// world.go 世界初始化：领地划分 / 族群实例 / 怪物实体 / 神兽分配
// 严格按照《寻仙 - 初始之地野怪系统 PRD+技术方案》第三章族群结构与技术方案 5.1/5.2 实现。
//
// 初始化规模（PRD 第三章）:
//   - 100个领地（10×10网格，中心 (col×1000+500, row×1000+500)，半径400）
//   - 每领地1个族群实例，族群编号=领地编号（1-100，山海经名录）
//   - 每族群：普通怪50 + 精英怪10 + Boss怪2 + 妖1 + 妖幼崽3（PRD"若干"取3）
//   - 全服20只神兽（每5族群一组共享1只），随机落在组内5个领地之一，随身1只神兽幼崽
//
// 幂等性：通过 territory 表行数判断是否已初始化，重复调用直接返回"已初始化"
package monster

import (
	"fmt"
	"math/rand"
)

// InitWorldResult 世界初始化结果统计
type InitWorldResult struct {
	Territories  int `json:"territories"`   // 生成领地数
	Factions     int `json:"factions"`      // 生成族群实例数
	Monsters     int `json:"monsters"`      // 生成怪物实体总数
	YaoCubs      int `json:"yao_cubs"`      // 生成妖幼崽数
	DivineBeasts int `json:"divine_beasts"` // 生成神兽数（含幼崽登记）
}

// initWorld 世界初始化核心逻辑（幂等）
// 返回统计结果；若已初始化过则返回 alreadyDone=true
func (s *Service) initWorld() (result InitWorldResult, alreadyDone bool, err error) {
	// ── 幂等检查：领地表已有数据视为已初始化 ──
	var count int
	if err = s.db.QueryRow("SELECT COUNT(*) FROM territory").Scan(&count); err != nil {
		return
	}
	if count >= TerritoryCount {
		alreadyDone = true
		return
	}

	// ── 步骤1：读取100族群名录（领地命名需要族群名） ──
	type speciesRow struct {
		ID   int
		Name string
	}
	rows, err := s.db.Query("SELECT species_id, name FROM monster_species ORDER BY species_id")
	if err != nil {
		return
	}
	speciesList := make([]speciesRow, 0, TerritoryCount)
	for rows.Next() {
		var sp speciesRow
		if err = rows.Scan(&sp.ID, &sp.Name); err != nil {
			rows.Close()
			return
		}
		speciesList = append(speciesList, sp)
	}
	rows.Close()
	if len(speciesList) < TerritoryCount {
		err = fmt.Errorf("monster_species 种子数据不足100条（当前%d条），请先执行 sql/monster_system.sql", len(speciesList))
		return
	}

	// ── 步骤2：生成100个领地（10×10网格） ──
	// 领地ID i（1-100）：row=(i-1)/10，col=(i-1)%10
	// 中心坐标：(col×1000+500, row×1000+500)，半径400（不重叠，怪物不串场）
	for i := 1; i <= TerritoryCount; i++ {
		row := (i - 1) / GridSize
		col := (i - 1) % GridSize
		cx := float64(col)*CellSize + CellSize/2
		cy := float64(row)*CellSize + CellSize/2
		name := speciesList[i-1].Name + "领地"
		_, err = s.db.Exec(
			`INSERT IGNORE INTO territory (territory_id, name, center_x, center_y, radius, danger_level)
			 VALUES (?, ?, ?, ?, ?, 2)`, // 外围危险等级固定★★
			i, name, cx, cy, TerritoryRadius,
		)
		if err != nil {
			return
		}
		result.Territories++
	}

	// ── 步骤3：生成100个族群实例（族群编号=领地编号） ──
	// faction_group = (species_id-1)/5 + 1，每5个族群共享1只神兽（技术方案 5.2）
	factionIDs := make(map[int]int64, TerritoryCount) // territory_id → faction_id
	for i := 1; i <= TerritoryCount; i++ {
		row := (i - 1) / GridSize
		col := (i - 1) % GridSize
		cx := float64(col)*CellSize + CellSize/2
		cy := float64(row)*CellSize + CellSize/2
		group := (i-1)/GroupSpan + 1

		var res int64
		var execRes interface {
			LastInsertId() (int64, error)
		}
		execRes, err = s.db.Exec(
			`INSERT INTO faction_instance (species_id, territory_id, faction_group, center_x, center_y, radius)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			i, i, group, cx, cy, TerritoryRadius,
		)
		if err != nil {
			return
		}
		res, err = execRes.LastInsertId()
		if err != nil {
			return
		}
		factionIDs[i] = res
		result.Factions++
	}

	// ── 步骤4：为每个族群生成怪物实体 ──
	// 数量结构（PRD 第三章）：普通50 + 精英10 + Boss2 + 妖1 + 妖幼崽3
	// 普通/精英/Boss/妖 阶位在人一阶~人三阶随机；幼崽固定人五阶
	// 五行属性全部随机分配（1-5）
	for i := 1; i <= TerritoryCount; i++ {
		fid := factionIDs[i]
		row := (i - 1) / GridSize
		col := (i - 1) % GridSize
		cx := float64(col)*CellSize + CellSize/2
		cy := float64(row)*CellSize + CellSize/2

		// 普通怪 ×50
		for n := 0; n < NormalPerFaction; n++ {
			if err = s.insertEntity(fid, i, TypeNormal, 1+rand.Intn(3), cx, cy); err != nil {
				return
			}
			result.Monsters++
		}
		// 精英怪 ×10
		for n := 0; n < ElitePerFaction; n++ {
			if err = s.insertEntity(fid, i, TypeElite, 1+rand.Intn(3), cx, cy); err != nil {
				return
			}
			result.Monsters++
		}
		// Boss怪 ×2
		for n := 0; n < BossPerFaction; n++ {
			if err = s.insertEntity(fid, i, TypeBoss, 1+rand.Intn(3), cx, cy); err != nil {
				return
			}
			result.Monsters++
		}
		// 妖 ×1
		if err = s.insertEntity(fid, i, TypeYao, 1+rand.Intn(3), cx, cy); err != nil {
			return
		}
		result.Monsters++

		// 妖幼崽 ×3（固定人五阶，登记到 yao_cub 表以支持CD刷新）
		for n := 0; n < YaoCubPerFaction; n++ {
			var entityID int64
			entityID, err = s.insertEntityReturnID(fid, i, TypeYaoCub, 5, cx, cy)
			if err != nil {
				return
			}
			// 查询实体的五行属性（插入时随机分配），登记妖幼崽表
			var elem int
			if err = s.db.QueryRow("SELECT element FROM monster_entity WHERE entity_id=?", entityID).Scan(&elem); err != nil {
				return
			}
			_, err = s.db.Exec(
				`INSERT INTO yao_cub (faction_id, entity_id, tier, element, is_captured) VALUES (?, ?, 5, ?, 0)`,
				fid, entityID, elem,
			)
			if err != nil {
				return
			}
			result.Monsters++
			result.YaoCubs++
		}
	}

	// ── 步骤5：生成20只神兽（技术方案 5.2 AssignDivineBeast） ──
	// 每组5个族群（如第1组=族群1-5），神兽随机落在组内5个领地之一
	// 神兽固定人九阶五修；神兽幼崽固定人五阶（属性=神兽人五阶的2/3），随神兽同领地
	for group := 1; group <= DivineGroupCount; group++ {
		// 组内随机选一个领地（组内领地编号 = (group-1)*5+1 ~ group*5）
		territoryID := (group-1)*GroupSpan + 1 + rand.Intn(GroupSpan)
		fid := factionIDs[territoryID]
		row := (territoryID - 1) / GridSize
		col := (territoryID - 1) % GridSize
		cx := float64(col)*CellSize + CellSize/2
		cy := float64(row)*CellSize + CellSize/2

		// 神兽本体（人九阶）
		var beastEntityID int64
		beastEntityID, err = s.insertEntityReturnID(fid, territoryID, TypeDivine, 9, cx, cy)
		if err != nil {
			return
		}
		// 神兽幼崽（人五阶，属性=神兽人五阶×2/3）
		var cubEntityID int64
		cubEntityID, err = s.insertEntityReturnID(fid, territoryID, TypeDivineCub, 5, cx, cy)
		if err != nil {
			return
		}

		// 神兽唯一性登记（species 原型 = 落点领地对应的族群）
		_, err = s.db.Exec(
			`INSERT INTO divine_beast (species_id, faction_group, territory_id, tier, entity_id, cub_entity_id, is_captured, cub_is_captured)
			 VALUES (?, ?, ?, 9, ?, ?, 0, 0)`,
			territoryID, group, territoryID, beastEntityID, cubEntityID,
		)
		if err != nil {
			return
		}
		// 回填族群实例的神兽ID
		_, err = s.db.Exec(
			`UPDATE faction_instance SET divine_beast_id=? WHERE faction_id=?`,
			beastEntityID, fid,
		)
		if err != nil {
			return
		}
		result.DivineBeasts++
		result.Monsters += 2 // 神兽本体+幼崽
	}

	// ── 步骤6：写入怪物模板缓存表（类型×阶数值，便于运营核对） ──
	// element=0 表示通用模板；普通/精英/Boss/妖/神兽 全1-9阶，幼崽只有5阶
	for _, mt := range []int{TypeNormal, TypeElite, TypeBoss, TypeYao, TypeDivine} {
		for tier := 1; tier <= 9; tier++ {
			attr := CalcMonsterAttr(mt, tier)
			multi := CalcCumulativeMultiplier(mt, tier)
			_, err = s.db.Exec(
				`INSERT IGNORE INTO monster_template (species_id, type, tier, element, hp, atk, def, spd, multi_mod)
				 VALUES (0, ?, ?, 0, ?, ?, ?, ?, ?)`,
				mt, tier, attr.HP, attr.ATK, attr.DEF, attr.SPD, multi,
			)
			if err != nil {
				return
			}
		}
	}
	for _, mt := range []int{TypeYaoCub, TypeDivineCub} {
		attr := CalcMonsterAttr(mt, 5)
		multi := CalcCumulativeMultiplier(mt, 5)
		_, err = s.db.Exec(
			`INSERT IGNORE INTO monster_template (species_id, type, tier, element, hp, atk, def, spd, multi_mod)
			 VALUES (0, ?, 5, 0, ?, ?, ?, ?, ?)`,
			mt, attr.HP, attr.ATK, attr.DEF, attr.SPD, multi,
		)
		if err != nil {
			return
		}
	}

	return
}

// insertEntity 插入一只怪物实体（不需要返回ID的场景）
func (s *Service) insertEntity(factionID int64, speciesID, monsterType, tier int, cx, cy float64) error {
	_, err := s.insertEntityReturnID(factionID, speciesID, monsterType, tier, cx, cy)
	return err
}

// insertEntityReturnID 插入一只怪物实体并返回实体ID
// 属性由 CalcMonsterAttr 按类型×阶计算；五行随机分配（1-5）；位置在领地圆内均匀随机
func (s *Service) insertEntityReturnID(factionID int64, speciesID, monsterType, tier int, cx, cy float64) (int64, error) {
	attr := CalcMonsterAttr(monsterType, tier)
	elem := 1 + rand.Intn(5) // 五行随机：1金 2木 3水 4火 5土
	px, py := randPosInRadius(cx, cy, TerritoryRadius)

	res, err := s.db.Exec(
		`INSERT INTO monster_entity (faction_id, species_id, type, tier, element, hp, max_hp, atk, def, spd, state, pos_x, pos_y)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
		factionID, speciesID, monsterType, tier, elem,
		attr.HP, attr.HP, attr.ATK, attr.DEF, attr.SPD, px, py,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}
