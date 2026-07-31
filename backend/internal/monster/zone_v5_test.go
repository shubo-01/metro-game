// zone_v5_test.go V5 怪物刷新CD分档表驱动单测。
// 运行：go test ./internal/monster/
package monster

import (
	"testing"
	"time"
)

// TestRespawnCDByType 刷新CD分档（PRD：普通5分钟/精英10分钟/Boss30分钟/妖2小时）
func TestRespawnCDByType(t *testing.T) {
	tests := []struct {
		name  string
		mType int
		want  time.Duration
	}{
		{"普通怪5分钟", TypeNormal, 5 * time.Minute},
		{"精英怪10分钟", TypeElite, 10 * time.Minute},
		{"Boss30分钟", TypeBoss, 30 * time.Minute},
		{"妖2小时", TypeYao, 2 * time.Hour},
		{"未知类型兜底5分钟", 0, 5 * time.Minute},
		{"妖幼崽不走本函数也兜底5分钟", TypeYaoCub, 5 * time.Minute},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RespawnCDByType(tt.mType); got != tt.want {
				t.Errorf("RespawnCDByType(%d) = %v, 期望 %v", tt.mType, got, tt.want)
			}
		})
	}
}
