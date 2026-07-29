// Package shenwei 神位系统数据模型与枚举常量。
// 神位品级/属性系/阶位枚举与 sql/migrations/v3_shenwei_system.sql 的 shenwei_def 表严格一致。
//
// 【隔离说明】本包实现的是"花果山神位继承系统"（PRD 神位系统 V2.0），
// 与装备系统的 myth_shard/inherit_record（大道争锋PVP神位继承）是完全独立的两套体系，
// 互不引用、互不影响。
package shenwei

import "time"

// ── 品级枚举（shenwei_def.grade）──
const (
	GradeFan      = 1 // 凡品：无继承要求，直接掉落
	GradeZhen     = 2 // 珍品：门槛 200+3(Lv-1)
	GradeLing     = 3 // 灵品：门槛 500+7(Lv-1)（当前版本无具体神位，留白待后续副本产出）
	GradeXian     = 4 // 仙品：门槛 1200+15(Lv-1)（齐天大圣）
	GradeShenhua  = 5 // 神话：门槛 3000+30(Lv-1)（留白）
	GradeXiantian = 6 // 先天：门槛 7000+50(Lv-1)（留白）
)

// ── 属性系枚举（shenwei_def.attr_type）──
const (
	AttrYao = 1 // 妖属：主加精（妖属→精）
	AttrMo  = 2 // 魔属：主加气（魔属→气）
	AttrDao = 3 // 道属：主加神（道属→神）
)

// ── 阶位枚举（shenwei_def.rank_type，融合线专用）──
const (
	RankNone  = 0 // 非融合线（碎片合成/副本产出神位）
	RankBing  = 1 // 兵：副本直接掉落
	RankJiang = 2 // 将：9兵融合
	RankShuai = 3 // 帅：9将融合（当前最高阶，"9帅→灵品?"PRD留白待定）
)

// ── 合成/融合固定规则常量（PRD 2.1/3.1）──
const (
	SynthesizeNeed = 7  // 碎片合成：7碎片 → 1完整神位
	FuseNeed       = 9  // 神位融合：9个同品级同属性系 → 1个高一阶神位
	TalismanPrice  = 99 // 归元符商城单价（灵石），总切换成本 = 灵石 + 归元符数×99
)

// ── /shenwei/grant 内部发放接口 grant_type 枚举 ──
const (
	GrantFragment    = 1 // 发放神位碎片（需带 shenwei_id）
	GrantTalisman    = 2 // 发放归元符
	GrantSpiritStone = 3 // 发放灵石
	GrantFreePoint   = 4 // 发放自由属性点（写入 character_realm.unassigned_points）
	GrantShenwei     = 5 // 发放完整神位（凡品兵直接掉落用，需带 shenwei_id，PRD 表2-1）
)

// InternalKey 内部服务间调用共享密钥：dungeon-service 调用 /shenwei/grant 时
// 通过 X-Internal-Key 请求头携带。简单常量方案（同任务书要求），
// 亦允许 RemoteAddr 为 127.0.0.1 的本机回环调用直接放行。
const InternalKey = "xunxian-internal-grant-2026"

// ShenweiDef 神位定义（对应 shenwei_def 表一行）
type ShenweiDef struct {
	ID            int    `json:"id"`             // 神位ID（1-12）
	Name          string `json:"name"`           // 神位名称
	AttrType      int    `json:"attr_type"`      // 属性系：1妖 2魔 3道
	Grade         int    `json:"grade"`          // 品级：1-6
	RankType      int    `json:"rank_type"`      // 阶位：0非融合线 1兵 2将 3帅
	BonusJing     int    `json:"bonus_jing"`     // 精加成
	BonusQi       int    `json:"bonus_qi"`       // 气加成
	BonusShen     int    `json:"bonus_shen"`     // 神加成
	SkillID       int    `json:"skill_id"`       // 专属技能ID
	SkillTier     int    `json:"skill_tier"`     // 技能档位：1凡术 2灵术 3仙术 4道术
	SuperiorID    int    `json:"superior_id"`    // 上位神位ID（0=无上位）
	FuseFromID    int    `json:"fuse_from_id"`   // 融合材料神位ID（0=非融合产物）
	AcquireMethod string `json:"acquire_method"` // 获取方式 drop/fuse/fragment/future
}

// BagItem 背包神位条目（对应 char_shenwei_bag 一行 + 定义名称）
type BagItem struct {
	ShenweiID  int       `json:"shenwei_id"`  // 神位ID
	Name       string    `json:"name"`        // 神位名称
	Grade      int       `json:"grade"`       // 品级
	AttrType   int       `json:"attr_type"`   // 属性系
	Count      int       `json:"count"`       // 完整神位持有数
	Inherited  bool      `json:"inherited"`   // 是否已继承（永久解锁，可付费切换）
	ObtainedAt time.Time `json:"obtained_at"` // 首次获得时间
}

// FragmentItem 碎片条目（对应 char_shenwei_fragment 一行 + 定义名称）
type FragmentItem struct {
	ShenweiID int    `json:"shenwei_id"` // 碎片对应的目标神位ID
	Name      string `json:"name"`       // 目标神位名称
	Count     int    `json:"count"`      // 当前碎片数
	Need      int    `json:"need"`       // 合成所需数（固定7）
}

// SwitchCost 切换费用（对应 shenwei_switch_cost 一行）
type SwitchCost struct {
	Grade         int `json:"grade"`          // 品级
	SpiritStone   int `json:"spirit_stone"`   // 灵石费用
	TalismanCount int `json:"talisman_count"` // 归元符数量
}

// InheritReq 继承门槛公式参数（对应 shenwei_inherit_req 一行）
// 门槛 = BaseReq + PerLevel × (角色等级 - 1)
type InheritReq struct {
	Grade    int // 品级
	BaseReq  int // Lv1 基础门槛
	PerLevel int // 每级增量
}
