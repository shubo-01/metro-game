// Package shenwei 数据访问层：神位系统所有 SQL 读写。
// 约定：
//   - 写操作全部走事务（*sql.Tx），读定义类静态表可直接用 *sql.DB
//   - 【全局锁序】同一事务内需要锁多张"角色行"表时，必须按固定表顺序加锁：
//     char_shenwei → char_shenwei_fragment → char_shenwei_bag → char_currency → shenwei_talisman
//     （各业务路径实际锁序：Synthesize 只锁 fragment；Fuse 只锁 bag；
//     Inherit 锁 char_shenwei→bag；Switch 锁 char_shenwei→bag→currency→talisman，
//     全部与全局锁序一致）
//   - 死锁场景：若 Inherit 先锁 bag 后锁 char_shenwei、Switch 先锁 char_shenwei 后锁 bag，
//     同角色并发"继承+切换"会交叉持锁互等形成确定性死锁，故两条路径开头都先锁 char_shenwei
//   - 同一张表内锁多行时按 shenwei_id 升序加锁（见 Inherit 的下属行+自身行）；
//     所有查询都以 character_id 为条件，跨角色操作时必须按 character_id 升序依次加锁
//     防止死锁——当前接口均为单角色操作
package shenwei

import (
	"database/sql"
)

// Execer 兼容 *sql.DB 与 *sql.Tx 的最小执行接口（与 character 包同模式）
type Execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	QueryRow(query string, args ...interface{}) *sql.Row
}

// ─────────────────────────────────────
//  静态定义读取（shenwei_def / shenwei_switch_cost / shenwei_inherit_req）
// ─────────────────────────────────────

// getDef 读取一个神位定义；不存在返回 sql.ErrNoRows
func getDef(e Execer, shenweiID int) (*ShenweiDef, error) {
	d := &ShenweiDef{}
	var skillID, superiorID, fuseFromID sql.NullInt64
	err := e.QueryRow(
		`SELECT id, name, attr_type, grade, rank_type, bonus_jing, bonus_qi, bonus_shen,
		        skill_id, skill_tier, superior_id, fuse_from_id, acquire_method
		 FROM shenwei_def WHERE id=?`, shenweiID,
	).Scan(&d.ID, &d.Name, &d.AttrType, &d.Grade, &d.RankType,
		&d.BonusJing, &d.BonusQi, &d.BonusShen,
		&skillID, &d.SkillTier, &superiorID, &fuseFromID, &d.AcquireMethod)
	if err != nil {
		return nil, err
	}
	// NULL 列统一转 0（0 表示"无"）
	d.SkillID = int(skillID.Int64)
	d.SuperiorID = int(superiorID.Int64)
	d.FuseFromID = int(fuseFromID.Int64)
	return d, nil
}

// getFuseProduct 查询以指定神位为材料的融合产物（shenwei_def.fuse_from_id 反查）
// 无产物（帅级/碎片线神位）返回 sql.ErrNoRows
func getFuseProduct(e Execer, materialID int) (*ShenweiDef, error) {
	var productID int
	err := e.QueryRow("SELECT id FROM shenwei_def WHERE fuse_from_id=?", materialID).Scan(&productID)
	if err != nil {
		return nil, err
	}
	return getDef(e, productID)
}

// getSwitchCost 读取指定品级的切换费用配置
func getSwitchCost(e Execer, grade int) (*SwitchCost, error) {
	c := &SwitchCost{Grade: grade}
	err := e.QueryRow(
		"SELECT spirit_stone, talisman_count FROM shenwei_switch_cost WHERE grade=?", grade,
	).Scan(&c.SpiritStone, &c.TalismanCount)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// getInheritReq 读取指定品级的继承门槛公式参数
func getInheritReq(e Execer, grade int) (*InheritReq, error) {
	r := &InheritReq{Grade: grade}
	err := e.QueryRow(
		"SELECT base_req, per_level FROM shenwei_inherit_req WHERE grade=?", grade,
	).Scan(&r.BaseReq, &r.PerLevel)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// ─────────────────────────────────────
//  碎片（char_shenwei_fragment）
// ─────────────────────────────────────

// lockFragmentCount 事务内锁定并读取碎片数量（FOR UPDATE 行锁）；无记录返回0
func lockFragmentCount(tx *sql.Tx, characterID int64, shenweiID int) (int, error) {
	var count int
	err := tx.QueryRow(
		"SELECT count FROM char_shenwei_fragment WHERE character_id=? AND shenwei_id=? FOR UPDATE",
		characterID, shenweiID,
	).Scan(&count)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return count, err
}

// addFragment 增加碎片（upsert：无记录则插入）
func addFragment(e Execer, characterID int64, shenweiID, n int) error {
	_, err := e.Exec(
		`INSERT INTO char_shenwei_fragment (character_id, shenwei_id, count) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE count = count + VALUES(count)`,
		characterID, shenweiID, n,
	)
	return err
}

// deductFragment 扣减碎片（调用前必须已 FOR UPDATE 校验过数量充足）
func deductFragment(tx *sql.Tx, characterID int64, shenweiID, n int) error {
	_, err := tx.Exec(
		"UPDATE char_shenwei_fragment SET count = count - ? WHERE character_id=? AND shenwei_id=? AND count >= ?",
		n, characterID, shenweiID, n,
	)
	return err
}

// ─────────────────────────────────────
//  神位背包（char_shenwei_bag）
// ─────────────────────────────────────

// lockBagItem 事务内锁定并读取背包条目（count + inherited）；无记录返回 (0,false,nil)
func lockBagItem(tx *sql.Tx, characterID int64, shenweiID int) (count int, inherited bool, err error) {
	var inh int
	err = tx.QueryRow(
		"SELECT count, inherited FROM char_shenwei_bag WHERE character_id=? AND shenwei_id=? FOR UPDATE",
		characterID, shenweiID,
	).Scan(&count, &inh)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	return count, inh == 1, err
}

// addBagShenwei 增加完整神位（upsert）
func addBagShenwei(e Execer, characterID int64, shenweiID, n int) error {
	_, err := e.Exec(
		`INSERT INTO char_shenwei_bag (character_id, shenwei_id, count) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE count = count + VALUES(count)`,
		characterID, shenweiID, n,
	)
	return err
}

// deductBagShenwei 扣减完整神位（调用前必须已 FOR UPDATE 校验过数量充足）
func deductBagShenwei(tx *sql.Tx, characterID int64, shenweiID, n int) error {
	_, err := tx.Exec(
		"UPDATE char_shenwei_bag SET count = count - ? WHERE character_id=? AND shenwei_id=? AND count >= ?",
		n, characterID, shenweiID, n,
	)
	return err
}

// markInherited 打上"已继承"永久标记（继承成功后调用，之后可付费切换回来）
func markInherited(tx *sql.Tx, characterID int64, shenweiID int) error {
	_, err := tx.Exec(
		"UPDATE char_shenwei_bag SET inherited = 1 WHERE character_id=? AND shenwei_id=?",
		characterID, shenweiID,
	)
	return err
}

// ─────────────────────────────────────
//  货币（char_currency）与归元符（shenwei_talisman）
// ─────────────────────────────────────

// lockSpiritStone 事务内锁定并读取灵石余额；无记录返回0（视为余额0，不自动开户）
func lockSpiritStone(tx *sql.Tx, characterID int64) (int64, error) {
	var stone int64
	err := tx.QueryRow(
		"SELECT spirit_stone FROM char_currency WHERE character_id=? FOR UPDATE", characterID,
	).Scan(&stone)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return stone, err
}

// deductSpiritStone 扣减灵石（调用前必须已 FOR UPDATE 校验过余额充足）
func deductSpiritStone(tx *sql.Tx, characterID int64, n int) error {
	_, err := tx.Exec(
		"UPDATE char_currency SET spirit_stone = spirit_stone - ? WHERE character_id=? AND spirit_stone >= ?",
		n, characterID, n,
	)
	return err
}

// addSpiritStone 增加灵石（upsert，供 /shenwei/grant 内部发放）
func addSpiritStone(e Execer, characterID int64, n int) error {
	_, err := e.Exec(
		`INSERT INTO char_currency (character_id, spirit_stone) VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE spirit_stone = spirit_stone + VALUES(spirit_stone)`,
		characterID, n,
	)
	return err
}

// lockTalisman 事务内锁定并读取归元符数量；无记录返回0
func lockTalisman(tx *sql.Tx, characterID int64) (int, error) {
	var count int
	err := tx.QueryRow(
		"SELECT count FROM shenwei_talisman WHERE character_id=? FOR UPDATE", characterID,
	).Scan(&count)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return count, err
}

// deductTalisman 扣减归元符（调用前必须已 FOR UPDATE 校验过数量充足）
func deductTalisman(tx *sql.Tx, characterID int64, n int) error {
	_, err := tx.Exec(
		"UPDATE shenwei_talisman SET count = count - ? WHERE character_id=? AND count >= ?",
		n, characterID, n,
	)
	return err
}

// addTalisman 增加归元符（upsert，供 /shenwei/grant 内部发放）
func addTalisman(e Execer, characterID int64, n int) error {
	_, err := e.Exec(
		`INSERT INTO shenwei_talisman (character_id, count) VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE count = count + VALUES(count)`,
		characterID, n,
	)
	return err
}

// ─────────────────────────────────────
//  当前激活神位（char_shenwei）与角色属性联动
// ─────────────────────────────────────

// lockCurrentShenwei 事务内锁定并读取当前激活神位ID；未激活任何神位返回 (0,nil)
func lockCurrentShenwei(tx *sql.Tx, characterID int64) (int, error) {
	var id int
	err := tx.QueryRow(
		"SELECT shenwei_id FROM char_shenwei WHERE character_id=? AND active=1 FOR UPDATE", characterID,
	).Scan(&id)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return id, err
}

// upsertActiveShenwei 写入/更新当前激活神位（继承与切换共用）
func upsertActiveShenwei(tx *sql.Tx, characterID int64, shenweiID int) error {
	_, err := tx.Exec(
		`INSERT INTO char_shenwei (character_id, shenwei_id, inherited_at, active) VALUES (?, ?, NOW(), 1)
		 ON DUPLICATE KEY UPDATE shenwei_id = VALUES(shenwei_id), inherited_at = NOW(), active = 1`,
		characterID, shenweiID,
	)
	return err
}

// applyShenweiBonus 把神位精气神加成写入 character_attributes 的 shenwei_* 三列。
// 旧神位加成直接被新值整体覆盖（快照式，不做增减运算，天然幂等），
// 写完后调用方必须紧跟 character.RecalcAndSaveDerived 重算衍生值。
func applyShenweiBonus(tx *sql.Tx, characterID int64, jing, qi, shen int) error {
	_, err := tx.Exec(
		"UPDATE character_attributes SET shenwei_jing=?, shenwei_qi=?, shenwei_shen=? WHERE character_id=?",
		jing, qi, shen, characterID,
	)
	return err
}

// getNakedAttrsAndLevel 读取角色"裸体"精气神（不含神位加成 shenwei_*、不含装备）
// 与境界数据（用于换算角色等级）。
// 门槛校验必须用裸值：若用 jing+shenwei_jing 会出现"低级神位加成帮忙够到高级神位门槛"
// 的套娃循环（PRD 表5-1 明确要求裸体值，不含加成）。
func getNakedAttrsAndLevel(e Execer, characterID int64) (jing, qi, shen, level int, err error) {
	// character_attributes.jing/qi/shen 本身就是裸值（固定点+自由点），
	// 神位加成单独存于 shenwei_* 三列，不会混入
	if err = e.QueryRow(
		"SELECT jing, qi, shen FROM character_attributes WHERE character_id=?", characterID,
	).Scan(&jing, &qi, &shen); err != nil {
		return
	}
	var minorStage, stageSegment int
	if err = e.QueryRow(
		"SELECT minor_stage, stage_segment FROM character_realm WHERE character_id=?", characterID,
	).Scan(&minorStage, &stageSegment); err != nil {
		return
	}
	level = CharacterLevel(minorStage, stageSegment)
	return
}

// addFreePoints 发放自由属性点（写入 character_realm.unassigned_points 待分配池，
// 与升级发放同一入口，玩家通过 /character/points/allocate 自由分配到精/气/神）
func addFreePoints(e Execer, characterID int64, n int) error {
	_, err := e.Exec(
		"UPDATE character_realm SET unassigned_points = unassigned_points + ? WHERE character_id=?",
		n, characterID,
	)
	return err
}

// ─────────────────────────────────────
//  信息查询（GET /shenwei/info 专用，无锁普通读）
// ─────────────────────────────────────

// getCurrentShenweiID 读取当前激活神位ID（无锁）；未激活返回0
func getCurrentShenweiID(db *sql.DB, characterID int64) (int, error) {
	var id int
	err := db.QueryRow(
		"SELECT shenwei_id FROM char_shenwei WHERE character_id=? AND active=1", characterID,
	).Scan(&id)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return id, err
}

// listBagItems 列出角色背包中所有神位（JOIN 定义表取名称/品级/属性系）
func listBagItems(db *sql.DB, characterID int64) ([]BagItem, error) {
	rows, err := db.Query(
		`SELECT b.shenwei_id, d.name, d.grade, d.attr_type, b.count, b.inherited, b.obtained_at
		 FROM char_shenwei_bag b JOIN shenwei_def d ON d.id = b.shenwei_id
		 WHERE b.character_id=? ORDER BY d.grade DESC, b.shenwei_id`, characterID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]BagItem, 0)
	for rows.Next() {
		var it BagItem
		var inh int
		if err := rows.Scan(&it.ShenweiID, &it.Name, &it.Grade, &it.AttrType, &it.Count, &inh, &it.ObtainedAt); err != nil {
			return nil, err
		}
		it.Inherited = inh == 1
		items = append(items, it)
	}
	return items, rows.Err()
}

// listFragments 列出角色所有神位碎片（JOIN 定义表取名称，附带合成所需数7）
func listFragments(db *sql.DB, characterID int64) ([]FragmentItem, error) {
	rows, err := db.Query(
		`SELECT f.shenwei_id, d.name, f.count
		 FROM char_shenwei_fragment f JOIN shenwei_def d ON d.id = f.shenwei_id
		 WHERE f.character_id=? AND f.count > 0 ORDER BY f.shenwei_id`, characterID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]FragmentItem, 0)
	for rows.Next() {
		var it FragmentItem
		if err := rows.Scan(&it.ShenweiID, &it.Name, &it.Count); err != nil {
			return nil, err
		}
		it.Need = SynthesizeNeed
		items = append(items, it)
	}
	return items, rows.Err()
}

// getTalismanCount 读取归元符持有数（无锁）；无记录返回0
func getTalismanCount(db *sql.DB, characterID int64) (int, error) {
	var count int
	err := db.QueryRow("SELECT count FROM shenwei_talisman WHERE character_id=?", characterID).Scan(&count)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return count, err
}

// getSpiritStone 读取灵石余额（无锁）；无记录返回0
func getSpiritStone(db *sql.DB, characterID int64) (int64, error) {
	var stone int64
	err := db.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=?", characterID).Scan(&stone)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return stone, err
}
