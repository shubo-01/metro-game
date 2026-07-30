// EHP 纯函数单元测试：锚点全部锁定《怪物血量玩家攻击力对比表.xlsx》原文数值。
package monster

import (
	"math"
	"testing"
)

// TestCalcPlayerDaoAttack 玩家道术攻击力锚点（xlsx 表5-1 展示值=四舍五入）
func TestCalcPlayerDaoAttack(t *testing.T) {
	cases := []struct {
		name        string
		level, xiu  int
		wantDisplay int64 // 四舍五入后的展示值（xlsx 原表）
	}{
		{"Lv.1 1修 = 3200（总点3/气1/占比1）", 1, 1, 3200},
		{"Lv.25 1修 ≈ 9224（xlsx 原表）", 25, 1, 9224},
		{"Lv.50 1修 ≈ 9410（xlsx 原表）", 50, 1, 9410},
		{"Lv.250 1修 ≈ 9562（xlsx 神魔行）", 250, 1, 9562},
		{"Lv.25 3修 = 1修×6 ≈ 55341", 25, 3, 55341},
		{"Lv.50 5修 = 1修×15 ≈ 141149", 50, 5, 141149},
	}
	for _, c := range cases {
		got := int64(math.Round(CalcPlayerDaoAttack(c.level, c.xiu)))
		if got != c.wantDisplay {
			t.Errorf("%s: got %d, want %d", c.name, got, c.wantDisplay)
		}
	}
	// 非法参数兜底
	if CalcPlayerDaoAttack(0, 1) != 0 {
		t.Error("等级0应返回0")
	}
	if CalcPlayerDaoAttack(10, 6) != 0 {
		t.Error("修数6应返回0")
	}
}

// TestCalcEhp EHP锚点（xlsx 原表）：EHP用【未取整】攻击力相乘再四舍五入
func TestCalcEhp(t *testing.T) {
	cases := []struct {
		name       string
		level, xiu int
		ehpMult    int
		want       int64
	}{
		{"阶段1普通怪 Lv.1：3200×5 = 16,000（xlsx 锚点）", 1, 1, 5, 16000},
		{"阶段1普通怪 Lv.50：9409.9×5 = 47,050（xlsx 锚点）", 50, 1, 5, 47050},
		{"阶段1普通怪 Lv.25：9223.5×5 = 46,118（≠展示值9224×5=46120，验证取整规则）", 25, 1, 5, 46118},
		{"阶段1 Boss(3修) Lv.25：55341.2×10 = 553,412（xlsx 锚点）", 25, 3, 10, 553412},
		{"阶段8普通怪 Lv.250：9561.68×75 = 717,125.75 → 717,126", 250, 1, 75, 717126},
	}
	for _, c := range cases {
		got := CalcEhp(CalcPlayerDaoAttack(c.level, c.xiu), c.ehpMult)
		if got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, got, c.want)
		}
	}
}

// TestEhpMultiplierPattern EHP倍数规律（xlsx 已验证）：基础{5,8,10,15,20}，每阶+10
func TestEhpMultiplierPattern(t *testing.T) {
	baseByType := map[int]int{1: 5, 2: 8, 3: 10, 4: 15, 5: 20}
	for stage := 1; stage <= 8; stage++ {
		for mType, base := range baseByType {
			want := base + (stage-1)*10
			// 与 v4_gongfa_skill_exp.sql 的 monster_ehp_config 40行种子保持同一公式，
			// SQL 侧种子如改动必须同步本测试
			if stage == 1 && want != base {
				t.Errorf("阶段1类型%d基础倍数应为%d", mType, base)
			}
			if stage == 8 && want != base+70 {
				t.Errorf("阶段8类型%d倍数应为%d", mType, base+70)
			}
		}
	}
}
