// zone_v5.go 战斗地图轮回夺舍迭代（V5）新增：刷新CD分档 + 神兽NPC沉眠状态机（白泽/朱厌）。
// 依据《战斗操作层与地图系统和轮回夺舍系统PRD》地图系统章节。
//
// 本文件新增路由（在 cmd/monster-service/main.go 注册）：
//   GET  /monster/divine-npc/status  查询神兽NPC状态（白泽/朱厌，带懒结算）
//   POST /monster/divine-npc/hit     攻击神兽NPC（沉眠→持续攻击唤醒→秒杀反击→回沉眠）
//
// 【与既有神兽体系的隔离】divine_npc_state（白泽/朱厌，不可捕的世界NPC）与
// divine_beast（monster_system 的20只可捕神兽）是两套独立体系，互不影响；
// 既有 /monster/divine/status、抓捕唯一性逻辑零改动。
//
// 状态机（懒结算，无定时器）：
//   沉眠(0) --连续攻击达到唤醒阈值--> 苏醒(1) --秒杀反击攻击者--> 苏醒到期自动回沉眠(0)
//   - "持续攻击"判定：两次攻击间隔超过连击窗口（combo_window_s），唤醒进度清零重来
//   - 回沉眠：无定时器，任何一次查询/受击时发现 awake_until 已过就地结算回眠
package monster

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

// RespawnCDByType 怪物刷新CD分档（PRD 地图系统：普通5分钟/精英10分钟/Boss30分钟/妖2小时）。
// 妖幼崽(5)沿用既有 YaoCubRespawnCD 逻辑（respawnYaoCubs），不走本函数；
// 神兽(6)/神兽幼崽(7)永不刷新（respawn_at=NULL），也不会调到这里；
// 未知类型兜底按普通怪5分钟。
func RespawnCDByType(mType int) time.Duration {
	switch mType {
	case TypeNormal:
		return 5 * time.Minute // 普通怪：5分钟
	case TypeElite:
		return 10 * time.Minute // 精英怪：10分钟
	case TypeBoss:
		return 30 * time.Minute // Boss：30分钟
	case TypeYao:
		return 2 * time.Hour // 妖：2小时
	default:
		return 5 * time.Minute // 兜底：按普通怪
	}
}

// divineNpcInfo 神兽NPC状态（响应结构）
type divineNpcInfo struct {
	NpcID        int    `json:"npc_id"`         // 1=白泽 2=朱厌
	Name         string `json:"name"`           // 神兽名称
	ZoneID       int    `json:"zone_id"`        // 所在分区
	PosX         int    `json:"pos_x"`          // X坐标（米）
	PosY         int    `json:"pos_y"`          // Y坐标（米）
	RealmDesc    string `json:"realm_desc"`     // 境界（大罗金妖仙）
	Level        int    `json:"level"`          // 等级99
	State        int    `json:"state"`          // 0=沉眠 1=苏醒（苏醒期间靠近=死）
	WakeProgress int    `json:"wake_progress"`  // 当前唤醒进度
	WakeThresh   int    `json:"wake_threshold"` // 唤醒阈值
	AwakeRemainS int    `json:"awake_remain_s"` // 苏醒剩余秒数（沉眠时为0）
	KillCount    int    `json:"kill_count"`     // 累计秒杀反击次数
}

// settleDivineNpc 懒结算单行状态（调用方须已持有该行 FOR UPDATE 锁或在只读场景用 db 直改）：
// 1. 苏醒到期 → 回沉眠、进度清零；2. 连击窗口超时 → 唤醒进度清零。
// 返回结算后的 state / wakeProgress。
func settleDivineNpc(e Execer2, npcID int, state, wakeProgress, comboWindowS int,
	lastHitAt, awakeUntil sql.NullTime, now time.Time) (int, int) {
	// 苏醒到期回沉眠（PRD：秒杀反击后回沉眠——到期即回，无定时器）
	if state == 1 && awakeUntil.Valid && now.After(awakeUntil.Time) {
		state = 0
		wakeProgress = 0
		e.Exec("UPDATE divine_npc_state SET state=0, wake_progress=0, awake_until=NULL WHERE npc_id=?", npcID)
	}
	// 沉眠中连击中断：距上次被打超过连击窗口，进度清零（"持续攻击"才算唤醒）
	if state == 0 && wakeProgress > 0 && lastHitAt.Valid &&
		now.Sub(lastHitAt.Time) > time.Duration(comboWindowS)*time.Second {
		wakeProgress = 0
		e.Exec("UPDATE divine_npc_state SET wake_progress=0 WHERE npc_id=?", npcID)
	}
	return state, wakeProgress
}

// Execer2 让 settleDivineNpc 同时兼容 *sql.DB 和 *sql.Tx（与 character.Execer 同思路）
type Execer2 interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

// ═══════════════════════════════════════════
//  GET /monster/divine-npc/status  神兽NPC状态查询
// ═══════════════════════════════════════════

// HandleDivineNpcStatus 查询白泽/朱厌的沉眠状态（查询即懒结算）
func (s *Service) HandleDivineNpcStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	rows, err := s.db.Query(
		`SELECT npc_id, name, zone_id, pos_x, pos_y, realm_desc, level, state,
		        wake_progress, wake_threshold, combo_window_s, last_hit_at, awake_until, kill_count
		 FROM divine_npc_state ORDER BY npc_id`)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询神兽NPC失败: " + err.Error()})
		return
	}

	now := time.Now()
	list := make([]divineNpcInfo, 0, 2)
	type rawRow struct {
		info         divineNpcInfo
		comboWindowS int
		lastHitAt    sql.NullTime
		awakeUntil   sql.NullTime
	}
	var raws []rawRow
	for rows.Next() {
		var rr rawRow
		if err := rows.Scan(&rr.info.NpcID, &rr.info.Name, &rr.info.ZoneID, &rr.info.PosX, &rr.info.PosY,
			&rr.info.RealmDesc, &rr.info.Level, &rr.info.State, &rr.info.WakeProgress, &rr.info.WakeThresh,
			&rr.comboWindowS, &rr.lastHitAt, &rr.awakeUntil, &rr.info.KillCount); err != nil {
			rows.Close()
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "数据解析失败: " + err.Error()})
			return
		}
		raws = append(raws, rr)
	}
	rows.Close() // 先关游标再执行懒结算 UPDATE（同连接串行，避免 busy buffer）

	for _, rr := range raws {
		// 查询即懒结算：到期回眠/连击中断清进度
		rr.info.State, rr.info.WakeProgress = settleDivineNpc(
			s.db, rr.info.NpcID, rr.info.State, rr.info.WakeProgress, rr.comboWindowS,
			rr.lastHitAt, rr.awakeUntil, now)
		if rr.info.State == 1 && rr.awakeUntil.Valid {
			rr.info.AwakeRemainS = int(time.Until(rr.awakeUntil.Time).Seconds())
		}
		list = append(list, rr.info)
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{"divine_npcs": list}})
}

// ═══════════════════════════════════════════
//  POST /monster/divine-npc/hit  攻击神兽NPC
// ═══════════════════════════════════════════

// HandleDivineNpcHit 攻击白泽/朱厌（大罗金妖仙99级，惹不起系列）
// 请求：{"player_id":1, "npc_id":1}
// 结果三种：
//   1. 沉眠且进度未达阈值 → 神兽纹丝不动，返回当前唤醒进度
//   2. 本次攻击达到唤醒阈值 → 神兽苏醒并当场秒杀反击本攻击者（awakened+killed）
//   3. 已苏醒状态下靠近攻击 → 直接被秒杀反击（killed）
// 秒杀 = 攻击者进入死亡流程（best-effort 写 character_death_state，前端走死亡三选一）
func (s *Service) HandleDivineNpcHit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID int64 `json:"player_id"`
		NpcID    int   `json:"npc_id"` // 1=白泽 2=朱厌
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.PlayerID <= 0 || req.NpcID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 或 npc_id 无效"})
		return
	}

	// 事务 + FOR UPDATE：状态机迁移必须原子（防两个玩家同时打导致进度错乱/双重唤醒）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	var name string
	var state, wakeProgress, wakeThreshold, comboWindowS, awakeS, killCount int
	var lastHitAt, awakeUntil sql.NullTime
	err = tx.QueryRow(
		`SELECT name, state, wake_progress, wake_threshold, combo_window_s, awake_s,
		        last_hit_at, awake_until, kill_count
		 FROM divine_npc_state WHERE npc_id=? FOR UPDATE`, req.NpcID,
	).Scan(&name, &state, &wakeProgress, &wakeThreshold, &comboWindowS, &awakeS,
		&lastHitAt, &awakeUntil, &killCount)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 6021, Msg: "神兽NPC不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询神兽NPC失败: " + err.Error()})
		return
	}

	now := time.Now()
	// 受击前先懒结算（到期回眠/连击中断清进度）
	state, wakeProgress = settleDivineNpc(tx, req.NpcID, state, wakeProgress, comboWindowS, lastHitAt, awakeUntil, now)

	awakened := false // 本次攻击是否触发苏醒
	killed := false   // 本次攻击者是否被秒杀反击

	if state == 1 {
		// 已苏醒：秒杀反击（大罗金妖仙对凡人，没有伤害计算的必要）
		killed = true
	} else {
		// 沉眠中：唤醒进度+1
		wakeProgress++
		if wakeProgress >= wakeThreshold {
			// 达到阈值：苏醒 + 当场秒杀唤醒者
			awakened, killed = true, true
			state = 1
			until := now.Add(time.Duration(awakeS) * time.Second)
			if _, err := tx.Exec(
				"UPDATE divine_npc_state SET state=1, wake_progress=0, awake_until=?, last_hit_at=? WHERE npc_id=?",
				until, now, req.NpcID); err != nil {
				writeJSON(w, 500, APIResponse{Code: 500, Msg: "神兽状态更新失败"})
				return
			}
			awakeUntil = sql.NullTime{Time: until, Valid: true}
		} else {
			// 未达阈值：记进度与连击锚点
			if _, err := tx.Exec(
				"UPDATE divine_npc_state SET wake_progress=?, last_hit_at=? WHERE npc_id=?",
				wakeProgress, now, req.NpcID); err != nil {
				writeJSON(w, 500, APIResponse{Code: 500, Msg: "神兽状态更新失败"})
				return
			}
		}
	}

	if killed {
		killCount++
		tx.Exec("UPDATE divine_npc_state SET kill_count=? WHERE npc_id=?", killCount, req.NpcID)
		// 秒杀 = 攻击者进入死亡流程（best-effort：角色若无死亡状态行则跳过，
		// 前端收到 killed=true 后引导玩家走 /death/trigger 死亡三选一）
		tx.Exec("UPDATE character_death_state SET is_dead=1, death_type=1 WHERE character_id=?", req.PlayerID)
		tx.Exec("UPDATE character_attributes SET hp_current=0, shield_current=0 WHERE character_id=?", req.PlayerID)
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	msg := name + "沉眠依旧，毫无反应"
	if awakened {
		msg = name + "被你吵醒了！一击将你拍成齑粉"
	} else if killed {
		msg = name + "正值苏醒，反手将你秒杀"
	}
	awakeRemain := 0
	if state == 1 && awakeUntil.Valid {
		awakeRemain = int(time.Until(awakeUntil.Time).Seconds())
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: msg, Data: map[string]interface{}{
		"npc_id":         req.NpcID,
		"name":           name,
		"state":          state,         // 0=沉眠 1=苏醒
		"wake_progress":  wakeProgress,  // 当前唤醒进度（苏醒后清零）
		"wake_threshold": wakeThreshold, // 唤醒阈值
		"awakened":       awakened,      // 本次是否触发苏醒
		"killed":         killed,        // 攻击者是否被秒杀（true则前端走死亡流程）
		"awake_remain_s": awakeRemain,   // 苏醒剩余秒数
	}})
}
