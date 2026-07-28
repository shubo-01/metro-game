// Package equipment 实现寻仙装备系统服务。
// 负责装备生成/穿戴卸下/基础加成计算/套装效果/升级/耐久修理/
// 打造系统/掉落系统/神话碎片合成/神位继承/交易/背包容量等核心功能。
// 严格按照《寻仙·装备系统 PRD+技术方案》实现。
//
// 关键设计:
//   - 服务端权威：装备生成、加成计算、升级判定、掉落判定全部在服务端完成
//   - 品质体系：9品质（凡/珍/碎片/灵/仙/神话/道/先天/功德），倍率 1/2/2.5/3/5/7/9/12/12
//   - 加成公式：实际加成 = 品质倍率 × 基数份额 × (1 + (装备等级-1)/9)，10级=2倍
//   - 气运加成：升级/打造/道宝合成成功率 = 基础成功率 + 0.10×气运点数，上限100%（PRD 5.2/10.1）
//   - 掉落气运：最终掉落概率 = base_rate × (1 + luck)，luck 为气运归一化值 0~1（与副本系统一致）
//   - 神话碎片：3片合成1件完整神话；掉落命中神话品质时 50% 概率转为掉3个碎片
package equipment

import (
	"database/sql"
	"encoding/json"
	"math/rand"
	"net/http"
	"strconv"
	"sync"

	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// Service 装备服务，持有数据库连接、Redis客户端和全局配置
type Service struct {
	db  *sql.DB       // MySQL 连接池
	rdb *redis.Client // Redis 客户端（碎片合成/道宝合成分布式锁）
	cfg *config.Config

	qualityOnce sync.Once             // 品质配置懒加载保护
	qualityCfg  map[int]QualityConfig // 品质配置内存缓存（equip_quality_config）
}

// NewService 创建装备服务实例
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
//  常量定义：品质 / 槽位 / 属性 / 耐久 / 背包
// ═══════════════════════════════════════════

// 品质枚举（与 equip_quality_config.quality 一致，PRD 第三章）
const (
	QualityFan    = 1 // 凡品 ×1
	QualityZhen   = 2 // 珍品 ×2
	QualityShard  = 3 // 神话碎片 ×2.5（不可穿戴，3片合成完整神话）
	QualityLing   = 4 // 灵宝 ×3
	QualityXian   = 5 // 仙宝 ×5
	QualityMyth   = 6 // 神话 ×7
	QualityDao    = 7 // 道宝 ×9（宗师合成产出）
	QualityInnate = 8 // 先天灵宝 ×12
	QualityGongde = 9 // 功德灵宝 ×12（前期不出）
)

// 槽位枚举（与 equipment_template.slot_type 一致，PRD 第二章）
const (
	SlotHead       = 1  // 头甲
	SlotFace       = 2  // 面甲
	SlotBody       = 3  // 躯甲
	SlotCrotch     = 4  // 裆甲
	SlotLeg        = 5  // 腿甲
	SlotFoot       = 6  // 足甲
	SlotArm        = 7  // 臂甲
	SlotBelt       = 8  // 腰带（背包扩展特殊功能）
	SlotBracelet   = 11 // 手镯
	SlotRing       = 12 // 戒指
	SlotEarring    = 13 // 耳环
	SlotNecklace   = 14 // 项链
	SlotMainWeapon = 21 // 主武器
	SlotSubWeapon  = 22 // 副武器（1~8件，档位由技能/身份决定）
)

// 装备大类枚举（与 equipment_template.category 一致）
const (
	CategoryArmor   = 1 // 穿戴甲（8件，加精）
	CategoryJewelry = 2 // 首饰（4件，加神）
	CategoryWeapon  = 3 // 武器（主+副，加气）
)

// 基础加成属性枚举：1=精 2=神 3=气（PRD 第四章）
const (
	AttrJing = 1 // 精（甲类）
	AttrShen = 2 // 神（首饰）
	AttrQi   = 3 // 气（武器）
)

// 耐久系统常量（PRD 第九章）
const (
	MaxDurability  = 300 // 耐久上限
	DurabilityWarn = 10  // 低耐久警告阈值（<10 提示玩家）
)

// 背包容量常量（PRD 第十三章）
const BaseInventorySlots = 20 // 基础背包格数（腰带提供额外扩展）

// 神话碎片常量（PRD 第十二章）
const (
	ShardCombineCount = 3   // 碎片合成完整神话所需数量（3合1）
	MythToShardRate   = 0.5 // 掉落命中神话品质时转为碎片的概率（50%）
	ShardDropCount    = 3   // 转碎片时一次掉落的碎片数量
)

// 道宝合成常量（PRD 10.3）：宗师满级解锁，10件仙宝合成，基础成功率50%
const (
	DaobaoXianCost   = 10  // 合成消耗仙宝装备件数
	DaobaoBaseRate   = 0.5 // 基础成功率50%（可被气运加成）
	DaobaoShatterCnt = 5   // 失败时随机粉碎件数（status=1 软删除）
	DaobaoDamagedCnt = 5   // 失败时随机破损件数（耐久置1）
)

// 打造品级枚举（与 craft_level.level 一致，PRD 10.1）
const (
	CraftApprentice = 1 // 学徒
	CraftCraftsman  = 2 // 匠人
	CraftArtisan    = 3 // 巧匠
	CraftMaster     = 4 // 大师
	CraftGrand      = 5 // 宗师
)

// 宗师满级条件：成功打造仙宝累计1000件，满级后解锁道宝合成（PRD 10.1）
const GrandMasterXianCount = 1000

// ═══════════════════════════════════════════
//  品质配置（equip_quality_config 内存缓存）
// ═══════════════════════════════════════════

// QualityConfig 品质全维度配置（对应 equip_quality_config 表一行）
type QualityConfig struct {
	Quality            int     // 品质枚举 1-9
	Name               string  // 品质名称
	Multiplier         float64 // 加成倍率（凡品×1为基准）
	ExtraAttrMin       int     // 附加属性数量下限
	ExtraAttrMax       int     // 附加属性数量上限
	RequiredMajorStage int     // 穿戴要求大境界：1人阶 2真人 3仙 4金仙
	RepairMaterial     string  // 修理材料名称
	BeltExtraSlots     int     // 腰带额外背包格数
	BeltQuickSlots     int     // 腰带快捷栏数
}

// loadQualityConfigs 懒加载品质配置到内存（服务生命周期内只加载一次）
// 品质配置是静态种子数据，缓存可满足"装备加成计算延迟 P99<10ms"的性能指标
func (s *Service) loadQualityConfigs() map[int]QualityConfig {
	s.qualityOnce.Do(func() {
		s.qualityCfg = make(map[int]QualityConfig)
		rows, err := s.db.Query(`SELECT quality, name, multiplier, extra_attr_min, extra_attr_max,
			required_major_stage, repair_material, belt_extra_slots, belt_quick_slots
			FROM equip_quality_config`)
		if err != nil {
			return
		}
		defer rows.Close()
		for rows.Next() {
			var q QualityConfig
			if err := rows.Scan(&q.Quality, &q.Name, &q.Multiplier, &q.ExtraAttrMin, &q.ExtraAttrMax,
				&q.RequiredMajorStage, &q.RepairMaterial, &q.BeltExtraSlots, &q.BeltQuickSlots); err == nil {
				s.qualityCfg[q.Quality] = q
			}
		}
	})
	return s.qualityCfg
}

// getQualityConfig 获取指定品质配置，第二返回值表示品质是否合法
func (s *Service) getQualityConfig(quality int) (QualityConfig, bool) {
	cfg, ok := s.loadQualityConfigs()[quality]
	return cfg, ok
}

// ═══════════════════════════════════════════
//  装备升级系统（PRD 5.2 + 技术方案第九章）
// ═══════════════════════════════════════════

// upgradeRates 升级成功率表（key=当前等级，PRD 5.2 表格）
// 1→2:100% 2→3:95% 3→4:90% 4→5:80% 5→6:70% 6→7:60% 7→8:55% 8→9:52% 9→10:50%
var upgradeRates = map[int]float64{
	1: 1.00, 2: 0.95, 3: 0.90, 4: 0.80, 5: 0.70,
	6: 0.60, 7: 0.55, 8: 0.52, 9: 0.50,
}

// 升级失败惩罚类型（技术方案第九章 upgradeFailures）
const (
	FailNone      = ""                       // 1→2 必成功，无失败分支
	FailDowngrade = "DOWNGRADE"              // 降1级（2→3/3→4/4→5 失败）
	FailHalfHalf  = "HALF_DOWN_HALF_DESTROY" // 50%降级/50%碎裂（5→6/6→7 失败）
	FailDestroy   = "DESTROY"                // 直接碎裂（7→8/8→9/9→10 失败）
)

// upgradeFailures 失败惩罚查表（key=当前等级）
var upgradeFailures = map[int]string{
	2: FailDowngrade, 3: FailDowngrade, 4: FailDowngrade,
	5: FailHalfHalf, 6: FailHalfHalf,
	7: FailDestroy, 8: FailDestroy, 9: FailDestroy,
}

// CalcUpgradeRate 计算装备升级实际成功率
// 公式（PRD 5.2）：成功率 = 基础成功率 + 0.10 × 气运点数，上限100%
// 注意：气运加成使用角色 qi_yun 的原始点数（每1点+10%），与打造系统一致
func CalcUpgradeRate(currentLevel, qiYun int) float64 {
	base, ok := upgradeRates[currentLevel]
	if !ok {
		return 0
	}
	rate := base + 0.10*float64(qiYun)
	if rate > 1.0 {
		rate = 1.0
	}
	return rate
}

// ═══════════════════════════════════════════
//  打造系统（PRD 10.1 品级×品质成功率矩阵）
// ═══════════════════════════════════════════

// craftRateMatrix 打造成功率矩阵 [打造品级][产出品质] = 基础成功率
// 严格按照 PRD 10.1：
//
//	学徒：凡30%
//	匠人：凡70% 珍30%
//	巧匠：凡90% 珍60% 灵10%
//	大师：凡100% 珍80% 灵50%
//	宗师：凡100% 珍80% 灵70% 仙50%
//
// 矩阵中不存在的组合表示该品级无法打造该品质（成功率0，接口层拒绝）
var craftRateMatrix = map[int]map[int]float64{
	CraftApprentice: {QualityFan: 0.30},
	CraftCraftsman:  {QualityFan: 0.70, QualityZhen: 0.30},
	CraftArtisan:    {QualityFan: 0.90, QualityZhen: 0.60, QualityLing: 0.10},
	CraftMaster:     {QualityFan: 1.00, QualityZhen: 0.80, QualityLing: 0.50},
	CraftGrand:      {QualityFan: 1.00, QualityZhen: 0.80, QualityLing: 0.70, QualityXian: 0.50},
}

// CalcCraftRate 计算打造实际成功率（含气运加成，每1点气运+10%，上限100%）
// 第二返回值 false 表示该品级无法打造该品质
func CalcCraftRate(craftLevel, quality, qiYun int) (float64, bool) {
	row, ok := craftRateMatrix[craftLevel]
	if !ok {
		return 0, false
	}
	base, ok := row[quality]
	if !ok {
		return 0, false
	}
	rate := base + 0.10*float64(qiYun)
	if rate > 1.0 {
		rate = 1.0
	}
	return rate, true
}

// craftUpgradeRequire 打造品级升级所需的"成功打造次数"条件（PRD 10.1）
// 升级需同时满足：次数积累 + NPC拜师认证（npc_certified=1）双条件
//
//	学徒→匠人：成功打造凡品300件
//	匠人→巧匠：成功打造珍品500件
//	巧匠→大师：成功打造灵宝500件
//	大师→宗师：成功打造灵宝900件
type craftUpgradeRule struct {
	fromLevel int    // 当前品级
	field     string // 考核的成功计数字段名（craft_level 表列名）
	need      int    // 所需成功次数
}

var craftUpgradeRules = []craftUpgradeRule{
	{CraftApprentice, "success_count_fan", 300},
	{CraftCraftsman, "success_count_zhen", 500},
	{CraftArtisan, "success_count_ling", 500},
	{CraftMaster, "success_count_ling", 900},
}

// ═══════════════════════════════════════════
//  基础加成计算（PRD 第四/五章）
// ═══════════════════════════════════════════

// LevelFactor 装备等级系数：1级=×1，10级=×2，线性递增（PRD 5.1）
// 公式：系数 = 1 + (装备等级-1)/9
func LevelFactor(level int) float64 {
	if level < 1 {
		level = 1
	}
	if level > 10 {
		level = 10
	}
	return 1.0 + float64(level-1)/9.0
}

// SubWeaponTotalBase 武器总凡品基数 T(n)，n 为实际装备的副武器数量（PRD 2.1 线性插值）
//
//	n ∈ [1,5]：T(n) = 1 + (n-1)×(3-1)/(5-1)，即 1→1, 2→1.5, 3→2, 4→2.5, 5→3
//	n ∈ (5,8]：T(n) = 3 + (n-5)×(5-3)/(8-5)，即 6→3.67, 7→4.33, 8→5
//	n = 0（只穿主武器）：基数 = 1（主武器独享凡品基准1气）
//
// 权威裁决说明：PRD 2.1 表三（插值表）与 4.3 部分示例（主武器基数恒为1）存在矛盾，
// 本实现以表三+插值公式为权威：主武器与每件副武器均分 T(n)/(n+1) 份额。
// 验证：1主1副全凡品 = 2件 × T(1)/2 × 1 = 1气，与 PRD 4.3 示例一吻合。
func SubWeaponTotalBase(n int) float64 {
	switch {
	case n <= 0:
		return 1.0
	case n <= 5:
		return 1.0 + float64(n-1)*2.0/4.0
	case n <= 8:
		return 3.0 + float64(n-5)*2.0/3.0
	default:
		return 5.0 // 超过8件按上限截断（8件为特殊人物档位上限）
	}
}

// WeaponShare 单件武器的基数份额：主武器与 n 件副武器共 n+1 件均分 T(n)
func WeaponShare(subWeaponCount int) float64 {
	return SubWeaponTotalBase(subWeaponCount) / float64(subWeaponCount+1)
}

// CalcBaseBonus 计算单件装备的基础属性实际加成（PRD 5.1 公式）
// 实际加成 = 品质倍率 × 基数份额 × 等级系数
//   - 甲/首饰：份额取 equipment_instance.base_attr_share（生成时随机分配，期望均分）
//   - 武器：份额动态计算 WeaponShare(当前已穿副武器数)，传入 share 时由调用方给出
func CalcBaseBonus(multiplier, share float64, level int) float64 {
	return multiplier * share * LevelFactor(level)
}

// ═══════════════════════════════════════════
//  穿戴境界校验（PRD 第十七章）
// ═══════════════════════════════════════════

// CheckRealmRequirement 校验角色境界是否满足装备穿戴要求
//
// 规则（PRD 第十七章 + 5.1）:
//   - 品质决定所需大境界：凡/珍→人阶(1)，灵/仙→真人(2)，神话/道宝→仙(3)，先天/功德→金仙(4)
//   - 角色大境界 > 所需大境界：可穿任意等级
//   - 角色大境界 = 所需大境界：需 段位 ≥ 装备等级（段位 = stage_segment+1，取值1~10）
//   - 角色大境界 < 所需大境界：不可穿戴
func CheckRealmRequirement(majorStage, stageSegment, requiredMajorStage, equipLevel int) bool {
	if majorStage > requiredMajorStage {
		return true
	}
	if majorStage < requiredMajorStage {
		return false
	}
	// 同大境界：段位（stage_segment 0~9 对应 1~10段）需 ≥ 装备等级
	return stageSegment+1 >= equipLevel
}

// getPlayerRealm 查询角色境界（character_realm 表）
// 返回 大境界（1人阶 2真人 3仙 4金仙）和 段（stage_segment 0-9）
func (s *Service) getPlayerRealm(playerID int64) (majorStage, stageSegment int, err error) {
	err = s.db.QueryRow(
		"SELECT major_stage, stage_segment FROM character_realm WHERE character_id = ?",
		playerID,
	).Scan(&majorStage, &stageSegment)
	return
}

// ═══════════════════════════════════════════
//  气运系统（与人物/副本系统一致）
// ═══════════════════════════════════════════

// getPlayerQiYun 查询角色气运原始点数（character_attributes.qi_yun）
// 用于升级/打造/道宝合成的成功率加成：每1点气运+10%，上限100%（PRD 5.2/10.1）
// 查询失败按 0 点处理（无加成，不阻断主流程）
func (s *Service) getPlayerQiYun(playerID int64) int {
	var qiYun int
	err := s.db.QueryRow(
		"SELECT qi_yun FROM character_attributes WHERE character_id = ?",
		playerID,
	).Scan(&qiYun)
	if err != nil {
		return 0
	}
	if qiYun < 0 {
		qiYun = 0
	}
	return qiYun
}

// getPlayerLuck 查询角色气运归一化值（qi_yun/100，裁剪到 0~1.0）
// 用于掉落概率加成：最终概率 = base_rate × (1 + luck)（与副本系统口径一致）
func (s *Service) getPlayerLuck(playerID int64) float64 {
	luck := float64(s.getPlayerQiYun(playerID)) / 100.0
	if luck > 1.0 {
		luck = 1.0
	}
	return luck
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

// queryInt64 从 URL query 中读取 int64 参数，出错返回 0
func queryInt64(r *http.Request, key string) int64 {
	v, _ := strconv.ParseInt(r.URL.Query().Get(key), 10, 64)
	return v
}

// randRange 在 [min, max] 闭区间内随机取整数（min>max 时返回 min）
func randRange(min, max int) int {
	if max <= min {
		return min
	}
	return min + rand.Intn(max-min+1)
}

// randFloatRange 在 [min, max] 区间内随机取浮点数
func randFloatRange(min, max float64) float64 {
	if max <= min {
		return min
	}
	return min + rand.Float64()*(max-min)
}
