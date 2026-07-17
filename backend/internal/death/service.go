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

// CalcPossessSuccessRate 夺舍成功率计算
// 公式：possessorShen/targetShen × (1 - 0.15×(境界差-1))
// 上限95%，下限5%
func CalcPossessSuccessRate(possessorShen, targetShen int, possessorRealm, targetRealm int) float64 {
	if targetShen <= 0 {
		targetShen = 1
	}
	baseRate := float64(possessorShen) / float64(targetShen)

	gap := possessorRealm - targetRealm
	if gap < 1 {
		return 0 // 境界不足不能夺舍
	}
	penalty := 0.15 * float64(gap-1)

	finalRate := baseRate * (1.0 - penalty)
	if finalRate > 0.95 {
		finalRate = 0.95
	}
	if finalRate < 0.05 {
		finalRate = 0.05
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

	// 创建遗迹洞府（死亡时自动保存财产）
	// 查询角色当前财产（这里简化为0，实际应查询背包系统）
	tx.Exec(
		"INSERT INTO heritage_ruins (owner_character_id, location_x, location_y, total_wealth, expires_at) VALUES (?, ?, ?, 0, ?)",
		req.CharacterID, req.LocationX, req.LocationY, time.Now().Add(7*24*time.Hour),
	)

	tx.Commit()

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "死亡触发成功，可选择六道轮回或鬼修",
		Data: map[string]interface{}{
			"death_type": req.DeathType,
			"options":    []string{"reincarnation", "ghost_cultivation"},
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

	// 重置角色属性
	tx.Exec("UPDATE character_attributes SET jing=?, qi=?, shen=?, qi_yun=?, wu_xing=?, hp_max=?, hp_current=?, mp_max=?, mp_current=?, soul_max=0, soul_current=0 WHERE character_id=?",
		newJing, newQi, newShen, newQiYun, newWuXing,
		newJing*100, newJing*100, newQi*50, newQi*50,
		req.CharacterID,
	)

	// 重置境界
	tx.Exec("UPDATE character_realm SET major_stage=1, minor_stage=1, stage_segment=0, exp_jing=0, exp_qi=0, exp_shen=0, xinmo_value=0, breakthrough_status=0 WHERE character_id=?", req.CharacterID)

	// 清除死亡状态
	tx.Exec("UPDATE character_death_state SET is_dead=0, death_type=0, ghost_mode=0, soul_hp_max=0, soul_hp_current=0 WHERE character_id=?", req.CharacterID)

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

	// 读取神属性（决定魂力上限）
	var shen int
	s.db.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&shen)

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

	// 恢复气血（精属性决定）
	var jing int
	s.db.QueryRow("SELECT jing FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&jing)
	s.db.Exec("UPDATE character_attributes SET hp_max=?, hp_current=? WHERE character_id=?", jing*100, jing*100, req.CharacterID)

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

	// 检查夺舍资格
	var ghostMode, possessCount int
	err := s.db.QueryRow("SELECT ghost_mode, possess_count FROM character_death_state WHERE character_id=?", req.CharacterID).
		Scan(&ghostMode, &possessCount)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	if ghostMode == 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "只有鬼修或残魂状态才能夺舍"})
		return
	}
	if possessCount >= 3 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "已达夺舍上限3次，将强制轮回变兽"})
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

	// 检查境界限制：只能夺舍比自己境界低的
	if possessorRealm <= targetRealm {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "只能夺舍境界低于自己的目标"})
		return
	}

	// 计算成功率
	successRate := CalcPossessSuccessRate(possessorShen, targetShen, possessorRealm, targetRealm)

	// 随机判定
	success := rand.Float64() < successRate

	// 记录夺舍日志
	s.db.Exec(
		"INSERT INTO possess_log (possessor_id, target_type, target_id, target_name, success, possessor_shen, target_shen) VALUES (?, ?, ?, ?, ?, ?, ?)",
		req.CharacterID, req.TargetType, req.TargetID, req.TargetName, boolToInt(success), possessorShen, targetShen,
	)

	// 增加夺舍次数
	s.db.Exec("UPDATE character_death_state SET possess_count=possess_count+1 WHERE character_id=?", req.CharacterID)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"success":        success,
			"success_rate":   math.Round(successRate*100) / 100,
			"possessor_shen": possessorShen,
			"target_shen":    targetShen,
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

	var possessCount int
	if err := tx.QueryRow("SELECT possess_count FROM character_death_state WHERE character_id=?", req.CharacterID).Scan(&possessCount); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	if req.Success {
		// 夺舍成功 → 成为全世界公敌
		tx.Exec("UPDATE character_death_state SET is_public_enemy=1, ghost_mode=0, is_dead=0 WHERE character_id=?", req.CharacterID)
		tx.Exec("UPDATE character_base SET race=1, form_state=1 WHERE character_id=?", req.CharacterID) // 恢复人形

		// 创建公敌记录
		nextThunder := time.Now().Add(time.Duration(rand.Intn(3600)+600) * time.Second) // 10分钟~1小时内
		tx.Exec("INSERT INTO public_enemy_state (character_id, next_thunder_at) VALUES (?, ?)", req.CharacterID, nextThunder)

		// 检查是否需要强制变兽（3次夺舍后）
		forceBeast := possessCount >= 3
		tx.Commit()

		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "夺舍成功！但已成为全世界公敌，小心天雷！",
			Data: map[string]interface{}{
				"is_public_enemy": true,
				"force_beast":     forceBeast,
				"possess_count":   possessCount,
			},
		})
	} else {
		// 夺舍失败 → 夺舍者只能轮回，被夺舍者可掠夺神属性
		var possessorShen int
		tx.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&possessorShen)

		plunderedShen := possessorShen / 3 // 被夺舍者掠夺1/3神属性
		if req.TargetID > 0 {
			tx.Exec("UPDATE character_attributes SET shen=shen+? WHERE character_id=?", plunderedShen, req.TargetID)
		}

		// 更新夺舍日志
		tx.Exec("UPDATE possess_log SET plundered_shen=? WHERE possessor_id=? ORDER BY id DESC LIMIT 1", plunderedShen, req.CharacterID)

		tx.Commit()

		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  fmt.Sprintf("夺舍失败！对方掠夺了%d点神属性。你必须进行轮回。", plunderedShen),
			Data: map[string]interface{}{
				"success":          false,
				"plundered_shen":   plunderedShen,
				"must_reincarnate": true,
			},
		})
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
//  POST /death/ruins/create  创建遗迹洞府
// ═══════════════════════════════════════════

func (s *Service) HandleRuinsCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID      int64 `json:"character_id"`
		LocationX        int   `json:"location_x"`
		LocationY        int   `json:"location_y"`
		TotalWealth      int64 `json:"total_wealth"`
		RestrictionLevel int   `json:"restriction_level"` // 禁制等级 0-9
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.RestrictionLevel > 9 {
		req.RestrictionLevel = 9
	}

	result, err := s.db.Exec(
		"INSERT INTO heritage_ruins (owner_character_id, location_x, location_y, total_wealth, restriction_level, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
		req.CharacterID, req.LocationX, req.LocationY, req.TotalWealth, req.RestrictionLevel,
		time.Now().Add(7*24*time.Hour),
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建遗迹失败"})
		return
	}
	ruinID, _ := result.LastInsertId()

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "遗迹洞府已创建",
		Data: map[string]interface{}{
			"ruin_id":           ruinID,
			"restriction_level": req.RestrictionLevel,
			"expires_in_days":   7,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/ruins/inherit  继承遗迹洞府
// ═══════════════════════════════════════════

func (s *Service) HandleRuinsInherit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		RuinID      int64 `json:"ruin_id"`
		CharacterID int64 `json:"character_id"`
		BreakLevel  int   `json:"break_level"` // 尝试突破的禁制等级
	}
	json.NewDecoder(r.Body).Decode(&req)

	var ownerID int64
	var isPlundered, restrictionLevel int
	var expiresAt time.Time
	err := s.db.QueryRow(
		"SELECT owner_character_id, is_plundered, restriction_level, expires_at FROM heritage_ruins WHERE ruin_id=?",
		req.RuinID,
	).Scan(&ownerID, &isPlundered, &restrictionLevel, &expiresAt)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "遗迹不存在"})
		return
	}

	if isPlundered == 1 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "遗迹已被掠夺"})
		return
	}

	// 原主人继承：过期后可免禁制继承
	isOwner := ownerID == req.CharacterID
	isExpired := time.Now().After(expiresAt)

	if isOwner && isExpired {
		// 免禁制继承
		s.db.Exec("UPDATE heritage_ruins SET is_plundered=1 WHERE ruin_id=?", req.RuinID)
		writeJSON(w, 200, APIResponse{Code: 0, Msg: "过期遗迹免禁制继承成功"})
		return
	}

	// 尝试突破禁制
	if req.BreakLevel < restrictionLevel {
		writeJSON(w, 400, APIResponse{
			Code: 400,
			Msg:  fmt.Sprintf("禁制等级%d，你的突破等级%d不足", restrictionLevel, req.BreakLevel),
		})
		return
	}

	s.db.Exec("UPDATE heritage_ruins SET is_plundered=1, discovered_by=? WHERE ruin_id=?", req.CharacterID, req.RuinID)

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "成功突破禁制，继承遗迹财产"})
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
