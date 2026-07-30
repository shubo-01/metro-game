// Package gongfa 数据访问层：功法·技能·经验系统所有 SQL 读写。
// 约定（与 shenwei 包同模式）：
//   - 写操作全部走事务（*sql.Tx），读定义类静态表可直接用 *sql.DB
//   - 【全局锁序】同一事务内需要锁多张"角色行"表时，必须按固定表顺序加锁：
//     char_gongfa → char_gongfa_learned → char_skill → char_skill_slots
//     → char_currency → char_mengyi_soup → char_meditation，
//     character_attributes / character_realm 的更新一律置于事务末尾（计划裁决8）。
//     各业务路径实际锁序：
//     Learn        锁 char_gongfa → char_gongfa_learned →（末尾）attributes
//     Forget       锁 char_gongfa_learned → char_currency → char_mengyi_soup →（末尾）attributes
//     SkillLearn   锁 char_skill →（末尾，仅走火时）attributes
//     SkillForget  锁 char_skill → char_skill_slots → char_currency → char_mengyi_soup
//     SlotSet      锁 char_skill → char_skill_slots
//     Meditate*    锁 char_meditation →（末尾）realm
//     KillExp      锁（末尾）realm
//     全部与全局锁序一致，不存在交叉持锁，杜绝死锁。
//   - 与神位系统共享 char_currency 表：shenwei 包锁序里 char_currency 也排在
//     角色道具表之后、attributes 之前，两包并发操作同角色不会形成环路等待。
//   - 同一张表内锁多行时按主键/唯一键升序加锁（如 char_gongfa 按 item_type 升序）。
package gongfa

import (
	"database/sql"
)

// Execer 兼容 *sql.DB 与 *sql.Tx 的最小执行接口（与 character/shenwei 包同模式）
type Execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	QueryRow(query string, args ...interface{}) *sql.Row
}

// Queryer 需要多行查询的场景（列表类），*sql.DB 与 *sql.Tx 都满足
type Queryer interface {
	Query(query string, args ...interface{}) (*sql.Rows, error)
}

// ─────────────────────────────────────
//  静态定义读取（gongfa_def / skill_def / exp_stage_config）
// ─────────────────────────────────────

// getGongfaDef 读取一个功法定义；不存在返回 sql.ErrNoRows
func getGongfaDef(e Execer, gongfaID int) (*GongfaDef, error) {
	d := &GongfaDef{}
	var isFrag int
	err := e.QueryRow(
		`SELECT id, name, attr_type, tier, meditate_xp_per_10min, shield_recover_mult,
		        bonus_jing, bonus_qi, bonus_shen, is_fragment, fuse_count,
		        req_major_stage, req_level, req_attr_total, source_desc
		 FROM gongfa_def WHERE id=?`, gongfaID,
	).Scan(&d.ID, &d.Name, &d.AttrType, &d.Tier, &d.MeditateXPPer10Min, &d.ShieldRecoverMult,
		&d.BonusJing, &d.BonusQi, &d.BonusShen, &isFrag, &d.FuseCount,
		&d.ReqMajorStage, &d.ReqLevel, &d.ReqAttrTotal, &d.SourceDesc)
	if err != nil {
		return nil, err
	}
	d.IsFragment = isFrag == 1
	return d, nil
}

// listGongfaDefs 读取全部功法定义（列表接口用）
func listGongfaDefs(q Queryer) ([]GongfaDef, error) {
	rows, err := q.Query(
		`SELECT id, name, attr_type, tier, meditate_xp_per_10min, shield_recover_mult,
		        bonus_jing, bonus_qi, bonus_shen, is_fragment, fuse_count,
		        req_major_stage, req_level, req_attr_total, source_desc
		 FROM gongfa_def ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GongfaDef
	for rows.Next() {
		var d GongfaDef
		var isFrag int
		if err := rows.Scan(&d.ID, &d.Name, &d.AttrType, &d.Tier, &d.MeditateXPPer10Min, &d.ShieldRecoverMult,
			&d.BonusJing, &d.BonusQi, &d.BonusShen, &isFrag, &d.FuseCount,
			&d.ReqMajorStage, &d.ReqLevel, &d.ReqAttrTotal, &d.SourceDesc); err != nil {
			return nil, err
		}
		d.IsFragment = isFrag == 1
		out = append(out, d)
	}
	return out, rows.Err()
}

// getSkillDef 读取一个技能定义；不存在返回 sql.ErrNoRows
func getSkillDef(e Execer, skillID int) (*SkillDef, error) {
	d := &SkillDef{}
	var isFrag int
	err := e.QueryRow(
		`SELECT id, name, skill_type, tier, damage_path, base_damage, multiplier,
		        cooldown_s, mp_cost, element, is_fragment, fuse_count, effect_desc, unlock_condition
		 FROM skill_def WHERE id=?`, skillID,
	).Scan(&d.ID, &d.Name, &d.SkillType, &d.Tier, &d.DamagePath, &d.BaseDamage, &d.Multiplier,
		&d.CooldownS, &d.MpCost, &d.Element, &isFrag, &d.FuseCount, &d.EffectDesc, &d.UnlockCondition)
	if err != nil {
		return nil, err
	}
	d.IsFragment = isFrag == 1
	return d, nil
}

// listSkillDefs 读取全部技能定义（列表接口用）
func listSkillDefs(q Queryer) ([]SkillDef, error) {
	rows, err := q.Query(
		`SELECT id, name, skill_type, tier, damage_path, base_damage, multiplier,
		        cooldown_s, mp_cost, element, is_fragment, fuse_count, effect_desc, unlock_condition
		 FROM skill_def ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SkillDef
	for rows.Next() {
		var d SkillDef
		var isFrag int
		if err := rows.Scan(&d.ID, &d.Name, &d.SkillType, &d.Tier, &d.DamagePath, &d.BaseDamage, &d.Multiplier,
			&d.CooldownS, &d.MpCost, &d.Element, &isFrag, &d.FuseCount, &d.EffectDesc, &d.UnlockCondition); err != nil {
			return nil, err
		}
		d.IsFragment = isFrag == 1
		out = append(out, d)
	}
	return out, rows.Err()
}

// getStageConfig 读取阶段经验配置（神兽base/最大等级/怪物XP累积倍率）；
// 运行时以 exp_stage_config 表为权威（与 Go 侧镜像表种子一致）
func getStageConfig(e Execer, stage int) (shenshouBase int64, maxLevel int, xpMult int64, err error) {
	err = e.QueryRow(
		"SELECT shenshou_base, max_level, monster_xp_mult FROM exp_stage_config WHERE stage=?", stage,
	).Scan(&shenshouBase, &maxLevel, &xpMult)
	return
}

// ─────────────────────────────────────
//  char_gongfa 功法背包（锁序第1位）
// ─────────────────────────────────────

// lockGongfaItems 锁定角色某功法的背包行（碎片+完整两行一次锁齐，按 item_type 升序），
// 返回 map[item_type]quantity；没有的行按 0 计。
func lockGongfaItems(tx *sql.Tx, characterID int64, gongfaID int) (map[int]int, error) {
	rows, err := tx.Query(
		`SELECT item_type, quantity FROM char_gongfa
		 WHERE character_id=? AND gongfa_id=? ORDER BY item_type FOR UPDATE`,
		characterID, gongfaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int]int{ItemFragment: 0, ItemComplete: 0}
	for rows.Next() {
		var t, q int
		if err := rows.Scan(&t, &q); err != nil {
			return nil, err
		}
		out[t] = q
	}
	return out, rows.Err()
}

// decGongfaItem 扣减功法背包数量（调用前必须已 FOR UPDATE 锁行并校验数量充足）
func decGongfaItem(tx *sql.Tx, characterID int64, gongfaID, itemType, n int) error {
	_, err := tx.Exec(
		`UPDATE char_gongfa SET quantity = quantity - ?
		 WHERE character_id=? AND gongfa_id=? AND item_type=? AND quantity >= ?`,
		n, characterID, gongfaID, itemType, n)
	return err
}

// listGongfaBag 读取角色功法背包全量（列表接口用，只读不锁）
func listGongfaBag(q Queryer, characterID int64) (map[int]map[int]int, error) {
	rows, err := q.Query(
		"SELECT gongfa_id, item_type, quantity FROM char_gongfa WHERE character_id=?", characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	// 外层 key=功法ID，内层 key=item_type
	out := map[int]map[int]int{}
	for rows.Next() {
		var gid, t, qty int
		if err := rows.Scan(&gid, &t, &qty); err != nil {
			return nil, err
		}
		if out[gid] == nil {
			out[gid] = map[int]int{}
		}
		out[gid][t] = qty
	}
	return out, rows.Err()
}

// ─────────────────────────────────────
//  char_gongfa_learned 已学功法（锁序第2位）
// ─────────────────────────────────────

// lockLearned 锁定并检查角色是否已学某功法（FOR UPDATE 防并发重复学习/遗忘）
func lockLearned(tx *sql.Tx, characterID int64, gongfaID int) (bool, error) {
	var id int64
	err := tx.QueryRow(
		"SELECT id FROM char_gongfa_learned WHERE character_id=? AND gongfa_id=? FOR UPDATE",
		characterID, gongfaID).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// insertLearned 写入已学功法记录（UNIQUE(character_id,gongfa_id) 兜底防重）
func insertLearned(tx *sql.Tx, characterID int64, gongfaID int) error {
	_, err := tx.Exec(
		"INSERT INTO char_gongfa_learned (character_id, gongfa_id) VALUES (?, ?)",
		characterID, gongfaID)
	return err
}

// deleteLearned 删除已学功法记录（遗忘）
func deleteLearned(tx *sql.Tx, characterID int64, gongfaID int) error {
	_, err := tx.Exec(
		"DELETE FROM char_gongfa_learned WHERE character_id=? AND gongfa_id=?",
		characterID, gongfaID)
	return err
}

// listLearnedIDs 读取角色已学功法ID列表（只读不锁）
func listLearnedIDs(q Queryer, characterID int64) ([]int, error) {
	rows, err := q.Query(
		"SELECT gongfa_id FROM char_gongfa_learned WHERE character_id=? ORDER BY gongfa_id", characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// getBestMeditateRate 取角色已学功法中最高品级的打坐XP速率（PRD 2.1：按最高功法算）。
// 未学任何功法返回 sql.ErrNoRows。
func getBestMeditateRate(e Execer, characterID int64) (tier, ratePer10Min int, err error) {
	err = e.QueryRow(
		`SELECT g.tier, g.meditate_xp_per_10min
		 FROM char_gongfa_learned l JOIN gongfa_def g ON g.id = l.gongfa_id
		 WHERE l.character_id=? ORDER BY g.tier DESC, g.meditate_xp_per_10min DESC LIMIT 1`,
		characterID).Scan(&tier, &ratePer10Min)
	return
}

// ─────────────────────────────────────
//  char_skill 技能背包（锁序第3位）
// ─────────────────────────────────────

// lockSkillItems 锁定角色某技能的背包行（碎片+完整，按 item_type 升序）
func lockSkillItems(tx *sql.Tx, characterID int64, skillID int) (map[int]int, error) {
	rows, err := tx.Query(
		`SELECT item_type, quantity FROM char_skill
		 WHERE character_id=? AND skill_id=? ORDER BY item_type FOR UPDATE`,
		characterID, skillID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int]int{ItemFragment: 0, ItemComplete: 0}
	for rows.Next() {
		var t, q int
		if err := rows.Scan(&t, &q); err != nil {
			return nil, err
		}
		out[t] = q
	}
	return out, rows.Err()
}

// addSkillItem 增加技能背包数量（合成产物入包，不存在则建行）
func addSkillItem(tx *sql.Tx, characterID int64, skillID, itemType, n int) error {
	_, err := tx.Exec(
		`INSERT INTO char_skill (character_id, skill_id, item_type, quantity) VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
		characterID, skillID, itemType, n)
	return err
}

// decSkillItem 扣减技能背包数量（调用前必须已锁行并校验充足）
func decSkillItem(tx *sql.Tx, characterID int64, skillID, itemType, n int) error {
	_, err := tx.Exec(
		`UPDATE char_skill SET quantity = quantity - ?
		 WHERE character_id=? AND skill_id=? AND item_type=? AND quantity >= ?`,
		n, characterID, skillID, itemType, n)
	return err
}

// countSkillComplete 只读查询完整技能持有数（装配校验用，无记录按0）
func countSkillComplete(e Execer, characterID int64, skillID int) (int, error) {
	var n int
	err := e.QueryRow(
		"SELECT quantity FROM char_skill WHERE character_id=? AND skill_id=? AND item_type=?",
		characterID, skillID, ItemComplete).Scan(&n)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return n, err
}

// listSkillBag 读取角色技能背包全量（列表接口用）
func listSkillBag(q Queryer, characterID int64) (map[int]map[int]int, error) {
	rows, err := q.Query(
		"SELECT skill_id, item_type, quantity FROM char_skill WHERE character_id=?", characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int]map[int]int{}
	for rows.Next() {
		var sid, t, qty int
		if err := rows.Scan(&sid, &t, &qty); err != nil {
			return nil, err
		}
		if out[sid] == nil {
			out[sid] = map[int]int{}
		}
		out[sid][t] = qty
	}
	return out, rows.Err()
}

// ─────────────────────────────────────
//  char_skill_slots 技能栏（锁序第4位）
// ─────────────────────────────────────

// SlotRow 一条技能栏装配记录
type SlotRow struct {
	SlotType  int `json:"slot_type"`  // 1=主动 2=被动
	SlotIndex int `json:"slot_index"` // 主动1-10 / 被动1-4
	SkillID   int `json:"skill_id"`   // 装配的技能ID
}

// lockSlots 锁定角色全部技能栏行（装配/卸下前锁齐，防并发交叉写）
func lockSlots(tx *sql.Tx, characterID int64) ([]SlotRow, error) {
	rows, err := tx.Query(
		`SELECT slot_type, slot_index, skill_id FROM char_skill_slots
		 WHERE character_id=? ORDER BY slot_type, slot_index FOR UPDATE`,
		characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SlotRow
	for rows.Next() {
		var s SlotRow
		if err := rows.Scan(&s.SlotType, &s.SlotIndex, &s.SkillID); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// upsertSlot 装配技能到指定栏位（已有装配则覆盖）
func upsertSlot(tx *sql.Tx, characterID int64, slotType, slotIndex, skillID int) error {
	_, err := tx.Exec(
		`INSERT INTO char_skill_slots (character_id, slot_type, slot_index, skill_id) VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id)`,
		characterID, slotType, slotIndex, skillID)
	return err
}

// deleteSlot 卸下指定栏位（skill_id=0 的语义：删行表示空栏）
func deleteSlot(tx *sql.Tx, characterID int64, slotType, slotIndex int) error {
	_, err := tx.Exec(
		"DELETE FROM char_skill_slots WHERE character_id=? AND slot_type=? AND slot_index=?",
		characterID, slotType, slotIndex)
	return err
}

// removeSkillFromSlots 把某技能从该角色所有栏位卸下（遗忘技能时清理装配）
func removeSkillFromSlots(tx *sql.Tx, characterID int64, skillID int) error {
	_, err := tx.Exec(
		"DELETE FROM char_skill_slots WHERE character_id=? AND skill_id=?",
		characterID, skillID)
	return err
}

// listSlots 读取角色全部技能栏（列表接口用，只读不锁）
func listSlots(q Queryer, characterID int64) ([]SlotRow, error) {
	rows, err := q.Query(
		`SELECT slot_type, slot_index, skill_id FROM char_skill_slots
		 WHERE character_id=? ORDER BY slot_type, slot_index`, characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SlotRow
	for rows.Next() {
		var s SlotRow
		if err := rows.Scan(&s.SlotType, &s.SlotIndex, &s.SkillID); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// ─────────────────────────────────────
//  char_currency 灵石（锁序第5位，与神位系统共享表）
// ─────────────────────────────────────

// lockSpiritStone 锁定并读取灵石余额（无记录按0，与 shenwei 包同语义）
func lockSpiritStone(tx *sql.Tx, characterID int64) (int64, error) {
	var n int64
	err := tx.QueryRow(
		"SELECT spirit_stone FROM char_currency WHERE character_id=? FOR UPDATE", characterID).Scan(&n)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return n, err
}

// decSpiritStone 扣减灵石（调用前必须已锁行并校验余额充足）
func decSpiritStone(tx *sql.Tx, characterID int64, n int64) error {
	_, err := tx.Exec(
		`UPDATE char_currency SET spirit_stone = spirit_stone - ?
		 WHERE character_id=? AND spirit_stone >= ?`, n, characterID, n)
	return err
}

// getSpiritStone 只读查询灵石余额（列表接口用，无记录按0）
func getSpiritStone(e Execer, characterID int64) (int64, error) {
	var n int64
	err := e.QueryRow(
		"SELECT spirit_stone FROM char_currency WHERE character_id=?", characterID).Scan(&n)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return n, err
}

// ─────────────────────────────────────
//  char_mengyi_soup 孟遗汤（锁序第6位）
// ─────────────────────────────────────

// lockSoup 锁定并读取孟遗汤数量（无记录按0）
func lockSoup(tx *sql.Tx, characterID int64) (int, error) {
	var n int
	err := tx.QueryRow(
		"SELECT count FROM char_mengyi_soup WHERE character_id=? FOR UPDATE", characterID).Scan(&n)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return n, err
}

// decSoup 扣减孟遗汤（调用前必须已锁行并校验充足）
func decSoup(tx *sql.Tx, characterID int64, n int) error {
	_, err := tx.Exec(
		"UPDATE char_mengyi_soup SET count = count - ? WHERE character_id=? AND count >= ?",
		n, characterID, n)
	return err
}

// getSoup 只读查询孟遗汤数量（列表接口用，无记录按0）
func getSoup(e Execer, characterID int64) (int, error) {
	var n int
	err := e.QueryRow(
		"SELECT count FROM char_mengyi_soup WHERE character_id=?", characterID).Scan(&n)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return n, err
}

// ─────────────────────────────────────
//  char_meditation 打坐状态（锁序第7位）
// ─────────────────────────────────────

// MeditationRow 打坐状态行（elapsedSec 由 SQL 现算，避免 Go/DB 时区不一致）
type MeditationRow struct {
	Status       int  // 0=未打坐 1=打坐中
	TodaySeconds int  // 今日已计入秒数
	TodayIsToday bool // today_date 是否等于今天（false 需换日重置）
	ElapsedSec   int  // 距 last_tick_at 的秒数（status=0 或无 last_tick_at 时为0）
}

// lockMeditation 锁定角色打坐状态行（无则先建默认行再锁，保证一定拿到锁）。
// 时间比较全部用数据库时钟（NOW()/CURDATE()），避免应用服务器时钟漂移。
func lockMeditation(tx *sql.Tx, characterID int64) (*MeditationRow, error) {
	if _, err := tx.Exec(
		"INSERT IGNORE INTO char_meditation (character_id, status) VALUES (?, 0)", characterID); err != nil {
		return nil, err
	}
	m := &MeditationRow{}
	var isToday, elapsed sql.NullInt64
	err := tx.QueryRow(
		`SELECT status, today_seconds,
		        (today_date IS NOT NULL AND today_date = CURDATE()),
		        IF(status=1 AND last_tick_at IS NOT NULL, TIMESTAMPDIFF(SECOND, last_tick_at, NOW()), 0)
		 FROM char_meditation WHERE character_id=? FOR UPDATE`,
		characterID).Scan(&m.Status, &m.TodaySeconds, &isToday, &elapsed)
	if err != nil {
		return nil, err
	}
	m.TodayIsToday = isToday.Int64 == 1
	m.ElapsedSec = int(elapsed.Int64)
	if m.ElapsedSec < 0 {
		m.ElapsedSec = 0 // 时钟回拨兜底
	}
	return m, nil
}

// startMeditation 开始打坐：置状态并把起点/结算点/今日额度日期都推到当前
func startMeditation(tx *sql.Tx, characterID int64, resetToday bool) error {
	if resetToday {
		// 换日：今日额度清零重记
		_, err := tx.Exec(
			`UPDATE char_meditation SET status=1, started_at=NOW(), last_tick_at=NOW(),
			 today_seconds=0, today_date=CURDATE() WHERE character_id=?`, characterID)
		return err
	}
	_, err := tx.Exec(
		`UPDATE char_meditation SET status=1, started_at=NOW(), last_tick_at=NOW(),
		 today_date=CURDATE() WHERE character_id=?`, characterID)
	return err
}

// advanceMeditation 结算推进：按完整单位推进 last_tick_at 并累计今日秒数
// （不满10分钟的零头保留在 last_tick_at 之后，留给下次结算）
func advanceMeditation(tx *sql.Tx, characterID int64, advanceSec int, resetToday bool) error {
	if resetToday {
		_, err := tx.Exec(
			`UPDATE char_meditation SET last_tick_at = DATE_ADD(last_tick_at, INTERVAL ? SECOND),
			 today_seconds = ?, today_date = CURDATE() WHERE character_id=?`,
			advanceSec, advanceSec, characterID)
		return err
	}
	_, err := tx.Exec(
		`UPDATE char_meditation SET last_tick_at = DATE_ADD(last_tick_at, INTERVAL ? SECOND),
		 today_seconds = today_seconds + ? WHERE character_id=?`,
		advanceSec, advanceSec, characterID)
	return err
}

// endMeditation 结束打坐：状态归零（started_at/last_tick_at 保留作历史参考）
func endMeditation(tx *sql.Tx, characterID int64) error {
	_, err := tx.Exec("UPDATE char_meditation SET status=0 WHERE character_id=?", characterID)
	return err
}

// getMeditation 只读查询打坐状态（列表接口用；无记录返回全零行）
func getMeditation(e Execer, characterID int64) (*MeditationRow, error) {
	m := &MeditationRow{}
	var isToday, elapsed sql.NullInt64
	err := e.QueryRow(
		`SELECT status, today_seconds,
		        (today_date IS NOT NULL AND today_date = CURDATE()),
		        IF(status=1 AND last_tick_at IS NOT NULL, TIMESTAMPDIFF(SECOND, last_tick_at, NOW()), 0)
		 FROM char_meditation WHERE character_id=?`,
		characterID).Scan(&m.Status, &m.TodaySeconds, &isToday, &elapsed)
	if err == sql.ErrNoRows {
		return &MeditationRow{}, nil
	}
	if err != nil {
		return nil, err
	}
	m.TodayIsToday = isToday.Int64 == 1
	m.ElapsedSec = int(elapsed.Int64)
	if m.ElapsedSec < 0 {
		m.ElapsedSec = 0
	}
	return m, nil
}

// ─────────────────────────────────────
//  character_attributes / character_realm（事务末尾更新，计划裁决8）
// ─────────────────────────────────────

// getNakedAttrs 读取裸值精气神（学习要求/走火判定都按裸值，防加成套娃；只读不锁）
func getNakedAttrs(e Execer, characterID int64) (jing, qi, shen int, err error) {
	err = e.QueryRow(
		"SELECT jing, qi, shen FROM character_attributes WHERE character_id=?", characterID).
		Scan(&jing, &qi, &shen)
	return
}

// getElementCount 修炼五行数量（1-5修；character_qi_elements 行数，0行按1修兜底）
func getElementCount(e Execer, characterID int64) (int, error) {
	var n int
	err := e.QueryRow(
		"SELECT COUNT(*) FROM character_qi_elements WHERE character_id=?", characterID).Scan(&n)
	if err != nil {
		return 0, err
	}
	if n == 0 {
		n = 1
	}
	return n, nil
}

// applyGongfaBonus 叠加式更新功法加成三列（学习传正数/遗忘传负数），
// 触发走火时同时写 zouhuo_until = NOW()+72小时。
// 【锁序】本函数必须在事务末尾调用（attributes 更新置底，计划裁决8）。
func applyGongfaBonus(tx *sql.Tx, characterID int64, dJing, dQi, dShen int, setZouhuo bool) error {
	if setZouhuo {
		_, err := tx.Exec(
			`UPDATE character_attributes SET
			 gongfa_jing = gongfa_jing + ?, gongfa_qi = gongfa_qi + ?, gongfa_shen = gongfa_shen + ?,
			 zouhuo_until = DATE_ADD(NOW(), INTERVAL ? HOUR)
			 WHERE character_id=?`, dJing, dQi, dShen, ZouhuoHours, characterID)
		return err
	}
	_, err := tx.Exec(
		`UPDATE character_attributes SET
		 gongfa_jing = gongfa_jing + ?, gongfa_qi = gongfa_qi + ?, gongfa_shen = gongfa_shen + ?
		 WHERE character_id=?`, dJing, dQi, dShen, characterID)
	return err
}

// setZouhuoOnly 只写走火截止时间（技能学习触发走火但技能无属性加成时用）。
// 【锁序】事务末尾调用。
func setZouhuoOnly(tx *sql.Tx, characterID int64) error {
	_, err := tx.Exec(
		"UPDATE character_attributes SET zouhuo_until = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE character_id=?",
		ZouhuoHours, characterID)
	return err
}

// RealmRow 境界行（杀怪/打坐经验入账用）
type RealmRow struct {
	MajorStage int   // 大境界 1-8
	MinorStage int   // 小阶 1-9
	Segment    int   // 段格 0-9
	ExpJing    int64 // 精经验
	ExpQi      int64 // 气经验
	ExpShen    int64 // 神经验
}

// lockRealm 锁定境界行（FOR UPDATE；经验入账前锁，防并发丢加）。
// 【锁序】realm 更新置事务末尾（计划裁决8），本函数必须是事务里最后锁的表。
func lockRealm(tx *sql.Tx, characterID int64) (*RealmRow, error) {
	r := &RealmRow{}
	err := tx.QueryRow(
		`SELECT major_stage, minor_stage, stage_segment, exp_jing, exp_qi, exp_shen
		 FROM character_realm WHERE character_id=? FOR UPDATE`, characterID).
		Scan(&r.MajorStage, &r.MinorStage, &r.Segment, &r.ExpJing, &r.ExpQi, &r.ExpShen)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// addRealmExp 三属性同额入账经验（文档口径：杀怪/打坐XP精气神同时+N）
func addRealmExp(tx *sql.Tx, characterID int64, xp int64) error {
	_, err := tx.Exec(
		`UPDATE character_realm SET exp_jing = exp_jing + ?, exp_qi = exp_qi + ?, exp_shen = exp_shen + ?
		 WHERE character_id=?`, xp, xp, xp, characterID)
	return err
}

// getRealm 只读查询境界（列表接口/预检用）
func getRealm(e Execer, characterID int64) (*RealmRow, error) {
	r := &RealmRow{}
	err := e.QueryRow(
		`SELECT major_stage, minor_stage, stage_segment, exp_jing, exp_qi, exp_shen
		 FROM character_realm WHERE character_id=?`, characterID).
		Scan(&r.MajorStage, &r.MinorStage, &r.Segment, &r.ExpJing, &r.ExpQi, &r.ExpShen)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// getZouhuoStatus 查询走火入魔状态（列表接口展示用）：是否生效中+剩余秒数
func getZouhuoStatus(e Execer, characterID int64) (active bool, remainSec int64, err error) {
	var a, remain sql.NullInt64
	err = e.QueryRow(
		`SELECT (zouhuo_until IS NOT NULL AND zouhuo_until > NOW()),
		        IF(zouhuo_until IS NOT NULL AND zouhuo_until > NOW(),
		           TIMESTAMPDIFF(SECOND, NOW(), zouhuo_until), 0)
		 FROM character_attributes WHERE character_id=?`, characterID).Scan(&a, &remain)
	if err != nil {
		return false, 0, err
	}
	return a.Int64 == 1, remain.Int64, nil
}
