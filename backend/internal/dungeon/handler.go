// Package dungeon HTTP 处理层：入场/心跳/结算等 REST 接口
package dungeon

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

// ═══════════════════════════════════════════
//  POST /dungeon/huaguoshan/enter  进入花果山副本
//
//  流程 (技术方案 P93-P94):
//    1. 校验牢结值 > 0
//    2. 读取玩家运气值
//    3. 调用 CalcProbs 生成概率表
//    4. 调用 RollRole 抽取身份
//    5. 创建 dungeon_scene_session 记录
//    6. 返回 session_id + role_type + probs 快照
// ═══════════════════════════════════════════

// HandleEnter 处理进入副本请求
func (s *Service) HandleEnter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	// 请求体解析
	var req struct {
		PlayerID int64   `json:"player_id"`
		EnterX   float64 `json:"enter_x"` // 世界地图进入位置X
		EnterY   float64 `json:"enter_y"` // 世界地图进入位置Y
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}
	if req.PlayerID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 无效"})
		return
	}

	// ── 步骤1：校验牢结值 ──
	remaining, err := s.getRemainingFatigue(req.PlayerID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "牢结值查询失败: " + err.Error()})
		return
	}
	if remaining <= 0 {
		writeJSON(w, 403, APIResponse{
			Code: 4001,
			Msg:  "牢结值已耗尽，请打坐恢复后再进入副本",
			Data: map[string]interface{}{"remaining_sec": 0, "is_penalty": true},
		})
		return
	}

	// ── 步骤2：读取运气值 ──
	luck, err := s.getPlayerLuck(req.PlayerID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "运气值查询失败: " + err.Error()})
		return
	}

	// ── 步骤3：计算加权概率 ──
	probs := CalcProbs(luck)

	// ── 步骤4：加权随机抽取身份 ──
	roleType := RollRole(probs)

	// ── 步骤5：创建会话记录 ──
	res, err := s.db.Exec(
		`INSERT INTO dungeon_scene_session 
		 (player_id, scene_id, role_type, luck_snapshot, enter_x, enter_y, start_at, outcome) 
		 VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
		req.PlayerID, HuaguoshanSceneID, roleType, luck, req.EnterX, req.EnterY,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建副本会话失败: " + err.Error()})
		return
	}
	sessionID, _ := res.LastInsertId()

	// ── 步骤6：Redis 记录会话初始状态（用于心跳检查/观测度累加） ──
	sessKey := fmt.Sprintf("hgs:session:%d", sessionID)
	_ = s.rdb.Set(sessKey+":role", roleType, 30*time.Minute)
	_ = s.rdb.Set(sessKey+":start", time.Now().Unix(), 30*time.Minute)
	if roleType == RoleGrass {
		_ = s.rdb.Set(sessKey+":observe", 0, 30*time.Minute)
	}

	// ── 步骤7：响应客户端 ──
	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "进入副本成功",
		Data: map[string]interface{}{
			"session_id":    sessionID,
			"role_type":     roleType,
			"role_name":     RoleName(roleType),
			"luck":          luck,
			"probs":         probs,
			"scene_id":      HuaguoshanSceneID,
			"max_duration":  DungeonMaxDurationSec,
			"remaining_sec": remaining,
		},
	})
}

// RoleName 返回角色类型的中文名称，供前端展示
func RoleName(roleType int) string {
	switch roleType {
	case RoleWukong:
		return "孙悟空"
	case RoleMowang:
		return "混世魔王"
	case RoleShouxa:
		return "魔王手下"
	case RoleMonkey:
		return "普通猴子"
	case RoleOldMon:
		return "老猴子"
	case RoleGrass:
		return "草木石头"
	}
	return "未知"
}

// ═══════════════════════════════════════════
//  POST /dungeon/huaguoshan/observe  上报观测事件（草木石头专用）
//
//  说明 (技术方案 P152-P156):
//    观测度 = 时间累加(0-60%) + 特定事件加成(0-40%)
//    时间累加由服务端 Tick 自动进行，此接口只接收事件加成
//    支持的 event_code:
//      "wukong_ultimate"  大圣释放大招 +10%
//      "mowang_summon"    魔王召唤手下 +5%
//      "mowang_burst"     魔王爆绝招   +10%
//      "mowang_death"     魔王死亡     +15%
// ═══════════════════════════════════════════

// HandleObserve 处理观测事件上报
func (s *Service) HandleObserve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		SessionID int64  `json:"session_id"`
		PlayerID  int64  `json:"player_id"`
		EventCode string `json:"event_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}

	// 权限校验：会话必须属于当前玩家，且为草木石头身份
	var roleType, outcome int
	err := s.db.QueryRow(
		"SELECT role_type, outcome FROM dungeon_scene_session WHERE session_id=? AND player_id=?",
		req.SessionID, req.PlayerID,
	).Scan(&roleType, &outcome)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "会话不存在"})
		return
	}
	if roleType != RoleGrass {
		writeJSON(w, 403, APIResponse{Code: 403, Msg: "仅草木石头身份可上报观测事件"})
		return
	}
	if outcome != OutcomeInProgress {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "会话已结束"})
		return
	}

	// 事件加成映射（技术方案 P154-P155）
	var bonus int
	switch req.EventCode {
	case "wukong_ultimate":
		bonus = 10
	case "mowang_summon":
		bonus = 5
	case "mowang_burst":
		bonus = 10
	case "mowang_death":
		bonus = 15
	default:
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "未知事件类型: " + req.EventCode})
		return
	}

	// Redis 原子累加观测度
	key := fmt.Sprintf("hgs:session:%d:observe", req.SessionID)
	newScore, err := s.rdb.IncrBy(key, int64(bonus))
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "观测度累加失败: " + err.Error()})
		return
	}

	// 加成上限保护：最高40（事件部分）+60（时间部分）=100
	if newScore > 100 {
		newScore = 100
		_ = s.rdb.Set(key, 100, 30*time.Minute)
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "观测度已更新",
		Data: map[string]interface{}{
			"observe_score": newScore,
			"event_code":    req.EventCode,
			"bonus":         bonus,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /dungeon/huaguoshan/settle  副本结算
//
//  流程 (PRD 11.3):
//    1. 校验会话所有权，读取 role_type/start_at
//    2. 根据 role_type + 上报数据判定 outcome
//    3. 计算存活时长 duration_sec
//    4. 计算评级 grade
//    5. 抽取死亡描述（如果死亡）/评语
//    6. 匹配奖励池 → 掉率抽取 → 唯一性物品Redis锁 → 写入背包/发放记录
//    7. 更新会话状态为已结束
// ═══════════════════════════════════════════

// SettleRequest 结算请求体
type SettleRequest struct {
	SessionID    int64 `json:"session_id"`
	PlayerID     int64 `json:"player_id"`
	SelfHpLeft   int   `json:"self_hp_left"`   // 自身剩余HP百分比 0-100
	BossHpLeft   int   `json:"boss_hp_left"`   // Boss剩余HP百分比（大圣战用）
	KilledByBoss bool  `json:"killed_by_boss"` // 是否被Boss打死（用于生存类结局判定）
	StoryDeath   bool  `json:"story_death"`    // 是否触发剧情死亡（魔王撑满时上报）
}

// HandleSettle 结算入口
func (s *Service) HandleSettle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req SettleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "请求参数错误"})
		return
	}

	// ── 步骤1：查询会话 ──
	var (
		roleType   int
		outcomeOld int
		startAt    time.Time
		luckSnap   float64
	)
	err := s.db.QueryRow(
		"SELECT role_type, outcome, start_at, luck_snapshot FROM dungeon_scene_session WHERE session_id=? AND player_id=?",
		req.SessionID, req.PlayerID,
	).Scan(&roleType, &outcomeOld, &startAt, &luckSnap)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "会话不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "会话查询失败: " + err.Error()})
		return
	}
	if outcomeOld != OutcomeInProgress {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "会话已结算过，请勿重复提交"})
		return
	}

	// ── 步骤2：计算存活时长 ──
	durationSec := int(time.Since(startAt).Seconds())
	if durationSec < 0 {
		durationSec = 0
	}
	if durationSec > DungeonMaxDurationSec {
		durationSec = DungeonMaxDurationSec
	}

	// ── 步骤3：判定结局 ──
	outcome := judgeOutcome(&req, roleType, durationSec)

	// ── 步骤4：读取观测度（草木石头结算时综合时间累加 + 事件累加） ──
	observeScore := 0
	if roleType == RoleGrass {
		observeScore = s.finalObserveScore(req.SessionID, durationSec)
		// 观测度决定结局
		if outcome == OutcomeInProgress {
			if observeScore >= 100 {
				outcome = OutcomeObserve
			} else if req.KilledByBoss || req.SelfHpLeft <= 0 {
				outcome = OutcomeDead
			} else {
				outcome = OutcomeObserve
			}
		}
	}

	// ── 步骤5：评级 ──
	grade := EvaluateGrade(roleType, outcome, durationSec, observeScore, req.SelfHpLeft)

	// ── 步骤6：死亡描述 & 评语 ──
	deathID, deathText := s.pickDeathDescription(roleType, outcome)
	commentText := ""
	if roleType == RoleWukong {
		commentText = PickWukongComment(outcome)
	}

	// ── 步骤7：奖励发放 ──
	rewards, err := s.grantRewards(req.SessionID, req.PlayerID, roleType, outcome, grade)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "奖励发放失败: " + err.Error()})
		return
	}

	// ── 步骤7.5：神位系统追加掉落（实现见 shenwei_drop.go）──
	// 碎片/凡品神位/自由属性点/归元符，通过 /shenwei/grant 内部接口发放，
	// 发放失败只记日志不阻断结算；掉落条目一并追进 rewards 写入 reward_json
	shenweiDrops := s.grantShenweiDrops(req.SessionID, req.PlayerID, roleType, outcome, luckSnap)
	rewards = append(rewards, shenweiDrops...)

	// ── 步骤8：写回会话记录（结算完成） ──
	rewardJSON, _ := json.Marshal(rewards)
	_, err = s.db.Exec(
		`UPDATE dungeon_scene_session 
		 SET end_at=NOW(), duration_sec=?, outcome=?, grade=?, death_id=?, death_text=?, 
		     comment_text=?, observe_score=?, boss_hp_left=?, self_hp_left=?, reward_json=? 
		 WHERE session_id=?`,
		durationSec, outcome, grade, nullableInt(deathID), nullableStr(deathText),
		nullableStr(commentText), observeScore, req.BossHpLeft, req.SelfHpLeft,
		string(rewardJSON), req.SessionID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "结算更新失败: " + err.Error()})
		return
	}

	// ── 步骤9：清理会话缓存 ──
	sessKey := fmt.Sprintf("hgs:session:%d", req.SessionID)
	_ = s.rdb.Del(sessKey + ":role")
	_ = s.rdb.Del(sessKey + ":start")
	_ = s.rdb.Del(sessKey + ":observe")

	// ── 步骤10：响应客户端 ──
	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "结算完成",
		Data: map[string]interface{}{
			"session_id":    req.SessionID,
			"role_type":     roleType,
			"role_name":     RoleName(roleType),
			"outcome":       outcome,
			"grade":         grade,
			"duration_sec":  durationSec,
			"observe_score": observeScore,
			"death_text":    deathText,
			"comment_text":  commentText,
			"rewards":       rewards,
		},
	})
}

// judgeOutcome 根据上报数据判定结局
func judgeOutcome(req *SettleRequest, roleType, durationSec int) int {
	switch roleType {
	case RoleWukong:
		// 大圣: 打死魔王 → 完胜/受伤；自己被打死 → 死亡
		return EvaluateOutcome(RoleWukong, req.SelfHpLeft, req.BossHpLeft)
	case RoleMowang:
		// 魔王: 剧情死亡（撑满5分钟或客户端上报） / 被大圣打死
		if req.StoryDeath || durationSec >= DungeonMaxDurationSec {
			return OutcomeStoryDeath
		}
		if req.KilledByBoss || req.SelfHpLeft <= 0 {
			return OutcomeDead
		}
		return OutcomeStoryDeath
	case RoleShouxa, RoleMonkey, RoleOldMon:
		// 生存类: 时间到 → 生存成功；被打死 → 死亡
		if req.KilledByBoss || req.SelfHpLeft <= 0 {
			return OutcomeDead
		}
		return OutcomeSurvive
	case RoleGrass:
		// 草木石头: 由上层根据观测度判定
		return OutcomeInProgress
	}
	return OutcomeInProgress
}

// finalObserveScore 计算草木石头结算时的最终观测度
// 综合时间累加（存活时长/300秒 × 60%）+ 事件累加（Redis中）
func (s *Service) finalObserveScore(sessionID int64, durationSec int) int {
	// 时间累加部分：0-60%
	timeScore := int(float64(durationSec) / float64(DungeonMaxDurationSec) * 60.0)
	if timeScore > 60 {
		timeScore = 60
	}

	// 事件累加部分：Redis 中已经原子累加
	eventScore := 0
	if v, err := s.rdb.Get(fmt.Sprintf("hgs:session:%d:observe", sessionID)); err == nil {
		eventScore, _ = strconv.Atoi(v)
	}
	if eventScore > 40 {
		eventScore = 40
	}

	total := timeScore + eventScore
	if total > 100 {
		total = 100
	}
	return total
}

// pickDeathDescription 从数据库随机抽取一条死亡描述
// 只对死亡类结局有意义（死亡/剧情死亡/被击碎）
func (s *Service) pickDeathDescription(roleType, outcome int) (int, string) {
	if outcome != OutcomeDead && outcome != OutcomeStoryDeath {
		return 0, ""
	}

	// 按权重加权随机（SQL 中用 -LOG(RAND())/weight 实现加权采样）
	var (
		deathID int
		desc    string
	)
	err := s.db.QueryRow(
		`SELECT death_id, description FROM dungeon_death_desc 
		 WHERE role_type=? AND enabled=1 
		 ORDER BY -LOG(RAND())/weight LIMIT 1`,
		roleType,
	).Scan(&deathID, &desc)
	if err != nil {
		return 0, ""
	}
	return deathID, desc
}

// ═══════════════════════════════════════════
//  奖励发放核心逻辑
// ═══════════════════════════════════════════

// RewardEntry 单条奖励发放结果
type RewardEntry struct {
	ItemID   int `json:"item_id"`
	ItemType int `json:"item_type"`
	Quantity int `json:"quantity"`
	IsUnique int `json:"is_unique,omitempty"`
}

// grantRewards 匹配奖励池 → 独立掉率抽取 → 唯一性物品分布式锁 → 落库
//
// 返回: 实际发放的奖励列表
func (s *Service) grantRewards(sessionID, playerID int64, roleType, outcome int, grade string) ([]RewardEntry, error) {
	// 步骤1：匹配奖励池（优先带评级的精确匹配，其次不带评级的兜底）
	poolID, err := s.matchRewardPool(roleType, outcome, grade)
	if err != nil {
		return nil, err
	}
	if poolID == 0 {
		// 无匹配奖励池，返回空
		return []RewardEntry{}, nil
	}

	// 步骤2：查询池内所有物品明细
	rows, err := s.db.Query(
		`SELECT item_id, item_type, qty_min, qty_max, drop_rate, is_unique 
		 FROM dungeon_reward_item WHERE pool_id=?`,
		poolID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rewards := []RewardEntry{}
	for rows.Next() {
		var (
			itemID, itemType, qtyMin, qtyMax, isUnique int
			dropRate                                   float64
		)
		if err := rows.Scan(&itemID, &itemType, &qtyMin, &qtyMax, &dropRate, &isUnique); err != nil {
			continue
		}

		// 独立掉率判定
		if rand.Float64() > dropRate {
			continue // 未掉落
		}

		// 数量随机
		qty := qtyMin
		if qtyMax > qtyMin {
			qty = qtyMin + rand.Intn(qtyMax-qtyMin+1)
		}

		// 唯一性物品：Redis 分布式锁抢占
		if isUnique == 1 {
			claimed, err := s.tryClaimUniqueReward(playerID, sessionID, itemID)
			if err != nil || !claimed {
				continue // 已被其他人拿走
			}
		}

		// 写入背包（同物品同来源自动堆叠）
		source := fmt.Sprintf("huaguoshan_%s", roleTypeToTag(roleType))
		_, _ = s.db.Exec(
			`INSERT INTO player_inventory (player_id, item_id, item_type, quantity, source, obtained_at)
			 VALUES (?, ?, ?, ?, ?, NOW())
			 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = NOW()`,
			playerID, itemID, itemType, qty, source,
		)

		// 写入发放记录
		_, _ = s.db.Exec(
			`INSERT INTO dungeon_reward_grant (session_id, player_id, item_id, quantity, is_unique) 
			 VALUES (?, ?, ?, ?, ?)`,
			sessionID, playerID, itemID, qty, isUnique,
		)

		rewards = append(rewards, RewardEntry{
			ItemID:   itemID,
			ItemType: itemType,
			Quantity: qty,
			IsUnique: isUnique,
		})
	}
	return rewards, nil
}

// matchRewardPool 匹配奖励池
// 优先按 (role_type, outcome, grade) 精确匹配，若不存在则回退 (role_type, outcome, NULL)
func (s *Service) matchRewardPool(roleType, outcome int, grade string) (int, error) {
	var poolID int

	// 精确匹配（带评级）
	err := s.db.QueryRow(
		"SELECT pool_id FROM dungeon_reward_pool WHERE role_type=? AND outcome=? AND grade=? AND enabled=1",
		roleType, outcome, grade,
	).Scan(&poolID)
	if err == nil {
		return poolID, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}

	// 兜底匹配（不带评级）
	err = s.db.QueryRow(
		"SELECT pool_id FROM dungeon_reward_pool WHERE role_type=? AND outcome=? AND grade IS NULL AND enabled=1",
		roleType, outcome,
	).Scan(&poolID)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return poolID, nil
}

// tryClaimUniqueReward 尝试抢占唯一性奖励
// 使用 Redis SetNX 分布式锁保证全服原子性，成功后写入 unique_reward_claim 表
func (s *Service) tryClaimUniqueReward(playerID, sessionID int64, itemID int) (bool, error) {
	// 组合 Key，未来其他唯一性物品也走此机制
	rewardKey := fmt.Sprintf("hgs:unique:item_%d", itemID)

	// 先查 MySQL 是否已有领取记录（防止 Redis 数据丢失后重复发放）
	var count int
	_ = s.db.QueryRow("SELECT COUNT(*) FROM unique_reward_claim WHERE reward_key=?", rewardKey).Scan(&count)
	if count > 0 {
		return false, nil
	}

	// Redis 分布式锁：只有第一个 SetNX 成功的能领取
	ok, err := s.rdb.SetNX(rewardKey, playerID, 0)
	if err != nil {
		return false, err
	}
	if !ok {
		return false, nil // 已被别人拿走
	}

	// 写入 MySQL 持久化
	_, err = s.db.Exec(
		"INSERT INTO unique_reward_claim (reward_key, player_id, session_id) VALUES (?, ?, ?)",
		rewardKey, playerID, sessionID,
	)
	if err != nil {
		// MySQL 落库失败：回滚 Redis 锁，避免物品丢失
		_ = s.rdb.Del(rewardKey)
		return false, err
	}
	return true, nil
}

// roleTypeToTag 将 role_type 转成来源标签，用于 player_inventory.source
func roleTypeToTag(roleType int) string {
	switch roleType {
	case RoleWukong:
		return "wukong"
	case RoleMowang:
		return "mowang"
	case RoleShouxa:
		return "shouxa"
	case RoleMonkey:
		return "monkey"
	case RoleOldMon:
		return "oldmon"
	case RoleGrass:
		return "grass"
	}
	return "unknown"
}

// nullableInt 将 0 转为 nil 以支持 MySQL NULL 写入
func nullableInt(v int) interface{} {
	if v == 0 {
		return nil
	}
	return v
}

// nullableStr 将空字符串转为 nil
func nullableStr(v string) interface{} {
	if v == "" {
		return nil
	}
	return v
}

// ═══════════════════════════════════════════
//  GET /dungeon/huaguoshan/session  查询会话状态（用于断线重连）
// ═══════════════════════════════════════════

// HandleSessionInfo 查询指定会话的实时状态
func (s *Service) HandleSessionInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	playerID := getPlayerIDFromQuery(r)
	if sessionID <= 0 || playerID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数无效"})
		return
	}

	var (
		roleType, outcome int
		grade             sql.NullString
		startAt           time.Time
		duration          int
		observeScore      int
	)
	err := s.db.QueryRow(
		`SELECT role_type, outcome, grade, start_at, duration_sec, observe_score 
		 FROM dungeon_scene_session WHERE session_id=? AND player_id=?`,
		sessionID, playerID,
	).Scan(&roleType, &outcome, &grade, &startAt, &duration, &observeScore)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "会话不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询失败: " + err.Error()})
		return
	}

	// 进行中的会话：实时计算剩余时间
	elapsed := int(time.Since(startAt).Seconds())
	remaining := DungeonMaxDurationSec - elapsed
	if remaining < 0 {
		remaining = 0
	}
	if outcome != OutcomeInProgress {
		remaining = 0
	}

	// 实时观测度（草木石头）
	if roleType == RoleGrass && outcome == OutcomeInProgress {
		observeScore = s.finalObserveScore(sessionID, elapsed)
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "OK",
		Data: map[string]interface{}{
			"session_id":     sessionID,
			"role_type":      roleType,
			"role_name":      RoleName(roleType),
			"outcome":        outcome,
			"grade":          grade.String,
			"elapsed_sec":    elapsed,
			"remaining_sec":  remaining,
			"observe_score":  observeScore,
			"is_in_progress": outcome == OutcomeInProgress,
		},
	})
}

// ═══════════════════════════════════════════
//  GET /dungeon/huaguoshan/probs  查询当前玩家的抽奖概率（用于入口预览）
// ═══════════════════════════════════════════

// HandleProbsPreview 概率预览（不消耗资源）
func (s *Service) HandleProbsPreview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	playerID := getPlayerIDFromQuery(r)
	if playerID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 无效"})
		return
	}

	luck, err := s.getPlayerLuck(playerID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "运气查询失败"})
		return
	}
	probs := CalcProbs(luck)

	// 附带每个角色的中文名，方便前端直接展示
	list := make([]map[string]interface{}, 0, 6)
	for _, rt := range []int{RoleWukong, RoleMowang, RoleShouxa, RoleMonkey, RoleOldMon, RoleGrass} {
		list = append(list, map[string]interface{}{
			"role_type":  rt,
			"role_name":  RoleName(rt),
			"base_prob":  RoleBaseProbs[rt],
			"final_prob": probs[rt],
		})
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "OK",
		Data: map[string]interface{}{
			"luck":  luck,
			"probs": list,
		},
	})
}
