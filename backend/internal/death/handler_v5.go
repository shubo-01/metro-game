// handler_v5.go 战斗地图轮回夺舍迭代（V5）新增：尸修状态机 + 天雷懒结算 + 秘境/夺舍公式常量。
// 依据《战斗操作层与地图系统和轮回夺舍系统PRD》与《战斗与地图系统轮回和夺舍系统技术设计文档》。
//
// 本文件新增路由（在 cmd/death-service/main.go 注册）：
//   POST /death/corpse/enter   进入尸修状态（死亡三选一之一，与鬼修互斥）
//   POST /death/corpse/exit    退出尸修状态（神仍为0，属性转换不可逆）
//   POST /death/thunder/check  天雷懒结算（登录时/查询时判定 next_thunder_at 到期触发）
//
// 结算制说明（无任何后台定时器）：
//   天雷不用定时器轰人，而是客户端登录/前端轮询时调用 /death/thunder/check，
//   服务端发现 next_thunder_at 已到期才补结算一次——和功法打坐的懒结算是同一套思路。
package death

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"xunxian/internal/character"
)

// ═══════════════════════════════════════════
//  V5 归属校验（评审修复：新接口防越权）
// ═══════════════════════════════════════════

// getAccountID 从请求头 X-Account-ID 读取账号ID（与 character 服务的认证方式完全一致）。
// 头缺失或非数字返回0（视为未认证）。
func getAccountID(r *http.Request) int64 {
	v := r.Header.Get("X-Account-ID")
	if v == "" {
		return 0
	}
	var id int64
	fmt.Sscanf(v, "%d", &id)
	return id
}

// assertCharacterOwner 校验"当前请求的账号"是否是指定角色的主人（防越权核心）。
// 实现风格与 character 包 handler_v2.go 的同名函数一致：
//   - 请求头没带账号（未登录/未认证）→ 401 未认证
//   - 角色在 character_base 里查不到 → 404 角色不存在
//   - 角色的 account_id 与请求账号不一致 → 403 无权操作
//
// 返回值：true=校验通过可以继续；false=校验失败，本函数已写好错误响应，调用方直接 return。
func (s *Service) assertCharacterOwner(w http.ResponseWriter, r *http.Request, characterID int64) bool {
	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未认证"})
		return false
	}
	var ownerID int64
	err := s.db.QueryRow("SELECT account_id FROM character_base WHERE character_id=?", characterID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return false
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询角色归属失败"})
		return false
	}
	if ownerID != accountID {
		writeJSON(w, 403, APIResponse{Code: 403, Msg: "无权操作他人角色"})
		return false
	}
	return true
}

// ═══════════════════════════════════════════
//  V5 秘境资产共用助手（评审修复：HandleTrigger 与 HandleRuinsCreate 共用，消除双写分叉）
// ═══════════════════════════════════════════

// ruinMatEntry 秘境材料快照条目（material_json 元素结构）。
// 从 HandleRuinsCreate 的函数内类型提取为包级，供死亡触发建秘境复用；
// 字段与 HandleRuinsInherit 反序列化用的本地结构完全一致（item_id/item_type/count）。
type ruinMatEntry struct {
	ItemID   int `json:"item_id"`
	ItemType int `json:"item_type"`
	Count    int `json:"count"`
}

// zoneIDByLocationTx 按坐标匹配 map_zone_config 边界判定所在分区（本地简单实现，不跨服务）。
// 多个分区包含同一点时取面积最小者（营地嵌套在外围里，归营地），查不到兜底 Zone2 外围原野。
func zoneIDByLocationTx(tx *sql.Tx, x, y int) int {
	zoneID := 2 // 兜底：外围原野
	_ = tx.QueryRow(
		`SELECT zone_id FROM map_zone_config
		 WHERE ?>=x_min AND ?<=x_max AND ?>=y_min AND ?<=y_max
		 ORDER BY (x_max-x_min)*(y_max-y_min) ASC LIMIT 1`,
		x, x, y, y,
	).Scan(&zoneID)
	return zoneID
}

// createRuinInTx 在事务内完成"资产划拨 + 建秘境"全流程（服务端权威，客户端不可伪造）：
//  1. 灵石×1/3 从 char_currency 划入（FOR UPDATE 锁余额行防并发；无货币行按0）
//  2. 材料×2/3 从 player_inventory 划入（item_type 1/2，快照存 material_json）
//  3. break_threshold = CalcRuinBreakThreshold(当前境界档)（3修/5修裸装100级攻击力）
//  4. INSERT heritage_ruins（total_wealth 老字段记灵石数保持兼容，7天过期）
//
// password 死亡触发时传空串（由后续 /death/ruins/create 补设），主动建秘境时传玩家所设密码。
func (s *Service) createRuinInTx(tx *sql.Tx, characterID int64, x, y, zoneID int, password string, restrictionLevel int) (
	ruinID int64, stoneIn int64, materials []ruinMatEntry, breakThreshold int64, err error) {

	// 1. 灵石×1/3 划入秘境（FOR UPDATE 锁余额行防并发；无货币行按0处理）
	var spiritStone int64
	_ = tx.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=? FOR UPDATE", characterID).Scan(&spiritStone)
	stoneIn = spiritStone / 3
	if stoneIn > 0 {
		if _, err = tx.Exec("UPDATE char_currency SET spirit_stone=spirit_stone-? WHERE character_id=?", stoneIn, characterID); err != nil {
			return 0, 0, nil, 0, fmt.Errorf("灵石划拨失败: %w", err)
		}
	}

	// 2. 材料×2/3 划入秘境：读 player_inventory 的普通/稀有材料（item_type 1/2），
	//    每种取 floor(数量×2/3) 存入 material_json 并从背包扣除
	rows, qerr := tx.Query("SELECT inv_id, item_id, item_type, quantity FROM player_inventory WHERE player_id=? AND item_type IN (1,2) AND quantity>0 FOR UPDATE", characterID)
	if qerr == nil {
		type invRow struct {
			invID    int64
			itemID   int
			itemType int
			qty      int
		}
		var invRows []invRow
		for rows.Next() {
			var ir invRow
			if rows.Scan(&ir.invID, &ir.itemID, &ir.itemType, &ir.qty) == nil {
				invRows = append(invRows, ir)
			}
		}
		rows.Close()
		for _, ir := range invRows {
			take := ir.qty * 2 / 3
			if take <= 0 {
				continue
			}
			if _, err = tx.Exec("UPDATE player_inventory SET quantity=quantity-? WHERE inv_id=?", take, ir.invID); err != nil {
				return 0, 0, nil, 0, fmt.Errorf("材料划拨失败: %w", err)
			}
			materials = append(materials, ruinMatEntry{ItemID: ir.itemID, ItemType: ir.itemType, Count: take})
		}
	}
	materialJSON, _ := json.Marshal(materials)

	// 3. 打破门槛：按当前境界档位计算（人/真人=3修档×4.0，地仙+=5修档×9.0）
	var majorStage, subRealm int
	_ = tx.QueryRow("SELECT major_stage, sub_realm FROM character_realm WHERE character_id=?", characterID).Scan(&majorStage, &subRealm)
	breakThreshold = CalcRuinBreakThreshold(character.RealmIndex(majorStage, subRealm))

	// 4. 建秘境
	result, ierr := tx.Exec(
		`INSERT INTO heritage_ruins
		 (owner_character_id, location_x, location_y, total_wealth, restriction_level,
		  password, stone_amount, material_json, break_threshold, zone_id, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		characterID, x, y, stoneIn, restrictionLevel,
		password, stoneIn, string(materialJSON), breakThreshold, zoneID,
		time.Now().Add(7*24*time.Hour),
	)
	if ierr != nil {
		return 0, 0, nil, 0, fmt.Errorf("创建秘境失败: %w", ierr)
	}
	ruinID, _ = result.LastInsertId()
	return ruinID, stoneIn, materials, breakThreshold, nil
}


// ═══════════════════════════════════════════
//  V5 常量（数值出处均为技术方案原文）
// ═══════════════════════════════════════════

const (
	// PossessTimeout 夺舍倒计时（PRD：发起夺舍后30分钟内必须完成结算，超时=失败→强制轮回）
	PossessTimeout = 30 * time.Minute

	// ThunderInterval 天雷触发间隔（技术方案5.2：每次登录1次 + 在线每2小时1次）
	ThunderInterval = 2 * time.Hour

	// ThunderBaseAtk 人阶100级裸装基准攻击力（技术方案5.2 公式基数800）
	ThunderBaseAtk = 800.0

	// ThunderFullStrikeMul 全力一击倍率（技术方案5.2 公式系数4.0）
	ThunderFullStrikeMul = 4.0

	// ThunderFiveCultMul 同级5修围攻倍率（技术方案5.2 公式系数9.0，"同级5修裸装全力一击"）
	ThunderFiveCultMul = 9.0

	// RuinThreeCultMul 秘境打破门槛的3修倍率（人阶/真人档，PRD：3修裸装100级攻击力）
	RuinThreeCultMul = 4.0

	// HumanBaseline 人阶100级均分基准值67（境界比值 ratio 的分母，见 character/calc.go realmTable）
	HumanBaseline = 67.0
)

// ═══════════════════════════════════════════
//  V5 纯函数（表驱动单测见 calc_v5_test.go）
// ═══════════════════════════════════════════

// CalcCorpseAttrs 尸修属性转换（PRD 轮回夺舍章节原文）：
//   神 → 0（永久，尸修无神识）
//   精 = 原精 + floor(原神 × 2/3)（神识残余灌入肉身）
//   气 = floor(原气 ÷ 3)（尸躯经脉枯萎，灵力大损）
// 返回转换后的 (精, 气, 神)。
func CalcCorpseAttrs(jing, qi, shen int) (newJing, newQi, newShen int) {
	if jing < 0 {
		jing = 0
	}
	if qi < 0 {
		qi = 0
	}
	if shen < 0 {
		shen = 0
	}
	return jing + shen*2/3, qi / 3, 0
}

// CalcThunderDamage 天雷伤害（技术方案5.2 原文公式）：
//   damage = 800 × 4.0 × ratio × 9.0
//   ratio  = 当前境界100级基准值 ÷ 人阶基准值67
// 即"同级5修裸装全力一击"的总伤害。realmIdx 为 1-12 境界档位。
func CalcThunderDamage(realmIdx int) int64 {
	ratio := character.GetRealmBaseline(realmIdx).Baseline / HumanBaseline
	return int64(ThunderBaseAtk * ThunderFullStrikeMul * ratio * ThunderFiveCultMul)
}

// CalcRuinBreakThreshold 秘境打破门槛（PRD 秘境章节原文）：
//   门槛 = 死亡时境界对应的 3修（人阶/真人）或 5修（地仙及以上）裸装100级攻击力
//   人阶/真人（realmIdx≤2）：800 × ratio × 4.0（3修档）
//   地仙及以上（realmIdx≥3）：800 × ratio × 9.0（5修档）
//   ratio = 境界基准值 ÷ 67
func CalcRuinBreakThreshold(realmIdx int) int64 {
	ratio := character.GetRealmBaseline(realmIdx).Baseline / HumanBaseline
	mul := ThunderFiveCultMul // 地仙及以上：5修档
	if realmIdx <= character.RealmZhenren {
		mul = RuinThreeCultMul // 人阶/真人：3修档
	}
	return int64(ThunderBaseAtk * ratio * mul)
}

// ═══════════════════════════════════════════
//  POST /death/corpse/enter  进入尸修状态
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 前置：必须处于死亡状态（is_dead=1），且未入鬼修（互斥，错误码6101）、未已是尸修。
// 效果（PRD）：神→0永久、精=原精+floor(神×2/3)、气=floor(气/3)、异常抵抗=0
//   （神=0后 RecalcAndSaveDerived 重算出的异常抵抗自然归零，不手写公式），
//   尸修状态下无法夺舍（HandlePossessStart 已用 6103 拦截）。
func (s *Service) HandleCorpseEnter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必填"})
		return
	}

	// 归属校验（评审修复）：只能给自己的角色转尸修（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 事务：状态检查 → 属性转换 → 重算衍生值 必须原子（防止转换到一半属性错乱）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 锁序注释：先锁 character_death_state 行，再锁 character_attributes 行，
	// 与 HandlePossessResult 的锁序保持一致，避免交叉死锁。
	var isDead, ghostMode, corpseMode int
	err = tx.QueryRow(
		"SELECT is_dead, ghost_mode, corpse_mode FROM character_death_state WHERE character_id=? FOR UPDATE",
		req.CharacterID,
	).Scan(&isDead, &ghostMode, &corpseMode)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色死亡状态不存在"})
		return
	}
	if ghostMode == 1 {
		writeJSON(w, 400, APIResponse{Code: 6101, Msg: "已是鬼修状态，鬼修与尸修互斥"})
		return
	}
	if corpseMode == 1 {
		writeJSON(w, 400, APIResponse{Code: 6102, Msg: "已处于尸修状态，请勿重复进入"})
		return
	}
	if isDead != 1 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "只有死亡状态才能选择尸修（死亡三选一）"})
		return
	}

	// 读原属性并按 PRD 公式转换
	var jing, qi, shen int
	err = tx.QueryRow(
		"SELECT jing, qi, shen FROM character_attributes WHERE character_id=? FOR UPDATE",
		req.CharacterID,
	).Scan(&jing, &qi, &shen)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色属性不存在"})
		return
	}
	newJing, newQi, newShen := CalcCorpseAttrs(jing, qi, shen)

	// 落库根属性：神清零是永久的，free_shen 记账一并清零（自由点加到神上的部分随神湮灭）
	if _, err := tx.Exec(
		"UPDATE character_attributes SET jing=?, qi=?, shen=?, free_shen=0 WHERE character_id=?",
		newJing, newQi, newShen, req.CharacterID,
	); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "尸修属性转换失败"})
		return
	}

	// 按 V2 公式重算全部衍生值（神=0 → 魂力/异常抵抗自然归零，绝不手写公式）
	if _, err := character.RecalcAndSaveDerived(tx, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "尸修转换后重算衍生属性失败"})
		return
	}

	// 尸修 = 以尸躯行走人间：气血补满、灵力按新上限补满，脱离死亡状态
	// （评审修复附带：与 CorpseExit 同类问题——事务内 Exec 逐条检查错误，不再静默忽略）
	if _, err := tx.Exec("UPDATE character_attributes SET hp_current=hp_max, mp_current=mp_max, shield_current=shield_max WHERE character_id=?", req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "尸修补满状态失败"})
		return
	}
	if _, err := tx.Exec("UPDATE character_death_state SET corpse_mode=1, is_dead=0 WHERE character_id=?", req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "尸修状态更新失败"})
		return
	}
	// race=4 尸修（1=人 2=鬼修 3=兽身 4=尸修）
	if _, err := tx.Exec("UPDATE character_base SET race=4 WHERE character_id=?", req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "尸修种族更新失败"})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "已入尸修：神识永灭，精魄大涨",
		Data: map[string]interface{}{
			"corpse_mode": 1,
			"old_attrs":   map[string]int{"jing": jing, "qi": qi, "shen": shen},
			"new_attrs":   map[string]int{"jing": newJing, "qi": newQi, "shen": newShen},
			"warning":     "神=0为永久转换，退出尸修也不会恢复；尸修无法夺舍，异常抵抗为0",
		},
	})
}

// ═══════════════════════════════════════════
//  POST /death/corpse/exit  退出尸修状态
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 注意：神=0 是永久的（PRD 原文），退出只是恢复"正常修炼者"身份，
//       属性不回退——想恢复神属性只有轮回重开一世。
func (s *Service) HandleCorpseExit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必填"})
		return
	}

	// 归属校验（评审修复）：只能操作自己的角色（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 评审修复：原实现非事务且多处 db.Exec 忽略错误，可能出现"race 改了但 corpse_mode 没改"
	// 的半状态。改为单事务：状态位/种族/衍生重算/补血 全部入事务并逐条检查错误，
	// 要么全部生效要么全部回滚。RecalcAndSaveDerived 的第一个参数是 Execer 接口
	// （*sql.Tx 天然满足，HandleCorpseEnter 已同样用法），直接传 tx 即可入事务。
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// FOR UPDATE 锁死亡状态行：防止与并发的 corpse/enter、reincarnation 交叉改状态
	var corpseMode int
	err = tx.QueryRow("SELECT corpse_mode FROM character_death_state WHERE character_id=? FOR UPDATE", req.CharacterID).Scan(&corpseMode)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色死亡状态不存在"})
		return
	}
	if corpseMode != 1 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "当前不在尸修状态"})
		return
	}

	if _, err := tx.Exec("UPDATE character_death_state SET corpse_mode=0 WHERE character_id=?", req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "退出尸修状态更新失败"})
		return
	}
	if _, err := tx.Exec("UPDATE character_base SET race=1 WHERE character_id=?", req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "恢复种族失败"})
		return
	}

	// 属性不回退（神仍为0），只重算衍生值并把气血补满（与鬼修 HandleGhostExit 同风格）
	if _, err := character.RecalcAndSaveDerived(tx, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "退出尸修后重算衍生属性失败"})
		return
	}
	if _, err := tx.Exec("UPDATE character_attributes SET hp_current=hp_max WHERE character_id=?", req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "补满气血失败"})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "已退出尸修，恢复为正常修炼状态（神仍为0，不可逆）"})
}

// ═══════════════════════════════════════════
//  POST /death/thunder/check  天雷懒结算
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "is_login":false}
//   is_login=true 表示"本次登录后的首次检查"（技术方案5.2：每次登录必轰1次），
//   此时只要是公敌就立即触发，无视 next_thunder_at 是否到期。
// 结算流程（懒结算，无定时器）：
//   1. 公敌校验：public_enemy_state 无记录 → 不是公敌，直接返回
//   2. 到期判定：is_login 或 next_thunder_at≤NOW() 才触发；未到期返回剩余秒数
//   3. 伤害计算：CalcThunderDamage（同级5修裸装全力一击，公式见上方）
//   4. 扣盾扣血：复用 character.ApplyDamage（先扣盾后扣血，跨服务口径一致）
//   5. 写 thunder_log + thunder_count+1 + next_thunder_at=NOW()+2小时
//   6. 天雷也算进入战斗：刷新 last_combat_time（护盾懒结算锚点）
func (s *Service) HandleThunderCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		IsLogin     bool  `json:"is_login"` // true=登录后首次检查（登录必轰1次）
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必填"})
		return
	}

	// 归属校验（评审修复）：天雷结算会扣血甚至致死，只能对自己的角色触发检查；
	// is_login=true 的登录场景同样必须校验（登录网关转发时也带 X-Account-ID 头）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 事务：到期判定 → 扣血 → 更新下次时间 必须原子（防并发重复轰两雷）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 锁序注释：先锁 public_enemy_state 行（触发资格），再锁 character_attributes 行（扣血）
	var thunderCount int
	var nextThunder sql.NullTime
	err = tx.QueryRow(
		"SELECT thunder_count, next_thunder_at FROM public_enemy_state WHERE character_id=? FOR UPDATE",
		req.CharacterID,
	).Scan(&thunderCount, &nextThunder)
	if err == sql.ErrNoRows {
		writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]interface{}{
			"is_public_enemy": false,
			"triggered":       false,
		}})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询公敌状态失败"})
		return
	}

	now := time.Now()
	due := req.IsLogin || (nextThunder.Valid && !now.Before(nextThunder.Time))
	if !due {
		// 未到期：只报剩余时间，不结算（这就是懒结算——没人来问就什么都不发生）
		remaining := 0
		if nextThunder.Valid {
			remaining = int(time.Until(nextThunder.Time).Seconds())
		} else {
			// 老数据无下次时间：现在补一个锚点，从本次查询起算2小时
			tx.Exec("UPDATE public_enemy_state SET next_thunder_at=? WHERE character_id=?",
				now.Add(ThunderInterval), req.CharacterID)
			tx.Commit()
			remaining = int(ThunderInterval.Seconds())
		}
		writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]interface{}{
			"is_public_enemy":   true,
			"triggered":         false,
			"remaining_seconds": remaining,
			"thunder_count":     thunderCount,
		}})
		return
	}

	// ── 到期触发：计算天雷伤害 ──
	// 评审修复：境界查询的 Scan 错误不再忽略——境界行缺失时若静默按零值算，
	// RealmIndex(0,0) 会把公敌按人阶轻轻放过，天雷形同虚设，必须显式报错。
	var majorStage, subRealm int
	if err := tx.QueryRow("SELECT major_stage, sub_realm FROM character_realm WHERE character_id=?", req.CharacterID).
		Scan(&majorStage, &subRealm); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "角色境界信息缺失，无法结算天雷"})
		return
	}
	realmIdx := character.RealmIndex(majorStage, subRealm)
	damage := CalcThunderDamage(realmIdx)
	element := rand.Intn(3) + 1 // 天雷附带属性随机：1精 2气 3神（技术方案5.2）

	// 锁定被轰者的护盾/HP行，复用 character.ApplyDamage 先扣盾后扣血
	var hpCur int
	var shieldCur int64
	err = tx.QueryRow(
		"SELECT hp_current, shield_current FROM character_attributes WHERE character_id=? FOR UPDATE",
		req.CharacterID,
	).Scan(&hpCur, &shieldCur)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色属性不存在"})
		return
	}
	shieldAfter, hpAfter, shieldAbsorbed, hpDamage, shieldBroken :=
		character.ApplyDamage(shieldCur, int64(hpCur), damage)
	isFatal := hpAfter <= 0

	// 落库：护盾/HP + 天雷也算进入战斗（刷新护盾懒结算锚点 last_combat_time）
	if _, err := tx.Exec(
		"UPDATE character_attributes SET shield_current=?, hp_current=?, last_combat_time=? WHERE character_id=?",
		shieldAfter, hpAfter, now, req.CharacterID,
	); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "天雷伤害落库失败"})
		return
	}

	// 致死：进入死亡流程（death_type=5 天雷诛杀），后续走死亡三选一
	if isFatal {
		tx.Exec("UPDATE character_death_state SET is_dead=1, death_type=5 WHERE character_id=?", req.CharacterID)
	}

	// 写天雷日志 + 推进下次触发时间（公敌状态永久，只能轮回解除——轮回时清 public_enemy_state）
	nextAt := now.Add(ThunderInterval)
	tx.Exec(
		`INSERT INTO thunder_log (character_id, damage, element, shield_absorbed, hp_damage, is_fatal)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		req.CharacterID, damage, element, shieldAbsorbed, hpDamage, boolToInt(isFatal),
	)
	tx.Exec(
		"UPDATE public_enemy_state SET thunder_count=thunder_count+1, next_thunder_at=? WHERE character_id=?",
		nextAt, req.CharacterID,
	)

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	elementNames := map[int]string{1: "精", 2: "气", 3: "神"}
	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "天雷降下！" + elementNames[element] + "属性神雷贯体",
		Data: map[string]interface{}{
			"is_public_enemy": true,
			"triggered":       true,
			"damage":          damage,          // 天雷总伤害（同级5修裸装全力一击）
			"element":         element,         // 随机属性：1精 2气 3神
			"shield_absorbed": shieldAbsorbed,  // 护盾吸收量
			"hp_damage":       hpDamage,        // 打到本体的伤害
			"shield_broken":   shieldBroken,    // 是否破盾
			"is_fatal":        isFatal,         // 是否致死（致死则进入死亡三选一）
			"hp_current":      hpAfter,         // 剩余HP
			"shield_current":  shieldAfter,     // 剩余护盾
			"thunder_count":   thunderCount + 1,
			"next_thunder_at": nextAt.Format("2006-01-02 15:04:05"),
		},
	})
}
