// Package gongfa 纯函数单元测试（表驱动，无 DB 依赖）。
// 【锚点原则】所有期望值锁定三份文档原文数值：
//   - 升级XP锚点：人阶 Lv.50 = 51,000（PRD 4.1 原文示例）
//   - 怪物XP阶段绝对值：普通怪Lv.1 = 2/10/30/60/120/240/480/960（PRD 表4-3）
//   - 等级差倍率全边界（PRD 表4-4）
//   - 遗忘总成本：凡0/灵228/仙377/道645（PRD 表2-4）
//   - 走火判定边界：品级×10 > max(精气神)（PRD 2.5）
//   - 打坐单位：10分钟/单位、每日4小时封顶（PRD 2.1）
package gongfa

import (
	"math"
	"testing"
)

// TestCalcUpgradeExpReq 升级XP公式 = 神兽base×(等级+1)/2×100（PRD 4.1）
func TestCalcUpgradeExpReq(t *testing.T) {
	cases := []struct {
		name  string
		stage int
		level int
		want  int64
	}{
		{"文档锚点：人阶Lv.50 = 20×51/2×100 = 51,000", 1, 50, 51000},
		{"人阶Lv.1 = 20×2/2×100 = 2,000", 1, 1, 2000},
		{"人阶Lv.100 = 20×101/2×100 = 101,000", 1, 100, 101000},
		{"真人Lv.50 = 100×51/2×100 = 255,000", 2, 50, 255000},
		{"地仙Lv.1 = 300×2/2×100 = 30,000", 3, 1, 30000},
		{"金仙Lv.50 = 1200×51/2×100 = 3,060,000", 5, 50, 3060000},
		{"神魔Lv.500 = 9600×501/2×100 = 240,480,000", 8, 500, 240480000},
		{"非法阶段0 → 0", 0, 50, 0},
		{"非法阶段9 → 0", 9, 50, 0},
		{"非法等级0 → 0", 1, 0, 0},
	}
	for _, c := range cases {
		if got := CalcUpgradeExpReq(c.stage, c.level); got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, got, c.want)
		}
	}
}

// TestLevelDiffMult 等级差经验倍率全边界（PRD 表4-4，两文档一致）
func TestLevelDiffMult(t *testing.T) {
	cases := []struct {
		diff int
		want float64
	}{
		{-30, 0}, {-5, 0}, {-4, 0}, // ≤-4 无经验
		{-3, 0.5}, {-2, 0.5}, {-1, 0.5}, // -3~-1 减半
		{0, 1.0},                     // 同级
		{1, 1.2}, {2, 1.2}, {3, 1.2}, // 1-3 级
		{4, 1.5}, {5, 1.5}, {6, 1.5}, // 4-6 级
		{7, 1.8}, {8, 1.8}, {10, 1.8}, // 7-10 级
		{11, 2.0}, {15, 2.0}, {20, 2.0}, // 11-20 级
		{21, 2.0}, {100, 2.0}, // >20 封顶 2.0
	}
	for _, c := range cases {
		if got := LevelDiffMult(c.diff); got != c.want {
			t.Errorf("diff=%d: got %v, want %v", c.diff, got, c.want)
		}
	}
}

// TestStageXPMultTable 阶段累积倍率必须复现 PRD 表4-3"普通怪Lv.1"绝对值列
// （2/10/30/60/120/240/480/960）——防止误用技术方案伪代码的相对倍率
func TestStageXPMultTable(t *testing.T) {
	wantAbs := []float64{2, 10, 30, 60, 120, 240, 480, 960} // 表4-3 原文
	for stage := 1; stage <= 8; stage++ {
		got := CalcMonsterBaseXP(stage, 1, 1) // 普通怪 Lv.1
		if got != wantAbs[stage-1] {
			t.Errorf("阶段%d 普通怪Lv.1 XP: got %v, want %v", stage, got, wantAbs[stage-1])
		}
	}
	// 类型base 校验（PRD 表4-2）：阶段1 Lv.1 → 精英5/Boss8/妖10/神兽20
	typeWant := map[int]float64{1: 2, 2: 5, 3: 8, 4: 10, 5: 20}
	for mType, want := range typeWant {
		if got := CalcMonsterBaseXP(1, mType, 1); got != want {
			t.Errorf("阶段1 类型%d Lv.1 XP: got %v, want %v", mType, got, want)
		}
	}
}

// TestCalcMonsterBaseXP 怪物基础XP = base×(等级+1)/2×阶段倍率（PRD 4.2）
func TestCalcMonsterBaseXP(t *testing.T) {
	cases := []struct {
		name                string
		stage, mType, level int
		want                float64
	}{
		{"人阶普通怪Lv.10 = 2×11/2×1 = 11", 1, 1, 10, 11},
		{"人阶普通怪Lv.50 = 2×51/2×1 = 51", 1, 1, 50, 51},
		{"人阶神兽Lv.50 = 20×51/2×1 = 510（升级XP=其×100=51,000）", 1, 5, 50, 510},
		{"真人Boss Lv.20 = 8×21/2×5 = 420", 2, 3, 20, 420},
		{"神魔妖Lv.100 = 10×101/2×480 = 242,400", 8, 4, 100, 242400},
		{"非法阶段 → 0", 0, 1, 10, 0},
		{"非法类型 → 0", 1, 6, 10, 0},
		{"非法等级 → 0", 1, 1, 0, 0},
	}
	for _, c := range cases {
		if got := CalcMonsterBaseXP(c.stage, c.mType, c.level); got != c.want {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

// TestCalcKillXP 最终XP = 基础XP×等级差×多修×伤害占比，向下取整
func TestCalcKillXP(t *testing.T) {
	cases := []struct {
		name                          string
		stage, mType, mLevel, playerL int
		xiuMult, ratio                float64
		want                          int64
	}{
		{"同级1修独享：Lv.10普通怪 = 11×1.0×1×1 = 11", 1, 1, 10, 10, 1, 1, 11},
		{"高3级：11×1.2 = 13.2 → 13（向下取整）", 1, 1, 10, 13, 1, 1, 13},
		{"高7级：11×1.8 = 19.8 → 19", 1, 1, 10, 17, 1, 1, 19},
		{"低4级打不动：11×0 = 0", 1, 1, 10, 6, 1, 1, 0},
		{"低1级减半：11×0.5 = 5.5 → 5", 1, 1, 10, 9, 1, 1, 5},
		{"5修（×9）：11×1×9×1 = 99", 1, 1, 10, 10, 9, 1, 99},
		{"组队半血占比：11×1×1×0.5 = 5.5 → 5", 1, 1, 10, 10, 1, 0.5, 5},
		{"占比越界钳制到1：等同独享", 1, 1, 10, 10, 1, 5, 11},
		{"占比负数钳制到0", 1, 1, 10, 10, 1, -1, 0},
	}
	for _, c := range cases {
		got := CalcKillXP(c.stage, c.mType, c.mLevel, c.playerL, c.xiuMult, c.ratio)
		if got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, got, c.want)
		}
	}
}

// TestZouhuoTriggered 走火判定：品级×10 > max(精,气,神)（PRD 2.5，裸值，整数实现）
func TestZouhuoTriggered(t *testing.T) {
	cases := []struct {
		name           string
		tier           int
		jing, qi, shen int
		want           bool
	}{
		{"凡法 max=9 → 10>9 触发", TierFan, 9, 5, 3, true},
		{"凡法 max=10 → 10>10 不触发（边界）", TierFan, 10, 5, 3, false},
		{"灵法 max=19 → 20>19 触发", TierLing, 10, 19, 5, true},
		{"灵法 max=20 → 不触发（边界）", TierLing, 10, 20, 5, false},
		{"仙法 max=29 → 触发", TierXian, 29, 20, 10, true},
		{"仙法 max=30 → 不触发（边界）", TierXian, 10, 10, 30, false},
		{"道法 max=39 → 触发", TierDao, 39, 39, 39, true},
		{"道法 max=40 → 不触发（边界）", TierDao, 5, 40, 5, false},
		{"max 取三者最大：精低但神高不触发", TierLing, 1, 1, 50, false},
	}
	for _, c := range cases {
		if got := ZouhuoTriggered(c.tier, c.jing, c.qi, c.shen); got != c.want {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

// TestCalcForgetTotalCost 遗忘总成本锚点（PRD 表2-4 原文）：
// 凡0 / 灵法 30+2×99=228 / 仙法 80+3×99=377 / 道法 150+5×99=645
func TestCalcForgetTotalCost(t *testing.T) {
	cases := []struct {
		tier int
		want int
	}{
		{TierFan, 0},
		{TierLing, 228},
		{TierXian, 377},
		{TierDao, 645},
	}
	for _, c := range cases {
		if got := CalcForgetTotalCost(ForgetCostTable[c.tier]); got != c.want {
			t.Errorf("品级%d 遗忘总成本: got %d, want %d", c.tier, got, c.want)
		}
	}
	// 明细锚点：灵法 30灵石+2汤 / 仙法 80+3 / 道法 150+5（表2-4 原文）
	if c := ForgetCostTable[TierLing]; c.SpiritStone != 30 || c.SoupCount != 2 {
		t.Errorf("灵法遗忘费用应为 30灵石+2孟遗汤，got %+v", c)
	}
	if c := ForgetCostTable[TierXian]; c.SpiritStone != 80 || c.SoupCount != 3 {
		t.Errorf("仙法遗忘费用应为 80灵石+3孟遗汤，got %+v", c)
	}
	if c := ForgetCostTable[TierDao]; c.SpiritStone != 150 || c.SoupCount != 5 {
		t.Errorf("道法遗忘费用应为 150灵石+5孟遗汤，got %+v", c)
	}
}

// TestCheckLearnReq 学习要求校验（PRD 表2-1）：
// 灵法 人阶50级+精气神120 / 仙法 真人20级+300 / 道法 金仙50级+2000
func TestCheckLearnReq(t *testing.T) {
	ling := LearnReqTable[TierLing]
	xian := LearnReqTable[TierXian]
	dao := LearnReqTable[TierDao]
	cases := []struct {
		name    string
		req     LearnReq
		major   int
		level   int
		total   int
		wantErr error
	}{
		{"凡法无要求：1级0属性也能学", LearnReqTable[TierFan], 1, 1, 0, nil},
		{"灵法：人阶50级+120 恰好达标", ling, 1, 50, 120, nil},
		{"灵法：人阶49级 → 等级不足", ling, 1, 49, 999, ErrLevelNotEnough},
		{"灵法：人阶50级但总和119 → 属性不足", ling, 1, 50, 119, ErrAttrNotEnough},
		{"灵法：大境界更高（真人1级）直接过等级关", ling, 2, 1, 120, nil},
		{"仙法：真人20级+300 恰好达标", xian, 2, 20, 300, nil},
		{"仙法：真人19级 → 等级不足", xian, 2, 19, 999, ErrLevelNotEnough},
		{"仙法：人阶90级也不行（大境界不足）", xian, 1, 90, 999, ErrLevelNotEnough},
		{"道法：金仙50级+2000 恰好达标", dao, 5, 50, 2000, nil},
		{"道法：金仙50级但1999 → 属性不足", dao, 5, 50, 1999, ErrAttrNotEnough},
		{"道法：天仙(4)不够金仙(5) → 等级不足", dao, 4, 100, 9999, ErrLevelNotEnough},
	}
	for _, c := range cases {
		got := CheckLearnReq(c.req, c.major, c.level, c.total)
		if got != c.wantErr {
			t.Errorf("%s: got %v, want %v", c.name, got, c.wantErr)
		}
	}
}

// TestCharLevel 级内等级换算：Lv = (小阶-1)×10 + 段格 + 1（与 shenwei 包同口径）
func TestCharLevel(t *testing.T) {
	cases := []struct {
		minor, seg, want int
	}{
		{1, 0, 1},  // 一阶0段 = Lv.1
		{1, 9, 10}, // 一阶9段 = Lv.10
		{5, 9, 50}, // 五阶9段 = Lv.50（灵法要求锚点）
		{2, 9, 20}, // 二阶9段 = Lv.20（仙法要求锚点）
		{9, 9, 90}, // 九阶9段 = Lv.90（大境界满级）
	}
	for _, c := range cases {
		if got := CharLevel(c.minor, c.seg); got != c.want {
			t.Errorf("CharLevel(%d,%d): got %d, want %d", c.minor, c.seg, got, c.want)
		}
	}
}

// TestMeditateUnits 打坐结算单位（PRD 2.1：10分钟/单位不满无经验，每日4小时封顶）
func TestMeditateUnits(t *testing.T) {
	cases := []struct {
		name           string
		elapsed, today int
		want           int
	}{
		{"9分59秒 → 0单位（不满不发）", 599, 0, 0},
		{"恰好10分钟 → 1单位", 600, 0, 1},
		{"20分50秒 → 2单位（零头留下次）", 1250, 0, 2},
		{"4小时整 → 24单位", 14400, 0, 24},
		{"超4小时按额度截断 → 24单位", 99999, 0, 24},
		{"今日已用14000秒，剩400不够1单位 → 0", 1200, 14000, 0},
		{"今日已用13800秒，剩600恰好1单位", 1200, 13800, 1},
		{"今日已满4小时 → 0", 600, 14400, 0},
		{"负经过时间兜底 → 0", -10, 0, 0},
	}
	for _, c := range cases {
		if got := MeditateUnits(c.elapsed, c.today); got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, got, c.want)
		}
	}
}

// TestMeditateXPTable 打坐XP速率锚点（PRD 表2-1：凡1/灵2/仙3/道5 每10分钟）
func TestMeditateXPTable(t *testing.T) {
	want := map[int]int{TierFan: 1, TierLing: 2, TierXian: 3, TierDao: 5}
	for tier, w := range want {
		if MeditateXPTable[tier] != w {
			t.Errorf("品级%d 打坐XP/10min: got %d, want %d", tier, MeditateXPTable[tier], w)
		}
	}
	// 满4小时收益锚点：24单位 × 速率 → 凡24/灵48/仙72/道120 XP每天
	if got := 24 * MeditateXPTable[TierDao]; got != 120 {
		t.Errorf("道法满4小时XP: got %d, want 120", got)
	}
}

// TestShenshouBaseAndMaxLevel 8阶神兽base与最大等级（PRD 表4-1 原文）
func TestShenshouBaseAndMaxLevel(t *testing.T) {
	wantBase := []int64{20, 100, 300, 600, 1200, 2400, 4800, 9600}
	for stage := 1; stage <= 8; stage++ {
		if ShenshouBaseTable[stage] != wantBase[stage-1] {
			t.Errorf("阶段%d 神兽base: got %d, want %d", stage, ShenshouBaseTable[stage], wantBase[stage-1])
		}
	}
	for stage := 1; stage <= 7; stage++ {
		if StageMaxLevelTable[stage] != 100 {
			t.Errorf("阶段%d 最大等级应为100", stage)
		}
	}
	if StageMaxLevelTable[8] != 500 {
		t.Errorf("神魔最大等级应为500, got %d", StageMaxLevelTable[8])
	}
}

// TestWuxingSkillXiuNeed 五行技解锁修数（PRD 表3-3~3-6：凡1/灵2/仙3/道5）
func TestWuxingSkillXiuNeed(t *testing.T) {
	want := map[int]int{TierFan: 1, TierLing: 2, TierXian: 3, TierDao: 5}
	for tier, w := range want {
		if WuxingSkillXiuNeed[tier] != w {
			t.Errorf("品级%d 五行技所需修数: got %d, want %d", tier, WuxingSkillXiuNeed[tier], w)
		}
	}
}

// TestUpgradeReqEqualsShenshouXP100 交叉校验（PRD 4.1 原文关系）：
// 升级XP恒等于"同级神兽XP×100"，其中同级神兽XP=表4-1神兽base×(等级+1)/2。
// 【口径说明】表4-1的神兽base(20/100/300...)与表4-2类型base(20)×表4-3阶段倍率
// 在前两阶恰好相等、3阶起偏离（300≠2×15×10），故升级XP只认表4-1的神兽base。
func TestUpgradeReqEqualsShenshouXP100(t *testing.T) {
	for stage := 1; stage <= 8; stage++ {
		for _, level := range []int{1, 10, 50, 100} {
			want := int64(math.Floor(float64(ShenshouBaseTable[stage]) * float64(level+1) / 2.0 * 100))
			if got := CalcUpgradeExpReq(stage, level); got != want {
				t.Errorf("阶段%d Lv.%d 升级XP: got %d, want %d", stage, level, got, want)
			}
		}
	}
}
