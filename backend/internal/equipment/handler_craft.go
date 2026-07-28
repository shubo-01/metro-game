// handler_craft.go 装备系统 HTTP 接口（掉落/打造/道宝合成/碎片合成/神位继承/交易/背包容量）
// 全部接口服务端权威判定，统一 APIResponse 响应格式（Code=0 成功）
package equipment

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"
)

// ═══════════════════════════════════════════
//  掉落接口（PRD 第十一章）
// ═══════════════════════════════════════════

// dropRollRequest 掉落判定请求体（击杀怪物后由野怪/副本服务或客户端上报调用）
type dropRollRequest struct {
	PlayerID    int64 `json:"player_id"`
	MonsterType int   `json:"monster_type"` // 1普通 2精英 3Boss 4妖 5神兽
}

// HandleDropRoll 击杀怪物装备掉落判定
// POST /equipment/drop/roll {"player_id":1, "monster_type":3}
func (s *Service) HandleDropRoll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req dropRollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.MonsterType < 1 || req.MonsterType > 5 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "非法怪物类型（1-5）"})
		return
	}
	result, err := s.RollDrop(req.PlayerID, req.MonsterType)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "掉落判定失败: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: result})
}

// ═══════════════════════════════════════════
//  打造系统（PRD 第十章）
// ═══════════════════════════════════════════

// craftRequest 打造请求体
// 材料/金币扣除由背包物品系统承接（图纸 materials JSON 已定义消耗），
// 本服务专注品级校验、成功率判定与产出（失败材料照扣，PRD 10.2）
type craftRequest struct {
	PlayerID    int64   `json:"player_id"`
	RecipeID    int     `json:"recipe_id"`
	MaterialIDs []int64 `json:"material_ids,omitempty"`
}

// HandleCraftDo 执行打造
// POST /craft/do {"player_id":1, "recipe_id":2}
//
// 流程:
//  1. 读取图纸（品质/所需打造品级）
//  2. 校验玩家打造品级 ≥ 图纸要求，且品级×品质在成功率矩阵内
//  3. 成功率 = 矩阵基础值 + 0.10×气运点数，上限100%
//  4. 成功：生成装备（等级随机1~10）+ 累计成功计数 + 检查品级升级（次数+NPC认证双条件）
//  5. 失败：材料照扣（由背包系统扣除），无产出
func (s *Service) HandleCraftDo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req craftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.RecipeID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 读取图纸
	var recipeQuality, recipeSlot, requiredLevel int
	err := s.db.QueryRow(`SELECT quality, slot_type, required_craft_level FROM craft_recipe WHERE recipe_id = ?`,
		req.RecipeID).Scan(&recipeQuality, &recipeSlot, &requiredLevel)
	if err != nil {
		writeJSON(w, http.StatusOK, APIResponse{Code: 2001, Msg: "图纸不存在"})
		return
	}

	// 读取玩家打造品级（无记录则初始化学徒）
	craftLevel := s.getOrInitCraftLevel(req.PlayerID)
	if craftLevel < requiredLevel {
		writeJSON(w, http.StatusOK, APIResponse{Code: 2002, Msg: "打造品级不足，无法使用该图纸"})
		return
	}

	// 品级×品质成功率矩阵校验 + 气运加成
	qiYun := s.getPlayerQiYun(req.PlayerID)
	rate, can := CalcCraftRate(craftLevel, recipeQuality, qiYun)
	if !can {
		writeJSON(w, http.StatusOK, APIResponse{Code: 2003, Msg: "当前打造品级无法打造该品质装备"})
		return
	}

	// 掷骰判定（失败材料照扣，PRD 10.2）
	if rand.Float64() > rate {
		writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "打造失败，材料已消耗", Data: map[string]interface{}{
			"success": false, "success_rate": rate, "craft_level": craftLevel,
		}})
		return
	}

	// 打造成功：产出装备（图纸槽位0=随机槽位，等级随机1~10）
	eq, err := s.GenerateEquipment(req.PlayerID, recipeQuality, recipeSlot, 0, "craft")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "装备生成失败: " + err.Error()})
		return
	}

	// 累计成功计数 + 检查品级升级
	s.incrCraftSuccess(req.PlayerID, recipeQuality)
	newLevel, upgraded := s.tryCraftLevelUp(req.PlayerID)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "打造成功", Data: map[string]interface{}{
		"success":        true,
		"success_rate":   rate,
		"equipment":      eq,
		"craft_level":    newLevel,
		"level_upgraded": upgraded,
	}})
}

// getOrInitCraftLevel 读取玩家打造品级，无记录则初始化为学徒(1)
func (s *Service) getOrInitCraftLevel(playerID int64) int {
	var level int
	err := s.db.QueryRow(`SELECT level FROM craft_level WHERE player_id = ?`, playerID).Scan(&level)
	if err != nil {
		_, _ = s.db.Exec(`INSERT IGNORE INTO craft_level (player_id, level) VALUES (?, 1)`, playerID)
		return CraftApprentice
	}
	return level
}

// incrCraftSuccess 打造成功后累计对应品质的成功计数（品级升级考核依据）
func (s *Service) incrCraftSuccess(playerID int64, quality int) {
	var column string
	switch quality {
	case QualityFan:
		column = "success_count_fan"
	case QualityZhen:
		column = "success_count_zhen"
	case QualityLing:
		column = "success_count_ling"
	case QualityXian:
		column = "success_count_xian"
	default:
		return
	}
	// 列名来自内部白名单 switch，无注入风险
	_, _ = s.db.Exec(`UPDATE craft_level SET `+column+` = `+column+` + 1 WHERE player_id = ?`, playerID)
}

// tryCraftLevelUp 检查并执行打造品级升级（次数积累 + NPC拜师认证双条件，PRD 10.1）
// 升级成功后清除认证标记（下一级需重新拜师认证）
// 返回 (当前品级, 本次是否升级)
func (s *Service) tryCraftLevelUp(playerID int64) (int, bool) {
	var level, fan, zhen, ling, xian, certified int
	err := s.db.QueryRow(`SELECT level, success_count_fan, success_count_zhen, success_count_ling,
		success_count_xian, npc_certified FROM craft_level WHERE player_id = ?`, playerID).
		Scan(&level, &fan, &zhen, &ling, &xian, &certified)
	if err != nil || level >= CraftGrand {
		return level, false
	}

	// 找到当前品级对应的升级规则
	counts := map[string]int{
		"success_count_fan":  fan,
		"success_count_zhen": zhen,
		"success_count_ling": ling,
		"success_count_xian": xian,
	}
	for _, rule := range craftUpgradeRules {
		if rule.fromLevel != level {
			continue
		}
		// 双条件：次数达标 + NPC拜师认证
		if counts[rule.field] >= rule.need && certified == 1 {
			_, _ = s.db.Exec(`UPDATE craft_level SET level = level + 1, npc_certified = 0 WHERE player_id = ?`, playerID)
			return level + 1, true
		}
		break
	}
	return level, false
}

// HandleCraftLevel 查询玩家打造品级信息
// GET /craft/level?player_id=1
//
// daobao_unlocked：宗师+成功打造仙宝≥1000 解锁道宝合成（PRD 10.1/10.3）
func (s *Service) HandleCraftLevel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}
	level := s.getOrInitCraftLevel(playerID)
	var fan, zhen, ling, xian, certified int
	_ = s.db.QueryRow(`SELECT success_count_fan, success_count_zhen, success_count_ling,
		success_count_xian, npc_certified FROM craft_level WHERE player_id = ?`, playerID).
		Scan(&fan, &zhen, &ling, &xian, &certified)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"craft_level":        level,
		"success_count_fan":  fan,
		"success_count_zhen": zhen,
		"success_count_ling": ling,
		"success_count_xian": xian,
		"npc_certified":      certified == 1,
		"daobao_unlocked":    level >= CraftGrand && xian >= GrandMasterXianCount,
	}})
}

// ═══════════════════════════════════════════
//  道宝合成（PRD 10.3）
// ═══════════════════════════════════════════

// daobaoRequest 道宝合成请求体：指定10件仙宝装备作为材料
type daobaoRequest struct {
	PlayerID     int64   `json:"player_id"`
	EquipmentIDs []int64 `json:"equipment_ids"` // 必须恰好10件本人未穿戴的仙宝
}

// HandleDaobaoCombine 道宝合成（宗师满级专属）
// POST /craft/daobao {"player_id":1, "equipment_ids":[...10件仙宝...]}
//
// 前置条件：打造品级=宗师 且 成功打造仙宝≥1000（满级）
// 成功率 = 50% + 0.10×气运点数，上限100%
// 成功：消耗10件仙宝，产出1件道宝（随机槽位/随机等级）
// 失败：随机5件粉碎（status=1），另5件破损（耐久置1）
func (s *Service) HandleDaobaoCombine(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req daobaoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if len(req.EquipmentIDs) != DaobaoXianCost {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "道宝合成需恰好10件仙宝装备"})
		return
	}

	// 前置条件校验：宗师满级
	var level, xian int
	err := s.db.QueryRow(`SELECT level, success_count_xian FROM craft_level WHERE player_id = ?`,
		req.PlayerID).Scan(&level, &xian)
	if err != nil || level < CraftGrand || xian < GrandMasterXianCount {
		writeJSON(w, http.StatusOK, APIResponse{Code: 2004, Msg: "道宝合成未解锁（需宗师品级且成功打造仙宝满1000件）"})
		return
	}

	// 校验10件材料：全部为本人、仙宝品质、未穿戴、未碎裂、无重复
	seen := make(map[int64]bool)
	for _, id := range req.EquipmentIDs {
		if seen[id] {
			writeJSON(w, http.StatusOK, APIResponse{Code: 2005, Msg: "材料装备ID重复"})
			return
		}
		seen[id] = true
		eq, ok := s.loadEquipment(id)
		if !ok || eq.OwnerID != req.PlayerID {
			writeJSON(w, http.StatusOK, APIResponse{Code: 2005, Msg: "材料装备不存在或不属于该玩家"})
			return
		}
		if eq.Quality != QualityXian {
			writeJSON(w, http.StatusOK, APIResponse{Code: 2006, Msg: "材料必须全部为仙宝品质"})
			return
		}
		if eq.IsEquipped {
			writeJSON(w, http.StatusOK, APIResponse{Code: 2007, Msg: "穿戴中的装备不能作为合成材料"})
			return
		}
	}

	// 成功率 = 50% + 气运加成（每1点+10%，上限100%）
	qiYun := s.getPlayerQiYun(req.PlayerID)
	rate := DaobaoBaseRate + 0.10*float64(qiYun)
	if rate > 1.0 {
		rate = 1.0
	}

	if rand.Float64() <= rate {
		// 合成成功：10件仙宝全部消耗（软删除），产出1件道宝
		for _, id := range req.EquipmentIDs {
			_, _ = s.db.Exec(`UPDATE equipment_instance SET status = 1 WHERE equipment_id = ?`, id)
		}
		eq, genErr := s.GenerateEquipment(req.PlayerID, QualityDao, 0, 0, "daobao_combine")
		if genErr != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "道宝生成失败: " + genErr.Error()})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "道宝合成成功", Data: map[string]interface{}{
			"success": true, "success_rate": rate, "equipment": eq,
		}})
		return
	}

	// 合成失败：洗牌后前5件粉碎（status=1），后5件破损（耐久置1）
	shuffled := make([]int64, len(req.EquipmentIDs))
	copy(shuffled, req.EquipmentIDs)
	rand.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })

	shatteredIDs := shuffled[:DaobaoShatterCnt]
	damagedIDs := shuffled[DaobaoShatterCnt : DaobaoShatterCnt+DaobaoDamagedCnt]
	for _, id := range shatteredIDs {
		_, _ = s.db.Exec(`UPDATE equipment_instance SET status = 1 WHERE equipment_id = ?`, id)
	}
	for _, id := range damagedIDs {
		_, _ = s.db.Exec(`UPDATE equipment_instance SET durability = 1 WHERE equipment_id = ?`, id)
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "道宝合成失败", Data: map[string]interface{}{
		"success": false, "success_rate": rate,
		"shattered_ids": shatteredIDs, "damaged_ids": damagedIDs,
	}})
}

// ═══════════════════════════════════════════
//  神话碎片合成（PRD 12.1）
// ═══════════════════════════════════════════

// shardCombineRequest 碎片合成请求体
type shardCombineRequest struct {
	PlayerID int64 `json:"player_id"`
}

// HandleShardCombine 神话碎片合成完整神话（3片合1）
// POST /shard/combine {"player_id":1}
//
// 合成产出：随机槽位、随机等级1~10的完整神话装备，附加属性合成时才生成（PRD 7.1）
func (s *Service) HandleShardCombine(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req shardCombineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 原子扣减3片（count>=3 条件更新，防并发超扣）
	res, err := s.db.Exec(`UPDATE myth_shard SET count = count - ? WHERE owner_id = ? AND count >= ?`,
		ShardCombineCount, req.PlayerID, ShardCombineCount)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "碎片扣减失败: " + err.Error()})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 3001, Msg: "神话碎片不足（3片可合成1件完整神话）"})
		return
	}

	// 生成完整神话装备（随机槽位/随机等级，附加属性此时生成）
	eq, err := s.GenerateEquipment(req.PlayerID, QualityMyth, 0, 0, "shard_combine")
	if err != nil {
		// 生成失败回滚碎片
		_, _ = s.db.Exec(`UPDATE myth_shard SET count = count + ? WHERE owner_id = ?`,
			ShardCombineCount, req.PlayerID)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "神话生成失败: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "合成成功", Data: map[string]interface{}{
		"equipment":  eq,
		"shard_left": s.getShardCount(req.PlayerID),
	}})
}

// ═══════════════════════════════════════════
//  神位继承（PRD 12.2 + 技术方案 10.2）
// ═══════════════════════════════════════════

// inheritActivateRequest 神位继承激活请求体
type inheritActivateRequest struct {
	PlayerID int64 `json:"player_id"`
	SkillID  int   `json:"skill_id"` // 要继承激活的神话技能ID
}

// HandleInheritActivate 激活神位继承
// POST /inherit/activate {"player_id":1, "skill_id":101}
//
// 规则：拥有神话碎片即获得继承资格；继承绑定人物不可交易转移；
// 技能激活由技能系统承接，本服务记录继承状态与技能清单
func (s *Service) HandleInheritActivate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req inheritActivateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.SkillID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 资格校验：拥有碎片即获得神位继承资格（PRD 12.2）
	var shardID int64
	var count int
	var skillsJSON string
	err := s.db.QueryRow(`SELECT shard_id, count, inherited_skills FROM myth_shard WHERE owner_id = ?`,
		req.PlayerID).Scan(&shardID, &count, &skillsJSON)
	if err != nil || count <= 0 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 3002, Msg: "未持有神话碎片，无神位继承资格"})
		return
	}

	// 技能清单去重追加
	var skills []int
	_ = json.Unmarshal([]byte(skillsJSON), &skills)
	for _, sk := range skills {
		if sk == req.SkillID {
			writeJSON(w, http.StatusOK, APIResponse{Code: 3003, Msg: "该技能已继承"})
			return
		}
	}
	skills = append(skills, req.SkillID)
	newSkillsJSON, _ := json.Marshal(skills)

	_, _ = s.db.Exec(`UPDATE myth_shard SET is_inherited = 1, inherited_skills = ? WHERE owner_id = ?`,
		string(newSkillsJSON), req.PlayerID)
	_, _ = s.db.Exec(`INSERT INTO inherit_record (player_id, shard_id, skill_id, is_active) VALUES (?, ?, ?, 1)`,
		req.PlayerID, shardID, req.SkillID)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "神位继承激活成功", Data: map[string]interface{}{
		"skill_id":         req.SkillID,
		"inherited_skills": skills,
	}})
}

// duelLostRequest 大道争锋失败结算请求体（由PVP系统回调）
type duelLostRequest struct {
	LoserID  int64 `json:"loser_id"`
	WinnerID int64 `json:"winner_id"`
}

// HandleInheritDuelLost 大道争锋失败结算：碎片转移给胜者 + 技能灰化
// POST /inherit/duel-lost {"loser_id":1, "winner_id":2}
//
// 神话碎片仅通过大道争锋PVP转移（PRD 12.2 + 技术方案 10.2 OnDuelLost）
func (s *Service) HandleInheritDuelLost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req duelLostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.LoserID <= 0 || req.WinnerID <= 0 || req.LoserID == req.WinnerID {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 读取败者碎片
	var count int
	err := s.db.QueryRow(`SELECT count FROM myth_shard WHERE owner_id = ?`, req.LoserID).Scan(&count)
	if err != nil || count <= 0 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 3004, Msg: "败者无神话碎片，无需结算"})
		return
	}

	// 碎片全部转移给胜者（UPSERT累加），败者清零并解除继承
	_, _ = s.db.Exec(`INSERT INTO myth_shard (owner_id, count) VALUES (?, ?)
		ON DUPLICATE KEY UPDATE count = count + VALUES(count)`, req.WinnerID, count)
	_, _ = s.db.Exec(`UPDATE myth_shard SET count = 0, is_inherited = 0, inherited_skills = '[]'
		WHERE owner_id = ?`, req.LoserID)

	// 败者已继承技能全部灰化（is_active=0，记录被夺时间）
	_, _ = s.db.Exec(`UPDATE inherit_record SET is_active = 0, lost_at = ? WHERE player_id = ? AND is_active = 1`,
		time.Now(), req.LoserID)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "大道争锋结算完成", Data: map[string]interface{}{
		"transferred_shards": count,
		"winner_shard_total": s.getShardCount(req.WinnerID),
	}})
}

// ═══════════════════════════════════════════
//  交易系统（PRD 第十六章 + 技术方案第十二章）
// ═══════════════════════════════════════════

// tradeCreateRequest 挂单请求体
type tradeCreateRequest struct {
	PlayerID    int64 `json:"player_id"` // 卖家
	EquipmentID int64 `json:"equipment_id"`
	Price       int64 `json:"price"`
}

// HandleTradeCreate 创建交易挂单
// POST /trade/create {"player_id":1, "equipment_id":100, "price":5000}
//
// 装备完全自由交易不绑定，所有品质均可交易（PRD 第十六章）
func (s *Service) HandleTradeCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req tradeCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.EquipmentID <= 0 || req.Price <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	eq, ok := s.loadEquipment(req.EquipmentID)
	if !ok || eq.OwnerID != req.PlayerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1001, Msg: "装备不存在或不属于该玩家"})
		return
	}

	// 同一装备不可重复挂单
	var pending int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM trade_order WHERE equipment_id = ? AND status = 'PENDING'`,
		req.EquipmentID).Scan(&pending)
	if pending > 0 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 4001, Msg: "该装备已在挂单中"})
		return
	}

	res, err := s.db.Exec(`INSERT INTO trade_order (seller_id, equipment_id, price, status) VALUES (?, ?, ?, 'PENDING')`,
		req.PlayerID, req.EquipmentID, req.Price)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "挂单失败: " + err.Error()})
		return
	}
	orderID, _ := res.LastInsertId()

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "挂单成功", Data: map[string]interface{}{
		"order_id": orderID, "price": req.Price, "equipment": eq,
	}})
}

// tradeExecuteRequest 成交请求体
type tradeExecuteRequest struct {
	OrderID  int64 `json:"order_id"`
	PlayerID int64 `json:"player_id"` // 买家
}

// HandleTradeExecute 执行交易成交
// POST /trade/execute {"order_id":1, "player_id":2}
//
// 金币扣除/入账由货币系统承接，本服务完成所有权转移与订单状态流转
// 穿戴中的装备成交前自动卸下（技术方案第十二章 ExecuteTrade）
func (s *Service) HandleTradeExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req tradeExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OrderID <= 0 || req.PlayerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 读取订单
	var sellerID, equipmentID, price int64
	var status string
	err := s.db.QueryRow(`SELECT seller_id, equipment_id, price, status FROM trade_order WHERE order_id = ?`,
		req.OrderID).Scan(&sellerID, &equipmentID, &price, &status)
	if err != nil {
		writeJSON(w, http.StatusOK, APIResponse{Code: 4002, Msg: "订单不存在"})
		return
	}
	if status != "PENDING" {
		writeJSON(w, http.StatusOK, APIResponse{Code: 4003, Msg: "订单已成交或已取消"})
		return
	}
	if req.PlayerID == sellerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 4004, Msg: "不能购买自己的挂单"})
		return
	}

	eq, ok := s.loadEquipment(equipmentID)
	if !ok || eq.OwnerID != sellerID {
		// 装备已碎裂或所有权已变化，订单自动作废
		_, _ = s.db.Exec(`UPDATE trade_order SET status = 'CANCELLED' WHERE order_id = ?`, req.OrderID)
		writeJSON(w, http.StatusOK, APIResponse{Code: 4005, Msg: "装备状态异常，订单已取消"})
		return
	}

	// 原子抢占订单（防并发重复成交）
	res, err := s.db.Exec(`UPDATE trade_order SET status = 'COMPLETED', buyer_id = ?
		WHERE order_id = ? AND status = 'PENDING'`, req.PlayerID, req.OrderID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "成交失败: " + err.Error()})
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 4003, Msg: "订单已被抢先成交"})
		return
	}

	// 所有权转移（穿戴中先卸下，卖家套装可能解除）
	_, _ = s.db.Exec(`UPDATE equipment_instance SET owner_id = ?, is_equipped = 0, source = 'trade'
		WHERE equipment_id = ?`, req.PlayerID, equipmentID)
	if eq.IsEquipped && isSetSlot(eq.SlotType) {
		s.refreshSetBonus(sellerID)
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "交易成功", Data: map[string]interface{}{
		"order_id": req.OrderID, "price": price, "equipment_id": equipmentID,
	}})
}

// ═══════════════════════════════════════════
//  背包容量（PRD 第十三章腰带扩展 + 技术方案第十一章）
// ═══════════════════════════════════════════

// HandleInventoryCapacity 查询玩家背包容量（基础20格 + 已穿腰带品质扩展）
// GET /inventory/capacity?player_id=1
//
// 腰带扩展：凡+2 珍+4 灵+6 仙+8 神话+10 道+12 先天+16；快捷栏为扩展格数减半
func (s *Service) HandleInventoryCapacity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}

	// 查询已穿戴的腰带（slot_type=8）
	beltExtra, beltQuick := 0, 0
	var beltQuality int
	err := s.db.QueryRow(`SELECT quality FROM equipment_instance
		WHERE owner_id = ? AND slot_type = ? AND is_equipped = 1 AND status = 0`,
		playerID, SlotBelt).Scan(&beltQuality)
	if err == nil {
		if qc, ok := s.getQualityConfig(beltQuality); ok {
			beltExtra = qc.BeltExtraSlots
			beltQuick = qc.BeltQuickSlots
		}
	}

	// 仓库容量（房产系统预留，当前返回已占用格数）
	var warehouseUsed int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM player_warehouse WHERE player_id = ?`, playerID).Scan(&warehouseUsed)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"base_slots":       BaseInventorySlots,
		"belt_extra_slots": beltExtra,
		"belt_quick_slots": beltQuick,
		"total_slots":      BaseInventorySlots + beltExtra,
		"warehouse_used":   warehouseUsed,
	}})
}
