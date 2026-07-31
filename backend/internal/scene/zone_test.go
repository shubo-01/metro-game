// zone_test.go V5 地图系统纯函数表驱动单测。
// 覆盖：坐标合法性判定（空气墙/禁区/嵌套Zone归属）、移动限速上限。
// 运行：go test ./internal/scene/
package scene

import (
	"math"
	"testing"
)

// testZones 与 v5_battle_map_samsara.sql 种子数据一致的三分区布局：
// Zone2 外围原野 (0,0)-(1000,1000)；Zone1 营地嵌于中央 (400,400)-(600,600)；
// Zone3 深处峡谷 (1000,0)-(1800,1200)。
var testZones = []ZoneRect{
	{ZoneID: 1, Name: "新手营地", XMin: 400, YMin: 400, XMax: 600, YMax: 600, IsSafeZone: true},
	{ZoneID: 2, Name: "外围原野", XMin: 0, YMin: 0, XMax: 1000, YMax: 1000},
	{ZoneID: 3, Name: "深处峡谷", XMin: 1000, YMin: 0, XMax: 1800, YMax: 1200},
}

// testForbidden 峡谷两侧崖壁禁区（与 SQL 种子一致）
var testForbidden = []ForbiddenRect{
	{AreaID: 1, ZoneID: 3, Name: "峡谷北崖", XMin: 1000, YMin: 0, XMax: 1800, YMax: 100},
	{AreaID: 2, ZoneID: 3, Name: "峡谷南崖", XMin: 1000, YMin: 1100, XMax: 1800, YMax: 1200},
}

// TestValidatePosition 坐标合法性：出界空气墙 / 禁区 / 嵌套Zone归属（面积最小者优先）
func TestValidatePosition(t *testing.T) {
	tests := []struct {
		name       string
		x, y       float64
		wantZone   int
		wantOK     bool
	}{
		// 嵌套归属：营地中心点同时在 Zone1 和 Zone2 矩形内，应归面积更小的 Zone1
		{"营地中心归Zone1", 500, 500, 1, true},
		{"营地边界点归Zone1", 400, 400, 1, true},
		// Zone2 普通点
		{"原野西北角", 10, 10, 2, true},
		{"原野营地外一步", 399, 500, 2, true},
		// Zone3 峡谷走廊（y∈[100,1100] 之外是崖壁禁区）
		{"峡谷走廊中部", 1400, 600, 3, true},
		// Zone2/Zone3 共边 x=1000：两边都包含，取面积小的 Zone2（100万 < 96万？不对，
		// Zone2=1000×1000=100万，Zone3=800×1200=96万 → 共边点归 Zone3）
		{"共边点归面积较小的Zone3", 1000, 500, 3, true},
		// 出界（空气墙）
		{"负坐标出界", -1, 500, 0, false},
		{"东侧出界", 1801, 500, 0, false},
		{"Zone2南侧出界", 500, 1001, 0, false},
		// 禁区（崖壁）
		{"峡谷北崖禁区", 1400, 50, 3, false},
		{"峡谷南崖禁区", 1400, 1150, 3, false},
		{"北崖边界线也算禁区", 1400, 100, 3, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			zoneID, ok, reason := ValidatePosition(tt.x, tt.y, testZones, testForbidden)
			if zoneID != tt.wantZone || ok != tt.wantOK {
				t.Errorf("ValidatePosition(%.0f,%.0f) = (zone=%d, ok=%v, reason=%q), 期望 (zone=%d, ok=%v)",
					tt.x, tt.y, zoneID, ok, reason, tt.wantZone, tt.wantOK)
			}
			// 非法时必须给出人话原因（前端要弹提示）
			if !tt.wantOK && reason == "" {
				t.Error("非法位置必须返回原因文本")
			}
		})
	}
}

// TestMaxAllowedSpeed 移动限速（PRD：基础5m/s，装备加成上限+50%封顶7.5m/s）
func TestMaxAllowedSpeed(t *testing.T) {
	tests := []struct {
		name  string
		bonus float64
		want  float64
	}{
		{"无加成基础5", 0, 5.0},
		{"加成20%", 0.2, 6.0},
		{"加成50%封顶7.5", 0.5, 7.5},
		{"超过50%强制封顶", 0.8, 7.5},
		{"客户端乱传999%也封顶", 9.99, 7.5},
		{"负加成按0处理", -0.3, 5.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MaxAllowedSpeed(tt.bonus)
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("MaxAllowedSpeed(%v) = %v, 期望 %v", tt.bonus, got, tt.want)
			}
		})
	}
}
