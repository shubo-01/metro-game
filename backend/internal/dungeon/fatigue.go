// Package dungeon 牢结值系统处理器
// 严格按照《花果山副本设计文档 V3》第9章 和 《花果山副本技术方案》第5章实现。
//
// 关键规则:
//   - 每日 5 小时 = 18000 秒
//   - 按玩家在线时间累计消耗（1:1消耗）
//   - 打坐恢复：1h → 2h（每秒恢复2秒）
//   - 耗尽触发负状态：不可进入副本 / 探索速度×0.5 / 属性×0.2
//   - 凌晨 3:00 定时重置
package dungeon

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// FatigueMaxSec 每日牢结值上限：5小时=18000秒
const FatigueMaxSec = 18000

// MeditateMultiplier 打坐恢复倍率：1秒打坐恢复2秒牢结值
const MeditateMultiplier = 2

// ═══════════════════════════════════════════
//  GET /fatigue/state  查询当日牢结值状态
// ═══════════════════════════════════════════

// HandleFatigueState 查询玩家当前牢结值状态
func (s *Service) HandleFatigueState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	playerID, _ := strconv.ParseInt(r.URL.Query().Get("player_id"), 10, 64)
	if playerID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 无效"})
		return
	}

	remaining, err := s.getRemainingFatigue(playerID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}

	// 查询是否处于负状态
	var isPenalty int
	_ = s.db.QueryRow("SELECT is_penalty FROM player_fatigue WHERE player_id=?", playerID).Scan(&isPenalty)

	// 查询是否正在打坐
	var meditateStartStr sql.NullString
	_ = s.db.QueryRow("SELECT meditate_start FROM player_fatigue WHERE player_id=?", playerID).Scan(&meditateStartStr)
	isMeditating := meditateStartStr.Valid && meditateStartStr.String != ""

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "OK",
		Data: map[string]interface{}{
			"player_id":       playerID,
			"remaining_sec":   remaining,
			"daily_max_sec":   FatigueMaxSec,
			"is_penalty":      isPenalty == 1,
			"is_meditating":   isMeditating,
			"next_reset_time": time.Now().Add(timeUntilNextReset()).Format(time.RFC3339),
		},
	})
}

// ═══════════════════════════════════════════
//  POST /fatigue/consume  在线消耗牢结值（每分钟或每次心跳上报）
// ═══════════════════════════════════════════

// HandleFatigueConsume 处理牢结值消耗
// 幂等设计：由客户端心跳周期性上报累计秒数，服务端做上限保护
func (s *Service) HandleFatigueConsume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		PlayerID   int64 `json:"player_id"`
		ConsumeSec int   `json:"consume_sec"` // 本次要消耗的秒数
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.PlayerID <= 0 || req.ConsumeSec <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数无效"})
		return
	}
	// 限流保护：单次消耗上限 5 分钟，防止恶意大数据
	if req.ConsumeSec > 300 {
		req.ConsumeSec = 300
	}

	// 先扣 Redis 缓存
	today := time.Now().Format("2006-01-02")
	key := fmt.Sprintf("fatigue:%d:%s", req.PlayerID, today)

	// 保证 Redis 有值（首次访问时从 MySQL 回源）
	if _, err := s.getRemainingFatigue(req.PlayerID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}

	newVal, err := s.rdb.DecrBy(key, int64(req.ConsumeSec))
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "扣减失败: " + err.Error()})
		return
	}

	// 下限保护：不能为负
	if newVal < 0 {
		newVal = 0
		_ = s.rdb.Set(key, 0, timeUntilNextReset())
	}

	// 同步到 MySQL（异步风险容忍：Redis 挂时数据从表恢复）
	isPenalty := 0
	if newVal <= 0 {
		isPenalty = 1
	}
	_, _ = s.db.Exec(
		`UPDATE player_fatigue SET remaining_sec=?, is_penalty=? WHERE player_id=?`,
		newVal, isPenalty, req.PlayerID,
	)

	// 更新日志表（幂等 UPSERT）
	_, _ = s.db.Exec(
		`INSERT INTO fatigue_log (player_id, log_date, online_sec, consume_sec) 
		 VALUES (?, ?, ?, ?) 
		 ON DUPLICATE KEY UPDATE online_sec = online_sec + VALUES(online_sec), 
		                          consume_sec = consume_sec + VALUES(consume_sec)`,
		req.PlayerID, today, req.ConsumeSec, req.ConsumeSec,
	)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "OK",
		Data: map[string]interface{}{
			"remaining_sec": newVal,
			"is_penalty":    isPenalty == 1,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /fatigue/meditate/start  开始打坐
// ═══════════════════════════════════════════

// HandleMeditateStart 记录打坐开始时间
func (s *Service) HandleMeditateStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID int64 `json:"player_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}

	// 确保记录已初始化
	if _, err := s.getRemainingFatigue(req.PlayerID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}

	_, err := s.db.Exec(
		"UPDATE player_fatigue SET meditate_start=NOW() WHERE player_id=?",
		req.PlayerID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "打坐启动失败: " + err.Error()})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "打坐开始，每秒恢复2秒牢结值",
		Data: map[string]interface{}{"meditate_start": time.Now().Format(time.RFC3339)},
	})
}

// ═══════════════════════════════════════════
//  POST /fatigue/meditate/end  结束打坐并结算恢复
// ═══════════════════════════════════════════

// HandleMeditateEnd 结束打坐，按打坐时长恢复牢结值
func (s *Service) HandleMeditateEnd(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID int64 `json:"player_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}

	// 查询打坐开始时间
	var startStr sql.NullString
	err := s.db.QueryRow(
		"SELECT meditate_start FROM player_fatigue WHERE player_id=?",
		req.PlayerID,
	).Scan(&startStr)
	if err != nil || !startStr.Valid || startStr.String == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "未在打坐中"})
		return
	}

	// 解析开始时间（MySQL DATETIME 常见格式 yyyy-mm-dd HH:MM:SS）
	startAt, err := time.ParseInLocation("2006-01-02 15:04:05", startStr.String, time.Local)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "打坐时间解析失败"})
		return
	}

	// 恢复量 = 打坐秒数 × 2
	elapsed := int(time.Since(startAt).Seconds())
	if elapsed < 0 {
		elapsed = 0
	}
	recoverSec := elapsed * MeditateMultiplier

	// Redis 累加，上限 FatigueMaxSec
	today := time.Now().Format("2006-01-02")
	key := fmt.Sprintf("fatigue:%d:%s", req.PlayerID, today)
	newVal, err := s.rdb.IncrBy(key, int64(recoverSec))
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "恢复失败: " + err.Error()})
		return
	}
	if newVal > FatigueMaxSec {
		newVal = FatigueMaxSec
		_ = s.rdb.Set(key, FatigueMaxSec, timeUntilNextReset())
	}

	// 同步 MySQL：清空打坐时间、更新剩余牢结值、复位负状态
	isPenalty := 0
	if newVal <= 0 {
		isPenalty = 1
	}
	_, _ = s.db.Exec(
		`UPDATE player_fatigue SET remaining_sec=?, meditate_start=NULL, is_penalty=? WHERE player_id=?`,
		newVal, isPenalty, req.PlayerID,
	)

	// 更新日志
	_, _ = s.db.Exec(
		`INSERT INTO fatigue_log (player_id, log_date, recover_sec) VALUES (?, ?, ?) 
		 ON DUPLICATE KEY UPDATE recover_sec = recover_sec + VALUES(recover_sec)`,
		req.PlayerID, today, recoverSec,
	)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "打坐结束",
		Data: map[string]interface{}{
			"meditate_sec":  elapsed,
			"recover_sec":   recoverSec,
			"remaining_sec": newVal,
			"is_penalty":    isPenalty == 1,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /fatigue/item/use  使用恢复道具立即恢复牢结值
// ═══════════════════════════════════════════

// HandleFatigueItemUse 处理恢复道具使用
func (s *Service) HandleFatigueItemUse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID   int64 `json:"player_id"`
		ItemID     int   `json:"item_id"`
		RecoverSec int   `json:"recover_sec"` // 道具固定恢复量（服务端根据物品配置校验）
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.RecoverSec <= 0 || req.RecoverSec > FatigueMaxSec {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "恢复量无效"})
		return
	}

	// TODO: 校验背包内确实拥有 item_id 并扣减数量（依赖物品系统，后续实现）

	// 确保 Redis 有值
	if _, err := s.getRemainingFatigue(req.PlayerID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}

	today := time.Now().Format("2006-01-02")
	key := fmt.Sprintf("fatigue:%d:%s", req.PlayerID, today)
	newVal, err := s.rdb.IncrBy(key, int64(req.RecoverSec))
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "恢复失败: " + err.Error()})
		return
	}
	if newVal > FatigueMaxSec {
		newVal = FatigueMaxSec
		_ = s.rdb.Set(key, FatigueMaxSec, timeUntilNextReset())
	}

	isPenalty := 0
	if newVal <= 0 {
		isPenalty = 1
	}
	_, _ = s.db.Exec(
		"UPDATE player_fatigue SET remaining_sec=?, is_penalty=? WHERE player_id=?",
		newVal, isPenalty, req.PlayerID,
	)

	_, _ = s.db.Exec(
		`INSERT INTO fatigue_log (player_id, log_date, item_recover) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE item_recover = item_recover + VALUES(item_recover)`,
		req.PlayerID, today, req.RecoverSec,
	)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "道具已使用",
		Data: map[string]interface{}{
			"remaining_sec": newVal,
			"recover_sec":   req.RecoverSec,
		},
	})
}
