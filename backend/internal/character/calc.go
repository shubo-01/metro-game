// calc.go 人物系统属性 V2 数值计算引擎
// 本文件是「人物系统属性 V2」的核心算法库，严格按照三份需求文档实现：
//   - 《人物系统属性_PRD_v2.docx》         —— 产品规则（境界/衍生/护盾/伤害路径）
//   - 《人物系统属性技术文档_V2.docx》     —— 算法伪代码（CalcDamage/ApplyDamage 等）
//   - 《人物系统属性基础表值_V2.docx》     —— 数值基准表（K值表/属性点表/技能倍率表）
//
// 设计要点（小白可以这样理解）：
//   1. 角色只有三个"根属性"：精（肉身）、气（能量）、神（灵魂）。
//   2. 其他一切数值（血量/蓝条/护盾/伤害）都是由精气神"乘一个系数"算出来的，
//      这叫"衍生属性"，就像用身高体重算 BMI 一样。
//   3. 所有函数都是纯计算（不连数据库、不发网络请求），方便单元测试直接验证数字。
package character

import "math"

// ═══════════════════════════════════════════
//  一、V2 衍生系数常量（基础表值文档 第二章"衍生系数总表"）
// ═══════════════════════════════════════════

const (
	// ── 精（肉身层）衍生系数 ──
	CoefHP       = 50 // 气血（本体HP）= 精 × 50，血条总量，归零=死亡
	CoefPhysique = 5  // 体魄 = 精 × 5，体修攻击力 + 物理防御
	CoefAgility  = 1  // 身法 = 精 × 1，闪避 + 移动速度
	CoefBone     = 3  // 根骨 = 精 × 3，走火入魔判定（功法等级 > 根骨×0.1 触发）

	// ── 气（能量层）衍生系数 ──
	CoefMP         = 20  // 灵力（蓝条）= 气 × 20，释放技能的资源
	CoefSkillPower = 2   // 功法威力 = 气 × 2，法修伤害系数
	CoefAffinity   = 0.5 // 五行亲和 = 气 × 0.5，法修元素加成（K值递减）

	// ── 神（灵魂层）衍生系数 ──
	CoefSoul           = 50  // 魂力（鬼修本体HP）= 神 × 50，鬼修血条
	CoefSenseRange     = 1   // 神识（感知范围·米）= 神 × 1，先手发现
	CoefReaction       = 1   // 反应（打断抗性值）= 神 × 1，打断施法/抗被打断
	CoefAbnormalResist = 0.5 // 异常抵抗值 = 神 × 0.5，冰冻/灼烧/眩晕抵抗

	// ── 精气神总和衍生系数 ──
	CoefShield      = 200 // 护盾厚度 = (精+气+神) × 200，唯一被动防御层
	CoefShieldRegen = 2   // 护盾恢复 = (精+气+神) × 2/秒（脱战5秒后才开始恢复）

	// ── 均衡加成 ──
	EquilibriumRatio = 3.0 // 精气神 max÷min ≤ 3 时判定为"均衡Build"
	EquilibriumBonus = 2.0 // 均衡Build所有伤害 × 2（不均衡则 × 1）

	// ── 三条主动伤害路径的技能基础伤害 ──
	BaseDamageWeapon  = 100 // 武器技基础伤害（体修路径，实际伤害看体魄+武器）
	BaseDamageElement = 150 // 五行技基础伤害（法修路径）
	BaseDamageDivine  = 300 // 神位技基础伤害（魂修路径，无多修/相生/亲和的补偿值）

	// ── 技能等级成长（技能1-10级）──
	SkillDamagePerLevel   = 0.10 // 每升1级伤害 +10%（倍率 = 1 + 0.1×(等级-1)）
	SkillCooldownPerLevel = 0.03 // 每升1级冷却 -3%（缩减 = 1 - 0.03×(等级-1)）

	// ── 暴击 ──
	CritMultiplier   = 1.5   // 暴击伤害倍率 ×1.5（大暴击×2.0由装备词条另算）
	CritRatePerWuXing = 0.005 // 暴击率 = 悟性 × 0.5%（初始悟性0 → 暴击率0，无新手加成）

	// ── 护盾恢复 ──
	ShieldRecoverDelay = 5 // 脱战后需等待5秒护盾才开始恢复
)

// 技能类型（对应 /combat/skill 请求的 skill_type 字段）
const (
	SkillTypeWeapon  = 1 // 武器技 → 路径B 体修
	SkillTypeElement = 2 // 五行技 → 路径A 法修
	SkillTypeDivine  = 3 // 神位技 → 路径C 魂修
)

// 异常状态类型（对应 /combat/abnormal 请求的 abnormal_type 字段）
const (
	AbnormalFrozen = 1 // 冰冻：基础概率30%，持续2秒，无法移动
	AbnormalBurn   = 2 // 灼烧：基础概率30%，持续3秒，每秒扣5%护盾（未破盾）或5%HP（已破盾）
	AbnormalStun   = 3 // 眩晕：基础概率20%，持续1.5秒，无法行动
)

// AbnormalBaseProb 各异常状态的基础触发概率（未计算抵抗前）
var AbnormalBaseProb = map[int]float64{
	AbnormalFrozen: 0.30,
	AbnormalBurn:   0.30,
	AbnormalStun:   0.20,
}

// AbnormalDuration 各异常状态的基础持续时间（秒）
var AbnormalDuration = map[int]float64{
	AbnormalFrozen: 2.0,
	AbnormalBurn:   3.0,
	AbnormalStun:   1.5,
}

// BurnDamagePercent 灼烧每秒伤害比例：护盾未破扣护盾上限5%，破盾后扣当前HP5%
const BurnDamagePercent = 0.05

// ═══════════════════════════════════════════
//  二、境界基准值表（基础表值文档 第一章/第三章）
//  1200级8大境界：人/真人/地仙/天仙/金仙/太乙金仙/大罗金仙/神魔
//  神魔含5子阶：太极/太素/太始/太初/太易
//  为了查表方便，把"8大境界+神魔5子阶"平铺成12个档位（索引1-12）
// ═══════════════════════════════════════════

// 境界档位索引（RealmIndex 的返回值，1-12）
const (
	RealmHuman    = 1  // 人（major_stage=1）
	RealmZhenren  = 2  // 真人（major_stage=2）
	RealmDixian   = 3  // 地仙（major_stage=3）
	RealmTianxian = 4  // 天仙（major_stage=4）
	RealmJinxian  = 5  // 金仙（major_stage=5）
	RealmTaiyiJx  = 6  // 太乙金仙（major_stage=6）
	RealmDaluoJx  = 7  // 大罗金仙（major_stage=7）
	RealmTaiji    = 8  // 神魔·太极（major_stage=8, sub_realm=1）
	RealmTaisu    = 9  // 神魔·太素（major_stage=8, sub_realm=2）
	RealmTaishi   = 10 // 神魔·太始（major_stage=8, sub_realm=3）
	RealmTaichu   = 11 // 神魔·太初（major_stage=8, sub_realm=4）
	RealmTaiyi    = 12 // 神魔·太易（major_stage=8, sub_realm=5）
)

// RealmBaseline 单个境界档位的基准数值。
// "基准值"= 该境界满级（100级）、纯均分加点、无装备时的精=气=神数值，
// 是K值递减体系和法修/魂修伤害系数的"参照物"。
type RealmBaseline struct {
	Name          string  // 境界名称（中文，用于日志和返回消息）
	Baseline      float64 // 满级均分基准值（精=气=神），例如人100级均分 67
	KAffinity     float64 // K亲和：亲和加成递减常数（基础表值文档 3.2 K值速查表原值）
	FixedPoints   int     // 该境界的固定点（突破时精气神各自动加到该值，不占自由点）
	FreePerLevel  int     // 境界内每升1级发放的自由属性点
	WashCost      int64   // 该境界单次洗点费用（灵石）
}

// realmTable 12档境界基准值总表。
// K亲和 直接取自基础表值文档"3.2 各境界K值速查"表原值；
// 文档未列出的 太素/太始/太初 按同表规律（K亲和 = 基准值 ÷ 2）补齐。
// K异常 = K亲和（两者在速查表中数值完全一致）；K反应 = 2 × K亲和。
var realmTable = map[int]RealmBaseline{
	RealmHuman:    {Name: "人", Baseline: 67, KAffinity: 67, FixedPoints: 1, FreePerLevel: 2, WashCost: 100},
	RealmZhenren:  {Name: "真人", Baseline: 171, KAffinity: 171, FixedPoints: 6, FreePerLevel: 3, WashCost: 1000},
	RealmDixian:   {Name: "地仙", Baseline: 346, KAffinity: 173, FixedPoints: 16, FreePerLevel: 5, WashCost: 5000},
	RealmTianxian: {Name: "天仙", Baseline: 592, KAffinity: 296, FixedPoints: 31, FreePerLevel: 7, WashCost: 20000},
	RealmJinxian:  {Name: "金仙", Baseline: 909, KAffinity: 454.5, FixedPoints: 51, FreePerLevel: 9, WashCost: 100000},
	RealmTaiyiJx:  {Name: "太乙金仙", Baseline: 1297, KAffinity: 648.5, FixedPoints: 76, FreePerLevel: 11, WashCost: 500000},
	RealmDaluoJx:  {Name: "大罗金仙", Baseline: 1756, KAffinity: 878, FixedPoints: 106, FreePerLevel: 13, WashCost: 500000},
	RealmTaiji:    {Name: "神魔·太极", Baseline: 2286, KAffinity: 1143, FixedPoints: 141, FreePerLevel: 15, WashCost: 500000},
	RealmTaisu:    {Name: "神魔·太素", Baseline: 2887, KAffinity: 1443.5, FixedPoints: 181, FreePerLevel: 17, WashCost: 500000},
	RealmTaishi:   {Name: "神魔·太始", Baseline: 3559, KAffinity: 1779.5, FixedPoints: 226, FreePerLevel: 19, WashCost: 500000},
	RealmTaichu:   {Name: "神魔·太初", Baseline: 4302, KAffinity: 2151, FixedPoints: 276, FreePerLevel: 21, WashCost: 500000},
	RealmTaiyi:    {Name: "神魔·太易", Baseline: 5116, KAffinity: 2558, FixedPoints: 331, FreePerLevel: 23, WashCost: 500000},
}

// RealmIndex 把数据库里的 (大境界, 神魔子阶) 换算成 1-12 的境界档位索引。
// majorStage: 1人 2真人 3地仙 4天仙 5金仙 6太乙 7大罗 8神魔
// subRealm:   神魔子阶 1太极 2太素 3太始 4太初 5太易（非神魔时传0即可）
func RealmIndex(majorStage, subRealm int) int {
	if majorStage < 1 {
		return RealmHuman // 非法输入按最低档"人"处理，保证不会查表失败
	}
	if majorStage < 8 {
		return majorStage // 1-7 大境界与档位一一对应
	}
	// 神魔阶段：档位 = 8(太极) + (子阶-1)
	if subRealm < 1 {
		subRealm = 1 // 刚突破到神魔还没记录子阶时，默认为第一子阶太极
	}
	if subRealm > 5 {
		subRealm = 5 // 太易已是终局，封顶
	}
	return RealmTaiji + subRealm - 1
}

// GetRealmBaseline 查询境界档位的完整基准数据（越界时兜底返回"人"档位）
func GetRealmBaseline(realmIdx int) RealmBaseline {
	if rb, ok := realmTable[realmIdx]; ok {
		return rb
	}
	return realmTable[RealmHuman]
}

// GetKAffinity 查询K亲和：亲和加成 = 1 + 亲和/(亲和+K亲和) 中的K。
// 例：人100级 K亲和=67，大罗100级 K亲和=878。
func GetKAffinity(realmIdx int) float64 { return GetRealmBaseline(realmIdx).KAffinity }

// GetKAbnormal 查询K异常：异常抵抗率 = 抵抗值/(抵抗值+K异常) 中的K。
// 基础表值文档中 K异常 与 K亲和 数值完全相同（人100级均为67）。
func GetKAbnormal(realmIdx int) float64 { return GetRealmBaseline(realmIdx).KAffinity }

// GetKReaction 查询K反应：打断抗性 = 反应值/(反应值+K反应) 中的K。
// K反应 = 2 × K亲和（人100级=134，真人100级=342）。
func GetKReaction(realmIdx int) float64 { return GetRealmBaseline(realmIdx).KAffinity * 2 }

// GetBaselinePower 查询基准功法威力 = 同级满级均分无装备的功法威力（基准值×2）。
// 法修伤害中的"功法威力系数" = 自己的功法威力 ÷ 这个基准。
func GetBaselinePower(realmIdx int) float64 {
	return GetRealmBaseline(realmIdx).Baseline * CoefSkillPower
}

// GetBaselineShen 查询基准神总 = 同级满级均分无装备的神值（即基准值本身）。
// 魂修伤害中的"神位系数" = 自己的神 ÷ 这个基准。
func GetBaselineShen(realmIdx int) float64 { return GetRealmBaseline(realmIdx).Baseline }

// GetFixedPoints 查询境界固定点：突破到该境界时，精气神各自动"加到"该值。
// 例：人1 → 真人6 → 地仙16 ... 神魔·太易331。
func GetFixedPoints(realmIdx int) int { return GetRealmBaseline(realmIdx).FixedPoints }

// GetFreePointsPerLevel 查询境界内每升1级发放的自由属性点（人+2/级，真人+3/级...）
func GetFreePointsPerLevel(realmIdx int) int { return GetRealmBaseline(realmIdx).FreePerLevel }

// GetWashCost 查询该境界单次洗点的灵石费用（PRD 6.5 洗点表）
func GetWashCost(realmIdx int) int64 { return GetRealmBaseline(realmIdx).WashCost }

// GetRealmName 查询境界中文名（用于接口返回和日志）
func GetRealmName(realmIdx int) string { return GetRealmBaseline(realmIdx).Name }

// ═══════════════════════════════════════════
//  三、衍生属性计算（V2，替换旧V1系数）
// ═══════════════════════════════════════════

// DerivedAttrs V2 衍生属性集合。
// 由精/气/神三个根属性按固定系数换算而来，角色面板和战斗全部使用这些值。
type DerivedAttrs struct {
	HPMax          int     `json:"hp_max"`          // 气血上限 = 精 × 50（本体HP，归零=死亡）
	MpMax          int     `json:"mp_max"`          // 灵力上限 = 气 × 20（蓝条）
	SoulMax        int     `json:"soul_max"`        // 魂力上限 = 神 × 50（鬼修血条）
	Physique       int     `json:"physique"`        // 体魄 = 精 × 5（体修攻击力+物理防御）
	Agility        int     `json:"agility"`         // 身法 = 精 × 1（闪避+移动速度）
	BoneBase       int     `json:"bone_base"`       // 根骨 = 精 × 3（走火入魔判定）
	SkillPower     int     `json:"skill_power"`     // 功法威力 = 气 × 2（法修伤害系数）
	SenseRange     int     `json:"sense_range"`     // 神识 = 神 × 1（感知范围·米）
	Affinity       float64 `json:"affinity"`        // 五行亲和 = 气 × 0.5（法修元素加成）
	Reaction       int     `json:"reaction"`        // 反应 = 神 × 1（打断抗性值）
	AbnormalResist float64 `json:"abnormal_resist"` // 异常抵抗值 = 神 × 0.5
	ShieldMax      int64   `json:"shield_max"`      // 护盾上限 = (精+气+神) × 200
	ShieldRegen    int     `json:"shield_regen"`    // 护盾恢复速度 = (精+气+神) × 2/秒（脱战5秒后）
	Equilibrium    float64 `json:"equilibrium"`     // 均衡加成 = 2（max÷min≤3）或 1
}

// CalcDerivedAttrs V2 属性衍生计算引擎（替换旧V1版本）。
// 传入精/气/神三个根属性值，返回全部衍生属性。
// 锚点自检（人100级凡品均分 67/67/67）：
//   气血3350 体魄335 根骨201 灵力1340 功法威力134 魂力3350 护盾40200
func CalcDerivedAttrs(jing, qi, shen int) DerivedAttrs {
	return DerivedAttrs{
		HPMax:          jing * CoefHP,
		MpMax:          qi * CoefMP,
		SoulMax:        shen * CoefSoul,
		Physique:       jing * CoefPhysique,
		Agility:        jing * CoefAgility,
		BoneBase:       jing * CoefBone,
		SkillPower:     qi * CoefSkillPower,
		SenseRange:     shen * CoefSenseRange,
		Affinity:       float64(qi) * CoefAffinity,
		Reaction:       shen * CoefReaction,
		AbnormalResist: float64(shen) * CoefAbnormalResist,
		ShieldMax:      CalcShieldCapacity(jing, qi, shen),
		ShieldRegen:    CalcShieldRegen(jing, qi, shen),
		Equilibrium:    CalcEquilibrium(jing, qi, shen),
	}
}

// CalcShieldCapacity 计算护盾上限 = (精+气+神) × 200。
// 关键设计：所有Build（全精/全气/全神/均分）只要总点数一样，护盾就一样厚，
// 护盾阶段人人公平，破盾后才体现Build差异。
func CalcShieldCapacity(jing, qi, shen int) int64 {
	return int64(jing+qi+shen) * CoefShield
}

// CalcShieldRegen 计算护盾恢复速度 = (精+气+神) × 2/秒。
// 注意：只有脱战5秒后才开始恢复（ShieldRecoverDelay），战斗中不恢复。
func CalcShieldRegen(jing, qi, shen int) int {
	return (jing + qi + shen) * CoefShieldRegen
}

// CalcEquilibrium 均衡加成判定。
// 精气神三者的 最大值÷最小值 ≤ 3 → 均衡Build，所有伤害 ×2；否则 ×1。
// 这是给"不偏科"玩家的补偿：均分虽然单项不突出，但伤害翻倍。
// 例：67/67/67 → 比值1 → ×2；199/1/1 → 比值199 → ×1；90/45/30 → 比值3（临界）→ ×2。
func CalcEquilibrium(jing, qi, shen int) float64 {
	mx := math.Max(float64(jing), math.Max(float64(qi), float64(shen)))
	mn := math.Min(float64(jing), math.Min(float64(qi), float64(shen)))
	if mn <= 0 {
		return 1.0 // 有属性为0（理论不该出现），视为极端偏科，无加成
	}
	if mx/mn <= EquilibriumRatio {
		return EquilibriumBonus
	}
	return 1.0
}

// CalcAffinityBonus 五行亲和加成 = 1 + 亲和/(亲和 + K亲和)。
// K值递减：亲和越高加成越大，但永远到不了2倍（渐近线），防止无限堆叠。
// 例：人100级均分凡品 亲和33.5、K=67 → 1 + 33.5/100.5 ≈ 1.333。
func CalcAffinityBonus(affinity, kAffinity float64) float64 {
	if affinity <= 0 || kAffinity <= 0 {
		return 1.0 // 没有亲和或K值非法时不加成
	}
	return 1.0 + affinity/(affinity+kAffinity)
}

// CalcAbnormalResistRate 异常抵抗率 = 抵抗值/(抵抗值 + K异常)。
// 返回0~1之间的小数。例：抵抗值67、K=67 → 50%；抵抗值199、K=67 → 74.8%。
func CalcAbnormalResistRate(resist, kAbnormal float64) float64 {
	if resist <= 0 || kAbnormal <= 0 {
		return 0.0 // 没有抵抗值就是0%抵抗
	}
	return resist / (resist + kAbnormal)
}

// CalcAbnormalTriggerProb 异常状态实际触发概率 = 基础概率 × (1 - 异常抵抗率)。
// 例：冰冻基础30%，防守方抵抗率50% → 实际15%。
func CalcAbnormalTriggerProb(baseProb, resist, kAbnormal float64) float64 {
	return baseProb * (1.0 - CalcAbnormalResistRate(resist, kAbnormal))
}

// CalcSkillMultiplier 技能等级伤害倍率 = 1 + 0.1 × (等级-1)。
// 技能1-10级：1级×1.0，5级×1.4，10级×1.9。超范围自动夹到[1,10]。
func CalcSkillMultiplier(level int) float64 {
	if level < 1 {
		level = 1
	}
	if level > 10 {
		level = 10
	}
	return 1.0 + SkillDamagePerLevel*float64(level-1)
}

// CalcSkillCooldownRate 技能等级冷却缩减 = 1 - 0.03 × (等级-1)。
// 1级=100%冷却，10级=73%冷却（即快27%）。
func CalcSkillCooldownRate(level int) float64 {
	if level < 1 {
		level = 1
	}
	if level > 10 {
		level = 10
	}
	return 1.0 - SkillCooldownPerLevel*float64(level-1)
}

// ═══════════════════════════════════════════
//  四、五行相生 / 克制（V2）
// ═══════════════════════════════════════════

// shengMap 五行相生链：金→水→木→火→土→金（谁"生"谁）。
// 元素编号沿用现有代码：1=金 2=木 3=水 4=火 5=土。
var shengMap = map[int]int{
	1: 3, // 金生水
	3: 2, // 水生木
	2: 4, // 木生火
	4: 5, // 火生土
	5: 1, // 土生金
}

// counterMapV2 五行相克链：金克木、木克土、土克水、水克火、火克金（与V1一致）。
var counterMapV2 = map[int]int{1: 2, 2: 5, 5: 3, 3: 4, 4: 1}

// CalcShengMultiplier 相生链额外系数（根据攻击方已修的五行组合判定）。
//   五修全齐（五行完整循环）→ ×1.2（叠乘在多修×15上，五修最终=×18）
//   存在三连相生（如 金→水→木）→ ×1.5
//   存在单相生（如 金→水）      → ×1.3
//   无相生（如 金+火）           → ×1.0
func CalcShengMultiplier(elements []int) float64 {
	// 先把已修元素放进集合，方便查"某元素有没有修"
	has := make(map[int]bool, len(elements))
	for _, e := range elements {
		if e >= 1 && e <= 5 {
			has[e] = true
		}
	}
	if len(has) >= 5 {
		return 1.2 // 五行完整循环
	}
	// 从每个已修元素出发，沿相生链看能连多长
	longest := 1
	for e := range has {
		length := 1
		cur := e
		// 最多走4步（5个元素的链）
		for i := 0; i < 4; i++ {
			next := shengMap[cur]
			if !has[next] {
				break
			}
			length++
			cur = next
		}
		if length > longest {
			longest = length
		}
	}
	switch {
	case longest >= 3:
		return 1.5 // 三连相生
	case longest == 2:
		return 1.3 // 单相生
	default:
		return 1.0 // 无相生
	}
}

// CalcElementCounterV2 五行克制系数（V2版）。
//   攻击方克制防守方 → ×1.5
//   攻击方被防守方克 → ×0.7（但攻击方精气神总和 > 防守方2倍时"逆克"，回到×1.0）
//   无克制关系       → ×1.0
// attackerSum/defenderSum 传双方的精气神总和，用于逆克判定。
func CalcElementCounterV2(attackerElement, defenderElement, attackerSum, defenderSum int) float64 {
	if attackerElement < 1 || defenderElement < 1 {
		return 1.0 // 任一方没有五行属性，谈不上克制
	}
	if counterMapV2[attackerElement] == defenderElement {
		return 1.5 // 我克对方
	}
	if counterMapV2[defenderElement] == attackerElement {
		// 对方克我：若我方总实力碾压（>2倍），逆克成功，不吃0.7惩罚
		if defenderSum > 0 && attackerSum > defenderSum*2 {
			return 1.0
		}
		return 0.7
	}
	return 1.0
}

// ═══════════════════════════════════════════
//  五、伤害计算（四条路径）与护盾结算
// ═══════════════════════════════════════════

// DamageInput 伤害计算的全部输入参数（纯数据，方便单元测试）。
type DamageInput struct {
	SkillType   int   // 技能类型：1武器技(体修) 2五行技(法修) 3神位技(魂修)
	SkillLevel  int   // 技能等级 1-10
	ElementType int   // 五行技的元素类型 1-5（非五行技可传0）
	WeaponBase  int   // 武器基础伤害（刀80/枪100/锤120/弩70/扇60/法杖50，传0默认100）
	AtkJing     int   // 攻击方 精
	AtkQi       int   // 攻击方 气
	AtkShen     int   // 攻击方 神
	AtkElements []int // 攻击方已修的五行列表（决定多修倍率和相生系数）
	DefElement  int   // 防守方主修五行（用于克制判定，0=无）
	DefJing     int   // 防守方 精（逆克判定用）
	DefQi       int   // 防守方 气
	DefShen     int   // 防守方 神
	RealmIdx    int   // 攻击方境界档位索引 1-12（决定基准功法威力/基准神/K亲和）
	IsCrit      bool  // 本次攻击是否暴击（由调用方掷骰后传入，保证本函数可测试）
}

// DamageResult 伤害计算结果，附带各环节倍率明细（方便前端展示战斗浮字和排查数值）。
type DamageResult struct {
	RawDamage     int64   `json:"raw_damage"`     // 最终伤害值（直接打护盾，无减免）
	BaseDamage    float64 `json:"base_damage"`    // 路径基础伤害部分
	SkillMul      float64 `json:"skill_mul"`      // 技能等级倍率 1.0-1.9
	MultiMul      float64 `json:"multi_mul"`      // 多修倍率（仅法修，其余为1）
	ShengMul      float64 `json:"sheng_mul"`      // 相生系数（仅法修）
	CounterMul    float64 `json:"counter_mul"`    // 五行克制系数（仅法修）
	AffinityBonus float64 `json:"affinity_bonus"` // 亲和加成（仅法修）
	CritMul       float64 `json:"crit_mul"`       // 暴击倍率 1.0 或 1.5
	Equilibrium   float64 `json:"equilibrium"`    // 均衡加成 1.0 或 2.0
}

// CalcDamage 伤害计算入口（四条路径中的三条主动路径，异常路径见 CalcAbnormalTriggerProb）。
//   路径A 法修：150 × (功法威力/基准功法威力) × 技能倍率 × 多修 × 相生 × 克制 × 亲和 × 暴击 × 均衡
//   路径B 体修：(体魄 + 武器基础) × 技能倍率 × 暴击 × 均衡
//   路径C 魂修：300 × (神/基准神) × 技能倍率 × 暴击 × 均衡
func CalcDamage(in DamageInput) DamageResult {
	res := DamageResult{
		SkillMul:      CalcSkillMultiplier(in.SkillLevel),
		MultiMul:      1.0,
		ShengMul:      1.0,
		CounterMul:    1.0,
		AffinityBonus: 1.0,
		CritMul:       1.0,
		Equilibrium:   CalcEquilibrium(in.AtkJing, in.AtkQi, in.AtkShen),
	}
	if in.IsCrit {
		res.CritMul = CritMultiplier
	}

	switch in.SkillType {
	case SkillTypeElement:
		// ── 路径A：法修（五行技） ──
		skillPower := float64(in.AtkQi) * CoefSkillPower       // 我的功法威力 = 气×2
		basePower := GetBaselinePower(in.RealmIdx)             // 同境界基准功法威力
		affinity := float64(in.AtkQi) * CoefAffinity           // 我的五行亲和 = 气×0.5
		kAffinity := GetKAffinity(in.RealmIdx)                 // 同境界K亲和
		elementCount := len(in.AtkElements)                    // 兼修数量
		if elementCount == 0 {
			elementCount = 1 // 至少算单修
		}
		atkSum := in.AtkJing + in.AtkQi + in.AtkShen
		defSum := in.DefJing + in.DefQi + in.DefShen

		res.BaseDamage = BaseDamageElement * (skillPower / basePower)
		res.MultiMul = GetDamageMultiplier(elementCount)                                        // 多修倍率（现有函数，勿改）
		res.ShengMul = CalcShengMultiplier(in.AtkElements)                                      // 相生系数
		res.CounterMul = CalcElementCounterV2(in.ElementType, in.DefElement, atkSum, defSum)    // 克制系数
		res.AffinityBonus = CalcAffinityBonus(affinity, kAffinity)                              // 亲和加成

	case SkillTypeDivine:
		// ── 路径C：魂修（神位技） ──
		// 无多修/相生/五行/亲和加成，基础300是补偿
		baseShen := GetBaselineShen(in.RealmIdx)
		res.BaseDamage = BaseDamageDivine * (float64(in.AtkShen) / baseShen)

	default:
		// ── 路径B：体修（武器技，默认路径） ──
		weaponBase := in.WeaponBase
		if weaponBase <= 0 {
			weaponBase = BaseDamageWeapon // 未指定武器时按基础100
		}
		physique := in.AtkJing * CoefPhysique // 体魄 = 精×5
		res.BaseDamage = float64(physique + weaponBase)
	}

	// 通用乘区：基础 × 技能倍率 × (法修专属乘区) × 暴击 × 均衡
	final := res.BaseDamage * res.SkillMul * res.MultiMul * res.ShengMul *
		res.CounterMul * res.AffinityBonus * res.CritMul * res.Equilibrium
	res.RawDamage = int64(final)
	return res
}

// ApplyDamage 护盾结算：伤害先扣护盾，护盾不够再扣本体HP（无任何减免公式）。
// 入参：当前护盾、当前HP、本次伤害；
// 出参：结算后护盾、结算后HP、护盾吸收量、HP实际扣除量、护盾是否被打破。
// 例：护盾1000 HP500 受伤300 → 护盾700 HP500（未破盾）；
//     护盾1000 HP500 受伤1200 → 护盾0 HP300（破盾，溢出200打到本体）。
func ApplyDamage(shieldCurrent, hpCurrent, damage int64) (shieldAfter, hpAfter, shieldAbsorbed, hpDamage int64, shieldBroken bool) {
	if damage <= 0 {
		return shieldCurrent, hpCurrent, 0, 0, false // 0伤害无事发生
	}
	if shieldCurrent >= damage {
		// 护盾足够厚，全部吸收
		return shieldCurrent - damage, hpCurrent, damage, 0, false
	}
	// 护盾不够：先吸收掉剩余护盾，溢出部分直接打本体HP
	shieldAbsorbed = shieldCurrent
	hpDamage = damage - shieldCurrent
	hpAfter = hpCurrent - hpDamage
	if hpAfter < 0 {
		hpAfter = 0 // HP最低为0（归零=死亡，由死亡系统处理后续）
	}
	return 0, hpAfter, shieldAbsorbed, hpDamage, true
}

// ApplyBurnTick 灼烧持续伤害的单次结算（每秒一跳，纯函数无副作用，方便单测）。
// 规则（PRD 4.4 异常状态表 + BurnDamagePercent=5%）：
//   - 未破盾（当前护盾>0）：每跳扣"护盾上限"的5%，最少扣1点；护盾不够扣时扣到0为止
//   - 已破盾（当前护盾=0）：每跳扣"当前HP"的5%，最少扣1点；HP最低扣到0（归零=死亡，由死亡系统接管）
//
// 入参：shieldMax 护盾上限、shieldCurrent 当前护盾、hpCurrent 当前HP
// 返回：结算后的护盾/HP，以及本跳实际扣掉的护盾量/HP量（返回风格与 ApplyDamage 对齐）
func ApplyBurnTick(shieldMax, shieldCurrent, hpCurrent int64) (shieldAfter, hpAfter, shieldDamage, hpDamage int64) {
	if shieldCurrent > 0 {
		// ── 护盾阶段：按护盾"上限"的5%灼烧（注意不是当前值，盾越厚每跳掉得越多）──
		shieldDamage = int64(float64(shieldMax) * BurnDamagePercent)
		if shieldDamage < 1 {
			shieldDamage = 1 // 保底1点，防止低数值角色灼烧无效
		}
		if shieldDamage > shieldCurrent {
			shieldDamage = shieldCurrent // 护盾不够扣：只扣剩余的，不穿透到HP（穿透留给下一跳的破盾分支）
		}
		return shieldCurrent - shieldDamage, hpCurrent, shieldDamage, 0
	}

	// ── 破盾阶段：按"当前HP"的5%灼烧（HP越低每跳掉得越少，不会一口气烧死）──
	if hpCurrent <= 0 {
		return 0, 0, 0, 0 // 已经没血了，无可再扣
	}
	hpDamage = int64(float64(hpCurrent) * BurnDamagePercent)
	if hpDamage < 1 {
		hpDamage = 1 // 保底1点：HP<20时5%截断为0，也要至少掉1点
	}
	hpAfter = hpCurrent - hpDamage
	if hpAfter < 0 {
		hpDamage = hpCurrent // 极端情况兜底：实际扣减量不超过剩余HP
		hpAfter = 0
	}
	return 0, hpAfter, 0, hpDamage // 破盾阶段护盾扣减恒为0
}
