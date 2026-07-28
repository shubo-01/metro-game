// generate.go 装备生成与掉落系统
// 实现技术方案 GenerateEquipment / RollDrop 伪代码的严格落地：
//   - 装备生成：随机槽位/随机等级1-10/基数份额随机浮动/附加属性按品质区间随机
//   - 掉落判定：怪物类型×品质概率表 + 气运加成 + 神话品质50%转3碎片
package equipment

import (
	"fmt"
	"math/rand"
)

// ═══════════════════════════════════════════
//  装备生成（技术方案 GenerateEquipment）
// ═══════════════════════════════════════════

// EquipmentInfo 装备实例完整信息（接口出参通用结构）
type EquipmentInfo struct {
	EquipmentID   int64       `json:"equipment_id"`
	OwnerID       int64       `json:"owner_id"`
	Quality       int         `json:"quality"`
	QualityName   string      `json:"quality_name"`
	SlotType      int         `json:"slot_type"`
	WeaponType    int         `json:"weapon_type"`
	Level         int         `json:"level"`
	Durability    int         `json:"durability"`
	BaseAttrType  int         `json:"base_attr_type"`  // 1精 2神 3气
	BaseAttrShare float64     `json:"base_attr_share"` // 基数份额（武器为0，动态计算）
	IsEquipped    bool        `json:"is_equipped"`
	Source        string      `json:"source"`
	ExtraAttrs    []ExtraAttr `json:"extra_attrs"`
}

// ExtraAttr 装备附加属性（equipment_extra_attr 表一行）
type ExtraAttr struct {
	AttrType int     `json:"attr_type"` // 1-16（暴击率/闪避率/…/冷却缩减）
	AttrName string  `json:"attr_name"` // 属性名称
	Value    float64 `json:"value"`     // 1级基准数值
	Category int     `json:"category"`  // 1百分比 2元素 3特殊效果 4功能
}

// allSlotTypes 可随机的槽位池（8甲+4首饰+主副武器，用于随机槽位生成）
var allSlotTypes = []int{
	SlotHead, SlotFace, SlotBody, SlotCrotch, SlotLeg, SlotFoot, SlotArm, SlotBelt,
	SlotBracelet, SlotRing, SlotEarring, SlotNecklace,
	SlotMainWeapon, SlotSubWeapon,
}

// randomSlotType 随机产出一个槽位类型（掉落/打造随机槽位图纸/碎片合成用）
func randomSlotType() int {
	return allSlotTypes[rand.Intn(len(allSlotTypes))]
}

// slotBaseInfo 根据槽位类型返回 (装备大类, 基础加成属性, 基数份额)
// 甲：每件基数 1/8 精；首饰：每件基数 1/4 神；武器：份额动态计算存0
// 甲/首饰生成时份额附加 0.7~1.3 随机浮动（PRD 4.1 "随机分配"，期望总和=品质倍率×1）
func slotBaseInfo(slotType int) (category, attrType int, share float64) {
	switch {
	case slotType >= SlotHead && slotType <= SlotBelt:
		return CategoryArmor, AttrJing, (1.0 / 8.0) * randFloatRange(0.7, 1.3)
	case slotType >= SlotBracelet && slotType <= SlotNecklace:
		return CategoryJewelry, AttrShen, (1.0 / 4.0) * randFloatRange(0.7, 1.3)
	default:
		return CategoryWeapon, AttrQi, 0 // 武器份额动态计算（WeaponShare）
	}
}

// randomWeaponType 武器槽位随机武器类型：1刀剑 2枪戟 3锤斧 4弓弩 5扇笛 6法杖（PRD 第八章）
func randomWeaponType(slotType int) int {
	if slotType == SlotMainWeapon || slotType == SlotSubWeapon {
		return 1 + rand.Intn(6)
	}
	return 0
}

// rollExtraAttrs 按品质随机生成附加属性（PRD 7.1 数量 + 7.2-7.5 数值区间）
// 数量在 [extra_attr_min, extra_attr_max] 随机；属性类型不重复；
// 数值在 equip_attr_config 对应品质区间内随机（1级基准值，实际值随等级提升）
// 神话碎片（extra_attr_max=0）不生成附加属性，合成完整神话后才生成
func (s *Service) rollExtraAttrs(quality int) []ExtraAttr {
	qc, ok := s.getQualityConfig(quality)
	if !ok || qc.ExtraAttrMax <= 0 {
		return nil
	}
	count := randRange(qc.ExtraAttrMin, qc.ExtraAttrMax)
	if count <= 0 {
		return nil
	}

	// 拉取该品质全部可选属性区间配置
	rows, err := s.db.Query(`SELECT attr_type, attr_name, category, min_value, max_value
		FROM equip_attr_config WHERE quality = ?`, quality)
	if err != nil {
		return nil
	}
	defer rows.Close()

	type attrRange struct {
		attrType int
		attrName string
		category int
		minV     float64
		maxV     float64
	}
	var pool []attrRange
	for rows.Next() {
		var a attrRange
		if err := rows.Scan(&a.attrType, &a.attrName, &a.category, &a.minV, &a.maxV); err == nil {
			pool = append(pool, a)
		}
	}
	if len(pool) == 0 {
		return nil
	}

	// 洗牌后取前 count 个，保证属性类型不重复
	rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	if count > len(pool) {
		count = len(pool)
	}

	attrs := make([]ExtraAttr, 0, count)
	for i := 0; i < count; i++ {
		a := pool[i]
		attrs = append(attrs, ExtraAttr{
			AttrType: a.attrType,
			AttrName: a.attrName,
			Value:    randFloatRange(a.minV, a.maxV),
			Category: a.category,
		})
	}
	return attrs
}

// GenerateEquipment 生成一件装备并落库（技术方案 GenerateEquipment 落地）
//
// 参数:
//   - ownerID: 装备所有者
//   - quality: 品质 1-9
//   - slotType: 槽位类型（传0则随机槽位）
//   - level: 装备等级（传0则随机1~10，PRD 5.2 掉落/打造时随机）
//   - source: 来源标记（drop/craft/daobao_combine/shard_combine）
//
// 返回生成的装备完整信息（含已落库的附加属性）
func (s *Service) GenerateEquipment(ownerID int64, quality, slotType, level int, source string) (*EquipmentInfo, error) {
	qc, ok := s.getQualityConfig(quality)
	if !ok {
		return nil, fmt.Errorf("非法品质: %d", quality)
	}
	if slotType == 0 {
		slotType = randomSlotType()
	}
	if level == 0 {
		level = 1 + rand.Intn(10) // 随机1~10级
	}

	category, attrType, share := slotBaseInfo(slotType)
	_ = category
	weaponType := randomWeaponType(slotType)

	// 写入装备实例
	res, err := s.db.Exec(`INSERT INTO equipment_instance
		(owner_id, quality, slot_type, weapon_type, level, durability, base_attr_type, base_attr_share, is_equipped, status, source)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
		ownerID, quality, slotType, weaponType, level, MaxDurability, attrType, share, source)
	if err != nil {
		return nil, fmt.Errorf("写入装备实例失败: %w", err)
	}
	equipmentID, _ := res.LastInsertId()

	// 随机附加属性并落库（神话碎片跳过，合成后才生成）
	extraAttrs := s.rollExtraAttrs(quality)
	for _, a := range extraAttrs {
		_, _ = s.db.Exec(`INSERT INTO equipment_extra_attr (equipment_id, attr_type, attr_value, attr_category)
			VALUES (?, ?, ?, ?)`, equipmentID, a.AttrType, a.Value, a.Category)
	}

	return &EquipmentInfo{
		EquipmentID:   equipmentID,
		OwnerID:       ownerID,
		Quality:       quality,
		QualityName:   qc.Name,
		SlotType:      slotType,
		WeaponType:    weaponType,
		Level:         level,
		Durability:    MaxDurability,
		BaseAttrType:  attrType,
		BaseAttrShare: share,
		IsEquipped:    false,
		Source:        source,
		ExtraAttrs:    extraAttrs,
	}, nil
}

// ═══════════════════════════════════════════
//  掉落系统（PRD 第十一章 + 技术方案 7.1 RollDrop）
// ═══════════════════════════════════════════

// dropEntry 掉落概率表一行（equip_drop_table）
type dropEntry struct {
	Quality      int
	BaseRate     float64
	DropTimesMin int
	DropTimesMax int
}

// RollDropResult 掉落判定结果
type RollDropResult struct {
	Drops       []*EquipmentInfo `json:"drops"`        // 掉落的装备列表
	ShardGained int              `json:"shard_gained"` // 本次获得的神话碎片数（神话品质50%转3碎片）
	ShardTotal  int              `json:"shard_total"`  // 玩家当前碎片总数
	Luck        float64          `json:"luck"`         // 本次判定使用的气运归一化值
	RollTimes   int              `json:"roll_times"`   // 实际判定次数
}

// RollDrop 击杀怪物后的装备掉落判定（技术方案 7.1 严格落地）
//
// 流程:
//  1. 按怪物类型读取掉落概率表（品质从高到低排序）
//  2. 判定次数在 [drop_times_min, drop_times_max] 随机（PRD 11.2：普1 精1-2 Boss2-3 妖2-3 神兽3-5）
//  3. 每次判定：从最高品质向下遍历，rand < base_rate×(1+luck) 即命中该品质并结束本次判定
//  4. 命中神话品质时，50% 概率转为掉落3个神话碎片（PRD 12.1）
//  5. 命中装备则 GenerateEquipment（随机槽位/随机等级1-10）
func (s *Service) RollDrop(playerID int64, monsterType int) (*RollDropResult, error) {
	rows, err := s.db.Query(`SELECT quality, base_rate, drop_times_min, drop_times_max
		FROM equip_drop_table WHERE monster_type = ? AND enabled = 1
		ORDER BY quality DESC`, monsterType)
	if err != nil {
		return nil, fmt.Errorf("读取掉落表失败: %w", err)
	}
	defer rows.Close()

	var entries []dropEntry
	for rows.Next() {
		var e dropEntry
		if err := rows.Scan(&e.Quality, &e.BaseRate, &e.DropTimesMin, &e.DropTimesMax); err == nil {
			entries = append(entries, e)
		}
	}
	if len(entries) == 0 {
		return nil, fmt.Errorf("怪物类型 %d 无掉落配置", monsterType)
	}

	luck := s.getPlayerLuck(playerID)
	rollTimes := randRange(entries[0].DropTimesMin, entries[0].DropTimesMax)

	result := &RollDropResult{Luck: luck, RollTimes: rollTimes, Drops: []*EquipmentInfo{}}

	for i := 0; i < rollTimes; i++ {
		// 从最高品质向下逐档判定，命中即结束本次判定
		for _, e := range entries {
			finalRate := e.BaseRate * (1.0 + luck)
			if rand.Float64() >= finalRate {
				continue
			}
			// 命中神话品质：50% 概率转为3个神话碎片（PRD 12.1）
			if e.Quality == QualityMyth && rand.Float64() < MythToShardRate {
				result.ShardGained += ShardDropCount
			} else {
				eq, genErr := s.GenerateEquipment(playerID, e.Quality, 0, 0, "drop")
				if genErr == nil {
					result.Drops = append(result.Drops, eq)
				}
			}
			break
		}
	}

	// 碎片入账（myth_shard 每玩家一行，UPSERT 累加）
	if result.ShardGained > 0 {
		_, err = s.db.Exec(`INSERT INTO myth_shard (owner_id, count) VALUES (?, ?)
			ON DUPLICATE KEY UPDATE count = count + VALUES(count)`, playerID, result.ShardGained)
		if err != nil {
			return nil, fmt.Errorf("碎片入账失败: %w", err)
		}
	}
	result.ShardTotal = s.getShardCount(playerID)
	return result, nil
}

// getShardCount 查询玩家当前神话碎片持有数
func (s *Service) getShardCount(playerID int64) int {
	var count int
	_ = s.db.QueryRow("SELECT count FROM myth_shard WHERE owner_id = ?", playerID).Scan(&count)
	return count
}

// loadEquipment 按ID读取装备实例（含附加属性），第二返回值 false 表示不存在或已碎裂
func (s *Service) loadEquipment(equipmentID int64) (*EquipmentInfo, bool) {
	var eq EquipmentInfo
	var isEquipped, status int
	err := s.db.QueryRow(`SELECT equipment_id, owner_id, quality, slot_type, weapon_type, level,
		durability, base_attr_type, base_attr_share, is_equipped, status, IFNULL(source,'')
		FROM equipment_instance WHERE equipment_id = ?`, equipmentID).
		Scan(&eq.EquipmentID, &eq.OwnerID, &eq.Quality, &eq.SlotType, &eq.WeaponType, &eq.Level,
			&eq.Durability, &eq.BaseAttrType, &eq.BaseAttrShare, &isEquipped, &status, &eq.Source)
	if err != nil || status != 0 {
		return nil, false
	}
	eq.IsEquipped = isEquipped == 1
	if qc, ok := s.getQualityConfig(eq.Quality); ok {
		eq.QualityName = qc.Name
	}
	eq.ExtraAttrs = s.loadExtraAttrs(equipmentID)
	return &eq, true
}

// loadExtraAttrs 读取装备的附加属性列表（联查属性名称）
func (s *Service) loadExtraAttrs(equipmentID int64) []ExtraAttr {
	rows, err := s.db.Query(`SELECT e.attr_type, IFNULL(c.attr_name,''), e.attr_value, e.attr_category
		FROM equipment_extra_attr e
		LEFT JOIN (SELECT DISTINCT attr_type, attr_name FROM equip_attr_config) c ON c.attr_type = e.attr_type
		WHERE e.equipment_id = ?`, equipmentID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var attrs []ExtraAttr
	for rows.Next() {
		var a ExtraAttr
		if err := rows.Scan(&a.AttrType, &a.AttrName, &a.Value, &a.Category); err == nil {
			attrs = append(attrs, a)
		}
	}
	return attrs
}
