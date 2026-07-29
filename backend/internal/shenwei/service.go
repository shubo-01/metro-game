// Package shenwei 神位系统业务逻辑层。
// 纯计算函数（门槛公式/费用/晋升判定等）全部无 DB 依赖，方便表驱动单元测试；
// 业务方法（合成/融合/继承/切换/发放）走事务 + FOR UPDATE 行锁保证并发安全。
package shenwei

import (
	"database/sql"
	"fmt"

	"xunxian/internal/character"
)

// Service 神位服务，持有数据库连接（无需 Redis）
type Service struct {
	db *sql.DB
}

// NewService 创建神位服务实例
func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

// ═══════════════════════════════════════════
//  纯计算函数（无 DB 依赖，供单元测试表驱动验证）
// ═══════════════════════════════════════════

// CalcInheritThreshold 继承精气神门槛公式：门槛 = base + perLevel × (Lv - 1)
// 参数来自 shenwei_inherit_req 表（计算公式.xlsx）：
//
//	凡品 base=0 per=0（无要求）；珍品 200+3(Lv-1)；灵品 500+7(Lv-1)；
//	仙品 1200+15(Lv-1)；神话 3000+30(Lv-1)；先天 7000+50(Lv-1)
//
// 等级下限保护：Lv<1 按 Lv=1 计算
func CalcInheritThreshold(baseReq, perLevel, level int) int {
	if level < 1 {
		level = 1
	}
	return baseReq + perLevel*(level-1)
}

// InheritReqTable Go 侧门槛参数镜像（与 v3_shenwei_system.sql 种子严格一致，
// 供单元测试锚点校验；运行时业务以 DB 配置为权威数据源）
var InheritReqTable = map[int]InheritReq{
	GradeFan:      {Grade: GradeFan, BaseReq: 0, PerLevel: 0},
	GradeZhen:     {Grade: GradeZhen, BaseReq: 200, PerLevel: 3},
	GradeLing:     {Grade: GradeLing, BaseReq: 500, PerLevel: 7},
	GradeXian:     {Grade: GradeXian, BaseReq: 1200, PerLevel: 15},
	GradeShenhua:  {Grade: GradeShenhua, BaseReq: 3000, PerLevel: 30},
	GradeXiantian: {Grade: GradeXiantian, BaseReq: 7000, PerLevel: 50},
}

// SwitchCostTable Go 侧切换费用镜像（与 SQL 种子一致，供测试；运行时以 DB 为准）
var SwitchCostTable = map[int]SwitchCost{
	GradeFan:      {Grade: GradeFan, SpiritStone: 10, TalismanCount: 1},
	GradeZhen:     {Grade: GradeZhen, SpiritStone: 30, TalismanCount: 2},
	GradeLing:     {Grade: GradeLing, SpiritStone: 80, TalismanCount: 2},
	GradeXian:     {Grade: GradeXian, SpiritStone: 150, TalismanCount: 3},
	GradeShenhua:  {Grade: GradeShenhua, SpiritStone: 300, TalismanCount: 4},
	GradeXiantian: {Grade: GradeXiantian, SpiritStone: 500, TalismanCount: 5},
}

// CalcSwitchTotalCost 切换总成本（灵石当量）= 灵石 + 归元符数 × 99
// 用于对照 PRD 表8-1：凡109/珍228/灵278/仙447/神话696/先天995
func CalcSwitchTotalCost(spiritStone, talismanCount int) int {
	return spiritStone + talismanCount*TalismanPrice
}

// CanSynthesize 碎片是否够合成（7 → 1 边界判定）
func CanSynthesize(fragmentCount int) bool {
	return fragmentCount >= SynthesizeNeed
}

// CanFuse 完整神位是否够融合（9 → 1 边界判定）
func CanFuse(shenweiCount int) bool {
	return shenweiCount >= FuseNeed
}

// IsPromotion 晋升免费判定：目标神位是否在当前激活神位的"上位链"上。
// superiorOf 为上位查询函数（返回该神位的上位ID与是否存在），
// 从当前神位沿 superior 链向上走，走到目标即为晋升（免费）。
// 例：当前=美猴王(10)，美猴王.superior=齐天大圣(12)，目标=12 → true。
// 带步数上限防御配置错误导致的环形链死循环。
func IsPromotion(currentID, targetID int, superiorOf func(int) (int, bool)) bool {
	if currentID == 0 || targetID == 0 || currentID == targetID {
		return false
	}
	cur := currentID
	for i := 0; i < 16; i++ { // 上位链深度上限16，防环
		sup, ok := superiorOf(cur)
		if !ok || sup == 0 {
			return false // 链到头也没遇到目标 → 非晋升
		}
		if sup == targetID {
			return true // 目标在上位链上 → 晋升免费
		}
		cur = sup
	}
	return false
}

// CharacterLevel 把项目境界体系换算为门槛公式所用的"角色等级 Lv"。
// 本项目角色成长为 9阶(minor_stage 1-9) × 10段(stage_segment 0-9)，
// 映射 Lv = (minor_stage-1)×10 + stage_segment + 1，范围 1~90，
// 与计算公式表的 Lv1-100 曲线同一量纲（公式为线性，直接代入即可）。
func CharacterLevel(minorStage, stageSegment int) int {
	if minorStage < 1 {
		minorStage = 1
	}
	if stageSegment < 0 {
		stageSegment = 0
	}
	return (minorStage-1)*10 + stageSegment + 1
}

// ═══════════════════════════════════════════
//  业务方法（事务 + FOR UPDATE）
// ═══════════════════════════════════════════

// Synthesize 碎片合成：7个碎片 → 1个完整神位入背包。
// 碎片不足返回业务错误 4001。
func (s *Service) Synthesize(characterID int64, shenweiID int) (map[string]interface{}, error) {
	// 神位定义校验（静态表，事务外读即可）
	def, err := getDef(s.db, shenweiID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "神位不存在"}
	}
	if err != nil {
		return nil, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// FOR UPDATE 锁定碎片行后校验数量（防并发双花）
	count, err := lockFragmentCount(tx, characterID, shenweiID)
	if err != nil {
		return nil, err
	}
	if !CanSynthesize(count) {
		return nil, &BizError{Code: CodeFragmentNotEnough,
			Msg: fmt.Sprintf("神位碎片不足：合成【%s】需要%d个碎片，当前仅有%d个", def.Name, SynthesizeNeed, count)}
	}

	// 扣7碎片 → 背包+1完整神位（同事务原子完成）
	if err := deductFragment(tx, characterID, shenweiID, SynthesizeNeed); err != nil {
		return nil, err
	}
	if err := addBagShenwei(tx, characterID, shenweiID, 1); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"shenwei_id":         shenweiID,
		"shenwei_name":       def.Name,
		"fragments_consumed": SynthesizeNeed,
		"fragments_left":     count - SynthesizeNeed,
	}, nil
}

// Fuse 神位融合：9个同品级同属性系完整神位 → 1个高一阶神位。
// 融合链（shenwei_def.fuse_from_id 配置）：兵→将→帅（妖/魔/道三条线）。
// 材料不足返回 4002；材料无更高阶产物（帅级/碎片线神位）返回 4003。
func (s *Service) Fuse(characterID int64, materialID int) (map[string]interface{}, error) {
	material, err := getDef(s.db, materialID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "材料神位不存在"}
	}
	if err != nil {
		return nil, err
	}

	// 反查融合产物：无产物 = 已是最高阶（帅级；"9帅→灵品?"PRD留白待定）
	product, err := getFuseProduct(s.db, materialID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: CodeFuseTopRank,
			Msg: fmt.Sprintf("【%s】已是最高阶或不可融合，无更高阶产物", material.Name)}
	}
	if err != nil {
		return nil, err
	}
	// 属性系一致性防御校验（种子数据保证同线融合，这里防配置错误）
	if material.AttrType != product.AttrType {
		return nil, &BizError{Code: 400, Msg: "融合配置异常：材料与产物属性系不一致"}
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// FOR UPDATE 锁定材料背包行后校验数量
	count, _, err := lockBagItem(tx, characterID, materialID)
	if err != nil {
		return nil, err
	}
	if !CanFuse(count) {
		return nil, &BizError{Code: CodeFuseNotEnough,
			Msg: fmt.Sprintf("融合材料不足：融合【%s】需要%d个【%s】，当前仅有%d个", product.Name, FuseNeed, material.Name, count)}
	}

	// 扣9材料 → 背包+1产物
	if err := deductBagShenwei(tx, characterID, materialID, FuseNeed); err != nil {
		return nil, err
	}
	if err := addBagShenwei(tx, characterID, product.ID, 1); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"material_shenwei_id": materialID,
		"material_name":       material.Name,
		"material_consumed":   FuseNeed,
		"product_shenwei_id":  product.ID,
		"product_name":        product.Name,
		"product_grade":       product.Grade,
	}, nil
}

// Inherit 神位继承：消耗1个背包完整神位，打上永久 inherited 标记，
// 并立即激活（写 char_shenwei + character_attributes.shenwei_* + 重算衍生值）。
// 校验顺序（PRD 表5-1 校验逻辑树）：
//  1. 凡品跳过门槛校验；
//  2. 裸体精气神总和 >= 门槛（base+per_level×(Lv-1)），不足 4010；
//  3. 有下属且下属未继承 → 4012；
//  4. 背包无该完整神位 → 400。
//
// 说明：门槛用裸属性 jing/qi/shen（不含 shenwei_* 神位加成）判定，
// 防止"戴着低级神位的加成够到高级神位门槛"的套娃循环。
func (s *Service) Inherit(characterID int64, shenweiID int) (map[string]interface{}, error) {
	def, err := getDef(s.db, shenweiID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "神位不存在"}
	}
	if err != nil {
		return nil, err
	}

	// ── 门槛校验（凡品跳过）──
	if def.Grade > GradeFan {
		jing, qi, shen, level, err := getNakedAttrsAndLevel(s.db, characterID)
		if err != nil {
			return nil, err
		}
		req, err := getInheritReq(s.db, def.Grade)
		if err != nil {
			return nil, err
		}
		threshold := CalcInheritThreshold(req.BaseReq, req.PerLevel, level)
		naked := jing + qi + shen // 裸体精气神总和（不含神位加成/装备）
		if naked < threshold {
			return nil, &BizError{Code: CodeAttrNotEnough,
				Msg: fmt.Sprintf("精气神不足：继承【%s】(Lv%d)需要裸体精气神总和≥%d，当前%d，还差%d（可通过副本自由属性点补足）",
					def.Name, level, threshold, naked, threshold-naked)}
		}
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// ── 锁序第1步：先锁 char_shenwei 当前激活行（全局锁序第1张表，与 Switch 对齐）──
	// 死锁场景说明：若 Inherit 先锁 bag 后锁 char_shenwei，而 Switch 先锁 char_shenwei
	// 后锁 bag，同角色并发"继承+切换"时两事务会交叉持锁互等形成确定性死锁；
	// 统一为 char_shenwei → bag → currency → talisman 后，后到事务会在第1张表上
	// 排队等待，不再交叉。返回值这里不需要，首次继承时无激活行也不报错。
	if _, err := lockCurrentShenwei(tx, characterID); err != nil {
		return nil, err
	}

	// ── 查下属定义（静态表普通读，不加锁）──
	// 下属 = superior_id 指向本神位的神位；如齐天大圣要求先继承美猴王
	var subID int
	var subName string
	err = tx.QueryRow("SELECT id, name FROM shenwei_def WHERE superior_id=?", shenweiID).Scan(&subID, &subName)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// ── 锁序第2步：bag 表内多行按 shenwei_id 升序加锁（同表多行固定顺序防交叉）──
	// 需要锁两行：下属行（查 inherited 标记）+ 自身行（查持有数），
	// 先锁完再做业务校验，锁顺序与校验顺序解耦
	var count int
	var subInherited bool
	if subID != 0 && subID < shenweiID {
		// 下属ID小 → 先锁下属行再锁自身行
		if _, subInherited, err = lockBagItem(tx, characterID, subID); err != nil {
			return nil, err
		}
		if count, _, err = lockBagItem(tx, characterID, shenweiID); err != nil {
			return nil, err
		}
	} else {
		// 无下属，或下属ID大 → 先锁自身行
		if count, _, err = lockBagItem(tx, characterID, shenweiID); err != nil {
			return nil, err
		}
		if subID != 0 {
			if _, subInherited, err = lockBagItem(tx, characterID, subID); err != nil {
				return nil, err
			}
		}
	}

	// ── 下属前置校验：下属存在且未继承 → 4012 ──
	if subID != 0 && !subInherited {
		return nil, &BizError{Code: CodeNeedSubordinate,
			Msg: fmt.Sprintf("需先继承下属神位【%s】，才能继承上位神位【%s】", subName, def.Name)}
	}

	// ── 背包持有校验 ──
	if count < 1 {
		return nil, &BizError{Code: 400, Msg: fmt.Sprintf("背包中没有完整的【%s】神位，请先合成或融合获得", def.Name)}
	}

	// ── 执行继承：扣1完整神位 + 永久标记 + 激活 + 写加成 + 重算 ──
	// 继承消耗完整神位（PRD 8.1），但 inherited 标记永久有效：
	// 之后可通过 /shenwei/switch 付费切换回来，无需重新刷神位
	if err := deductBagShenwei(tx, characterID, shenweiID, 1); err != nil {
		return nil, err
	}
	if err := markInherited(tx, characterID, shenweiID); err != nil {
		return nil, err
	}
	if err := upsertActiveShenwei(tx, characterID, shenweiID); err != nil {
		return nil, err
	}
	// 加成快照覆盖写入（旧神位加成自动被替换）
	if err := applyShenweiBonus(tx, characterID, def.BonusJing, def.BonusQi, def.BonusShen); err != nil {
		return nil, err
	}
	// 同事务内重算衍生值：有效精气神 = 裸值 + shenwei_*（character 包已改造支持）
	derived, err := character.RecalcAndSaveDerived(tx, characterID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"shenwei_id":   shenweiID,
		"shenwei_name": def.Name,
		"bonus":        map[string]int{"jing": def.BonusJing, "qi": def.BonusQi, "shen": def.BonusShen},
		"skill_id":     def.SkillID,
		"skill_tier":   def.SkillTier,
		"derived":      derived, // 重算后的最新衍生属性
	}, nil
}

// Switch 神位切换：在"已继承"的神位之间切换激活。
// 规则（PRD 8.3）：
//   - 目标必须已继承（inherited=1），否则 400；
//   - 目标在当前激活神位的上位链上 → 晋升，免费；
//   - 普通切换按【当前激活(旧)神位】品级扣 灵石+归元符（旧神位费用不返还），
//     灵石不足 4020、归元符不足 4021；
//   - 切换后写 char_shenwei active + 覆盖 shenwei_* 三列 + 同事务重算衍生值。
func (s *Service) Switch(characterID int64, targetID int) (map[string]interface{}, error) {
	target, err := getDef(s.db, targetID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "目标神位不存在"}
	}
	if err != nil {
		return nil, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 当前激活神位（FOR UPDATE 锁定，防止并发切换）
	currentID, err := lockCurrentShenwei(tx, characterID)
	if err != nil {
		return nil, err
	}
	if currentID == 0 {
		return nil, &BizError{Code: 400, Msg: "当前未激活任何神位，请先通过继承接口激活首个神位"}
	}
	if currentID == targetID {
		return nil, &BizError{Code: 400, Msg: "目标神位已是当前激活神位，无需切换"}
	}

	// 目标必须已继承（inherited 永久标记）
	_, inherited, err := lockBagItem(tx, characterID, targetID)
	if err != nil {
		return nil, err
	}
	if !inherited {
		return nil, &BizError{Code: 400, Msg: fmt.Sprintf("【%s】尚未继承，请先通过继承接口继承后再切换", target.Name)}
	}

	// 晋升判定：目标在当前神位的上位链上 → 免费（PRD 4：下属→上位晋升不消耗灵石与归元符）
	isPromotion := IsPromotion(currentID, targetID, func(id int) (int, bool) {
		d, err := getDef(tx, id)
		if err != nil {
			return 0, false
		}
		return d.SuperiorID, true
	})

	// 普通切换：按当前激活(旧)神位品级扣费（技术方案伪代码 Switch 步骤4，费用不返还）
	costStone, costTalisman := 0, 0
	if !isPromotion {
		current, err := getDef(tx, currentID)
		if err != nil {
			return nil, err
		}
		cost, err := getSwitchCost(tx, current.Grade)
		if err != nil {
			return nil, err
		}
		costStone, costTalisman = cost.SpiritStone, cost.TalismanCount

		// 灵石校验+扣减（FOR UPDATE）
		stone, err := lockSpiritStone(tx, characterID)
		if err != nil {
			return nil, err
		}
		if stone < int64(costStone) {
			return nil, &BizError{Code: CodeSpiritStoneNotEnough,
				Msg: fmt.Sprintf("灵石不足：切换需要%d灵石，当前余额%d", costStone, stone)}
		}
		// 归元符校验+扣减（FOR UPDATE）
		talisman, err := lockTalisman(tx, characterID)
		if err != nil {
			return nil, err
		}
		if talisman < costTalisman {
			return nil, &BizError{Code: CodeTalismanNotEnough,
				Msg: fmt.Sprintf("归元符不足：切换需要%d个归元符，当前持有%d个（副本3%%掉率或商城99灵石/个）", costTalisman, talisman)}
		}
		if err := deductSpiritStone(tx, characterID, costStone); err != nil {
			return nil, err
		}
		if err := deductTalisman(tx, characterID, costTalisman); err != nil {
			return nil, err
		}
	}

	// 切换激活 + 覆盖加成 + 同事务重算衍生值
	if err := upsertActiveShenwei(tx, characterID, targetID); err != nil {
		return nil, err
	}
	if err := applyShenweiBonus(tx, characterID, target.BonusJing, target.BonusQi, target.BonusShen); err != nil {
		return nil, err
	}
	derived, err := character.RecalcAndSaveDerived(tx, characterID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"old_shenwei_id": currentID,
		"new_shenwei_id": targetID,
		"new_name":       target.Name,
		"is_promotion":   isPromotion,
		"spirit_stone":   costStone,
		"talisman_count": costTalisman,
		"total_cost":     CalcSwitchTotalCost(costStone, costTalisman),
		"bonus":          map[string]int{"jing": target.BonusJing, "qi": target.BonusQi, "shen": target.BonusShen},
		"derived":        derived,
	}, nil
}

// Grant 内部发放：供 dungeon-service 副本结算掉落回调。
// grant_type：1碎片(带shenwei_id) / 2归元符 / 3灵石 / 4自由属性点 / 5完整神位(带shenwei_id)
// 权限校验在 handler 层完成（X-Internal-Key 或本机回环）。
func (s *Service) Grant(characterID int64, grantType, shenweiID, count int) (map[string]interface{}, error) {
	if count <= 0 {
		return nil, &BizError{Code: 400, Msg: "发放数量必须大于0"}
	}

	switch grantType {
	case GrantFragment:
		// 校验目标神位存在，防脏数据
		if _, err := getDef(s.db, shenweiID); err != nil {
			return nil, &BizError{Code: 404, Msg: "碎片目标神位不存在"}
		}
		if err := addFragment(s.db, characterID, shenweiID, count); err != nil {
			return nil, err
		}
	case GrantTalisman:
		if err := addTalisman(s.db, characterID, count); err != nil {
			return nil, err
		}
	case GrantSpiritStone:
		if err := addSpiritStone(s.db, characterID, count); err != nil {
			return nil, err
		}
	case GrantFreePoint:
		if err := addFreePoints(s.db, characterID, count); err != nil {
			return nil, err
		}
	case GrantShenwei:
		if _, err := getDef(s.db, shenweiID); err != nil {
			return nil, &BizError{Code: 404, Msg: "发放目标神位不存在"}
		}
		if err := addBagShenwei(s.db, characterID, shenweiID, count); err != nil {
			return nil, err
		}
	default:
		return nil, &BizError{Code: 400, Msg: fmt.Sprintf("未知发放类型 grant_type=%d", grantType)}
	}

	return map[string]interface{}{
		"character_id": characterID,
		"grant_type":   grantType,
		"shenwei_id":   shenweiID,
		"count":        count,
	}, nil
}

// Info 神位总览：当前激活神位 + 背包列表 + 碎片列表 + 归元符数 + 灵石余额。
// 纯读接口无需事务（各表独立快照读，展示用途允许瞬时不一致）。
func (s *Service) Info(characterID int64) (map[string]interface{}, error) {
	// 当前激活神位（未激活时 current 为 nil）
	currentID, err := getCurrentShenweiID(s.db, characterID)
	if err != nil {
		return nil, err
	}
	var current interface{} // 未激活输出 null，前端好判断
	if currentID != 0 {
		def, err := getDef(s.db, currentID)
		if err != nil {
			return nil, err
		}
		current = def
	}

	bag, err := listBagItems(s.db, characterID)
	if err != nil {
		return nil, err
	}
	fragments, err := listFragments(s.db, characterID)
	if err != nil {
		return nil, err
	}
	talisman, err := getTalismanCount(s.db, characterID)
	if err != nil {
		return nil, err
	}
	stone, err := getSpiritStone(s.db, characterID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"current":        current,   // 当前激活神位完整定义（null=未激活）
		"bag":            bag,       // 已获得神位背包（含 inherited 标记）
		"fragments":      fragments, // 碎片列表（含合成所需数7）
		"talisman_count": talisman,  // 归元符持有数
		"spirit_stone":   stone,     // 灵石余额
	}, nil
}
