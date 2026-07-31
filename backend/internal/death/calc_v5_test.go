// calc_v5_test.go V5 战斗地图轮回夺舍迭代——death 包纯函数表驱动单测。
// 覆盖：夺舍成功率 / 尸修属性转换 / 天雷伤害 / 秘境打破门槛。
// 运行：go test ./internal/death/
package death

import (
	"math"
	"testing"
)

// TestCalcPossessSuccessRate 夺舍成功率（技术方案5.1）：
// base = ratio/(1+ratio)，境界修正 同级及以下×0.7 / 高1档×0.85 / 高2档×0.95 / 高3档+×1.0，
// clamp 到 [0.01, 0.99]。
func TestCalcPossessSuccessRate(t *testing.T) {
	tests := []struct {
		name           string
		possessorShen  int
		targetShen     int
		possessorRealm int
		targetRealm    int
		want           float64
	}{
		// 双方神相等：base=0.5
		{"同神同境界：0.5×0.7", 100, 100, 2, 2, 0.35},
		{"同神高1档：0.5×0.85", 100, 100, 3, 2, 0.425},
		{"同神高2档：0.5×0.95", 100, 100, 4, 2, 0.475},
		{"同神高3档：0.5×1.0", 100, 100, 5, 2, 0.5},
		{"同神高4档也是×1.0", 100, 100, 7, 2, 0.5},
		// 夺舍更高境界（PRD：无硬性境界限制）：gap<0 走最重的×0.7，不再返回0
		{"夺舍更高境界不拦截", 100, 100, 2, 5, 0.35},
		// 神是对方2倍：base=2/3
		{"神2倍高1档", 200, 100, 3, 2, (2.0 / 3.0) * 0.85},
		// 下限clamp：夺舍者神为0 → base=0 → 抬到0.01
		{"神为0抬到下限0.01", 0, 100, 5, 1, 0.01},
		// 上限clamp：神碾压且高3档 → 压到0.99
		{"神碾压压到上限0.99", 1000000, 1, 7, 1, 0.99},
		// 防除零：目标神≤0按1算，1000/(1+1000)×1.0≈0.999→clamp 0.99
		{"目标神为0防除零", 1000, 0, 7, 1, 0.99},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalcPossessSuccessRate(tt.possessorShen, tt.targetShen, tt.possessorRealm, tt.targetRealm)
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("CalcPossessSuccessRate(%d,%d,%d,%d) = %v, 期望 %v",
					tt.possessorShen, tt.targetShen, tt.possessorRealm, tt.targetRealm, got, tt.want)
			}
		})
	}
}

// TestCalcCorpseAttrs 尸修属性转换（PRD）：
// 精 = 原精 + floor(神×2/3)；气 = floor(气÷3)；神 = 0（永久）。
func TestCalcCorpseAttrs(t *testing.T) {
	tests := []struct {
		name                       string
		jing, qi, shen             int
		wantJing, wantQi, wantShen int
	}{
		{"常规转换", 10, 9, 7, 14, 3, 0},        // 10+floor(14/3=4)=14, floor(9/3)=3
		{"整除场景", 30, 30, 30, 50, 10, 0},     // 30+20=50, 10
		{"全零", 0, 0, 0, 0, 0, 0},
		{"神为1时floor(2/3)=0", 5, 5, 1, 5, 1, 0},
		{"气为2时floor(2/3)=0", 5, 2, 0, 5, 0, 0},
		{"负数输入按0处理", -5, -3, -1, 0, 0, 0},
		{"大数值不溢出", 100000, 99999, 88888, 100000 + 88888*2/3, 99999 / 3, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotJing, gotQi, gotShen := CalcCorpseAttrs(tt.jing, tt.qi, tt.shen)
			if gotJing != tt.wantJing || gotQi != tt.wantQi || gotShen != tt.wantShen {
				t.Errorf("CalcCorpseAttrs(%d,%d,%d) = (%d,%d,%d), 期望 (%d,%d,%d)",
					tt.jing, tt.qi, tt.shen, gotJing, gotQi, gotShen, tt.wantJing, tt.wantQi, tt.wantShen)
			}
		})
	}
}

// trunc 运行期浮点截断（Go 不允许把不精确的无类型浮点常量直接转 int64，
// 这里用变量走运行期转换，与被测函数内部 int64(...) 截断行为完全一致）
func trunc(f float64) int64 { return int64(f) }

// TestCalcThunderDamage 天雷伤害（技术方案5.2）：
// damage = 800 × 4.0 × (境界基准值÷67) × 9.0。
// 人阶 ratio=1 → 28800；其他档位按 realmTable 基准值等比放大。
func TestCalcThunderDamage(t *testing.T) {
	tests := []struct {
		name     string
		realmIdx int
		want     int64
	}{
		{"人阶基准28800", 1, 28800},                                // 800×4×1×9
		{"真人171/67", 2, trunc(28800.0 * 171.0 / 67.0)},          // 73504
		{"地仙346/67", 3, trunc(28800.0 * 346.0 / 67.0)},          // 148728
		{"神魔太易5116/67", 12, trunc(28800.0 * 5116.0 / 67.0)},     // 2199116
		{"非法档位兜底按人阶", 0, 28800},                                // GetRealmBaseline 越界兜底
		{"越界档位兜底按人阶", 99, 28800},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalcThunderDamage(tt.realmIdx)
			if got != tt.want {
				t.Errorf("CalcThunderDamage(%d) = %d, 期望 %d", tt.realmIdx, got, tt.want)
			}
		})
	}
	// 单调性：境界越高天雷越痛（1-12档严格递增）
	prev := int64(0)
	for idx := 1; idx <= 12; idx++ {
		d := CalcThunderDamage(idx)
		if d <= prev {
			t.Errorf("天雷伤害应随境界严格递增：档位%d伤害%d ≤ 档位%d伤害%d", idx, d, idx-1, prev)
		}
		prev = d
	}
}

// TestCalcRuinBreakThreshold 秘境打破门槛（PRD）：
// 人阶/真人（≤2）= 800×ratio×4.0（3修档）；地仙及以上 = 800×ratio×9.0（5修档）。
func TestCalcRuinBreakThreshold(t *testing.T) {
	tests := []struct {
		name     string
		realmIdx int
		want     int64
	}{
		{"人阶3修档3200", 1, 3200},                                // 800×1×4
		{"真人3修档", 2, trunc(800.0 * 171.0 / 67.0 * 4.0)},        // 8167
		{"地仙切换5修档", 3, trunc(800.0 * 346.0 / 67.0 * 9.0)},      // 37182
		{"天仙5修档", 4, trunc(800.0 * 592.0 / 67.0 * 9.0)},        // 63617
		{"神魔太易5修档", 12, trunc(800.0 * 5116.0 / 67.0 * 9.0)},    // 549779
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalcRuinBreakThreshold(tt.realmIdx)
			if got != tt.want {
				t.Errorf("CalcRuinBreakThreshold(%d) = %d, 期望 %d", tt.realmIdx, got, tt.want)
			}
		})
	}
	// 档位切换正确性：真人(3修)门槛 < 地仙(5修)门槛（既涨基准又换倍率）
	if CalcRuinBreakThreshold(2) >= CalcRuinBreakThreshold(3) {
		t.Error("地仙档门槛应显著高于真人档（3修→5修倍率切换）")
	}
}
