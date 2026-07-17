// Package dungeon 实现花果山副本服务。
// 负责副本进入、随机身份分配、会话管理、观测度累加、结算评级、奖励发放等核心功能。
// 严格按照《寻仙-花果山副本设计文档 V3》和《花果山副本技术方案》实现。
//
// 关键设计:
//   - 服务端权威：所有概率计算、结局判定、奖励发放均在服务端完成，防作弊
//   - 运气加权：稀有身份（大圣0.01/魔王0.09）按 x(1+luck) 加权，超出量从其他4种角色按原比例扣除
//   - 唯一性奖励：悟性+0.1 全服限量，通过 Redis SetNX 分布式锁 + MySQL 记录双保险
//   - 观测度：静态计时60% + 特定战斗事件40%，精细化累加
package dungeon

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// Service 花果山副本服务，持有数据库连接、Redis客户端和全局配置
type Service struct {
	db  *sql.DB       // MySQL 连接池
	rdb *redis.Client // Redis 客户端（用于分布式锁/会话状态/观测度缓存）
	cfg *config.Config
}

// NewService 创建副本服务实例
func NewService(db *sql.DB, rdb *redis.Client, cfg *config.Config) *Service {
	return &Service{db: db, rdb: rdb, cfg: cfg}
}

// APIResponse 统一 API 响应结构体
// Code=0 表示成功，其他值表示业务错误码
type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

// ═══════════════════════════════════════════
//  常量定义：角色类型 / 结局 / 场景ID
// ═══════════════════════════════════════════

// 花果山副本 role_type 枚举（与 dungeon_scene_session.role_type 一致）
const (
	RoleWukong = 1 // 孙悟空
	RoleMowang = 2 // 混世魔王
	RoleShouxa = 3 // 魔王手下
	RoleMonkey = 4 // 普通猴子
	RoleOldMon = 5 // 老猴子
	RoleGrass  = 6 // 草木石头
)

// 花果山副本 outcome 枚举
const (
	OutcomeInProgress = 0 // 进行中
	OutcomeWin        = 1 // 完胜（大圣）
	OutcomeHurt       = 2 // 受伤（大圣）
	OutcomeDead       = 3 // 死亡
	OutcomeSurvive    = 4 // 生存成功
	OutcomeObserve    = 5 // 观测完成
	OutcomeStoryDeath = 6 // 剧情死亡（魔王撑满5分钟）
)

// 花果山场景ID
const HuaguoshanSceneID = 1

// 副本时长上限：5分钟
const DungeonMaxDurationSec = 300

// 唯一性奖励Key：悟性+0.1（全服限量）
const UniqueRewardComprehension = "hgs:unique:comprehension_boost_v1"

// ═══════════════════════════════════════════
//  核心算法（严格按照技术方案 P77-P92 实现）
// ═══════════════════════════════════════════

// RoleBaseProbs 六种角色的基础中奖概率（PRD 表0/技术方案 P82-P90）
// 顺序与 role_type 枚举一致
var RoleBaseProbs = map[int]float64{
	RoleWukong: 0.01, // 孙悟空
	RoleMowang: 0.09, // 混世魔王
	RoleShouxa: 0.30, // 魔王手下
	RoleMonkey: 0.35, // 普通猴子
	RoleOldMon: 0.10, // 老猴子
	RoleGrass:  0.15, // 草木石头
}

// CalcProbs 运气加权概率计算（技术方案 P77-P92）
//
// 参数:
//   - luck: 玩家运气值（0-1.0），来自 character_attributes.qi_yun / 100 换算
//
// 返回值:
//   - map[int]float64: role_type → 最终概率，总和恒为 1.0
//
// 算法说明:
//  1. 稀有身份加权：wkProb = 0.01 × (1 + luck)，mwProb = 0.09 × (1 + luck)
//  2. 多出的概率：extra = (wkProb - 0.01) + (mwProb - 0.09)
//  3. 从四普通角色（手下0.30/猴子0.35/老猴0.10/草木0.15，总和0.90）按比例扣除
//  4. 各角色扣除量 = extra × (该角色原概率 / 0.90)
func CalcProbs(luck float64) map[int]float64 {
	// 边界保护：负数/超过1.0都视为无效，回退到基础概率
	if luck < 0 {
		luck = 0
	}
	if luck > 1.0 {
		luck = 1.0
	}

	probs := make(map[int]float64, 6)

	// 稀有身份加权
	wkProb := 0.01 * (1 + luck)
	mwProb := 0.09 * (1 + luck)
	probs[RoleWukong] = wkProb
	probs[RoleMowang] = mwProb

	// 多出的总概率
	extra := (wkProb - 0.01) + (mwProb - 0.09)
	poolSum := 0.30 + 0.35 + 0.10 + 0.15 // 0.90

	// 四普通角色按比例扣除
	probs[RoleShouxa] = 0.30 - extra*(0.30/poolSum)
	probs[RoleMonkey] = 0.35 - extra*(0.35/poolSum)
	probs[RoleOldMon] = 0.10 - extra*(0.10/poolSum)
	probs[RoleGrass] = 0.15 - extra*(0.15/poolSum)

	return probs
}

// RollRole 根据概率表加权随机抽取一个 role_type
// 使用累积概率区间法：将各角色概率累加，随机数落在哪个区间即为对应角色。
func RollRole(probs map[int]float64) int {
	// 累积概率总和（理论=1.0，做防御性容错）
	total := 0.0
	for _, p := range probs {
		total += p
	}
	if total <= 0 {
		return RoleMonkey // 兜底返回最常见的普通猴子
	}

	// 随机数落点（0 ~ total）
	roll := rand.Float64() * total
	cumulative := 0.0

	// 按 role_type 顺序遍历，保证结果确定性
	roleOrder := []int{RoleWukong, RoleMowang, RoleShouxa, RoleMonkey, RoleOldMon, RoleGrass}
	for _, rt := range roleOrder {
		cumulative += probs[rt]
		if roll <= cumulative {
			return rt
		}
	}
	return RoleMonkey
}

// EvaluateGrade 结算评级（PRD 11.4 评级标准）
//
// 参数:
//   - roleType: 角色类型
//   - outcome:  结局（1-6）
//   - durationSec: 存活时长（秒）
//   - observeScore: 观测度（草木石头专用，0-100）
//   - selfHpLeft: 自身剩余HP百分比（大圣战判定用）
//
// 返回值:
//   - 评级字符 S/A/B/C/D
func EvaluateGrade(roleType, outcome, durationSec, observeScore, selfHpLeft int) string {
	switch roleType {
	case RoleWukong:
		// 大圣：完胜→S，受伤→A，死亡→D
		if outcome == OutcomeWin {
			return "S"
		}
		if outcome == OutcomeHurt {
			return "A"
		}
		return "D"
	case RoleMowang:
		// 魔王：撑满5分钟触发剧情死亡→S，4-5分钟→A，1-4分钟→B，<1分钟被打死→D
		if outcome == OutcomeStoryDeath {
			return "S"
		}
		if durationSec >= 240 {
			return "A"
		}
		if durationSec >= 60 {
			return "B"
		}
		return "D"
	case RoleShouxa, RoleMonkey, RoleOldMon:
		// 生存类：5分钟→S，3-4分钟→A，2-3分钟→B，1-2分钟→C，<1分钟→D
		if durationSec >= DungeonMaxDurationSec {
			return "S"
		}
		if durationSec >= 180 {
			return "A"
		}
		if durationSec >= 120 {
			return "B"
		}
		if durationSec >= 60 {
			return "C"
		}
		return "D"
	case RoleGrass:
		// 草木石头：按观测度分层
		if observeScore >= 100 {
			return "S"
		}
		if observeScore >= 75 {
			return "A"
		}
		if observeScore >= 50 {
			return "B"
		}
		if observeScore >= 25 {
			return "C"
		}
		return "D"
	}
	return "D"
}

// EvaluateOutcome 根据战斗数据自动判定结局（不含生存/观测的自然结局判定）
//
// 说明:
//   - 大圣: 双方HP决定完胜/受伤/死亡
//   - 魔王: 只判定被打死；剧情死亡由客户端到时上报
//   - 其他: 交给上层业务判定（生存/观测/波及死亡）
func EvaluateOutcome(roleType, selfHpLeft, bossHpLeft int) int {
	switch roleType {
	case RoleWukong:
		if bossHpLeft <= 0 && selfHpLeft > 70 {
			return OutcomeWin
		}
		if bossHpLeft <= 0 && selfHpLeft > 0 {
			return OutcomeHurt
		}
		return OutcomeDead
	case RoleMowang:
		if selfHpLeft <= 0 {
			return OutcomeDead
		}
		return OutcomeStoryDeath
	}
	return OutcomeInProgress
}

// PickWukongComment 大圣战三种结局随机评语（PRD 表4）
// 用于结算画面展示，非固定文案。
func PickWukongComment(outcome int) string {
	switch outcome {
	case OutcomeWin:
		return pickOne([]string{
			"齐天大圣名不虚传",
			"一棍扫清妖帝，果然是强者",
			"这一战之后，花果山再无战事",
		})
	case OutcomeHurt:
		return pickOne([]string{
			"赢是赢了，但这个狼狈样子",
			"齐天大圣？齐天叫花子还差不多",
			"下次带医仙进来吧",
		})
	case OutcomeDead:
		return pickOne([]string{
			"拿了大圣的模板还死，建议卸载游戏",
			"这个操作，给只猴子都不如",
			"魔王都想给你造墓",
		})
	}
	return ""
}

// pickOne 从字符串切片中随机选一个
func pickOne(list []string) string {
	if len(list) == 0 {
		return ""
	}
	return list[rand.Intn(len(list))]
}

// writeJSON 统一 JSON 响应工具函数
func writeJSON(w http.ResponseWriter, status int, resp APIResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}

// getPlayerIDFromQuery 从 query/form 中读取 player_id，出错返回 0
func getPlayerIDFromQuery(r *http.Request) int64 {
	pid, _ := strconv.ParseInt(r.URL.Query().Get("player_id"), 10, 64)
	return pid
}

// getPlayerLuck 查询玩家当前运气值（qi_yun/100 归一化到 0-1.0）
// 这里 player_id 语义上等于 character_id（单角色项目）
func (s *Service) getPlayerLuck(playerID int64) (float64, error) {
	var qiYun int
	err := s.db.QueryRow(
		"SELECT qi_yun FROM character_attributes WHERE character_id=?",
		playerID,
	).Scan(&qiYun)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	// 简单线性归一化到 0-1.0，可后续加曲线
	luck := float64(qiYun) / 100.0
	if luck < 0 {
		luck = 0
	}
	if luck > 1.0 {
		luck = 1.0
	}
	return luck, nil
}

// getRemainingFatigue 查询玩家当日剩余牢结值（秒）
// 优先读 Redis 缓存 fatigue:{player_id}:{yyyy-mm-dd}
// 未命中则回源 MySQL player_fatigue 表，并写回缓存
func (s *Service) getRemainingFatigue(playerID int64) (int, error) {
	today := time.Now().Format("2006-01-02")
	key := fmt.Sprintf("fatigue:%d:%s", playerID, today)

	// 先读 Redis
	if v, err := s.rdb.Get(key); err == nil {
		if sec, err := strconv.Atoi(v); err == nil {
			return sec, nil
		}
	}

	// 回源 MySQL
	var remaining int
	var lastResetDate sql.NullString
	err := s.db.QueryRow(
		"SELECT remaining_sec, last_reset_date FROM player_fatigue WHERE player_id=?",
		playerID,
	).Scan(&remaining, &lastResetDate)

	if err == sql.ErrNoRows {
		// 首次进入：插入默认记录 18000 秒
		remaining = 18000
		_, _ = s.db.Exec(
			"INSERT INTO player_fatigue (player_id, remaining_sec, daily_max_sec, last_reset_date) VALUES (?, 18000, 18000, ?)",
			playerID, today,
		)
	} else if err != nil {
		return 0, err
	} else if lastResetDate.String != today {
		// 跨日重置（防止定时任务失败也能自愈）
		remaining = 18000
		_, _ = s.db.Exec(
			"UPDATE player_fatigue SET remaining_sec=?, last_reset_date=?, is_penalty=0 WHERE player_id=?",
			remaining, today, playerID,
		)
	}

	// 写回 Redis，次日凌晨3:00过期
	ttl := timeUntilNextReset()
	_ = s.rdb.Set(key, remaining, ttl)
	return remaining, nil
}

// timeUntilNextReset 计算距离下次凌晨3:00的时间（用于牢结值 Redis TTL）
func timeUntilNextReset() time.Duration {
	now := time.Now()
	next := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, now.Location())
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	return next.Sub(now)
}
