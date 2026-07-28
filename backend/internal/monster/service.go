// Package monster 实现初始之地野怪系统服务。
// 负责领地/族群管理、怪物属性模板计算、协战围攻倍率计算、
// 怪物受击扣血、妖幼崽/神兽幼崽抓捕、神兽唯一性保障、世界初始化等核心功能。
// 严格按照《寻仙 - 初始之地野怪系统 PRD+技术方案》实现。
//
// 关键设计:
//   - 服务端权威：属性计算/协战倍率/抓捕判定全部在服务端完成，客户端不可伪造
//   - 属性递推：以"人一阶单属性玩家模板"为基准，按 PRD 第四章倍率表逐阶累乘
//   - 协战倍率：围攻数量 × (同属性/五行相生) 查表，蛮蛮(#99)成对最终×2
//   - 唯一性保障：神兽幼崽抓捕通过 Redis SetNX 分布式锁 + MySQL 记录双保险
//   - 妖幼崽刷新：被抓后写 Redis CD（yao_cub:respawn:{faction_id}），到期懒刷新
package monster

import (
	"database/sql"
	"encoding/json"
	"math"
	"math/rand"
	"net/http"
	"strconv"

	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// Service 野怪服务，持有数据库连接、Redis客户端和全局配置
type Service struct {
	db  *sql.DB       // MySQL 连接池
	rdb *redis.Client // Redis 客户端（妖幼崽刷新CD/神兽幼崽唯一性锁）
	cfg *config.Config
}

// NewService 创建野怪服务实例
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
//  常量定义：怪物类型 / 状态 / 五行 / 世界参数
// ═══════════════════════════════════════════

// 怪物类型枚举（与 monster_entity.type 一致）
const (
	TypeNormal    = 1 // 普通怪（单修）
	TypeElite     = 2 // 精英怪（双修）
	TypeBoss      = 3 // Boss怪（三修）
	TypeYao       = 4 // 妖（四修）
	TypeYaoCub    = 5 // 妖幼崽（可抓捕，CD刷新）
	TypeDivine    = 6 // 神兽（五修，全服唯一）
	TypeDivineCub = 7 // 神兽幼崽（可抓捕，全服唯一不刷新）
)

// 怪物状态枚举（与 monster_entity.state 一致）
const (
	StateIdle     = 0 // 待机
	StatePatrol   = 1 // 巡逻
	StateCombat   = 2 // 战斗
	StateDead     = 3 // 死亡（等待复活）
	StateCaptured = 4 // 已被抓捕
)

// 五行属性枚举：1金 2木 3水 4火 5土（与人物系统一致）
const (
	ElemJin  = 1 // 金
	ElemMu   = 2 // 木
	ElemShui = 3 // 水
	ElemHuo  = 4 // 火
	ElemTu   = 5 // 土
)

// 世界初始化参数（PRD 第三章族群结构 + 技术方案 5.1）
const (
	TerritoryCount   = 100    // 外围领地总数（10×10网格）
	GridSize         = 10     // 网格边长（10×10）
	CellSize         = 1000.0 // 单格边长（世界坐标）
	TerritoryRadius  = 400.0  // 领地半径（怪物活动边界，不串场）
	NormalPerFaction = 50     // 每族群普通怪数量
	ElitePerFaction  = 10     // 每族群精英怪数量
	BossPerFaction   = 2      // 每族群Boss怪数量
	YaoPerFaction    = 1      // 每族群妖数量
	YaoCubPerFaction = 3      // 每族群妖幼崽数量（PRD"若干"，落地取3只）
	DivineGroupCount = 20     // 神兽分组数（100族群÷5）
	GroupSpan        = 5      // 每组族群数
)

// 妖幼崽被抓后的刷新CD（秒），Redis key: yao_cub:respawn:{faction_id}
const YaoCubRespawnCD = 600

// 普通/精英/Boss/妖 死亡后的复活CD（秒），懒刷新
const MonsterRespawnCD = 300

// 蛮蛮（比翼鸟）族群编号：永远成对出现，协战倍率翻倍（PRD 4.3）
const ManmanSpeciesID = 99

// 神兽幼崽唯一性分布式锁前缀（SetNX），key: divine_cub:capture:{faction_group}
const DivineCubLockPrefix = "divine_cub:capture:"

// ═══════════════════════════════════════════
//  怪物属性计算系统（PRD 第四章 + 技术方案 4.1）
// ═══════════════════════════════════════════

// 人一阶单属性玩家模板基准值。
// 与人物系统衍生公式一致（character/service.go CalcDerivedAttrs，精=气=神=1）：
//
//	气血 = 精×100 = 100，攻击 = 功法威力 = 气×12 = 12，
//	防御 = 体魄 = 精×10 = 10，速度 = 身法 = 精×5 = 5
const (
	BaseHP  = 100 // 基准气血
	BaseATK = 12  // 基准攻击
	BaseDEF = 10  // 基准防御
	BaseSPD = 5   // 基准速度
)

// CultCount 返回各怪物类型的修炼种数（多修模板 = 单属性模板 × 修炼种数）
// PRD 4.1-4.5：普通=单修1 精英=双修2 Boss=三修3 妖=四修4 神兽=五修5
func CultCount(monsterType int) int {
	switch monsterType {
	case TypeNormal:
		return 1
	case TypeElite:
		return 2
	case TypeBoss:
		return 3
	case TypeYao, TypeYaoCub:
		return 4 // 妖幼崽沿用妖的四修模板（属性另乘2/3）
	case TypeDivine, TypeDivineCub:
		return 5 // 神兽幼崽沿用神兽的五修模板（属性另乘2/3）
	default:
		return 1
	}
}

// tierStepMultiplier 返回某类型怪物从上一阶到第 tier 阶的"单步"倍率
// 严格按照 PRD 4.1-4.5 各类型模板表：
//
//	普通怪：一阶×1.5（相对玩家模板），二阶×1.5，三阶×2.0，四阶×2.0，之后交替 1.5/1.5/2.0/2.0
//	精英怪：一阶×2.0，二阶×2.5，三阶及以后×3.0
//	Boss怪：一阶×3.0，二阶×3.5，三阶及以后×4.0
//	妖　　：同Boss（一阶×3.0，二阶×3.5，三阶及以后×4.0）
//	神兽　：一阶×5.0，二阶×2.0，三阶及以后×3.0
func tierStepMultiplier(monsterType, tier int) float64 {
	switch monsterType {
	case TypeNormal:
		// 周期4循环：位置1,2→×1.5；位置3,4→×2.0
		switch (tier - 1) % 4 {
		case 0, 1:
			return 1.5
		default:
			return 2.0
		}
	case TypeElite:
		switch tier {
		case 1:
			return 2.0
		case 2:
			return 2.5
		default:
			return 3.0
		}
	case TypeBoss, TypeYao, TypeYaoCub:
		switch tier {
		case 1:
			return 3.0
		case 2:
			return 3.5
		default:
			return 4.0
		}
	case TypeDivine, TypeDivineCub:
		switch tier {
		case 1:
			return 5.0
		case 2:
			return 2.0
		default:
			return 3.0
		}
	default:
		return 1.0
	}
}

// CalcCumulativeMultiplier 计算某类型怪物第 tier 阶相对"人一阶玩家单属性模板"的累计倍率
// 递推关系：本阶属性 = 上一阶属性 × 本阶单步倍率，故累计倍率 = 各阶单步倍率连乘
func CalcCumulativeMultiplier(monsterType, tier int) float64 {
	multi := 1.0
	for t := 1; t <= tier; t++ {
		multi *= tierStepMultiplier(monsterType, t)
	}
	return multi
}

// MonsterAttr 怪物四维属性
type MonsterAttr struct {
	HP  int `json:"hp"`  // 气血
	ATK int `json:"atk"` // 攻击
	DEF int `json:"def"` // 防御
	SPD int `json:"spd"` // 速度
}

// CalcMonsterAttr 计算某类型×某阶怪物的属性（技术方案 4.1 CalcMonsterAttr 落地）
// 公式：属性 = 基准值 × 修炼种数 × 累计倍率
// 幼崽特殊规则（PRD 4.6）：妖幼崽/神兽幼崽固定人五阶，属性 = 母体人五阶属性 × 2/3
func CalcMonsterAttr(monsterType, tier int) MonsterAttr {
	cult := float64(CultCount(monsterType))
	multi := CalcCumulativeMultiplier(monsterType, tier)
	factor := cult * multi

	// 幼崽属性打 2/3 折（在母体同阶属性基础上）
	if monsterType == TypeYaoCub || monsterType == TypeDivineCub {
		factor = factor * 2.0 / 3.0
	}

	return MonsterAttr{
		HP:  int(float64(BaseHP) * factor),
		ATK: int(float64(BaseATK) * factor),
		DEF: int(float64(BaseDEF) * factor),
		SPD: int(float64(BaseSPD) * factor),
	}
}

// ═══════════════════════════════════════════
//  协战围攻系统（PRD 第五章 + 技术方案 4.2/4.3）
// ═══════════════════════════════════════════

// shengNext 五行相生环的"下一个"映射（PRD 第五章）：
// 金生水、水生木、木生火、火生土、土生金
// 即 金(1)→水(3)→木(2)→火(4)→土(5)→金(1)
var shengNext = map[int]int{
	ElemJin:  ElemShui, // 金生水
	ElemShui: ElemMu,   // 水生木
	ElemMu:   ElemHuo,  // 木生火
	ElemHuo:  ElemTu,   // 火生土
	ElemTu:   ElemJin,  // 土生金
}

// allSameElement 判断围攻怪物是否全部同五行属性
func allSameElement(elements []int) bool {
	if len(elements) == 0 {
		return false
	}
	first := elements[0]
	for _, e := range elements {
		if e != first {
			return false
		}
	}
	return true
}

// isWuxingSheng 判断围攻怪物的五行属性是否构成"相生叠加"
// 判定规则：对属性去重后，若去重集合 ≥2 种，且这些属性在相生环上
// 能构成一条连续的相生链（如 金→水→木），则视为触发相生叠加
func isWuxingSheng(elements []int) bool {
	// 去重
	set := make(map[int]bool)
	for _, e := range elements {
		if e >= ElemJin && e <= ElemTu {
			set[e] = true
		}
	}
	k := len(set)
	if k < 2 {
		return false // 至少需要2种不同属性才谈得上"相生"
	}

	// 尝试以每一种属性为链头，沿相生环走 k-1 步，
	// 若能恰好覆盖去重集合中的所有属性，则构成连续相生链
	for start := range set {
		cur := start
		matched := 1
		for i := 1; i < k; i++ {
			cur = shengNext[cur]
			if !set[cur] {
				break
			}
			matched++
		}
		if matched == k {
			return true
		}
	}
	return false
}

// CoopDamageMultiplier 协战围攻伤害倍率计算（技术方案 4.2 伪代码严格落地）
//
// 参数:
//   - elements: 围攻怪物的五行属性列表
//   - manmanCount: 围攻列表中蛮蛮(#99)的数量（≥2视为成对，最终倍率×2）
//
// 返回值:
//   - multiplier: 最终协战伤害倍率
//   - sameElem: 是否全同属性
//   - shengCycle: 是否构成五行相生链
//   - manmanPaired: 是否触发蛮蛮成对翻倍
//
// 倍率表（PRD 第五章）:
//
//	围攻3个：同属性×1.5 / 相生×2.0
//	围攻4个：同属性×2.0 / 相生×3.0
//	围攻5个：同属性×3.0 / 相生×5.0
//	围攻7个：同属性×4.0 / 相生×10.0
func CoopDamageMultiplier(elements []int, manmanCount int) (multiplier float64, sameElem, shengCycle, manmanPaired bool) {
	n := len(elements)
	sameElem = allSameElement(elements)
	shengCycle = isWuxingSheng(elements)

	switch {
	case n >= 7 && shengCycle:
		multiplier = 10.0
	case n >= 7 && sameElem:
		multiplier = 4.0
	case n >= 5 && shengCycle:
		multiplier = 5.0
	case n >= 5 && sameElem:
		multiplier = 3.0
	case n >= 4 && shengCycle:
		multiplier = 3.0
	case n >= 4 && sameElem:
		multiplier = 2.0
	case n >= 3 && shengCycle:
		multiplier = 2.0
	case n >= 3 && sameElem:
		multiplier = 1.5
	default:
		multiplier = 1.0
	}

	// 蛮蛮特殊机制（PRD 4.3）：永远成对出现，围攻含蛮蛮对时最终倍率×2
	if manmanCount >= 2 {
		manmanPaired = true
		multiplier *= 2.0
	}
	return
}

// ═══════════════════════════════════════════
//  抓捕系统（PRD 第六章 + 技术方案 6.1/6.2）
// ═══════════════════════════════════════════

// 抓捕血量门槛：目标血量必须 ≤30% 才允许抓捕
const CaptureHPThreshold = 0.3

// CalcCaptureRate 抓捕成功率计算（技术方案 6.2 公式严格落地）
//
// 公式：captureRate = baseRate × itemMultiplier × levelMultiplier × hpFactor
//   - baseRate = 0.3（基础成功率）
//   - itemMultiplier：道具品质倍率，普通×1.0 / 稀有×1.5 / 传说×2.0
//   - levelMultiplier = 1 + 0.1×(抓捕等级-1)（抓捕技能系统未上线，等级暂固定1，即×1.0）
//   - hpFactor = (1 - 目标血量百分比) / 0.7，血量越低成功率越高
//     （血量恰好30%时 hpFactor=1.0，血量0%时 hpFactor≈1.43）
//
// 结果裁剪到 [0, 1.0]
func CalcCaptureRate(hpPercent float64, itemQuality, captureLevel int) float64 {
	baseRate := 0.3

	var itemMultiplier float64
	switch itemQuality {
	case 2:
		itemMultiplier = 1.5 // 稀有
	case 3:
		itemMultiplier = 2.0 // 传说
	default:
		itemMultiplier = 1.0 // 普通
	}

	if captureLevel < 1 {
		captureLevel = 1
	}
	levelMultiplier := 1.0 + 0.1*float64(captureLevel-1)

	hpFactor := (1.0 - hpPercent) / 0.7

	rate := baseRate * itemMultiplier * levelMultiplier * hpFactor
	if rate < 0 {
		rate = 0
	}
	if rate > 1.0 {
		rate = 1.0
	}
	return rate
}

// ═══════════════════════════════════════════
//  通用工具函数
// ═══════════════════════════════════════════

// writeJSON 统一 JSON 响应工具函数
func writeJSON(w http.ResponseWriter, status int, resp APIResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}

// queryInt 从 URL query 中读取整数参数，出错返回 0
func queryInt(r *http.Request, key string) int {
	v, _ := strconv.Atoi(r.URL.Query().Get(key))
	return v
}

// randPosInRadius 在圆形领地内随机取一点（中心 cx,cy 半径 radius）
// 采用"随机角度+sqrt均匀半径"保证圆内均匀分布
func randPosInRadius(cx, cy, radius float64) (float64, float64) {
	angle := rand.Float64() * 2 * math.Pi
	// 半径开方保证面积均匀（否则点会向圆心聚集）
	r := radius * math.Sqrt(rand.Float64())
	return cx + r*math.Cos(angle), cy + r*math.Sin(angle)
}
