// handler.go 装备系统 HTTP 接口（穿戴/卸下/加成汇总/升级/耐久/修理/列表）
// 全部接口服务端权威判定，统一 APIResponse 响应格式（Code=0 成功）
package equipment

import (
	"encoding/json"
	"math/rand"
	"net/http"
)

// ═══════════════════════════════════════════
//  查询接口：装备列表 / 已穿戴列表
// ═══════════════════════════════════════════

// HandleList 玩家全部装备列表（含背包+已穿戴，不含已碎裂）
// GET /equipment/list?player_id=1
func (s *Service) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}
	list, err := s.listEquipments(playerID, -1)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"equipments": list,
		"total":      len(list),
	}})
}

// HandleEquipped 玩家已穿戴装备列表
// GET /equipment/equipped?player_id=1
func (s *Service) HandleEquipped(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}
	list, err := s.listEquipments(playerID, 1)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"equipments": list,
		"total":      len(list),
	}})
}

// listEquipments 查询玩家装备列表。equippedFilter: -1=全部 0=仅背包 1=仅已穿戴
func (s *Service) listEquipments(playerID int64, equippedFilter int) ([]*EquipmentInfo, error) {
	query := `SELECT equipment_id, owner_id, quality, slot_type, weapon_type, level,
		durability, base_attr_type, base_attr_share, is_equipped, IFNULL(source,'')
		FROM equipment_instance WHERE owner_id = ? AND status = 0`
	args := []interface{}{playerID}
	if equippedFilter >= 0 {
		query += " AND is_equipped = ?"
		args = append(args, equippedFilter)
	}
	query += " ORDER BY is_equipped DESC, quality DESC, level DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*EquipmentInfo
	for rows.Next() {
		var eq EquipmentInfo
		var isEquipped int
		if err := rows.Scan(&eq.EquipmentID, &eq.OwnerID, &eq.Quality, &eq.SlotType, &eq.WeaponType,
			&eq.Level, &eq.Durability, &eq.BaseAttrType, &eq.BaseAttrShare, &isEquipped, &eq.Source); err != nil {
			continue
		}
		eq.IsEquipped = isEquipped == 1
		if qc, ok := s.getQualityConfig(eq.Quality); ok {
			eq.QualityName = qc.Name
		}
		eq.ExtraAttrs = s.loadExtraAttrs(eq.EquipmentID)
		list = append(list, &eq)
	}
	return list, nil
}

// ═══════════════════════════════════════════
//  穿戴 / 卸下（PRD 第十七章境界校验 + 第六章套装触发）
// ═══════════════════════════════════════════

// equipRequest 穿戴/卸下请求体
type equipRequest struct {
	PlayerID    int64 `json:"player_id"`
	EquipmentID int64 `json:"equipment_id"`
	// SubWeaponLimit 副武器档位上限：1=常规 5=三头六臂 8=特殊人物（PRD 2.1）
	// 档位解锁校验由技能/身份系统负责，本服务按传入上限校验数量，缺省按常规1
	SubWeaponLimit int `json:"sub_weapon_limit,omitempty"`
}

// HandleEquip 穿戴装备
// POST /equipment/equip {"player_id":1, "equipment_id":100, "sub_weapon_limit":1}
//
// 校验链: 所有权 → 未穿戴 → 品质可穿戴（碎片不可） → 境界要求 → 槽位冲突处理
// 甲/首饰槽位变化后触发套装重新判定（换件解除+重穿齐重随机，PRD 6.1）
func (s *Service) HandleEquip(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req equipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.EquipmentID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	eq, ok := s.loadEquipment(req.EquipmentID)
	if !ok {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1001, Msg: "装备不存在或已碎裂"})
		return
	}
	if eq.OwnerID != req.PlayerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1002, Msg: "装备不属于该玩家"})
		return
	}
	if eq.IsEquipped {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1003, Msg: "装备已处于穿戴状态"})
		return
	}
	// 神话碎片不可穿戴，需3片合成完整神话（PRD 12.1）
	if eq.Quality == QualityShard {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1004, Msg: "神话碎片不可穿戴，请先合成完整神话"})
		return
	}

	// 境界校验（PRD 第十七章）：品质→大境界，同大境界需段位≥装备等级
	qc, _ := s.getQualityConfig(eq.Quality)
	majorStage, stageSegment, err := s.getPlayerRealm(req.PlayerID)
	if err != nil {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1005, Msg: "查询角色境界失败"})
		return
	}
	if !CheckRealmRequirement(majorStage, stageSegment, qc.RequiredMajorStage, eq.Level) {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1006,
			Msg: "境界不足，无法穿戴该装备（品质 " + qc.Name + " 需对应大境界且段位≥装备等级）"})
		return
	}

	// 槽位冲突处理
	if eq.SlotType == SlotSubWeapon {
		// 副武器：数量不得超过档位上限（1常规/5三头六臂/8特殊，PRD 2.1）
		limit := req.SubWeaponLimit
		if limit <= 0 {
			limit = 1
		}
		if limit > 8 {
			limit = 8
		}
		var subCount int
		_ = s.db.QueryRow(`SELECT COUNT(*) FROM equipment_instance
			WHERE owner_id = ? AND slot_type = ? AND is_equipped = 1 AND status = 0`,
			req.PlayerID, SlotSubWeapon).Scan(&subCount)
		if subCount >= limit {
			writeJSON(w, http.StatusOK, APIResponse{Code: 1007, Msg: "副武器数量已达档位上限"})
			return
		}
	} else {
		// 其他槽位唯一：同槽位已穿的自动卸下
		_, _ = s.db.Exec(`UPDATE equipment_instance SET is_equipped = 0
			WHERE owner_id = ? AND slot_type = ? AND is_equipped = 1 AND status = 0`,
			req.PlayerID, eq.SlotType)
	}

	if _, err := s.db.Exec(`UPDATE equipment_instance SET is_equipped = 1 WHERE equipment_id = ?`, req.EquipmentID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "穿戴失败: " + err.Error()})
		return
	}

	// 甲/首饰槽位变化触发套装重新判定（武器不参与套装，PRD 6.1）
	var setInfo *SetBonusInfo
	if isSetSlot(eq.SlotType) {
		setInfo = s.refreshSetBonus(req.PlayerID)
	} else {
		setInfo = s.getActiveSetBonus(req.PlayerID)
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "穿戴成功", Data: map[string]interface{}{
		"equipment": eq,
		"set_bonus": setInfo,
	}})
}

// HandleUnequip 卸下装备
// POST /equipment/unequip {"player_id":1, "equipment_id":100}
func (s *Service) HandleUnequip(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req equipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.EquipmentID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	eq, ok := s.loadEquipment(req.EquipmentID)
	if !ok || eq.OwnerID != req.PlayerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1001, Msg: "装备不存在或不属于该玩家"})
		return
	}
	if !eq.IsEquipped {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1003, Msg: "装备未处于穿戴状态"})
		return
	}

	if _, err := s.db.Exec(`UPDATE equipment_instance SET is_equipped = 0 WHERE equipment_id = ?`, req.EquipmentID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "卸下失败: " + err.Error()})
		return
	}

	// 甲/首饰卸下必然破坏套装完整性，解除套装效果（PRD 6.1）
	var setInfo *SetBonusInfo
	if isSetSlot(eq.SlotType) {
		setInfo = s.refreshSetBonus(req.PlayerID)
	} else {
		setInfo = s.getActiveSetBonus(req.PlayerID)
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "卸下成功", Data: map[string]interface{}{
		"equipment": eq,
		"set_bonus": setInfo,
	}})
}

// ═══════════════════════════════════════════
//  套装系统（PRD 第六章）
// ═══════════════════════════════════════════

// SetBonusInfo 套装效果信息
type SetBonusInfo struct {
	IsActive   bool    `json:"is_active"`   // 套装是否生效
	Quality    int     `json:"quality"`     // 套装品质
	FloatValue float64 `json:"float_value"` // 锁定的浮动值 0~0.8
	FloatAttr  int     `json:"float_attr"`  // 浮动加成分配的属性：1精 2神 3气
	Bonus      float64 `json:"bonus"`       // 浮动加成数值 = 品质倍率×1×浮动值
}

// isSetSlot 判断槽位是否参与套装判定（8甲+4首饰，武器不参与）
func isSetSlot(slotType int) bool {
	return (slotType >= SlotHead && slotType <= SlotBelt) ||
		(slotType >= SlotBracelet && slotType <= SlotNecklace)
}

// refreshSetBonus 甲/首饰槽位变化后的套装重新判定（PRD 6.1）
// 规则：换任意一件即解除旧套装；重新穿齐（8甲+4首饰全同品质）则重新随机浮动值并锁定
func (s *Service) refreshSetBonus(playerID int64) *SetBonusInfo {
	// 第一步：解除现有套装效果（换件即解除）
	_, _ = s.db.Exec(`UPDATE set_bonus SET is_active = 0 WHERE player_id = ? AND is_active = 1`, playerID)

	// 第二步：检查当前是否重新满足套装条件
	rows, err := s.db.Query(`SELECT slot_type, quality FROM equipment_instance
		WHERE owner_id = ? AND is_equipped = 1 AND status = 0`, playerID)
	if err != nil {
		return &SetBonusInfo{IsActive: false}
	}
	defer rows.Close()

	slotQuality := make(map[int]int) // 槽位→品质
	for rows.Next() {
		var slot, quality int
		if err := rows.Scan(&slot, &quality); err == nil {
			slotQuality[slot] = quality
		}
	}

	// 12个套装槽位必须全部穿戴且品质一致
	setSlots := []int{SlotHead, SlotFace, SlotBody, SlotCrotch, SlotLeg, SlotFoot, SlotArm, SlotBelt,
		SlotBracelet, SlotRing, SlotEarring, SlotNecklace}
	setQuality := -1
	for _, slot := range setSlots {
		q, exists := slotQuality[slot]
		if !exists {
			return &SetBonusInfo{IsActive: false} // 有槽位空缺
		}
		if setQuality == -1 {
			setQuality = q
		} else if q != setQuality {
			return &SetBonusInfo{IsActive: false} // 品质不一致
		}
	}

	// 第三步：穿齐那一刻随机生成0~80%浮动值并锁定，随机分配到精/神/气之一
	floatValue := rand.Float64() * 0.8
	floatAttr := 1 + rand.Intn(3)
	_, _ = s.db.Exec(`INSERT INTO set_bonus (player_id, quality, float_value, float_attr, is_active)
		VALUES (?, ?, ?, ?, 1)`, playerID, setQuality, floatValue, floatAttr)

	qc, _ := s.getQualityConfig(setQuality)
	return &SetBonusInfo{
		IsActive:   true,
		Quality:    setQuality,
		FloatValue: floatValue,
		FloatAttr:  floatAttr,
		Bonus:      qc.Multiplier * 1.0 * floatValue, // 套装浮动加成 = 品质倍率×1×浮动值
	}
}

// getActiveSetBonus 查询玩家当前生效的套装效果（无变化场景查询用）
func (s *Service) getActiveSetBonus(playerID int64) *SetBonusInfo {
	var info SetBonusInfo
	err := s.db.QueryRow(`SELECT quality, float_value, float_attr FROM set_bonus
		WHERE player_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`, playerID).
		Scan(&info.Quality, &info.FloatValue, &info.FloatAttr)
	if err != nil {
		return &SetBonusInfo{IsActive: false}
	}
	info.IsActive = true
	if qc, ok := s.getQualityConfig(info.Quality); ok {
		info.Bonus = qc.Multiplier * 1.0 * info.FloatValue
	}
	return &info
}

// ═══════════════════════════════════════════
//  加成汇总（PRD 第四/五/六/七章 CalcTotalBonus）
// ═══════════════════════════════════════════

// HandleBonus 汇总玩家已穿戴装备的全部加成（供人物系统/战斗系统调用）
// GET /equipment/bonus?player_id=1
//
// 计算口径:
//   - 甲/首饰：单件加成 = 品质倍率 × base_attr_share × 等级系数，按精/神分别累加
//   - 武器：单件加成 = 品质倍率 × WeaponShare(副武器数) × 等级系数，累加到气
//   - 附加属性：数值 × 等级系数，按属性类型汇总
//   - 套装：浮动加成 = 品质倍率×1×锁定浮动值，加到锁定属性上
func (s *Service) HandleBonus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}

	equipped, err := s.listEquipments(playerID, 1)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}

	// 统计副武器数量（武器份额动态插值需要）
	subCount := 0
	for _, eq := range equipped {
		if eq.SlotType == SlotSubWeapon {
			subCount++
		}
	}
	weaponShare := WeaponShare(subCount)

	var jingBonus, shenBonus, qiBonus float64
	extraTotal := make(map[int]float64) // attr_type → 汇总值
	extraNames := make(map[int]string)  // attr_type → 属性名
	extraCategory := make(map[int]int)  // attr_type → 属性大类

	for _, eq := range equipped {
		qc, ok := s.getQualityConfig(eq.Quality)
		if !ok {
			continue
		}
		// 基础加成：武器用动态份额，甲/首饰用落库份额
		share := eq.BaseAttrShare
		if eq.SlotType == SlotMainWeapon || eq.SlotType == SlotSubWeapon {
			share = weaponShare
		}
		bonus := CalcBaseBonus(qc.Multiplier, share, eq.Level)
		switch eq.BaseAttrType {
		case AttrJing:
			jingBonus += bonus
		case AttrShen:
			shenBonus += bonus
		case AttrQi:
			qiBonus += bonus
		}
		// 附加属性随装备等级同步提升（PRD 7.5 说明）
		factor := LevelFactor(eq.Level)
		for _, a := range eq.ExtraAttrs {
			extraTotal[a.AttrType] += a.Value * factor
			extraNames[a.AttrType] = a.AttrName
			extraCategory[a.AttrType] = a.Category
		}
	}

	// 套装浮动加成（PRD 6.2）
	setInfo := s.getActiveSetBonus(playerID)
	if setInfo.IsActive {
		switch setInfo.FloatAttr {
		case AttrJing:
			jingBonus += setInfo.Bonus
		case AttrShen:
			shenBonus += setInfo.Bonus
		case AttrQi:
			qiBonus += setInfo.Bonus
		}
	}

	// 附加属性汇总列表
	type extraSummary struct {
		AttrType int     `json:"attr_type"`
		AttrName string  `json:"attr_name"`
		Category int     `json:"category"`
		Total    float64 `json:"total"`
	}
	extras := make([]extraSummary, 0, len(extraTotal))
	for t, v := range extraTotal {
		extras = append(extras, extraSummary{AttrType: t, AttrName: extraNames[t], Category: extraCategory[t], Total: v})
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"jing_bonus":       jingBonus,
		"shen_bonus":       shenBonus,
		"qi_bonus":         qiBonus,
		"sub_weapon_count": subCount,
		"weapon_share":     weaponShare,
		"extra_attrs":      extras,
		"set_bonus":        setInfo,
	}})
}

// ═══════════════════════════════════════════
//  装备升级（PRD 5.2 + 技术方案第九章）
// ═══════════════════════════════════════════

// upgradeRequest 升级请求体
// 说明：升级消耗同品质材料+金币（PRD 5.2），材料/货币扣除由背包物品系统承接，
// 本服务专注升级判定与结果落库，material_ids 预留透传
type upgradeRequest struct {
	PlayerID    int64   `json:"player_id"`
	EquipmentID int64   `json:"equipment_id"`
	MaterialIDs []int64 `json:"material_ids,omitempty"`
}

// HandleUpgrade 装备升级
// POST /equipment/upgrade {"player_id":1, "equipment_id":100}
//
// 成功率 = 基础成功率(升级表) + 0.10×气运点数，上限100%
// 失败惩罚（按当前等级分段）：2-4级降1级；5-6级50%降级/50%碎裂；7-9级碎裂
// 不可跳级，10级封顶
func (s *Service) HandleUpgrade(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req upgradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.EquipmentID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	eq, ok := s.loadEquipment(req.EquipmentID)
	if !ok || eq.OwnerID != req.PlayerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1001, Msg: "装备不存在或不属于该玩家"})
		return
	}
	if eq.Quality == QualityShard {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1004, Msg: "神话碎片不可升级"})
		return
	}
	if eq.Level >= 10 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1008, Msg: "装备已满级（10级）"})
		return
	}

	qiYun := s.getPlayerQiYun(req.PlayerID)
	rate := CalcUpgradeRate(eq.Level, qiYun)

	// 掷骰判定（服务端随机，客户端不可预测）
	if rand.Float64() <= rate {
		newLevel := eq.Level + 1
		_, _ = s.db.Exec(`UPDATE equipment_instance SET level = ? WHERE equipment_id = ?`, newLevel, req.EquipmentID)
		writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "升级成功", Data: map[string]interface{}{
			"success": true, "result_level": newLevel, "is_broken": false, "success_rate": rate,
		}})
		return
	}

	// 失败惩罚分段处理
	failType := upgradeFailures[eq.Level]
	resultLevel := eq.Level
	isBroken := false
	switch failType {
	case FailDowngrade:
		if resultLevel > 1 {
			resultLevel--
		}
	case FailHalfHalf:
		if rand.Float64() < 0.5 {
			if resultLevel > 1 {
				resultLevel--
			}
		} else {
			isBroken = true
		}
	case FailDestroy:
		isBroken = true
	}

	if isBroken {
		// 碎裂：软删除 + 卸下，甲/首饰碎裂后套装解除
		_, _ = s.db.Exec(`UPDATE equipment_instance SET status = 1, is_equipped = 0 WHERE equipment_id = ?`, req.EquipmentID)
		if eq.IsEquipped && isSetSlot(eq.SlotType) {
			s.refreshSetBonus(req.PlayerID)
		}
	} else if resultLevel != eq.Level {
		_, _ = s.db.Exec(`UPDATE equipment_instance SET level = ? WHERE equipment_id = ?`, resultLevel, req.EquipmentID)
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "升级失败", Data: map[string]interface{}{
		"success": false, "result_level": resultLevel, "is_broken": isBroken, "success_rate": rate,
	}})
}

// ═══════════════════════════════════════════
//  耐久与修理（PRD 第九章）
// ═══════════════════════════════════════════

// durabilityRequest 耐久消耗请求体
type durabilityRequest struct {
	PlayerID    int64 `json:"player_id"`
	EquipmentID int64 `json:"equipment_id"`
	Amount      int   `json:"amount,omitempty"` // 消耗点数，缺省1（每次攻击/受击扣1）
}

// HandleDurabilityConsume 耐久消耗（战斗系统每次攻击/受击调用）
// POST /equipment/durability/consume {"player_id":1, "equipment_id":100, "amount":1}
//
// 耐久<10 返回警告标记；归零装备碎裂消失（软删除，无保险机制，PRD 9.1）
func (s *Service) HandleDurabilityConsume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req durabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.EquipmentID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.Amount <= 0 {
		req.Amount = 1
	}

	eq, ok := s.loadEquipment(req.EquipmentID)
	if !ok || eq.OwnerID != req.PlayerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1001, Msg: "装备不存在或不属于该玩家"})
		return
	}

	newDurability := eq.Durability - req.Amount
	isBroken := newDurability <= 0
	if isBroken {
		// 耐久归零：装备碎裂消失（软删除留审计），无保险机制
		_, _ = s.db.Exec(`UPDATE equipment_instance SET durability = 0, status = 1, is_equipped = 0
			WHERE equipment_id = ?`, req.EquipmentID)
		if eq.IsEquipped && isSetSlot(eq.SlotType) {
			s.refreshSetBonus(req.PlayerID)
		}
		newDurability = 0
	} else {
		_, _ = s.db.Exec(`UPDATE equipment_instance SET durability = ? WHERE equipment_id = ?`,
			newDurability, req.EquipmentID)
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"durability": newDurability,
		"is_warning": newDurability > 0 && newDurability < DurabilityWarn, // 低耐久警告（<10）
		"is_broken":  isBroken,
	}})
}

// repairRequest 修理请求体
type repairRequest struct {
	PlayerID    int64 `json:"player_id"`
	EquipmentID int64 `json:"equipment_id"`
}

// HandleRepair 装备修理（耐久恢复至300上限）
// POST /equipment/repair {"player_id":1, "equipment_id":100}
//
// 修理材料按品质对应（铁/精铁/灵矿/仙玉/神石/道晶/先天精粹，PRD 9.2）
// 材料/金币扣除由背包物品系统承接，本服务记录修理日志并恢复耐久
// 金币费用 PRD 未给出具体数值，采用线性规则：(300-当前耐久)×品质倍率
func (s *Service) HandleRepair(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}
	var req repairRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID <= 0 || req.EquipmentID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	eq, ok := s.loadEquipment(req.EquipmentID)
	if !ok || eq.OwnerID != req.PlayerID {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1001, Msg: "装备不存在或不属于该玩家"})
		return
	}
	if eq.Durability >= MaxDurability {
		writeJSON(w, http.StatusOK, APIResponse{Code: 1009, Msg: "耐久已满，无需修理"})
		return
	}

	qc, _ := s.getQualityConfig(eq.Quality)
	goldCost := int(float64(MaxDurability-eq.Durability) * qc.Multiplier)

	// 恢复耐久至上限 + 修理日志留痕（防篡改审计）
	_, err := s.db.Exec(`UPDATE equipment_instance SET durability = ? WHERE equipment_id = ?`,
		MaxDurability, req.EquipmentID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "修理失败: " + err.Error()})
		return
	}
	_, _ = s.db.Exec(`INSERT INTO repair_log (equipment_id, player_id, material_name, gold_cost, durability_before)
		VALUES (?, ?, ?, ?, ?)`, req.EquipmentID, req.PlayerID, qc.RepairMaterial, goldCost, eq.Durability)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "修理成功", Data: map[string]interface{}{
		"durability":        MaxDurability,
		"material_name":     qc.RepairMaterial,
		"gold_cost":         goldCost,
		"durability_before": eq.Durability,
	}})
}
