// handler.go 野怪服务 HTTP 接口层
// 严格按照《寻仙 - 初始之地野怪系统 PRD+技术方案》实现。
//
// 接口清单（对应 proto/monster.proto 消息定义）:
//
//	GET  /monster/territories      领地列表
//	GET  /monster/faction          族群信息（?territory_id=）
//	GET  /monster/list             怪物实体列表（?faction_id=，含懒刷新）
//	GET  /monster/divine/status    全服20只神兽状态
//	POST /monster/coop/calc        协战围攻倍率计算（服务端权威）
//	POST /monster/hit              怪物受击扣血（服务端权威血量）
//	POST /capture/attempt          抓捕妖幼崽/神兽幼崽
//	POST /monster/admin/init_world 世界初始化（幂等管理接口）
package monster

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

// ═══════════════════════════════════════════
//  GET /monster/territories 领地列表
// ═══════════════════════════════════════════

// TerritoryInfo 领地信息（对应 proto TerritoryInfo）
type TerritoryInfo struct {
	TerritoryID int     `json:"territory_id"` // 领地ID（1-100）
	Name        string  `json:"name"`         // 领地名称
	CenterX     float64 `json:"center_x"`     // 领地中心X
	CenterY     float64 `json:"center_y"`     // 领地中心Y
	Radius      float64 `json:"radius"`       // 领地半径
	DangerLevel int     `json:"danger_level"` // 危险等级：2外围~5妖殿
}

// HandleTerritories 查询全部领地
func (s *Service) HandleTerritories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	rows, err := s.db.Query(
		"SELECT territory_id, name, center_x, center_y, radius, danger_level FROM territory ORDER BY territory_id")
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询领地失败: " + err.Error()})
		return
	}
	defer rows.Close()

	list := make([]TerritoryInfo, 0, TerritoryCount)
	for rows.Next() {
		var t TerritoryInfo
		if err := rows.Scan(&t.TerritoryID, &t.Name, &t.CenterX, &t.CenterY, &t.Radius, &t.DangerLevel); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "数据解析失败: " + err.Error()})
			return
		}
		list = append(list, t)
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{"territories": list}})
}

// ═══════════════════════════════════════════
//  GET /monster/faction?territory_id= 族群信息
// ═══════════════════════════════════════════

// HandleFaction 查询某领地的族群信息（含山海经原型描述）
func (s *Service) HandleFaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	territoryID := queryInt(r, "territory_id")
	if territoryID < 1 || territoryID > TerritoryCount {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "territory_id 无效（1-100）"})
		return
	}

	// 族群实例 + 族群名录联查（对应 proto FactionInfo）
	var info struct {
		FactionID      int64  `json:"faction_id"`       // 族群实例ID
		SpeciesID      int    `json:"species_id"`       // 族群编号（1-100）
		SpeciesName    string `json:"species_name"`     // 族群名称（山海经原型）
		SourceText     string `json:"source_text"`      // 山海经出处
		FormDesc       string `json:"form_desc"`        // 形态描述
		TraitDesc      string `json:"trait_desc"`       // 族群特点
		TerritoryID    int    `json:"territory_id"`     // 所属领地
		FactionGroup   int    `json:"faction_group"`    // 神兽分组（1-20）
		HasDivineBeast bool   `json:"has_divine_beast"` // 神兽是否落在本族群领地
	}
	var divineBeastID sql.NullInt64
	err := s.db.QueryRow(
		`SELECT f.faction_id, f.species_id, sp.name, sp.source_text, sp.form_desc, sp.trait_desc,
		        f.territory_id, f.faction_group, f.divine_beast_id
		 FROM faction_instance f
		 JOIN monster_species sp ON sp.species_id = f.species_id
		 WHERE f.territory_id = ?`, territoryID,
	).Scan(&info.FactionID, &info.SpeciesID, &info.SpeciesName, &info.SourceText, &info.FormDesc,
		&info.TraitDesc, &info.TerritoryID, &info.FactionGroup, &divineBeastID)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "族群不存在，请先执行世界初始化"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询族群失败: " + err.Error()})
		return
	}
	info.HasDivineBeast = divineBeastID.Valid

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: info})
}

// ═══════════════════════════════════════════
//  GET /monster/list?faction_id= 怪物实体列表（含懒刷新）
// ═══════════════════════════════════════════

// MonsterEntityInfo 怪物实体信息（对应 proto MonsterEntityInfo）
type MonsterEntityInfo struct {
	EntityID  int64   `json:"entity_id"`  // 实体ID
	FactionID int64   `json:"faction_id"` // 所属族群
	SpeciesID int     `json:"species_id"` // 族群编号
	Type      int     `json:"type"`       // 怪物类型：1-7
	Tier      int     `json:"tier"`       // 等级阶位：1-9
	Element   int     `json:"element"`    // 五行属性：1-5
	HP        int     `json:"hp"`         // 当前气血
	MaxHP     int     `json:"max_hp"`     // 气血上限
	ATK       int     `json:"atk"`        // 攻击力
	DEF       int     `json:"def"`        // 防御力
	SPD       int     `json:"spd"`        // 速度
	State     int     `json:"state"`      // 状态
	PosX      float64 `json:"pos_x"`      // X坐标
	PosY      float64 `json:"pos_y"`      // Y坐标
}

// HandleMonsterList 查询某族群的怪物实体列表
// 查询前先做"懒刷新"：将已到复活时间的死亡怪物/妖幼崽恢复
func (s *Service) HandleMonsterList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	factionID := queryInt(r, "faction_id")
	if factionID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "faction_id 无效"})
		return
	}

	// ── 懒刷新1：死亡的普通/精英/Boss/妖 到复活时间后原地满血复活 ──
	// 神兽(6)/神兽幼崽(7)被消灭/抓捕后不刷新（respawn_at 为 NULL 不会命中）
	_, _ = s.db.Exec(
		`UPDATE monster_entity SET state=0, hp=max_hp, respawn_at=NULL
		 WHERE faction_id=? AND state=3 AND type IN (1,2,3,4) AND respawn_at IS NOT NULL AND respawn_at<=NOW()`,
		factionID,
	)
	// ── 懒刷新2：被抓的妖幼崽 CD到期后刷新（随机五行重新分配，PRD 5.3） ──
	s.respawnYaoCubs(int64(factionID))

	rows, err := s.db.Query(
		`SELECT entity_id, faction_id, species_id, type, tier, element, hp, max_hp, atk, def, spd, state, pos_x, pos_y
		 FROM monster_entity WHERE faction_id=? AND state<>4 ORDER BY type, entity_id`,
		factionID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询怪物失败: " + err.Error()})
		return
	}
	defer rows.Close()

	list := make([]MonsterEntityInfo, 0, 70)
	for rows.Next() {
		var m MonsterEntityInfo
		if err := rows.Scan(&m.EntityID, &m.FactionID, &m.SpeciesID, &m.Type, &m.Tier, &m.Element,
			&m.HP, &m.MaxHP, &m.ATK, &m.DEF, &m.SPD, &m.State, &m.PosX, &m.PosY); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "数据解析失败: " + err.Error()})
			return
		}
		list = append(list, m)
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{"monsters": list}})
}

// respawnYaoCubs 妖幼崽懒刷新：CD到期的被抓幼崽重新入场
// 刷新规则（技术方案 5.3）：重新随机五行属性，恢复满血，实体状态复位
func (s *Service) respawnYaoCubs(factionID int64) {
	rows, err := s.db.Query(
		`SELECT cub_id, entity_id FROM yao_cub
		 WHERE faction_id=? AND is_captured=1 AND respawn_at IS NOT NULL AND respawn_at<=NOW()`,
		factionID,
	)
	if err != nil {
		return
	}
	type cubRow struct{ cubID, entityID int64 }
	cubs := make([]cubRow, 0, YaoCubPerFaction)
	for rows.Next() {
		var c cubRow
		if rows.Scan(&c.cubID, &c.entityID) == nil {
			cubs = append(cubs, c)
		}
	}
	rows.Close()

	for _, c := range cubs {
		newElem := 1 + rand.Intn(5) // 刷新时随机重新分配五行
		attr := CalcMonsterAttr(TypeYaoCub, 5)
		_, _ = s.db.Exec(
			`UPDATE monster_entity SET state=0, element=?, hp=?, max_hp=? WHERE entity_id=?`,
			newElem, attr.HP, attr.HP, c.entityID,
		)
		_, _ = s.db.Exec(
			`UPDATE yao_cub SET is_captured=0, element=?, respawn_at=NULL WHERE cub_id=?`,
			newElem, c.cubID,
		)
	}
}

// ═══════════════════════════════════════════
//  POST /monster/coop/calc 协战倍率计算（服务端权威）
// ═══════════════════════════════════════════

// HandleCoopCalc 协战围攻倍率计算
// 服务端实时校验围攻怪物的存在性与状态，客户端不可伪造（技术方案 九、安全与反作弊）
func (s *Service) HandleCoopCalc(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID  int64   `json:"player_id"`  // 被围攻玩家ID
		EntityIDs []int64 `json:"entity_ids"` // 围攻怪物实体ID列表
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.PlayerID <= 0 || len(req.EntityIDs) == 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 或 entity_ids 无效"})
		return
	}

	// 逐个校验实体：必须存在且为存活可战状态（待机/巡逻/战斗）
	// 去重防止客户端重复传同一实体刷倍率
	seen := make(map[int64]bool, len(req.EntityIDs))
	elements := make([]int, 0, len(req.EntityIDs))
	manmanCount := 0
	for _, eid := range req.EntityIDs {
		if seen[eid] {
			continue
		}
		seen[eid] = true

		var elem, state, speciesID int
		err := s.db.QueryRow(
			"SELECT element, state, species_id FROM monster_entity WHERE entity_id=?", eid,
		).Scan(&elem, &state, &speciesID)
		if err == sql.ErrNoRows {
			continue // 不存在的实体直接忽略（不给客户端刷数机会）
		}
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询实体失败: " + err.Error()})
			return
		}
		if state == StateDead || state == StateCaptured {
			continue // 死亡/被抓的怪不参与围攻
		}
		elements = append(elements, elem)
		if speciesID == ManmanSpeciesID {
			manmanCount++
		}
	}

	multiplier, sameElem, shengCycle, manmanPaired := CoopDamageMultiplier(elements, manmanCount)
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"surround_count":  len(elements),
		"same_element":    sameElem,
		"is_sheng_cycle":  shengCycle,
		"manman_paired":   manmanPaired,
		"coop_multiplier": multiplier,
	}})
}

// ═══════════════════════════════════════════
//  POST /monster/hit 怪物受击（服务端权威扣血）
// ═══════════════════════════════════════════

// HandleMonsterHit 怪物受击扣血
// 抓捕的血量条件（≤30%）以本接口维护的服务端血量为准
func (s *Service) HandleMonsterHit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID int64 `json:"player_id"` // 攻击者玩家ID
		EntityID int64 `json:"entity_id"` // 被攻击怪物实体ID
		Damage   int   `json:"damage"`    // 伤害值（后续接入战斗服务后由服务端计算）
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.PlayerID <= 0 || req.EntityID <= 0 || req.Damage <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数无效"})
		return
	}

	// 查询当前血量与状态
	var hp, maxHP, state, mType int
	err := s.db.QueryRow(
		"SELECT hp, max_hp, state, type FROM monster_entity WHERE entity_id=?", req.EntityID,
	).Scan(&hp, &maxHP, &state, &mType)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "怪物不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询怪物失败: " + err.Error()})
		return
	}
	if state == StateDead || state == StateCaptured {
		writeJSON(w, 400, APIResponse{Code: 4101, Msg: "目标已死亡或已被抓捕"})
		return
	}

	// 扣血结算
	hp -= req.Damage
	isDead := hp <= 0
	if isDead {
		hp = 0
		// 死亡处理：普通/精英/Boss/妖 写复活CD；神兽被消灭永不刷新（唯一性）
		if mType == TypeDivine {
			_, err = s.db.Exec("UPDATE monster_entity SET hp=0, state=3, respawn_at=NULL WHERE entity_id=?", req.EntityID)
			// 神兽本体被消灭：登记唯一性状态（不刷新）
			_, _ = s.db.Exec("UPDATE divine_beast SET is_captured=1 WHERE entity_id=?", req.EntityID)
		} else {
			respawnAt := time.Now().Add(MonsterRespawnCD * time.Second)
			_, err = s.db.Exec("UPDATE monster_entity SET hp=0, state=3, respawn_at=? WHERE entity_id=?", respawnAt, req.EntityID)
		}
	} else {
		_, err = s.db.Exec("UPDATE monster_entity SET hp=?, state=2 WHERE entity_id=?", hp, req.EntityID)
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "扣血失败: " + err.Error()})
		return
	}

	hpPercent := 0.0
	if maxHP > 0 {
		hpPercent = float64(hp) / float64(maxHP)
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"hp":         hp,
		"max_hp":     maxHP,
		"is_dead":    isDead,
		"hp_percent": hpPercent,
	}})
}

// ═══════════════════════════════════════════
//  POST /capture/attempt 抓捕（技术方案 6.1 AttemptCapture 落地）
// ═══════════════════════════════════════════

// HandleCaptureAttempt 抓捕妖幼崽/神兽幼崽
// 流程（技术方案 6.1）:
//  1. 校验目标可抓捕（仅类型5/7）且血量 ≤30%
//  2. 神兽幼崽：检查全服唯一性（Redis SetNX 锁 + MySQL 双保险）
//  3. 计算成功率并掷骰（服务端随机，客户端无法预测）
//  4. 成功：妖幼崽写CD刷新；神兽幼崽永久标记；写抓捕日志
func (s *Service) HandleCaptureAttempt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID    int64 `json:"player_id"`    // 玩家ID
		EntityID    int64 `json:"entity_id"`    // 目标实体ID
		ItemQuality int   `json:"item_quality"` // 抓捕道具品质：1普通 2稀有 3传说
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.PlayerID <= 0 || req.EntityID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 或 entity_id 无效"})
		return
	}
	if req.ItemQuality < 1 || req.ItemQuality > 3 {
		req.ItemQuality = 1 // 非法品质回退为普通道具
	}

	// ── 步骤1：查询目标并校验可抓捕性 ──
	var factionID int64
	var mType, hp, maxHP, state, elem, speciesID int
	err := s.db.QueryRow(
		"SELECT faction_id, type, hp, max_hp, state, element, species_id FROM monster_entity WHERE entity_id=?",
		req.EntityID,
	).Scan(&factionID, &mType, &hp, &maxHP, &state, &elem, &speciesID)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "目标不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询目标失败: " + err.Error()})
		return
	}
	if mType != TypeYaoCub && mType != TypeDivineCub {
		writeJSON(w, 400, APIResponse{Code: 4201, Msg: "该目标不可抓捕（仅妖幼崽/神兽幼崽）"})
		return
	}
	if state == StateDead || state == StateCaptured {
		writeJSON(w, 400, APIResponse{Code: 4202, Msg: "目标已死亡或已被抓捕"})
		return
	}

	// ── 步骤2：血量条件校验（PRD 第六章：血量降至30%以下才可抓捕） ──
	hpPercent := 1.0
	if maxHP > 0 {
		hpPercent = float64(hp) / float64(maxHP)
	}
	if hpPercent > CaptureHPThreshold {
		writeJSON(w, 400, APIResponse{Code: 4203, Msg: fmt.Sprintf("目标血量%.0f%%仍高于30%%，无法抓捕", hpPercent*100)})
		return
	}

	// ── 步骤3：神兽幼崽唯一性预检查（MySQL 记录） ──
	var factionGroup int
	if mType == TypeDivineCub {
		var cubCaptured int
		err = s.db.QueryRow(
			"SELECT faction_group, cub_is_captured FROM divine_beast WHERE cub_entity_id=?", req.EntityID,
		).Scan(&factionGroup, &cubCaptured)
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "神兽登记查询失败: " + err.Error()})
			return
		}
		if cubCaptured == 1 {
			writeJSON(w, 400, APIResponse{Code: 4204, Msg: "该神兽幼崽已被其他玩家抓捕（全服唯一）"})
			return
		}
	}

	// ── 步骤4：计算成功率并掷骰（抓捕技能系统未上线，等级固定1） ──
	captureRate := CalcCaptureRate(hpPercent, req.ItemQuality, 1)
	success := rand.Float64() < captureRate

	// 抓捕日志（无论成败都留痕，审计与反作弊）
	logCapture := func(ok bool) {
		_, _ = s.db.Exec(
			`INSERT INTO capture_log (player_id, target_type, target_id, success, item_used, capture_rate)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			req.PlayerID, mType, req.EntityID, boolToInt(ok), req.ItemQuality, captureRate,
		)
	}

	if !success {
		logCapture(false)
		writeJSON(w, 200, APIResponse{Code: 0, Msg: "抓捕失败，再接再厉", Data: map[string]interface{}{
			"success":      false,
			"capture_rate": captureRate,
		}})
		return
	}

	// ── 步骤5：抓捕成功结算 ──
	if mType == TypeDivineCub {
		// 神兽幼崽：Redis SetNX 分布式锁抢占（防并发双抓），锁永不过期
		lockKey := fmt.Sprintf("%s%d", DivineCubLockPrefix, factionGroup)
		ok, lockErr := s.rdb.SetNX(lockKey, req.PlayerID, 0)
		if lockErr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "唯一性锁获取失败: " + lockErr.Error()})
			return
		}
		if !ok {
			logCapture(false)
			writeJSON(w, 400, APIResponse{Code: 4204, Msg: "手慢一步，该神兽幼崽刚被其他玩家抓捕"})
			return
		}
		// MySQL 双保险登记（唯一性永久记录）
		_, err = s.db.Exec(
			`UPDATE divine_beast SET cub_is_captured=1, cub_capturer_id=?, capture_time=NOW() WHERE cub_entity_id=?`,
			req.PlayerID, req.EntityID,
		)
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "神兽幼崽登记失败: " + err.Error()})
			return
		}
		// 实体永久标记为已抓捕（不刷新）
		_, _ = s.db.Exec("UPDATE monster_entity SET state=4, respawn_at=NULL WHERE entity_id=?", req.EntityID)
	} else {
		// 妖幼崽：标记被抓 + 写CD刷新（MySQL respawn_at + Redis TTL 双记录）
		respawnAt := time.Now().Add(YaoCubRespawnCD * time.Second)
		_, err = s.db.Exec("UPDATE monster_entity SET state=4 WHERE entity_id=?", req.EntityID)
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "抓捕结算失败: " + err.Error()})
			return
		}
		_, _ = s.db.Exec(
			"UPDATE yao_cub SET is_captured=1, respawn_at=? WHERE entity_id=?", respawnAt, req.EntityID)
		// Redis CD key（技术方案 5.3）：yao_cub:respawn:{faction_id}，TTL=刷新CD
		_ = s.rdb.Set(fmt.Sprintf("yao_cub:respawn:%d", factionID), req.EntityID, YaoCubRespawnCD*time.Second)
	}

	logCapture(true)
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "抓捕成功！获得新的伙伴", Data: map[string]interface{}{
		"success":      true,
		"capture_rate": captureRate,
		"species_id":   speciesID, // 宠物/坐骑原型族群
		"element":      elem,      // 目标五行属性
	}})
}

// boolToInt 布尔转 0/1（SQL 写入用）
func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// ═══════════════════════════════════════════
//  GET /monster/divine/status 全服神兽状态
// ═══════════════════════════════════════════

// HandleDivineStatus 查询全服20只神兽的唯一性状态
func (s *Service) HandleDivineStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	rows, err := s.db.Query(
		`SELECT d.beast_id, d.species_id, sp.name, d.faction_group, d.territory_id,
		        d.is_captured, d.cub_is_captured, IFNULL(d.cub_capturer_id, 0)
		 FROM divine_beast d
		 JOIN monster_species sp ON sp.species_id = d.species_id
		 ORDER BY d.faction_group`)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询神兽失败: " + err.Error()})
		return
	}
	defer rows.Close()

	type beastInfo struct {
		BeastID       int64  `json:"beast_id"`        // 神兽ID
		SpeciesID     int    `json:"species_id"`      // 原型族群编号
		SpeciesName   string `json:"species_name"`    // 原型族群名称
		FactionGroup  int    `json:"faction_group"`   // 所属分组（1-20）
		TerritoryID   int    `json:"territory_id"`    // 实际落点领地
		IsCaptured    bool   `json:"is_captured"`     // 神兽本体是否已消灭
		CubIsCaptured bool   `json:"cub_is_captured"` // 幼崽是否已被抓捕（全服唯一）
		CubCapturerID int64  `json:"cub_capturer_id"` // 抓捕幼崽的玩家ID
	}
	list := make([]beastInfo, 0, DivineGroupCount)
	for rows.Next() {
		var b beastInfo
		var cap1, cap2 int
		if err := rows.Scan(&b.BeastID, &b.SpeciesID, &b.SpeciesName, &b.FactionGroup, &b.TerritoryID,
			&cap1, &cap2, &b.CubCapturerID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "数据解析失败: " + err.Error()})
			return
		}
		b.IsCaptured = cap1 == 1
		b.CubIsCaptured = cap2 == 1
		list = append(list, b)
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{"beasts": list}})
}

// ═══════════════════════════════════════════
//  POST /monster/admin/init_world 世界初始化（幂等）
// ═══════════════════════════════════════════

// HandleAdminInitWorld 世界初始化管理接口
// 首次部署时调用一次；重复调用直接返回"已初始化"，不会产生重复数据
func (s *Service) HandleAdminInitWorld(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	result, alreadyDone, err := s.initWorld()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "世界初始化失败: " + err.Error()})
		return
	}
	if alreadyDone {
		writeJSON(w, 200, APIResponse{Code: 0, Msg: "世界已初始化，无需重复执行"})
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "世界初始化完成", Data: result})
}
