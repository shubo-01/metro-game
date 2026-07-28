// calc_test.go 人物系统属性 V2 数值计算单元测试
// 覆盖三份需求文档中的全部"验收锚点"（文档给出的标准答案数值），
// 只要这些断言全部通过，就证明 V2 公式实现与策划案完全一致。
// 运行方式（backend 目录下）：go test ./internal/character/ -count=1
package character

import (
	"math"
	"testing"
)

// almostEqual 浮点数近似比较（误差容忍 1e-9），
// 因为浮点乘除会有极小的二进制误差，不能直接用 == 判断。
func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// ═══════════════════════════════════════════
//  一、衍生属性锚点（基础表值文档 验收标准）
// ═══════════════════════════════════════════

// TestDerivedAttrs_Anchor_Balanced 锚点1：人100级凡品均分 67/67/67
// 文档标准答案：气血3350 体魄335 根骨201 灵力1340 功法威力134 魂力3350 护盾40200
func TestDerivedAttrs_Anchor_Balanced(t *testing.T) {
	d := CalcDerivedAttrs(67, 67, 67)

	if d.HPMax != 3350 {
		t.Errorf("气血上限：期望3350，实际%d", d.HPMax)
	}
	if d.Physique != 335 {
		t.Errorf("体魄：期望335，实际%d", d.Physique)
	}
	if d.BoneBase != 201 {
		t.Errorf("根骨：期望201，实际%d", d.BoneBase)
	}
	if d.MpMax != 1340 {
		t.Errorf("灵力上限：期望1340，实际%d", d.MpMax)
	}
	if d.SkillPower != 134 {
		t.Errorf("功法威力：期望134，实际%d", d.SkillPower)
	}
	if d.SoulMax != 3350 {
		t.Errorf("魂力上限：期望3350，实际%d", d.SoulMax)
	}
	if d.ShieldMax != 40200 {
		t.Errorf("护盾上限：期望40200，实际%d", d.ShieldMax)
	}
	// 均分Build必然均衡：max/min=1 ≤ 3 → 伤害×2
	if d.Equilibrium != 2.0 {
		t.Errorf("均衡加成：期望2.0，实际%v", d.Equilibrium)
	}
	// 其余衍生：身法67 神识67 反应67 亲和33.5 异常抵抗33.5 护盾回速402/秒
	if d.Agility != 67 || d.SenseRange != 67 || d.Reaction != 67 {
		t.Errorf("身法/神识/反应：期望67/67/67，实际%d/%d/%d", d.Agility, d.SenseRange, d.Reaction)
	}
	if !almostEqual(d.Affinity, 33.5) {
		t.Errorf("五行亲和：期望33.5，实际%v", d.Affinity)
	}
	if !almostEqual(d.AbnormalResist, 33.5) {
		t.Errorf("异常抵抗值：期望33.5，实际%v", d.AbnormalResist)
	}
	if d.ShieldRegen != 402 {
		t.Errorf("护盾恢复速度：期望402/秒，实际%d", d.ShieldRegen)
	}
}

// TestDerivedAttrs_Anchor_FullJing 锚点2：人100级全精 199/1/1
// 文档标准答案：气血9950；护盾仍是40200（总点数一样护盾就一样厚，护盾阶段人人公平）
func TestDerivedAttrs_Anchor_FullJing(t *testing.T) {
	d := CalcDerivedAttrs(199, 1, 1)

	if d.HPMax != 9950 {
		t.Errorf("全精气血上限：期望9950，实际%d", d.HPMax)
	}
	if d.ShieldMax != 40200 {
		t.Errorf("全精护盾上限：期望40200（与均分相同），实际%d", d.ShieldMax)
	}
	// 极端偏科：199/1 = 199 > 3 → 无均衡加成
	if d.Equilibrium != 1.0 {
		t.Errorf("全精均衡加成：期望1.0（偏科无加成），实际%v", d.Equilibrium)
	}
}

// TestDerivedAttrs_Anchor_Jinxian 锚点3：金仙全精 2427
// 文档标准答案：气血 2427×50 = 121350
func TestDerivedAttrs_Anchor_Jinxian(t *testing.T) {
	d := CalcDerivedAttrs(2427, 1, 1)
	if d.HPMax != 121350 {
		t.Errorf("金仙全精气血上限：期望121350，实际%d", d.HPMax)
	}
}

// ═══════════════════════════════════════════
//  二、均衡加成边界（PRD：max/min ≤ 3 → ×2，否则 ×1）
// ═══════════════════════════════════════════

func TestCalcEquilibrium_Boundary(t *testing.T) {
	// 恰好等于3：90/30 = 3 → 临界值也算均衡，×2
	if got := CalcEquilibrium(90, 45, 30); got != 2.0 {
		t.Errorf("ratio=3（临界）：期望×2，实际×%v", got)
	}
	// 略超过3：91/30 ≈ 3.033 → 不均衡，×1
	if got := CalcEquilibrium(91, 45, 30); got != 1.0 {
		t.Errorf("ratio>3：期望×1，实际×%v", got)
	}
	// 完全均分 → ×2
	if got := CalcEquilibrium(67, 67, 67); got != 2.0 {
		t.Errorf("均分：期望×2，实际×%v", got)
	}
	// 极端偏科 → ×1
	if got := CalcEquilibrium(199, 1, 1); got != 1.0 {
		t.Errorf("极端偏科：期望×1，实际×%v", got)
	}
	// 有属性为0（防御性）→ ×1
	if got := CalcEquilibrium(10, 0, 10); got != 1.0 {
		t.Errorf("属性为0：期望×1，实际×%v", got)
	}
}

// ═══════════════════════════════════════════
//  三、技能等级倍率（1-10级：伤害+10%/级，冷却-3%/级）
// ═══════════════════════════════════════════

func TestCalcSkillMultiplier(t *testing.T) {
	cases := []struct {
		level int
		want  float64
	}{
		{1, 1.0},  // 1级 ×1.0
		{5, 1.4},  // 5级 ×1.4
		{10, 1.9}, // 10级 ×1.9（满级）
		{0, 1.0},  // 非法输入夹到1级
		{99, 1.9}, // 非法输入夹到10级
	}
	for _, c := range cases {
		if got := CalcSkillMultiplier(c.level); !almostEqual(got, c.want) {
			t.Errorf("技能%d级伤害倍率：期望%v，实际%v", c.level, c.want, got)
		}
	}
	// 冷却缩减：1级=100%，10级=73%（快27%）
	if got := CalcSkillCooldownRate(1); !almostEqual(got, 1.0) {
		t.Errorf("1级冷却：期望1.0，实际%v", got)
	}
	if got := CalcSkillCooldownRate(10); !almostEqual(got, 0.73) {
		t.Errorf("10级冷却：期望0.73，实际%v", got)
	}
}

// ═══════════════════════════════════════════
//  四、K值递减体系（亲和加成 / 异常抵抗率）
// ═══════════════════════════════════════════

// TestKValueTable K值查表锚点：人100 K亲和=67 K反应=134；真人171；大罗878
func TestKValueTable(t *testing.T) {
	if got := GetKAffinity(RealmHuman); got != 67 {
		t.Errorf("人 K亲和：期望67，实际%v", got)
	}
	if got := GetKReaction(RealmHuman); got != 134 {
		t.Errorf("人 K反应：期望134，实际%v", got)
	}
	if got := GetKAffinity(RealmZhenren); got != 171 {
		t.Errorf("真人 K亲和：期望171，实际%v", got)
	}
	if got := GetKAffinity(RealmDaluoJx); got != 878 {
		t.Errorf("大罗 K亲和：期望878，实际%v", got)
	}
	// K异常与K亲和数值一致
	if GetKAbnormal(RealmHuman) != GetKAffinity(RealmHuman) {
		t.Errorf("K异常应等于K亲和")
	}
}

// TestCalcAffinityBonus 亲和加成 = 1 + 亲和/(亲和+K)
func TestCalcAffinityBonus(t *testing.T) {
	// 人100级均分凡品：亲和33.5、K=67 → 1 + 33.5/100.5 = 4/3 ≈ 1.3333
	if got := CalcAffinityBonus(33.5, 67); !almostEqual(got, 1.0+33.5/100.5) {
		t.Errorf("亲和33.5加成：期望%v，实际%v", 1.0+33.5/100.5, got)
	}
	// 亲和=K时正好 1.5 倍
	if got := CalcAffinityBonus(67, 67); !almostEqual(got, 1.5) {
		t.Errorf("亲和=K：期望1.5，实际%v", got)
	}
	// 无亲和 → 不加成
	if got := CalcAffinityBonus(0, 67); got != 1.0 {
		t.Errorf("亲和0：期望1.0，实际%v", got)
	}
}

// TestCalcAbnormalResistRate 异常抵抗率锚点：抵抗值67、K=67 → 50%
// （对应文档"珍品均分：神134 → 抵抗值67 → 抵抗率50%"的验收数值）
func TestCalcAbnormalResistRate(t *testing.T) {
	if got := CalcAbnormalResistRate(67, 67); !almostEqual(got, 0.5) {
		t.Errorf("抵抗值67/K67：期望50%%，实际%v", got)
	}
	// 无抵抗值 → 0%
	if got := CalcAbnormalResistRate(0, 67); got != 0.0 {
		t.Errorf("抵抗值0：期望0，实际%v", got)
	}
}

// TestCalcAbnormalTriggerProb 异常触发概率 = 基础概率 × (1-抵抗率)
func TestCalcAbnormalTriggerProb(t *testing.T) {
	// 冰冻基础30%，抵抗率50% → 实际15%
	if got := CalcAbnormalTriggerProb(AbnormalBaseProb[AbnormalFrozen], 67, 67); !almostEqual(got, 0.15) {
		t.Errorf("冰冻vs抵抗50%%：期望0.15，实际%v", got)
	}
	// 眩晕基础20%，无抵抗 → 20%
	if got := CalcAbnormalTriggerProb(AbnormalBaseProb[AbnormalStun], 0, 67); !almostEqual(got, 0.20) {
		t.Errorf("眩晕vs无抵抗：期望0.20，实际%v", got)
	}
	// 基础概率/持续时间常量核对（PRD 4.4 异常状态表）
	if AbnormalBaseProb[AbnormalBurn] != 0.30 || AbnormalDuration[AbnormalBurn] != 3.0 {
		t.Errorf("灼烧参数：期望30%%/3秒")
	}
	if AbnormalDuration[AbnormalFrozen] != 2.0 || AbnormalDuration[AbnormalStun] != 1.5 {
		t.Errorf("冰冻/眩晕持续时间：期望2秒/1.5秒")
	}
}

// ═══════════════════════════════════════════
//  五、五行相生 / 克制
// ═══════════════════════════════════════════

func TestCalcShengMultiplier(t *testing.T) {
	// 单相生：金→水（金1生水3）→ ×1.3
	if got := CalcShengMultiplier([]int{1, 3}); !almostEqual(got, 1.3) {
		t.Errorf("单相生金水：期望1.3，实际%v", got)
	}
	// 三连相生：金→水→木 → ×1.5
	if got := CalcShengMultiplier([]int{1, 3, 2}); !almostEqual(got, 1.5) {
		t.Errorf("三连相生金水木：期望1.5，实际%v", got)
	}
	// 五修循环 → ×1.2
	if got := CalcShengMultiplier([]int{1, 2, 3, 4, 5}); !almostEqual(got, 1.2) {
		t.Errorf("五修循环：期望1.2，实际%v", got)
	}
	// 无相生：金+火（金不生火，火不生金）→ ×1.0
	if got := CalcShengMultiplier([]int{1, 4}); !almostEqual(got, 1.0) {
		t.Errorf("无相生金火：期望1.0，实际%v", got)
	}
	// 单修 → ×1.0
	if got := CalcShengMultiplier([]int{4}); !almostEqual(got, 1.0) {
		t.Errorf("单修：期望1.0，实际%v", got)
	}
}

func TestCalcElementCounterV2(t *testing.T) {
	// 金(1)克木(2) → ×1.5
	if got := CalcElementCounterV2(1, 2, 201, 201); !almostEqual(got, 1.5) {
		t.Errorf("金克木：期望1.5，实际%v", got)
	}
	// 被克：木(2)攻金(1)（金克木）→ ×0.7
	if got := CalcElementCounterV2(2, 1, 201, 201); !almostEqual(got, 0.7) {
		t.Errorf("木被金克：期望0.7，实际%v", got)
	}
	// 逆克：被克但我方精气神总和 > 对方2倍 → 回到×1.0
	if got := CalcElementCounterV2(2, 1, 500, 201); !almostEqual(got, 1.0) {
		t.Errorf("逆克（500 vs 201）：期望1.0，实际%v", got)
	}
	// 无克制关系：金(1) vs 水(3) → ×1.0
	if got := CalcElementCounterV2(1, 3, 201, 201); !almostEqual(got, 1.0) {
		t.Errorf("金vs水无克制：期望1.0，实际%v", got)
	}
}

// ═══════════════════════════════════════════
//  六、四条伤害路径样例
// ═══════════════════════════════════════════

// TestCalcDamage_WeaponPath 路径B 体修（武器技）
// 全精199/1/1 + 武器基础100 + 技能1级 + 不暴击：
// 伤害 = (体魄995 + 100) × 1.0 × 1.0 × 1.0(偏科无均衡) = 1095
func TestCalcDamage_WeaponPath(t *testing.T) {
	res := CalcDamage(DamageInput{
		SkillType: SkillTypeWeapon, SkillLevel: 1, WeaponBase: 100,
		AtkJing: 199, AtkQi: 1, AtkShen: 1, RealmIdx: RealmHuman,
	})
	if res.RawDamage != 1095 {
		t.Errorf("体修全精武器技：期望1095，实际%d", res.RawDamage)
	}
	// 均分67 + 武器100 + 5级技能(×1.4) + 均衡×2：
	// (335+100) × 1.4 × 2 = 1218
	res2 := CalcDamage(DamageInput{
		SkillType: SkillTypeWeapon, SkillLevel: 5, WeaponBase: 100,
		AtkJing: 67, AtkQi: 67, AtkShen: 67, RealmIdx: RealmHuman,
	})
	if res2.RawDamage != 1218 {
		t.Errorf("体修均分5级武器技：期望1218，实际%d", res2.RawDamage)
	}
}

// TestCalcDamage_ElementPath 路径A 法修（五行技）
// 人100级均分67单修火 + 技能1级 + 无克制 + 不暴击：
// 150 × (134/134) × 1.0 × 多修1 × 相生1 × 克制1 × 亲和(1+33.5/100.5≈1.333) × 均衡2
// = 150 × 4/3 × 2 = 400（浮点截断后为399或400，均视为正确）
func TestCalcDamage_ElementPath(t *testing.T) {
	res := CalcDamage(DamageInput{
		SkillType: SkillTypeElement, SkillLevel: 1, ElementType: 4,
		AtkJing: 67, AtkQi: 67, AtkShen: 67, AtkElements: []int{4},
		DefElement: 0, RealmIdx: RealmHuman,
	})
	// 各乘区明细逐项核对
	if !almostEqual(res.BaseDamage, 150) {
		t.Errorf("法修基础伤害：期望150（功法威力=基准），实际%v", res.BaseDamage)
	}
	if !almostEqual(res.MultiMul, 1.0) || !almostEqual(res.ShengMul, 1.0) || !almostEqual(res.CounterMul, 1.0) {
		t.Errorf("单修无相生无克制：多修/相生/克制均应为1")
	}
	if !almostEqual(res.AffinityBonus, 1.0+33.5/100.5) {
		t.Errorf("亲和加成：期望%v，实际%v", 1.0+33.5/100.5, res.AffinityBonus)
	}
	if !almostEqual(res.Equilibrium, 2.0) {
		t.Errorf("均衡：期望2.0，实际%v", res.Equilibrium)
	}
	// 最终伤害 ≈ 400（int64 截断允许 399/400）
	if res.RawDamage != 399 && res.RawDamage != 400 {
		t.Errorf("法修均分单修：期望≈400，实际%d", res.RawDamage)
	}

	// 五修全齐（多修×15 × 相生×1.2 = ×18 质变）核对倍率
	res5 := CalcDamage(DamageInput{
		SkillType: SkillTypeElement, SkillLevel: 1, ElementType: 4,
		AtkJing: 67, AtkQi: 67, AtkShen: 67, AtkElements: []int{1, 2, 3, 4, 5},
		RealmIdx: RealmHuman,
	})
	if !almostEqual(res5.MultiMul, 15.0) || !almostEqual(res5.ShengMul, 1.2) {
		t.Errorf("五修：多修期望×15、相生期望×1.2，实际×%v/×%v", res5.MultiMul, res5.ShengMul)
	}
}

// TestCalcDamage_DivinePath 路径C 魂修（神位技）
// 人100级均分67（神=基准67）+ 技能1级 + 不暴击：
// 300 × (67/67) × 1.0 × 均衡2 = 600
func TestCalcDamage_DivinePath(t *testing.T) {
	res := CalcDamage(DamageInput{
		SkillType: SkillTypeDivine, SkillLevel: 1,
		AtkJing: 67, AtkQi: 67, AtkShen: 67, RealmIdx: RealmHuman,
	})
	if res.RawDamage != 600 {
		t.Errorf("魂修均分神位技：期望600，实际%d", res.RawDamage)
	}
	// 暴击版本：600 × 1.5 = 900
	resCrit := CalcDamage(DamageInput{
		SkillType: SkillTypeDivine, SkillLevel: 1,
		AtkJing: 67, AtkQi: 67, AtkShen: 67, RealmIdx: RealmHuman, IsCrit: true,
	})
	if resCrit.RawDamage != 900 {
		t.Errorf("魂修暴击：期望900，实际%d", resCrit.RawDamage)
	}
}

// ═══════════════════════════════════════════
//  七、护盾结算（先扣盾后扣血）
// ═══════════════════════════════════════════

func TestApplyDamage(t *testing.T) {
	// 场景1：护盾1000 HP500 受伤300 → 护盾700 HP500 未破盾
	shield, hp, absorbed, hpDmg, broken := ApplyDamage(1000, 500, 300)
	if shield != 700 || hp != 500 || absorbed != 300 || hpDmg != 0 || broken {
		t.Errorf("未破盾场景：期望盾700血500吸300，实际盾%d血%d吸%d扣%d破%v", shield, hp, absorbed, hpDmg, broken)
	}
	// 场景2：护盾1000 HP500 受伤1200 → 护盾0 HP300 破盾溢出200
	shield, hp, absorbed, hpDmg, broken = ApplyDamage(1000, 500, 1200)
	if shield != 0 || hp != 300 || absorbed != 1000 || hpDmg != 200 || !broken {
		t.Errorf("破盾场景：期望盾0血300吸1000扣200，实际盾%d血%d吸%d扣%d破%v", shield, hp, absorbed, hpDmg, broken)
	}
	// 场景3：伤害超过盾+血总和 → HP归零不为负
	_, hp, _, _, _ = ApplyDamage(100, 50, 9999)
	if hp != 0 {
		t.Errorf("超杀场景：HP应归零，实际%d", hp)
	}
	// 场景4：0伤害无事发生
	shield, hp, absorbed, hpDmg, broken = ApplyDamage(1000, 500, 0)
	if shield != 1000 || hp != 500 || absorbed != 0 || hpDmg != 0 || broken {
		t.Errorf("0伤害场景：应全部保持原值")
	}
}

// ═══════════════════════════════════════════
//  八、境界表（档位索引 / 固定点 / 每级自由点）
// ═══════════════════════════════════════════

func TestRealmIndex(t *testing.T) {
	// 1-7大境界与档位一一对应
	if RealmIndex(1, 0) != RealmHuman || RealmIndex(7, 0) != RealmDaluoJx {
		t.Errorf("大境界档位映射错误")
	}
	// 神魔子阶：太极→8档，太易→12档
	if RealmIndex(8, 1) != RealmTaiji || RealmIndex(8, 5) != RealmTaiyi {
		t.Errorf("神魔子阶档位映射错误")
	}
	// 刚突破神魔未记录子阶（0）→ 默认太极
	if RealmIndex(8, 0) != RealmTaiji {
		t.Errorf("神魔子阶0应默认太极档位")
	}
}

// TestFixedPointsTable 固定点表锚点：人1/真人6/地仙16/天仙31/金仙51/太乙76/大罗106/太极141/太易331
func TestFixedPointsTable(t *testing.T) {
	want := map[int]int{
		RealmHuman: 1, RealmZhenren: 6, RealmDixian: 16, RealmTianxian: 31,
		RealmJinxian: 51, RealmTaiyiJx: 76, RealmDaluoJx: 106,
		RealmTaiji: 141, RealmTaiyi: 331,
	}
	for idx, w := range want {
		if got := GetFixedPoints(idx); got != w {
			t.Errorf("境界档位%d固定点：期望%d，实际%d", idx, w, got)
		}
	}
}

// TestFreePointsPerLevel 每级自由点锚点：人+2/级（任务书核心规则）
func TestFreePointsPerLevel(t *testing.T) {
	if got := GetFreePointsPerLevel(RealmHuman); got != 2 {
		t.Errorf("人境界每级自由点：期望2，实际%d", got)
	}
	if got := GetFreePointsPerLevel(RealmZhenren); got != 3 {
		t.Errorf("真人境界每级自由点：期望3，实际%d", got)
	}
}

// TestBaselineTable 基准值锚点：基准功法威力=基准×2，基准神=基准
func TestBaselineTable(t *testing.T) {
	// 人100级基准67 → 基准功法威力134
	if got := GetBaselinePower(RealmHuman); got != 134 {
		t.Errorf("人基准功法威力：期望134，实际%v", got)
	}
	if got := GetBaselineShen(RealmHuman); got != 67 {
		t.Errorf("人基准神：期望67，实际%v", got)
	}
}

// ═══════════════════════════════════════════
//  九、灼烧持续掉血（ApplyBurnTick 边界测试）
//  规则：未破盾扣护盾上限5%（最少1点）；破盾后扣当前HP5%（最少1点，HP不低于0）
// ═══════════════════════════════════════════

func TestApplyBurnTick(t *testing.T) {
	// 场景1 护盾阶段：盾上限40200、当前10000、HP3350
	// → 扣护盾上限5% = 2010（注意按"上限"算，不是按当前值），盾10000-2010=7990，HP不动
	shield, hp, sd, hd := ApplyBurnTick(40200, 10000, 3350)
	if shield != 7990 || hp != 3350 || sd != 2010 || hd != 0 {
		t.Errorf("护盾阶段：期望盾7990血3350扣盾2010扣血0，实际盾%d血%d扣盾%d扣血%d", shield, hp, sd, hd)
	}

	// 场景2 护盾阶段但剩余护盾不足一跳：盾上限40200（一跳2010）、当前只剩100
	// → 只扣掉剩余的100，盾归0，本跳不穿透HP（下一跳走破盾分支）
	shield, hp, sd, hd = ApplyBurnTick(40200, 100, 3350)
	if shield != 0 || hp != 3350 || sd != 100 || hd != 0 {
		t.Errorf("护盾不足一跳：期望盾0血3350扣盾100扣血0，实际盾%d血%d扣盾%d扣血%d", shield, hp, sd, hd)
	}

	// 场景3 护盾阶段最少1点：盾上限10（5%=0.5截断为0→保底1点）、当前5 → 扣1剩4
	shield, _, sd, _ = ApplyBurnTick(10, 5, 100)
	if shield != 4 || sd != 1 {
		t.Errorf("护盾保底1点：期望盾4扣盾1，实际盾%d扣盾%d", shield, sd)
	}

	// 场景4 破盾阶段：盾0、HP1000 → 扣当前HP5% = 50 → HP950
	shield, hp, sd, hd = ApplyBurnTick(40200, 0, 1000)
	if shield != 0 || hp != 950 || sd != 0 || hd != 50 {
		t.Errorf("破盾阶段：期望盾0血950扣盾0扣血50，实际盾%d血%d扣盾%d扣血%d", shield, hp, sd, hd)
	}

	// 场景5 破盾阶段最少1点：HP10 → 5%=0.5截断为0 → 保底扣1 → HP9
	_, hp, _, hd = ApplyBurnTick(40200, 0, 10)
	if hp != 9 || hd != 1 {
		t.Errorf("HP保底1点：期望血9扣血1，实际血%d扣血%d", hp, hd)
	}

	// 场景6 HP被打空：HP只剩1 → 保底扣1 → HP归0不为负（归零=死亡，由死亡系统接管）
	_, hp, _, hd = ApplyBurnTick(0, 0, 1)
	if hp != 0 || hd != 1 {
		t.Errorf("HP打空：期望血0扣血1，实际血%d扣血%d", hp, hd)
	}

	// 场景7 HP已经是0：无可再扣，全部返回0（不能扣成负数）
	shield, hp, sd, hd = ApplyBurnTick(0, 0, 0)
	if shield != 0 || hp != 0 || sd != 0 || hd != 0 {
		t.Errorf("HP已为0：期望全0，实际盾%d血%d扣盾%d扣血%d", shield, hp, sd, hd)
	}
}
