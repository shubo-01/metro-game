// Package gongfa 数据模型与纯计算函数。
// 本文件不碰数据库：结构体 + 常量表镜像 + 纯函数，全部可表驱动单测。
// 【数值权威】所有常量严格对照三份文档原文：
//   《功法技能经验系统PRD》表2-1/2-4/4-1/4-2/4-3、
//   《功法技能经验系统技术方案》3.x/4.x、
//   《怪物血量玩家攻击力对比表.xlsx》。
// 运行时业务以数据库配置表（gongfa_def/skill_def/exp_stage_config）为权威
// 数据源，这里的镜像表仅供纯函数计算与单元测试锚点校验。
package gongfa

// ─────────────────────────────────────
//  枚举常量
// ─────────────────────────────────────

// 功法/技能等级（tier）：PRD 表2-1 功法四品 / 表3-1 技能四档
const (
	TierFan  = 1 // 凡法/凡术
	TierLing = 2 // 灵法/灵术
	TierXian = 3 // 仙法/仙术
	TierDao  = 4 // 道法/道术
)

// 技能类型（skill_def.skill_type）：PRD 3.1 技能分类
const (
	SkillTypeWuxing  = 1 // 五行技（按修数自动解锁，进主动栏）
	SkillTypeLearned = 2 // 学习技（掉落/9碎片合成，进主动栏）
	SkillTypeShenwei = 3 // 神位技（随神位继承，不占栏）
	SkillTypePassive = 4 // 被动技（进被动栏）
	SkillTypeNormal  = 5 // 普攻（默认解锁，不占栏）
)

// 背包物品类型（char_gongfa/char_skill.item_type）
const (
	ItemFragment = 1 // 碎片
	ItemComplete = 2 // 完整功法/技能
)

// 技能栏类型（char_skill_slots.slot_type）：PRD 3.1 主动10栏+被动4栏
const (
	SlotActive  = 1 // 主动栏，slot_index 1-10
	SlotPassive = 2 // 被动栏，slot_index 1-4
)

// 栏位数量上限
const (
	ActiveSlotMax  = 10 // 主动技能栏数量
	PassiveSlotMax = 4  // 被动技能栏数量
)

// 合成/道具/打坐常量
const (
	FuseNeed        = 9     // 9碎片合成1完整功法/技能（PRD 2章/3.3）
	SoupPrice       = 99    // 孟遗汤商城价：99灵石/个（PRD 表2-4，与归元符同价）
	MeditateUnitSec = 600   // 打坐结算单位：10分钟=600秒，不满整单位无经验（PRD 2.1）
	MeditateDayCap  = 14400 // 每日打坐上限：4小时=14400秒（PRD 2.1）
	ZouhuoHours     = 72    // 走火入魔持续时长：72小时（PRD 2.5，按真实时间实现）
)

// ─────────────────────────────────────
//  结构体（与 v4_gongfa_skill_exp.sql 表结构一一对应）
// ─────────────────────────────────────

// GongfaDef 功法定义（gongfa_def 表）
type GongfaDef struct {
	ID                 int     `json:"id"`
	Name               string  `json:"name"`
	AttrType           int     `json:"attr_type"`             // 1=妖属(加精) 2=魔属(加气) 3=道属(加神)
	Tier               int     `json:"tier"`                  // 1=凡法 2=灵法 3=仙法 4=道法
	MeditateXPPer10Min int     `json:"meditate_xp_per_10min"` // 打坐XP/10分钟
	ShieldRecoverMult  float64 `json:"shield_recover_mult"`   // 护盾恢复倍率
	BonusJing          int     `json:"bonus_jing"`            // 学习后精加成
	BonusQi            int     `json:"bonus_qi"`              // 学习后气加成
	BonusShen          int     `json:"bonus_shen"`            // 学习后神加成
	IsFragment         bool    `json:"is_fragment"`           // 是否碎片产出
	FuseCount          int     `json:"fuse_count"`            // 合成所需碎片数（9）
	ReqMajorStage      int     `json:"req_major_stage"`       // 学习要求-大境界下限（0=无）
	ReqLevel           int     `json:"req_level"`             // 学习要求-境界内等级下限
	ReqAttrTotal       int     `json:"req_attr_total"`        // 学习要求-裸值精气神总和下限
	SourceDesc         string  `json:"source_desc"`           // 来源说明
}

// SkillDef 技能定义（skill_def 表）
type SkillDef struct {
	ID              int     `json:"id"`
	Name            string  `json:"name"`
	SkillType       int     `json:"skill_type"`  // 1=五行技 2=学习技 3=神位技 4=被动技 5=普攻
	Tier            int     `json:"tier"`        // 1=凡术 2=灵术 3=仙术 4=道术
	DamagePath      int     `json:"damage_path"` // 1=A法修 2=B体修 3=C魂修 0=非伤害
	BaseDamage      int     `json:"base_damage"`
	Multiplier      float64 `json:"multiplier"`
	CooldownS       int     `json:"cooldown_s"`
	MpCost          int     `json:"mp_cost"`
	Element         int     `json:"element"` // 1金2木3水4火5土 0通用
	IsFragment      bool    `json:"is_fragment"`
	FuseCount       int     `json:"fuse_count"`
	EffectDesc      string  `json:"effect_desc"`
	UnlockCondition string  `json:"unlock_condition"`
}

// ForgetCost 遗忘费用（按功法/技能品级，PRD 表2-4 原文数值）
type ForgetCost struct {
	SpiritStone int `json:"spirit_stone"` // 灵石费用
	SoupCount   int `json:"soup_count"`   // 孟遗汤数量
}

// LearnReq 学习要求（按品级，PRD 表2-1：大境界+级内等级+裸值精气神总和）
type LearnReq struct {
	MajorStage int // 大境界下限：0=无 1=人阶 2=真人 5=金仙
	Level      int // 该大境界内等级下限（1-90/1-100）
	AttrTotal  int // 裸值精气神总和下限
}

// ─────────────────────────────────────
//  常量表镜像（与 SQL 种子严格一致，供纯函数与单测锚点）
// ─────────────────────────────────────

// ForgetCostTable 遗忘费用表（PRD 表2-4 原文：凡法免费 / 灵法30灵石+2孟遗汤 /
// 仙法80+3 / 道法150+5；总成本折灵石 = 灵石+孟遗汤×99 → 凡0/灵228/仙377/道645）
var ForgetCostTable = map[int]ForgetCost{
	TierFan:  {SpiritStone: 0, SoupCount: 0},
	TierLing: {SpiritStone: 30, SoupCount: 2},
	TierXian: {SpiritStone: 80, SoupCount: 3},
	TierDao:  {SpiritStone: 150, SoupCount: 5},
}

// LearnReqTable 学习要求表（PRD 表2-1 原文：凡法无要求 / 灵法 人阶50级+精气神120 /
// 仙法 真人20级+精气神300 / 道法 金仙50级+精气神2000；精气神=裸值总和防加成套娃）。
// 技能（学习技）按同品级共用本表（技术方案3.3：学习技能与学习功法同一套要求校验）。
var LearnReqTable = map[int]LearnReq{
	TierFan:  {MajorStage: 0, Level: 0, AttrTotal: 0},
	TierLing: {MajorStage: 1, Level: 50, AttrTotal: 120},
	TierXian: {MajorStage: 2, Level: 20, AttrTotal: 300},
	TierDao:  {MajorStage: 5, Level: 50, AttrTotal: 2000},
}

// MeditateXPTable 打坐XP速率表（PRD 表2-1：凡1/灵2/仙3/道5 XP每10分钟；
// 运行时取自 gongfa_def.meditate_xp_per_10min，这里供单测锚点）
var MeditateXPTable = map[int]int{
	TierFan:  1,
	TierLing: 2,
	TierXian: 3,
	TierDao:  5,
}

// WuxingSkillXiuNeed 五行技解锁所需修数（PRD 表3-3~3-6：凡术1修/灵术2修/仙术3修/道术5修）
var WuxingSkillXiuNeed = map[int]int{
	TierFan:  1,
	TierLing: 2,
	TierXian: 3,
	TierDao:  5,
}

// ShenshouBaseTable 8阶神兽base XP（PRD 表4-1：升级XP与怪物XP的公共基数），
// 下标=阶段1-8（0位不用）：人20/真人100/地仙300/天仙600/金仙1200/太乙2400/大罗4800/神魔9600
var ShenshouBaseTable = [9]int64{0, 20, 100, 300, 600, 1200, 2400, 4800, 9600}

// StageMaxLevelTable 各阶段最大等级（PRD 表4-1：前7阶100级，神魔500级）
var StageMaxLevelTable = [9]int{0, 100, 100, 100, 100, 100, 100, 100, 500}

// MonsterTypeBaseTable 怪物类型base XP（PRD 表4-2：普通2/精英5/Boss8/妖10/神兽20）
var MonsterTypeBaseTable = map[int]int64{
	1: 2,  // 普通怪
	2: 5,  // 精英怪
	3: 8,  // Boss
	4: 10, // 妖
	5: 20, // 神兽
}

// StageXPMultTable 怪物XP阶段【累积】倍率（下标=阶段1-8）。
// 由 PRD 表4-3"普通怪Lv.1"绝对值列 (2/10/30/60/120/240/480/960) ÷ 基准2 推得。
// 【注意】技术方案伪代码中的 {1,5,3,2,...} 是"相对上一阶段"倍率，
// 直接连乘才等于本表，实现必须用累积值，勿照抄伪代码。
var StageXPMultTable = [9]int64{0, 1, 5, 15, 30, 60, 120, 240, 480}

// ─────────────────────────────────────
//  纯计算函数（无 DB 依赖，logic_test.go 表驱动全覆盖）
// ─────────────────────────────────────

// CharLevel 由境界小阶+段格换算"该大境界内等级"：Lv = (minor-1)×10 + seg + 1。
// 与 shenwei 包同一口径（minor 1-9 × seg 0-9 → Lv 1-90）。
// 功法学习要求（如"人阶50级"）与杀怪等级差都按这个级内等级计算。
func CharLevel(minorStage, stageSegment int) int {
	return (minorStage-1)*10 + stageSegment + 1
}

// ZouhuoTriggered 走火入魔触发判定（PRD 2.5 + 触发条件表#7）：
// 功法品级 > max(精,气,神)/10 时触发（精气神取【裸值】）。
// 整数实现：tier×10 > max(jing,qi,shen)，避免浮点除法。
// 例：凡法(1)需最高属性≥10；灵法(2)需≥20；仙法(3)需≥30；道法(4)需≥40。
// 【重要】走火不阻断学习（技术方案伪代码 ApplyZouHuo 后继续走完学习流程），
// 只是写入 zouhuo_until=NOW()+72h，生效期内有效精×0.5（"精暴降50%"）。
func ZouhuoTriggered(tier, jing, qi, shen int) bool {
	max := jing
	if qi > max {
		max = qi
	}
	if shen > max {
		max = shen
	}
	return tier*10 > max
}

// CheckLearnReq 学习要求校验（PRD 表2-1）。满足返回 nil，否则返回对应业务错误：
//   - 大境界或级内等级不足 → ErrLevelNotEnough
//   - 裸值精气神总和不足 → ErrAttrNotEnough
//
// 判定规则：大境界高于要求直接过等级关；等于要求时比较级内等级。
func CheckLearnReq(req LearnReq, majorStage, levelInStage, nakedAttrTotal int) error {
	if req.MajorStage > 0 {
		if majorStage < req.MajorStage {
			return ErrLevelNotEnough
		}
		if majorStage == req.MajorStage && levelInStage < req.Level {
			return ErrLevelNotEnough
		}
	}
	if nakedAttrTotal < req.AttrTotal {
		return ErrAttrNotEnough
	}
	return nil
}

// CalcForgetTotalCost 遗忘总成本（灵石当量）= 灵石 + 孟遗汤数 × 99。
// 对照 PRD 表2-4 总成本列：凡0 / 灵228 / 仙377 / 道645（单测锚点）。
func CalcForgetTotalCost(c ForgetCost) int {
	return c.SpiritStone + c.SoupCount*SoupPrice
}

// CalcUpgradeExpReq 升级所需XP（PRD 4.1 文档公式，单测锚点+响应展示用）：
// 升级XP = 同级神兽XP × 100 = 神兽base × (等级+1)/2 × 100 = base × (等级+1) × 50。
// 锚点：人阶 Lv.50 = 20 × 51 × 50 = 51,000（PRD 原文示例）。
// 整数精确：(等级+1)/2×100 恒等于 (等级+1)×50，无小数丢失。
// stage 越界返回 0（调用方已校验，这里兜底防 panic）。
func CalcUpgradeExpReq(stage, level int) int64 {
	if stage < 1 || stage > 8 || level < 1 {
		return 0
	}
	return ShenshouBaseTable[stage] * int64(level+1) * 50
}

// LevelDiffMult 等级差经验倍率（PRD 表4-4 / 技术方案4.2，两文档数值一致）。
// diff = 玩家级内等级 - 怪物级内等级：
//
//	diff ≤ -4        → 0（怪太强打不动，无经验）
//	-3 ≤ diff ≤ -1   → 0.5
//	diff = 0         → 1.0
//	1 ≤ diff ≤ 3     → 1.2
//	4 ≤ diff ≤ 6     → 1.5
//	7 ≤ diff ≤ 10    → 1.8
//	diff ≥ 11        → 2.0（封顶，>20 同样2.0）
func LevelDiffMult(diff int) float64 {
	switch {
	case diff <= -4:
		return 0
	case diff <= -1:
		return 0.5
	case diff == 0:
		return 1.0
	case diff <= 3:
		return 1.2
	case diff <= 6:
		return 1.5
	case diff <= 10:
		return 1.8
	default:
		return 2.0
	}
}

// CalcMonsterBaseXP 怪物基础XP（未乘等级差/多修/伤害占比）：
// 怪物XP = 类型base × (怪物等级+1)/2 × 阶段累积倍率（PRD 4.2 + 表4-3）。
// 校验：普通怪 Lv.1 各阶段 = 2×1×{1,5,15,30,60,120,240,480} = 表4-3 绝对值列。
// 参数非法（阶段/类型越界）返回 0。
func CalcMonsterBaseXP(monsterStage, monsterType, monsterLevel int) float64 {
	if monsterStage < 1 || monsterStage > 8 || monsterLevel < 1 {
		return 0
	}
	base, ok := MonsterTypeBaseTable[monsterType]
	if !ok {
		return 0
	}
	return float64(base) * float64(monsterLevel+1) / 2.0 * float64(StageXPMultTable[monsterStage])
}

// CalcKillXP 杀怪最终XP（向下取整）：
// 最终XP = 怪物基础XP × 等级差倍率 × 多修经验倍率 × 伤害占比。
//   - xiuMult：多修经验倍率（1/2/3/4/9，复用 character.GetExpMultiplier 的返回值）
//   - damageRatio：伤害占比（组队分配用，单人=1.0；越界钳制到 [0,1]）
//
// 【口径说明】文档公式不含悟性加成，与现有 /character/exp/add（悟性%加成）
// 是两套独立入口，本函数严格按文档实现，不加悟性。
func CalcKillXP(monsterStage, monsterType, monsterLevel, playerLevel int, xiuMult, damageRatio float64) int64 {
	if damageRatio < 0 {
		damageRatio = 0
	}
	if damageRatio > 1 {
		damageRatio = 1
	}
	baseXP := CalcMonsterBaseXP(monsterStage, monsterType, monsterLevel)
	diffMult := LevelDiffMult(playerLevel - monsterLevel)
	return int64(baseXP * diffMult * xiuMult * damageRatio)
}

// MeditateUnits 打坐可结算的完整10分钟单位数（PRD 2.1 结算规则）：
//   - elapsedSec：距上次结算点经过的秒数
//   - todaySec：今日已计入的打坐秒数（上限14400=4小时）
//
// 规则：不满10分钟的零头不发经验（留给下次结算）；今日剩余额度不足时按额度截断。
func MeditateUnits(elapsedSec, todaySec int) int {
	if elapsedSec <= 0 {
		return 0
	}
	remain := MeditateDayCap - todaySec
	if remain <= 0 {
		return 0
	}
	usable := elapsedSec
	if usable > remain {
		usable = remain
	}
	return usable / MeditateUnitSec
}
