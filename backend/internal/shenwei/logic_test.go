// Package shenwei 纯逻辑单元测试（表驱动，不依赖数据库）。
// 覆盖：继承门槛公式 / 切换费用 / 合成边界 / 融合边界 / 晋升免费判定 / 等级换算。
// 锚点数值全部来自《神位系统计算公式.xlsx》与 PRD 表8-1，
// 与 sql/migrations/v3_shenwei_system.sql 种子数据严格对齐。
package shenwei

import "testing"

// TestCalcInheritThreshold 继承门槛公式：门槛 = base + per_level × (Lv - 1)
// 五档公式多等级锚点对照（计算公式表 xlsx）：
//   珍品 200+3(Lv-1)；灵品 500+7(Lv-1)；仙品 1200+15(Lv-1)；
//   神话 3000+30(Lv-1)；先天 7000+50(Lv-1)；凡品恒为0
func TestCalcInheritThreshold(t *testing.T) {
	cases := []struct {
		name  string
		grade int
		level int
		want  int
	}{
		// 凡品：任何等级都无要求
		{"凡品Lv1", GradeFan, 1, 0},
		{"凡品Lv90", GradeFan, 90, 0},
		// 珍品 200+3(Lv-1)
		{"珍品Lv1", GradeZhen, 1, 200},
		{"珍品Lv10", GradeZhen, 10, 227},
		{"珍品Lv50", GradeZhen, 50, 347},
		{"珍品Lv90", GradeZhen, 90, 467},
		{"珍品Lv100", GradeZhen, 100, 497},
		// 灵品 500+7(Lv-1)
		{"灵品Lv1", GradeLing, 1, 500},
		{"灵品Lv50", GradeLing, 50, 843},
		{"灵品Lv100", GradeLing, 100, 1193},
		// 仙品 1200+15(Lv-1)
		{"仙品Lv1", GradeXian, 1, 1200},
		{"仙品Lv50", GradeXian, 50, 1935},
		{"仙品Lv100", GradeXian, 100, 2685},
		// 神话 3000+30(Lv-1)
		{"神话Lv1", GradeShenhua, 1, 3000},
		{"神话Lv100", GradeShenhua, 100, 5970},
		// 先天 7000+50(Lv-1)
		{"先天Lv1", GradeXiantian, 1, 7000},
		{"先天Lv100", GradeXiantian, 100, 11950},
		// 边界：Lv<1 按 Lv=1 保护
		{"珍品Lv0下限保护", GradeZhen, 0, 200},
		{"珍品Lv负数下限保护", GradeZhen, -5, 200},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := InheritReqTable[c.grade]
			got := CalcInheritThreshold(req.BaseReq, req.PerLevel, c.level)
			if got != c.want {
				t.Errorf("CalcInheritThreshold(grade=%d, Lv=%d) = %d, 期望 %d", c.grade, c.level, got, c.want)
			}
		})
	}
}

// TestCalcSwitchTotalCost 切换费用6档对照（PRD 表8-1，归元符单价99灵石）：
// 凡 10+1×99=109；珍 30+2×99=228；灵 80+2×99=278；
// 仙 150+3×99=447；神话 300+4×99=696；先天 500+5×99=995
func TestCalcSwitchTotalCost(t *testing.T) {
	cases := []struct {
		name      string
		grade     int
		wantStone int // 灵石部分
		wantCount int // 归元符数
		wantTotal int // 总灵石当量
	}{
		{"凡品", GradeFan, 10, 1, 109},
		{"珍品", GradeZhen, 30, 2, 228},
		{"灵品", GradeLing, 80, 2, 278},
		{"仙品", GradeXian, 150, 3, 447},
		{"神话", GradeShenhua, 300, 4, 696},
		{"先天", GradeXiantian, 500, 5, 995},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			cost := SwitchCostTable[c.grade]
			if cost.SpiritStone != c.wantStone || cost.TalismanCount != c.wantCount {
				t.Errorf("SwitchCostTable[%d] = {灵石%d 符%d}, 期望 {灵石%d 符%d}",
					c.grade, cost.SpiritStone, cost.TalismanCount, c.wantStone, c.wantCount)
			}
			if got := CalcSwitchTotalCost(cost.SpiritStone, cost.TalismanCount); got != c.wantTotal {
				t.Errorf("CalcSwitchTotalCost(%s) = %d, 期望 %d", c.name, got, c.wantTotal)
			}
		})
	}
}

// TestCanSynthesize 碎片合成 7→1 边界判定
func TestCanSynthesize(t *testing.T) {
	cases := []struct {
		count int
		want  bool
	}{
		{0, false},
		{6, false}, // 差1个，不许合成
		{7, true},  // 正好7个，允许
		{8, true},  // 超出也允许（只扣7）
		{14, true},
	}
	for _, c := range cases {
		if got := CanSynthesize(c.count); got != c.want {
			t.Errorf("CanSynthesize(%d) = %v, 期望 %v", c.count, got, c.want)
		}
	}
}

// TestCanFuse 神位融合 9→1 边界判定
func TestCanFuse(t *testing.T) {
	cases := []struct {
		count int
		want  bool
	}{
		{0, false},
		{8, false}, // 差1个，不许融合
		{9, true},  // 正好9个，允许
		{10, true},
		{18, true},
	}
	for _, c := range cases {
		if got := CanFuse(c.count); got != c.want {
			t.Errorf("CanFuse(%d) = %v, 期望 %v", c.count, got, c.want)
		}
	}
}

// TestIsPromotion 晋升免费判定：目标是否在当前激活神位的上位链上。
// 用内存 map 模拟 shenwei_def.superior_id 配置：
// 美猴王(10) → 齐天大圣(12)；其余无上位。
func TestIsPromotion(t *testing.T) {
	superiors := map[int]int{
		10: 12, // 美猴王的上位是齐天大圣
	}
	lookup := func(id int) (int, bool) {
		return superiors[id], true // 无配置返回0（无上位）
	}

	cases := []struct {
		name    string
		current int
		target  int
		want    bool
	}{
		{"美猴王→齐天大圣是晋升免费", 10, 12, true},
		{"齐天大圣→美猴王是降位收费", 12, 10, false},
		{"混世魔王→齐天大圣无上位关系收费", 11, 12, false},
		{"妖兵→魔兵平级切换收费", 1, 2, false},
		{"当前为空不算晋升", 0, 12, false},
		{"目标为空不算晋升", 10, 0, false},
		{"自己切自己不算晋升", 10, 10, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := IsPromotion(c.current, c.target, lookup); got != c.want {
				t.Errorf("IsPromotion(%d→%d) = %v, 期望 %v", c.current, c.target, got, c.want)
			}
		})
	}

	// 多级链：兵(1)→将(4)→帅(7) 假想 superior 链，隔级晋升也应免费
	chain := map[int]int{1: 4, 4: 7}
	chainLookup := func(id int) (int, bool) { return chain[id], true }
	if !IsPromotion(1, 7, chainLookup) {
		t.Error("隔级上位链 1→4→7 应判定为晋升免费")
	}

	// 环形链防御：配置错误互为上位时不能死循环，且判定为非晋升
	loop := map[int]int{1: 2, 2: 1}
	loopLookup := func(id int) (int, bool) { return loop[id], true }
	if IsPromotion(1, 3, loopLookup) {
		t.Error("环形上位链应安全终止并返回 false")
	}
}

// TestCharacterLevel 境界体系 → 角色等级Lv 换算：
// Lv = (minor_stage-1)×10 + stage_segment + 1，范围1~90
func TestCharacterLevel(t *testing.T) {
	cases := []struct {
		name         string
		minorStage   int
		stageSegment int
		want         int
	}{
		{"1阶0段=Lv1", 1, 0, 1},
		{"1阶9段=Lv10", 1, 9, 10},
		{"2阶0段=Lv11", 2, 0, 11},
		{"5阶4段=Lv45", 5, 4, 45},
		{"9阶9段=Lv90满级", 9, 9, 90},
		{"非法0阶下限保护", 0, 0, 1},
		{"非法负段下限保护", 1, -3, 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := CharacterLevel(c.minorStage, c.stageSegment); got != c.want {
				t.Errorf("CharacterLevel(%d,%d) = %d, 期望 %d", c.minorStage, c.stageSegment, got, c.want)
			}
		})
	}
}

// TestInheritThresholdWithCharacterLevel 组合验证：境界换算+门槛公式端到端。
// 例：3阶4段(Lv24) 继承珍品门槛 = 200+3×23 = 269
func TestInheritThresholdWithCharacterLevel(t *testing.T) {
	lv := CharacterLevel(3, 3) // (3-1)×10+3+1 = Lv24
	if lv != 24 {
		t.Fatalf("CharacterLevel(3,3) = %d, 期望 24", lv)
	}
	req := InheritReqTable[GradeZhen]
	if got := CalcInheritThreshold(req.BaseReq, req.PerLevel, lv); got != 269 {
		t.Errorf("珍品Lv24门槛 = %d, 期望 269", got)
	}
}
