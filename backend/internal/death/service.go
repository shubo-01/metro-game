// Package death 实现人物系统的死亡服务。
// 负责死亡处理、六道轮回、鬼修转换、夺舍机制、兽身轮回、遗迹洞府、公敌系统。
// 严格按照《寻仙-人物系统PRD》第五~八章 和《人物系统技术方案》第三章实现。
package death

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"time"

	"xunxian/internal/character"
	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// Service 死亡服务，持有数据库连接和配置
type Service struct {
	db  *sql.DB
	rdb *redis.Client
	cfg *config.Config
}

// NewService 创建死亡服务实例
func NewService(db *sql.DB, rdb *redis.Client, cfg *config.Config) *Service {
	return &Service{db: db, rdb: rdb, cfg: cfg}
}

// APIResponse 统一 API 响应格式
type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

// ═══════════════════════════════════════════
//  核心算法
// ═══════════════════════════════════════════

// CalcPossessSuccessRate 夺舍成功率计算（V5 按技术方案 5.1 修正）
// 公式（技术方案 5.1 原文）：
//  1. ratio = 夺舍者神 ÷ 被夺舍者神
//  2. base  = ratio / (1 + ratio)   —— 神越高越接近1，双方相等时=0.5
//  3. 境界修正（gap = 夺舍者境界档 - 目标境界档）：
//     同境界及以下 ×0.7 / 高1档 ×0.85 / 高2档 ×0.95 / 高3档及以上 ×1.0
//  4. 结果 clamp 到 [0.01, 0.99]
// 注意：PRD 明确"无硬性境界限制，可夺舍更高境界"，所以 gap<=0 不再返回0，
// 只是吃最重的 ×0.7 修正（旧版"境界不足不能夺舍"的拦截已按 PRD 删除）。
func CalcPossessSuccessRate(possessorShen, targetShen int, possessorRealm, targetRealm int) float64 {
	if targetShen <= 0 {
		targetShen = 1 // 防除零：目标神最低按1算
	}
	if possessorShen < 0 {
		possessorShen = 0
	}
	ratio := float64(possessorShen) / float64(targetShen)
	base := ratio / (1.0 + ratio)

	// 境界修正系数查档（技术方案 5.1 表）
	gap := possessorRealm - targetRealm
	var realmMul float64
	switch {
	case gap <= 0:
		realmMul = 0.70 // 同境界或夺舍更高境界：最难档
	case gap == 1:
		realmMul = 0.85
	case gap == 2:
		realmMul = 0.95
	default: // gap >= 3
		realmMul = 1.00
	}

	finalRate := base * realmMul
	if finalRate > 0.99 {
		finalRate = 0.99
	}
	if finalRate < 0.01 {
		finalRate = 0.01
	}
	return finalRate
}

// CalcBeastJing 兽身精属性加成计算
// 兽形×1.5，人形无加成
func CalcBeastJing(baseJing int, isInBeastForm bool) int {
	if isInBeastForm {
		return int(float64(baseJing) * 1.5)
	}
	return baseJing
}

// CanBeastTransform 是否可化形（真人以上才能）
func CanBeastTransform(majorStage int) bool {
	return majorStage >= 2
}

// calcReincarnationType 根据因果值计算轮回道分配
// 因果值高（善）：优先天道/人道/阿修罗道
// 因果值低（恶）：可能坠入畜生道/饿鬼道/地狱道
func calcReincarnationType(karmaValue int) int {
	// 基础权重
	weights := map[int]float64{
		1: 10, // 天道
		2: 15, // 阿修罗道
		3: 30, // 人道（最常见）
		4: 20, // 畜生道
		5: 15, // 饿鬼道
		6: 10, // 地狱道
	}

	// 因果值调整权重
	if karmaValue > 0 {
		weights[1] += float64(karmaValue) * 2                    // 善行加天道概率
		weights[3] += float64(karmaValue)                        // 善行加人道概率
		weights[6] = math.Max(1, weights[6]-float64(karmaValue)) // 善行减地狱道概率
	} else if karmaValue < 0 {
		evil := float64(-karmaValue)
		weights[1] = math.Max(1, weights[1]-evil) // 恶行减天道概率
		weights[4] += evil * 1.5                  // 恶行加畜生道概率
		weights[5] += evil                        // 恶行加饿鬼道概率
		weights[6] += evil * 1.5                  // 恶行加地狱道概率
	}

	// 加权随机选择
	total := 0.0
	for _, w := range weights {
		total += w
	}
	roll := rand.Float64() * total
	cumulative := 0.0
	for i := 1; i <= 6; i++ {
		cumulative += weights[i]
		if roll <= cumulative {
			return i
		}
	}
	return 3 // 默认人道
}

// ═══════════════════════════════════════════
//  POST /death/trigger  触发死亡
// ═══════════════════════════════════════════

func (s *Service) HandleTrigger(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		DeathType   int   `json:"death_type"` // 1=自由探索死 2=魂飞魄散 3=夺舍失败
		IsDungeon   bool  `json:"is_dungeon"` // true=副本内死亡
		LocationX   int   `json:"location_x"`
		LocationY   int   `json:"location_y"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 副本内死亡：不触发死亡机制，只扣减奖励
	if req.IsDungeon {
		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "副本内死亡，被踢出副本，无永久惩罚",
			Data: map[string]interface{}{"is_dungeon_death": true},
		})
		return
	}

	// 自由探索死亡：标记死亡状态
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE character_death_state SET is_dead=1, death_type=? WHERE character_id=?", req.DeathType, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "更新死亡状态失败"})
		return
	}

	// 创建遗迹洞府（死亡时自动保存财产）——评审修复：不再是"只写0财富"的简化 INSERT，
	// 改为复用 createRuinInTx（handler_v5.go）真实划拨资产：
	//   灵石1/3（查 char_currency）+ 材料2/3（查 player_inventory）+ break_threshold 按境界档
	//   + zone_id 按死亡坐标匹配 map_zone_config 本地判定；password 死亡触发时留空，
	//   由后续 POST /death/ruins/create 补设密码/禁制。
	// 防双写约定（与 HandleRuinsCreate 呼应）：trigger 只在"本人没有未掠夺秘境"时新建带资产
	// 的记录；ruins/create 发现已有未掠夺秘境时只更新密码/禁制/分区，不会二次划拨资产建新记录。
	var existRuins int
	if err := tx.QueryRow("SELECT COUNT(*) FROM heritage_ruins WHERE owner_character_id=? AND is_plundered=0", req.CharacterID).Scan(&existRuins); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询秘境状态失败"})
		return
	}
	var ruinID, ruinStone int64
	if existRuins == 0 {
		zoneID := zoneIDByLocationTx(tx, req.LocationX, req.LocationY) // 按死亡坐标判定分区，匹配不到兜底2
		var cErr error
		ruinID, ruinStone, _, _, cErr = s.createRuinInTx(tx, req.CharacterID, req.LocationX, req.LocationY, zoneID, "", 0)
		if cErr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "死亡建立秘境失败: " + cErr.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "死亡触发成功，可三选一：六道轮回 / 鬼修 / 尸修",
		Data: map[string]interface{}{
			"death_type": req.DeathType,
			"ruin_id":    ruinID,    // 死亡时自动设立的秘境ID（已有未掠夺秘境时为0，不重复建）
			"ruin_stone": ruinStone, // 自动存入秘境的灵石数（原余额1/3）
			// PRD 死亡三选一（V5 新增尸修入口 corpse_cultivation）
			// 评审修复（项7）：corpse_cultivation 增加 can_possess=false 机器可读标记（只增不删改）
			"options": []map[string]interface{}{
				{"key": "reincarnation", "name": "六道轮回", "api": "/death/reincarnation", "desc": "按因果值随机六道转世重开"},
				{"key": "ghost_cultivation", "name": "鬼修", "api": "/death/ghost/enter", "desc": "以魂力代血条继续修行（精=0）"},
				{"key": "corpse_cultivation", "name": "尸修", "api": "/death/corpse/enter", "desc": "神→0永久，精=原精+神×2/3，气÷3；无法夺舍", "can_possess": false},
			},
			// 评审修复（项7）：夺舍规则速览，方便前端在死亡弹窗直接展示
			"possess_hint": "夺舍需真人以上境界（尸修不可夺舍），每一生限3次（轮回后重置），发起前须先设立秘境（/death/ruins/create）",
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/reincarnation  六道轮回
// ═══════════════════════════════════════════

func (s *Service) HandleReincarnation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		ForceBeast  bool  `json:"force_beast"` // true=三次夺舍强制变兽
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 读取轮回前属性
	var jing, qi, shen int
	err := s.db.QueryRow("SELECT jing, qi, shen FROM character_attributes WHERE character_id=?", req.CharacterID).
		Scan(&jing, &qi, &shen)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 读取因果值
	var karmaValue int
	s.db.QueryRow("SELECT karma_value FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&karmaValue)

	// 确定死亡原因
	var deathType int
	s.db.QueryRow("SELECT death_type FROM character_death_state WHERE character_id=?", req.CharacterID).Scan(&deathType)
	if req.ForceBeast {
		deathType = 4
	}

	// 计算轮回道（根据因果值）
	reincType := calcReincarnationType(karmaValue)

	// 记录轮回日志
	s.db.Exec(
		"INSERT INTO reincarnation_log (character_id, reincarnation_type, previous_jing, previous_qi, previous_shen, reason, is_beast) VALUES (?, ?, ?, ?, ?, ?, ?)",
		req.CharacterID, reincType, jing, qi, shen, deathType, boolToInt(req.ForceBeast),
	)

	// 应用轮回效果（事务确保原子性）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	newJing, newQi, newShen := 1, 1, 1
	newQiYun, newWuXing := 0, 0
	reincDesc := ""

	switch reincType {
	case 1: // 天道：悟性+2，气运+1
		newWuXing = 2
		newQiYun = 1
		reincDesc = "天道轮回：悟性+2，气运+1"
	case 2: // 阿修罗道：精+2
		newJing = 3
		reincDesc = "阿修罗道轮回：精+2，战斗天赋强化"
	case 3: // 人道：全属性+1，气运+2
		newJing, newQi, newShen = 2, 2, 2
		newQiYun = 2
		reincDesc = "人道轮回：全属性+1，气运+2"
	case 4: // 畜生道：获得特殊异能但肉身受限
		// TODO: Phase 2 实现畜生道专属异能系统（如夜视/毒抗/速度加成等）
		reincDesc = "畜生道轮回：获得特殊异能但肉身受限"
	case 5: // 饿鬼道：资源获取Debuff，鬼修路线加成
		// TODO: Phase 2 实现饿鬼道资源获取Debuff和鬼修路线专属功法加成
		reincDesc = "饿鬼道轮回：资源获取Debuff，鬼修路线加成"
	case 6: // 地狱道：全属性-1，隐藏天赋
		newJing, newQi, newShen = 0, 0, 0
		reincDesc = "地狱道轮回：全属性归零，熬过有隐藏天赋"
	}

	// 重置角色属性（V2 改造）：这里只写"根属性"（精/气/神/气运/悟性），
	// 轮回等于重开一世，之前加的自由点也一并作废，所以 free_* 记账同步清零。
	// 衍生值（气血/灵力/魂力/护盾等）绝不在这里手写公式（那是 V1 的老毛病，
	// 会和 character 服务的 V2 公式对不上），统一交给下面的 RecalcAndSaveDerived 重算。
	tx.Exec("UPDATE character_attributes SET jing=?, qi=?, shen=?, qi_yun=?, wu_xing=?, free_jing=0, free_qi=0, free_shen=0 WHERE character_id=?",
		newJing, newQi, newShen, newQiYun, newWuXing,
		req.CharacterID,
	)

	// 按 V2 公式重算全部衍生值（hp/mp/soul/shield/affinity/reaction/abnormal_resist）并落库。
	// RecalcAndSaveDerived 是 character 包导出的共用重算函数，传入 tx 保证在同一事务内完成。
	if _, err := character.RecalcAndSaveDerived(tx, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "轮回后重算衍生属性失败"})
		return
	}

	// 轮回转世 = 满状态重生：把当前值补满到新上限
	// （重算函数只负责"上限"和"封顶当前值"，不负责回填；魂力条是鬼修专用，
	//   转世后是肉身状态，当前魂力清零即可）
	tx.Exec("UPDATE character_attributes SET hp_current=hp_max, mp_current=mp_max, shield_current=shield_max, soul_current=0 WHERE character_id=?", req.CharacterID)

	// 重置境界
	tx.Exec("UPDATE character_realm SET major_stage=1, minor_stage=1, stage_segment=0, exp_jing=0, exp_qi=0, exp_shen=0, xinmo_value=0, breakthrough_status=0 WHERE character_id=?", req.CharacterID)

	// 清除死亡状态（V5：轮回=重开一世，尸修状态、夺舍次数与夺舍倒计时一并清理）
	// 【possess_count 语义说明（评审修复项5，PRD原文："3次/一生，轮回后重置为3次"）】
	// possess_count 记录的是"本世已使用的夺舍次数"（不是剩余次数），三处口径一致自洽：
	//   ① HandlePossessStart：possess_count >= 3 时拒绝（3次用完）；每成功发起一次 +1
	//   ② HandleDeathState：返回 possess_remaining = 3 - possess_count（换算成剩余次数给前端）
	//   ③ 本处轮回：possess_count 清0 = 已用次数归零 = 剩余次数恢复为3，即 PRD 的"轮回后重置为3次"
	tx.Exec("UPDATE character_death_state SET is_dead=0, death_type=0, ghost_mode=0, corpse_mode=0, soul_hp_max=0, soul_hp_current=0, possess_count=0, possess_deadline=NULL WHERE character_id=?", req.CharacterID)

	// V5：公敌与天雷状态是"永久处罚，只能轮回解除"（技术方案5.2），轮回时在此一并清除
	tx.Exec("UPDATE character_death_state SET is_public_enemy=0, public_enemy_until=NULL, thunder_penalty_next=NULL WHERE character_id=?", req.CharacterID)
	tx.Exec("DELETE FROM public_enemy_state WHERE character_id=?", req.CharacterID)

	// 清除五行修炼
	tx.Exec("DELETE FROM character_qi_elements WHERE character_id=?", req.CharacterID)

	// 强制变兽处理
	if req.ForceBeast {
		beastType := rand.Intn(5) + 1 // 随机兽身种类 1-5
		tx.Exec("UPDATE character_death_state SET beast_form=1, beast_can_transform=0 WHERE character_id=?", req.CharacterID)
		tx.Exec("UPDATE character_base SET race=3, form_state=2 WHERE character_id=?", req.CharacterID)
		tx.Exec(
			"INSERT INTO character_beast_state (character_id, beast_type, beast_evolution_stage, jing_multiplier, can_transform, current_form) VALUES (?, ?, 1, 1.5, 0, 1)",
			req.CharacterID, beastType,
		)
		reincDesc += " → 强制变为兽身"
	}

	tx.Commit()

	reincNames := map[int]string{1: "天道", 2: "阿修罗道", 3: "人道", 4: "畜生道", 5: "饿鬼道", 6: "地狱道"}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  reincDesc,
		Data: map[string]interface{}{
			"reincarnation_type": reincType,
			"reincarnation_name": reincNames[reincType],
			"new_attrs": map[string]int{
				"jing": newJing, "qi": newQi, "shen": newShen,
				"qi_yun": newQiYun, "wu_xing": newWuXing,
			},
			"is_beast": req.ForceBeast,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/ghost/enter  进入鬼修状态
// ═══════════════════════════════════════════

func (s *Service) HandleGhostEnter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// V5 互斥校验：尸修状态下不能再入鬼修（PRD：鬼修/尸修二选一，互斥）
	var corpseMode int
	s.db.QueryRow("SELECT corpse_mode FROM character_death_state WHERE character_id=?", req.CharacterID).Scan(&corpseMode)
	if corpseMode == 1 {
		writeJSON(w, 400, APIResponse{Code: 6101, Msg: "已是尸修状态，鬼修与尸修互斥"})
		return
	}

	// 读取神属性（决定魂力上限）
	var shen int
	s.db.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&shen)

	// 鬼修专用数值：魂力血条上限 = 神×30，写入 character_death_state.soul_hp_max。
	// 注意：这是鬼修独立体系的数值，与 V2 DerivedAttrs 的魂力上限
	// （character_attributes.soul_max = 神×50，见 character/calc.go）是两套体系，
	// 按策划案保留 ×30 不改，请勿"顺手统一"成 V2 系数。
	soulMax := shen * 30
	soulCurrent := soulMax

	// 进入鬼修状态
	s.db.Exec("UPDATE character_death_state SET ghost_mode=1, soul_hp_max=?, soul_hp_current=? WHERE character_id=?",
		soulMax, soulCurrent, req.CharacterID)
	s.db.Exec("UPDATE character_base SET race=2 WHERE character_id=?", req.CharacterID)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "进入鬼修状态，以魂力代替血条",
		Data: map[string]interface{}{
			"ghost_mode":      1,
			"soul_hp_max":     soulMax,
			"soul_hp_current": soulCurrent,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/ghost/exit  鬼修重聚肉身
// ═══════════════════════════════════════════

func (s *Service) HandleGhostExit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 恢复为正常状态
	s.db.Exec("UPDATE character_death_state SET ghost_mode=0, soul_hp_max=0, soul_hp_current=0 WHERE character_id=?", req.CharacterID)
	s.db.Exec("UPDATE character_base SET race=1 WHERE character_id=?", req.CharacterID)

	// 恢复气血（V2 改造）：不再手写 V1 公式（hp=精×100），
	// 改为调用 character 包导出的重算函数，按 V2 公式重算全部衍生值
	// （hp/mp/soul/shield/affinity/reaction/abnormal_resist），保证跨服务口径一致。
	if _, err := character.RecalcAndSaveDerived(s.db, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "重聚肉身后重算衍生属性失败"})
		return
	}
	// 重聚肉身 = 肉身满血回归：把当前气血补满到重算后的上限
	s.db.Exec("UPDATE character_attributes SET hp_current=hp_max WHERE character_id=?", req.CharacterID)

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "重聚肉身成功，恢复为正常修炼状态"})
}

// ═══════════════════════════════════════════
//  POST /death/possess/start  发起夺舍
// ═══════════════════════════════════════════

func (s *Service) HandlePossessStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64  `json:"character_id"` // 夺舍者
		TargetType  int    `json:"target_type"`  // 1=NPC 2=玩家
		TargetID    int64  `json:"target_id"`
		TargetName  string `json:"target_name"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 检查夺舍资格（V5 按 PRD 修正）：
	//   - PRD："真人以上所有修炼者"都可夺舍，不再限定鬼修/残魂状态；
	//   - 尸修（corpse_mode=1）无法夺舍（PRD 尸修限制条款）；
	//   - 3次/一生上限保留（轮回后 possess_count 重置为0）。
	var ghostMode, corpseMode, possessCount int
	err := s.db.QueryRow("SELECT ghost_mode, corpse_mode, possess_count FROM character_death_state WHERE character_id=?", req.CharacterID).
		Scan(&ghostMode, &corpseMode, &possessCount)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	if corpseMode == 1 {
		writeJSON(w, 400, APIResponse{Code: 6103, Msg: "尸修无法夺舍（神已永久归零）"})
		return
	}
	if possessCount >= 3 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "已达夺舍上限3次/一生，将强制轮回变兽"})
		return
	}

	// 读取夺舍者神属性和境界
	var possessorShen, possessorRealm int
	if err := s.db.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&possessorShen); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "夺舍者属性不存在"})
		return
	}
	if err := s.db.QueryRow("SELECT major_stage FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&possessorRealm); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "夺舍者境界不存在"})
		return
	}

	// PRD 夺舍资格："真人以上所有修炼者"（大境界≥2）或已是鬼修状态（死后残魂夺舍）
	if possessorRealm < 2 && ghostMode == 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "需真人以上境界（或鬼修状态）才能夺舍"})
		return
	}

	// PRD 夺舍前置：必须先设立秘境（夺舍失败强制轮回时资产有处可去）
	// 只要求存在一座"未被掠夺"的秘境即可
	var ruinCount int
	s.db.QueryRow("SELECT COUNT(*) FROM heritage_ruins WHERE owner_character_id=? AND is_plundered=0", req.CharacterID).Scan(&ruinCount)
	if ruinCount == 0 {
		writeJSON(w, 400, APIResponse{Code: 6104, Msg: "夺舍前必须先设立秘境（调用 /death/ruins/create）"})
		return
	}

	// 读取目标神属性和境界（NPC简化处理：默认值）
	targetShen := 5  // NPC默认神属性
	targetRealm := 1 // NPC默认人阶
	if req.TargetType == 2 {
		// 目标为玩家，从数据库读取真实属性
		if err := s.db.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.TargetID).Scan(&targetShen); err != nil {
			writeJSON(w, 404, APIResponse{Code: 404, Msg: "目标角色属性不存在"})
			return
		}
		if err := s.db.QueryRow("SELECT major_stage FROM character_realm WHERE character_id=?", req.TargetID).Scan(&targetRealm); err != nil {
			writeJSON(w, 404, APIResponse{Code: 404, Msg: "目标角色境界不存在"})
			return
		}
	}

	// V5 删除旧版"只能夺舍境界低于自己"拦截：
	// PRD 明确"无硬性境界限制，可夺舍更高境界"，境界差只影响成功率修正系数

	// 计算成功率（技术方案 5.1：ratio/(1+ratio) × 境界修正，clamp 0.01-0.99）
	successRate := CalcPossessSuccessRate(possessorShen, targetShen, possessorRealm, targetRealm)

	// 随机判定
	success := rand.Float64() < successRate

	// 记录夺舍日志
	s.db.Exec(
		"INSERT INTO possess_log (possessor_id, target_type, target_id, target_name, success, possessor_shen, target_shen) VALUES (?, ?, ?, ?, ?, ?, ?)",
		req.CharacterID, req.TargetType, req.TargetID, req.TargetName, boolToInt(success), possessorShen, targetShen,
	)

	// 增加夺舍次数 + 写入30分钟倒计时（PRD：倒计时内必须完成夺舍结算，超时=失败→强制轮回）
	deadline := time.Now().Add(PossessTimeout)
	s.db.Exec("UPDATE character_death_state SET possess_count=possess_count+1, possess_deadline=? WHERE character_id=?",
		deadline, req.CharacterID)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"success":          success,
			"success_rate":     math.Round(successRate*100) / 100,
			"possessor_shen":   possessorShen,
			"target_shen":      targetShen,
			"possess_deadline": deadline.Format("2006-01-02 15:04:05"), // 30分钟内须调用 /death/possess/result 结算
			"timeout_seconds":  int(PossessTimeout.Seconds()),
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/possess/result  夺舍结算
// ═══════════════════════════════════════════

func (s *Service) HandlePossessResult(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		Success     bool  `json:"success"`
		TargetID    int64 `json:"target_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// FOR UPDATE 锁定夺舍者死亡状态行，防止并发重复结算同一次夺舍
	var possessCount int
	var deadline sql.NullTime
	if err := tx.QueryRow("SELECT possess_count, possess_deadline FROM character_death_state WHERE character_id=? FOR UPDATE", req.CharacterID).Scan(&possessCount, &deadline); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// V5 懒结算超时判定（PRD：30分钟倒计时，超时=夺舍失败→强制轮回）
	// 无论客户端上报 success 是什么，只要已过 deadline 一律按失败处理
	timedOut := deadline.Valid && time.Now().After(deadline.Time)
	if timedOut {
		req.Success = false
	}
	// 结算完成后清空倒计时（本次夺舍生命周期结束）
	tx.Exec("UPDATE character_death_state SET possess_deadline=NULL WHERE character_id=?", req.CharacterID)

	if req.Success {
		// 夺舍成功（PRD）：变成对方境界、获得对方一切 → 同时成为全世界公敌、遭天雷
		// 被夺舍玩家 → 强制轮回变妖修（畜生道）
		tx.Exec("UPDATE character_death_state SET is_public_enemy=1, ghost_mode=0, is_dead=0 WHERE character_id=?", req.CharacterID)
		tx.Exec("UPDATE character_base SET race=1, form_state=1 WHERE character_id=?", req.CharacterID) // 恢复人形

		// "获得对方一切"：夺取目标的精气神与境界（仅目标为玩家时生效；NPC目标无档案可夺）
		if req.TargetID > 0 {
			var tJing, tQi, tShen int
			if err := tx.QueryRow("SELECT jing, qi, shen FROM character_attributes WHERE character_id=? FOR UPDATE", req.TargetID).
				Scan(&tJing, &tQi, &tShen); err == nil {
				var tMajor, tMinor, tSeg, tSub int
				tx.QueryRow("SELECT major_stage, minor_stage, stage_segment, sub_realm FROM character_realm WHERE character_id=?", req.TargetID).
					Scan(&tMajor, &tMinor, &tSeg, &tSub)

				// 夺舍者接管目标的肉身：精气神/境界整体替换（自由点记账清零，视为新肉身）
				tx.Exec("UPDATE character_attributes SET jing=?, qi=?, shen=?, free_jing=0, free_qi=0, free_shen=0 WHERE character_id=?",
					tJing, tQi, tShen, req.CharacterID)
				tx.Exec("UPDATE character_realm SET major_stage=?, minor_stage=?, stage_segment=?, sub_realm=? WHERE character_id=?",
					tMajor, tMinor, tSeg, tSub, req.CharacterID)
				// 按 V2 公式重算夺舍者衍生属性并满状态接管新肉身
				if _, err := character.RecalcAndSaveDerived(tx, req.CharacterID); err == nil {
					tx.Exec("UPDATE character_attributes SET hp_current=hp_max, mp_current=mp_max, shield_current=shield_max WHERE character_id=?", req.CharacterID)
				}

				// 被夺舍玩家标记强制轮回变妖修（畜生道）：death_type=4，
				// 实际轮回由其客户端调用 /death/reincarnation {force_beast:true} 完成
				tx.Exec("UPDATE character_death_state SET is_dead=1, death_type=4 WHERE character_id=?", req.TargetID)
			}
		}

		// 创建公敌记录（天雷懒结算锚点：技术方案5.2 登录1次+在线每2小时1次，
		// 首雷按2小时后到期，由 /death/thunder/check 懒结算触发）
		nextThunder := time.Now().Add(ThunderInterval)
		tx.Exec("INSERT INTO public_enemy_state (character_id, next_thunder_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE next_thunder_at=VALUES(next_thunder_at)",
			req.CharacterID, nextThunder)

		// 检查是否需要强制变兽（3次夺舍后）
		forceBeast := possessCount >= 3
		tx.Commit()

		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "夺舍成功！已接管对方肉身与境界，但已成为全世界公敌，小心天雷！",
			Data: map[string]interface{}{
				"is_public_enemy": true,
				"force_beast":     forceBeast,
				"possess_count":   possessCount,
				"target_forced":   req.TargetID > 0, // 被夺舍玩家是否已被标记强制轮回变妖修
			},
		})
	} else {
		// 夺舍失败（PRD）→ 夺舍者强制轮回；被夺舍者掠夺其 2/3 神属性 + 获得其秘境密码与地址
		var possessorShen int
		tx.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&possessorShen)

		plunderedShen := possessorShen * 2 / 3 // PRD：被夺舍者掠夺2/3神属性（旧版1/3已修正）
		if req.TargetID > 0 {
			tx.Exec("UPDATE character_attributes SET shen=shen+? WHERE character_id=?", plunderedShen, req.TargetID)
		}

		// 更新夺舍日志
		tx.Exec("UPDATE possess_log SET plundered_shen=? WHERE possessor_id=? ORDER BY id DESC LIMIT 1", plunderedShen, req.CharacterID)

		// PRD：被夺舍者同时获得夺舍者的秘境密码与地址（取最近一座未被掠夺的秘境）
		var ruinID int64
		var ruinPwd sql.NullString
		var ruinX, ruinY int
		hasRuin := tx.QueryRow(
			"SELECT ruin_id, password, location_x, location_y FROM heritage_ruins WHERE owner_character_id=? AND is_plundered=0 ORDER BY ruin_id DESC LIMIT 1",
			req.CharacterID,
		).Scan(&ruinID, &ruinPwd, &ruinX, &ruinY) == nil

		tx.Commit()

		data := map[string]interface{}{
			"success":          false,
			"timed_out":        timedOut, // true=因30分钟超时被判失败
			"plundered_shen":   plunderedShen,
			"must_reincarnate": true, // PRD：夺舍失败夺舍者强制轮回
		}
		if hasRuin {
			// 秘境情报泄露给被夺舍者（前端展示给目标玩家）
			data["revealed_ruin"] = map[string]interface{}{
				"ruin_id":    ruinID,
				"password":   ruinPwd.String,
				"location_x": ruinX,
				"location_y": ruinY,
			}
		}

		msg := fmt.Sprintf("夺舍失败！对方掠夺了%d点神属性（2/3），并得知了你的秘境密码与位置。你必须进行轮回。", plunderedShen)
		if timedOut {
			msg = "夺舍超时（30分钟倒计时已过），按失败结算：" + msg
		}
		writeJSON(w, 200, APIResponse{Code: 0, Msg: msg, Data: data})
	}
}

// ═══════════════════════════════════════════
//  POST /death/beast/transform  兽身化形切换
// ═══════════════════════════════════════════

func (s *Service) HandleBeastTransform(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		ToHuman     bool  `json:"to_human"` // true=化为人形 false=变为兽形
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 检查是否可化形
	var majorStage int
	s.db.QueryRow("SELECT major_stage FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&majorStage)

	if !CanBeastTransform(majorStage) {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "需达到真人境界才能化形"})
		return
	}

	var beastForm int
	s.db.QueryRow("SELECT beast_form FROM character_death_state WHERE character_id=?", req.CharacterID).Scan(&beastForm)
	if beastForm == 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "非兽身状态，无需化形"})
		return
	}

	if req.ToHuman {
		// 化为人形：失去精属性1.5倍加成
		s.db.Exec("UPDATE character_beast_state SET current_form=2, can_transform=1, last_transform_at=NOW() WHERE character_id=?", req.CharacterID)
		s.db.Exec("UPDATE character_base SET form_state=1 WHERE character_id=?", req.CharacterID)

		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "化形为人，失去精属性1.5倍加成，可使用人族功法和装备",
			Data: map[string]interface{}{"current_form": 2, "jing_multiplier": 1.0},
		})
	} else {
		// 变为兽形：恢复精属性1.5倍加成
		s.db.Exec("UPDATE character_beast_state SET current_form=1, last_transform_at=NOW() WHERE character_id=?", req.CharacterID)
		s.db.Exec("UPDATE character_base SET form_state=2 WHERE character_id=?", req.CharacterID)

		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "变为兽形，精属性×1.5倍加成，无法使用人族功法和装备",
			Data: map[string]interface{}{"current_form": 1, "jing_multiplier": 1.5},
		})
	}
}

// ═══════════════════════════════════════════
//  POST /death/ruins/create  创建遗迹洞府（秘境）
// ═══════════════════════════════════════════
//
// V5 按 PRD 补全：
//   - 秘境资产构成由服务端从数据库计算（客户端不可伪造）：
//     灵石×1/3（从 char_currency 扣除划入）+ 材料×2/3（从 player_inventory 扣除，
//     item_type 1/2 的普通/稀有材料，快照存入 material_json）
//   - 可设中文密码（password，可为空）
//   - 打破门槛 break_threshold = 死亡时境界对应的 3修（人阶/真人）或 5修（地仙+）
//     裸装100级攻击力（CalcRuinBreakThreshold，公式见 calc_v5.go）
//   - 过期时间7天（老逻辑保留）
func (s *Service) HandleRuinsCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID      int64  `json:"character_id"`
		LocationX        int    `json:"location_x"`
		LocationY        int    `json:"location_y"`
		ZoneID           int    `json:"zone_id"`           // 死亡地点所在分区（1/2/3，缺省2）
		Password         string `json:"password"`          // 秘境密码（可中文，可为空=不设密码）
		RestrictionLevel int    `json:"restriction_level"` // 禁制等级 0-9（老字段保留）
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.RestrictionLevel > 9 {
		req.RestrictionLevel = 9
	}
	if req.ZoneID < 1 || req.ZoneID > 3 {
		req.ZoneID = 2 // 缺省按外围原野
	}
	// 密码长度上限（utf8mb4 中文安全：列宽 VARCHAR(64)）
	if len(req.Password) > 60 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "密码过长（最多60字节，约20个汉字）"})
		return
	}

	// 事务：资产划拨（扣灵石/扣材料）+ 建秘境 必须原子
	// 防双写约定（评审修复项6，与 HandleTrigger 呼应）：
	//   死亡触发（/death/trigger）时已自动建了一条带资产的秘境记录（密码为空），
	//   所以这里先 FOR UPDATE 查本人未掠夺秘境——
	//   有 → 只补设密码/禁制/分区（UPDATE），绝不二次划拨资产建新记录（否则玩家财产会被扣两遍）；
	//   无 → 走 createRuinInTx 新建（兼容"没走 trigger 直接调本接口"的旧流程）。
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 先查本人是否已有未掠夺的秘境（FOR UPDATE 锁行，防止并发下同时走"新建"分支建出两条）
	var existRuinID, existStone, existThreshold int64
	err = tx.QueryRow(
		"SELECT ruin_id, stone_amount, break_threshold FROM heritage_ruins WHERE owner_character_id=? AND is_plundered=0 ORDER BY ruin_id DESC LIMIT 1 FOR UPDATE",
		req.CharacterID,
	).Scan(&existRuinID, &existStone, &existThreshold)

	if err == nil {
		// 分支A：已有秘境（通常是死亡触发时自动建的）→ 只更新密码/禁制/分区，不动资产与位置
		//（秘境位置=死亡地点，由 trigger 写死，这里传的坐标忽略）
		if _, uErr := tx.Exec(
			"UPDATE heritage_ruins SET password=?, restriction_level=?, zone_id=? WHERE ruin_id=?",
			req.Password, req.RestrictionLevel, req.ZoneID, existRuinID,
		); uErr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "更新秘境设置失败"})
			return
		}
		if cErr := tx.Commit(); cErr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
			return
		}
		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "秘境设置已更新（死亡时资产已存入，本次仅补设密码/禁制）",
			Data: map[string]interface{}{
				"ruin_id":           existRuinID,
				"updated":           true,               // true=更新既有秘境（未二次划拨资产）
				"stone_amount":      existStone,         // 死亡时已存入的灵石
				"break_threshold":   existThreshold,     // 死亡时已定的打破门槛
				"has_password":      req.Password != "", // 是否设了密码（密码本身不回显）
				"restriction_level": req.RestrictionLevel,
				"zone_id":           req.ZoneID,
				"expires_in_days":   7,
			},
		})
		return
	}
	if err != sql.ErrNoRows {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询秘境状态失败"})
		return
	}

	// 分支B：没有未掠夺秘境 → 新建（资产划拨逻辑已提取为 createRuinInTx 公共函数，
	// 与 HandleTrigger 复用同一份代码，保证两个入口口径完全一致）
	ruinID, stoneIn, materials, breakThreshold, err := s.createRuinInTx(
		tx, req.CharacterID, req.LocationX, req.LocationY, req.ZoneID, req.Password, req.RestrictionLevel,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建遗迹失败: " + err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "秘境已设立：灵石1/3与材料2/3已存入",
		Data: map[string]interface{}{
			"ruin_id":           ruinID,
			"updated":           false,               // false=本次新建秘境并划拨资产
			"stone_amount":      stoneIn,             // 存入的灵石（原余额1/3）
			"materials":         materials,           // 存入的材料清单（各原持有量的2/3）
			"break_threshold":   breakThreshold,      // 他人打破所需攻击力
			"has_password":      req.Password != "",  // 是否设了密码（密码本身不回显）
			"restriction_level": req.RestrictionLevel,
			"zone_id":           req.ZoneID,
			"expires_in_days":   7,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/ruins/inherit  继承/打破遗迹洞府（秘境）
// ═══════════════════════════════════════════
//
// V5 按 PRD 全面重写，三条获取路径：
//   路径A 原主人（轮回转世后）：知道地点即可回来继承；设了密码则须密码正确（防"知道位置不知道密码"的白嫖）
//   路径B 他人凭密码：夺舍失败时被夺舍者会获得秘境密码与地址，凭密码可直接开启继承
//   路径C 他人强行打破：无密码/密码不对时，须攻击力 >= break_threshold（死亡时境界对应
//         3修/5修裸装100级攻击力）才能砸开禁制夺取
// 结算：灵石 stone_amount 回 char_currency，材料 material_json 逐条回 player_inventory
//       （source='heritage_ruin' 堆叠），事务原子，FOR UPDATE 锁秘境行防双开。
func (s *Service) HandleRuinsInherit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		RuinID      int64  `json:"ruin_id"`
		CharacterID int64  `json:"character_id"`
		Password    string `json:"password"`   // 开启密码（可为空）
		BreakAtk    int64  `json:"break_atk"`  // 强行打破时携带的攻击力（服务端会与门槛比较）
		BreakLevel  int    `json:"break_level"` // 旧字段保留兼容（禁制等级比较，已不作为主要判定）
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.RuinID <= 0 || req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "ruin_id 与 character_id 必填"})
		return
	}

	// 事务 + FOR UPDATE：秘境只能被开一次，两个玩家同时开必须排队且后者看到 is_plundered=1
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	var ownerID int64
	var isPlundered, restrictionLevel int
	var expiresAt time.Time
	var password sql.NullString
	var stoneAmount, breakThreshold sql.NullInt64
	var materialJSON sql.NullString
	err = tx.QueryRow(
		`SELECT owner_character_id, is_plundered, restriction_level, expires_at,
		        password, stone_amount, material_json, break_threshold
		 FROM heritage_ruins WHERE ruin_id=? FOR UPDATE`,
		req.RuinID,
	).Scan(&ownerID, &isPlundered, &restrictionLevel, &expiresAt,
		&password, &stoneAmount, &materialJSON, &breakThreshold)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "遗迹不存在"})
		return
	}
	if isPlundered == 1 {
		writeJSON(w, 400, APIResponse{Code: 6203, Msg: "秘境已被开启，财物已空"})
		return
	}

	isOwner := ownerID == req.CharacterID
	hasPassword := password.Valid && password.String != ""
	passwordOK := hasPassword && req.Password == password.String
	isExpired := time.Now().After(expiresAt)

	// ── 三条路径的准入判定 ──
	var method string // 获取方式，写回响应给前端做不同演出
	switch {
	case isOwner:
		// 原主人：设了密码则必须密码正确（过期后免密，PRD：7天后禁制自然消散）
		if hasPassword && !passwordOK && !isExpired {
			writeJSON(w, 403, APIResponse{Code: 6201, Msg: "秘境密码错误"})
			return
		}
		method = "owner_inherit"
	case passwordOK:
		// 他人凭密码开启（夺舍失败泄露密码的场景）
		method = "password_open"
	case isExpired:
		// 过期秘境禁制消散：任何发现者可直接继承
		method = "expired_loot"
	default:
		// 他人强行打破：攻击力必须达到死亡时境界对应的打破门槛
		threshold := breakThreshold.Int64
		if threshold <= 0 {
			// 老数据无门槛列值时回退旧禁制等级判定，保持兼容
			if req.BreakLevel < restrictionLevel {
				writeJSON(w, 403, APIResponse{Code: 6202,
					Msg: fmt.Sprintf("禁制等级%d，你的突破等级%d不足", restrictionLevel, req.BreakLevel)})
				return
			}
		} else if req.BreakAtk < threshold {
			writeJSON(w, 403, APIResponse{Code: 6202,
				Msg: fmt.Sprintf("禁制坚固：需攻击力%d以上才能打破（当前%d）", threshold, req.BreakAtk)})
			return
		}
		method = "force_break"
	}

	// ── 资产发放：灵石回 char_currency ──
	gotStone := int64(0)
	if stoneAmount.Valid && stoneAmount.Int64 > 0 {
		gotStone = stoneAmount.Int64
		if _, err := tx.Exec(
			`INSERT INTO char_currency (character_id, spirit_stone) VALUES (?, ?)
			 ON DUPLICATE KEY UPDATE spirit_stone=spirit_stone+VALUES(spirit_stone)`,
			req.CharacterID, gotStone,
		); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "灵石发放失败"})
			return
		}
	}

	// ── 资产发放：材料快照逐条回背包（同物品同来源自动堆叠） ──
	type matEntry struct {
		ItemID   int `json:"item_id"`
		ItemType int `json:"item_type"`
		Count    int `json:"count"`
	}
	var materials []matEntry
	if materialJSON.Valid && materialJSON.String != "" {
		_ = json.Unmarshal([]byte(materialJSON.String), &materials)
	}
	for _, m := range materials {
		if m.Count <= 0 {
			continue
		}
		itemType := m.ItemType
		if itemType != 1 && itemType != 2 {
			itemType = 1 // 老快照无 item_type 时按普通材料回收
		}
		if _, err := tx.Exec(
			`INSERT INTO player_inventory (player_id, item_id, item_type, quantity, source)
			 VALUES (?, ?, ?, ?, 'heritage_ruin')
			 ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)`,
			req.CharacterID, m.ItemID, itemType, m.Count,
		); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "材料发放失败"})
			return
		}
	}

	// ── 标记秘境已开启 ──
	if _, err := tx.Exec(
		"UPDATE heritage_ruins SET is_plundered=1, discovered_by=? WHERE ruin_id=?",
		req.CharacterID, req.RuinID,
	); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "秘境状态更新失败"})
		return
	}
	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "秘境开启成功，财物已入账",
		Data: map[string]interface{}{
			"method":       method,    // owner_inherit/password_open/expired_loot/force_break
			"spirit_stone": gotStone,  // 获得灵石
			"materials":    materials, // 获得材料清单
			"is_owner":     isOwner,
		},
	})
}

// ═══════════════════════════════════════════
//  GET /death/state  查询角色死亡状态（含夺舍次数/鬼修/兽身等）
// ═══════════════════════════════════════════

func (s *Service) HandleDeathState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID := r.URL.Query().Get("character_id")
	if charID == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return
	}

	// 查询死亡状态表
	var (
		isDead, deathType, ghostMode       int
		soulHPMax, soulHPCur, possessCount int
		beastForm, beastCanTransform       int
		isPublicEnemy                      int
	)
	publicEnemyUntil := sql.NullTime{}
	thunderNext := sql.NullTime{}

	err := s.db.QueryRow(
		`SELECT is_dead, death_type, ghost_mode, soul_hp_max, soul_hp_current,
		        possess_count, beast_form, beast_can_transform, is_public_enemy,
		        public_enemy_until, thunder_penalty_next
		 FROM character_death_state WHERE character_id=?`,
		charID,
	).Scan(&isDead, &deathType, &ghostMode, &soulHPMax, &soulHPCur,
		&possessCount, &beastForm, &beastCanTransform, &isPublicEnemy,
		&publicEnemyUntil, &thunderNext)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色死亡状态不存在"})
		return
	}

	data := map[string]interface{}{
		"is_dead":             isDead == 1,
		"death_type":          deathType,
		"ghost_mode":          ghostMode,
		"soul_hp_max":         soulHPMax,
		"soul_hp_current":     soulHPCur,
		"possess_count":       possessCount,
		"possess_remaining":   3 - possessCount, // 剩余夺舍次数（上限3次）
		"beast_form":          beastForm,
		"beast_can_transform": beastCanTransform,
		"is_public_enemy":     isPublicEnemy == 1,
	}
	if publicEnemyUntil.Valid {
		data["public_enemy_until"] = publicEnemyUntil.Time.Format("2006-01-02 15:04:05")
	}
	if thunderNext.Valid {
		data["thunder_penalty_next"] = thunderNext.Time.Format("2006-01-02 15:04:05")
	}

	writeJSON(w, 200, APIResponse{Code: 0, Data: data})
}

// ═══════════════════════════════════════════
//  GET /death/public-enemy/status  查询公敌状态
// ═══════════════════════════════════════════

func (s *Service) HandlePublicEnemyStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID := r.URL.Query().Get("character_id")
	if charID == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return
	}

	var reason int
	var bounty int64
	var thunderCount int
	var nextThunder sql.NullTime
	err := s.db.QueryRow(
		"SELECT become_enemy_reason, bounty_total, thunder_count, next_thunder_at FROM public_enemy_state WHERE character_id=?",
		charID,
	).Scan(&reason, &bounty, &thunderCount, &nextThunder)
	if err != nil {
		writeJSON(w, 200, APIResponse{
			Code: 0,
			Data: map[string]interface{}{"is_public_enemy": false},
		})
		return
	}

	data := map[string]interface{}{
		"is_public_enemy": true,
		"reason":          reason,
		"bounty_total":    bounty,
		"thunder_count":   thunderCount,
	}
	if nextThunder.Valid {
		data["next_thunder_at"] = nextThunder.Time.Format("2006-01-02 15:04:05")
		remaining := time.Until(nextThunder.Time)
		data["thunder_remaining_seconds"] = int(remaining.Seconds())
	}

	writeJSON(w, 200, APIResponse{Code: 0, Data: data})
}

// ═══════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
