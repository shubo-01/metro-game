// combat_v5_test.go V5 战斗操作层纯函数表驱动单测（硬直分档/护盾懒结算/控制效果表）。
// 运行：go test ./internal/character/
package character

import "testing"

// TestCalcHitStagger 受击硬直分档（PRD：普攻0.2s/精英0.3s/Boss0.5s，暴击+0.1s）
func TestCalcHitStagger(t *testing.T) {
	tests := []struct {
		name       string
		sourceType int
		isCrit     bool
		want       float64
	}{
		{"普攻不暴击0.2s", HitSourceNormal, false, 0.2},
		{"普攻暴击0.3s", HitSourceNormal, true, 0.3},
		{"精英不暴击0.3s", HitSourceElite, false, 0.3},
		{"精英暴击0.4s", HitSourceElite, true, 0.4},
		{"Boss不暴击0.5s", HitSourceBoss, false, 0.5},
		{"Boss暴击0.6s", HitSourceBoss, true, 0.6},
		{"非法来源兜底按普攻", 99, false, 0.2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalcHitStagger(tt.sourceType, tt.isCrit)
			// 浮点比较：0.1的累加存在精度误差，用容差判等
			if diff := got - tt.want; diff > 1e-9 || diff < -1e-9 {
				t.Errorf("CalcHitStagger(%d, %v) = %v, 期望 %v", tt.sourceType, tt.isCrit, got, tt.want)
			}
		})
	}
}

// TestCalcShieldRecover 护盾懒结算恢复量（PRD：脱战5秒后 (精+气+神)×2/秒）
func TestCalcShieldRecover(t *testing.T) {
	tests := []struct {
		name          string
		cur, max      int64
		regen         int64
		elapsedS      int64
		wantShield    int64
		wantRecovered int64
	}{
		{"正常恢复不到上限", 100, 1000, 60, 10, 700, 600},
		{"恢复触顶截断", 900, 1000, 60, 10, 1000, 100},
		{"已满盾不恢复", 1000, 1000, 60, 10, 1000, 0},
		{"还在战斗延迟内(elapsed=0)", 100, 1000, 60, 0, 100, 0},
		{"负秒数按0处理", 100, 1000, 60, -5, 100, 0},
		{"恢复速度为0不恢复", 100, 1000, 0, 10, 100, 0},
		{"刚好1秒恢复regen那么多", 0, 1000, 60, 1, 60, 60},
		{"超长脱战一次补满", 0, 500, 60, 3600, 500, 500},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotShield, gotRecovered := CalcShieldRecover(tt.cur, tt.max, tt.regen, tt.elapsedS)
			if gotShield != tt.wantShield || gotRecovered != tt.wantRecovered {
				t.Errorf("CalcShieldRecover(%d,%d,%d,%d) = (%d,%d), 期望 (%d,%d)",
					tt.cur, tt.max, tt.regen, tt.elapsedS, gotShield, gotRecovered, tt.wantShield, tt.wantRecovered)
			}
		})
	}
}

// TestGetControlSpec 控制效果表（PRD：击退0.5s/击倒1s+0.5s起身/眩晕1-3s/定身1-3s/石化2-3s盾恢复×3）
func TestGetControlSpec(t *testing.T) {
	tests := []struct {
		name        string
		controlType int
		wantOK      bool
		wantMinS    float64
		wantMaxS    float64
		wantExtra   float64
	}{
		{"击退0.5秒位移3米", ControlKnockback, true, 0.5, 0.5, 3.0},
		{"击倒1秒起身0.5秒", ControlKnockdown, true, 1.0, 1.0, 0.5},
		{"眩晕1-3秒", ControlStun, true, 1.0, 3.0, 0},
		{"定身1-3秒", ControlRoot, true, 1.0, 3.0, 0},
		{"石化2-3秒盾恢复x3", ControlPetrify, true, 2.0, 3.0, 3.0},
		{"非法类型返回false", 99, false, 0, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			spec, ok := GetControlSpec(tt.controlType)
			if ok != tt.wantOK {
				t.Fatalf("GetControlSpec(%d) ok = %v, 期望 %v", tt.controlType, ok, tt.wantOK)
			}
			if !ok {
				return
			}
			if spec.MinS != tt.wantMinS || spec.MaxS != tt.wantMaxS || spec.ExtraVal != tt.wantExtra {
				t.Errorf("GetControlSpec(%d) = {min:%v max:%v extra:%v}, 期望 {min:%v max:%v extra:%v}",
					tt.controlType, spec.MinS, spec.MaxS, spec.ExtraVal, tt.wantMinS, tt.wantMaxS, tt.wantExtra)
			}
		})
	}
}
