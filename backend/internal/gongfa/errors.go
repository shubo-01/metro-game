// Package gongfa 功法·技能·经验系统错误码定义。
// 与《功法技能经验系统技术方案》对齐的业务错误码，全部带中文提示，
// 由 handler 层直接透传给前端（HTTP 状态码统一 200，业务码区分）。
// 错误码段：功法/技能/经验系统专用 5xxx 段（5001 起），
// 与神位系统 4xxx 段、通用 400/401/403/404/500 均不冲突。
package gongfa

// 业务错误码常量（功法技能经验系统专用 5xxx 段）
const (
	CodeOK = 0 // 成功

	// ── 功法学习/遗忘（50x）──
	CodeGongfaNotEnough = 5001 // 功法不足：无完整功法且碎片不足9个
	CodeAlreadyLearned  = 5002 // 已学习过该功法（不能重复学习）
	CodeNotLearned      = 5003 // 未学习该功法（无法遗忘）
	CodeLevelNotEnough  = 5004 // 等级不足：未达到功法/技能的境界等级要求
	CodeAttrNotEnough   = 5005 // 精气神不足：裸值总和未达学习要求

	// ── 扣费（501x）──
	CodeSpiritStoneNotEnough = 5010 // 灵石不足：遗忘费用不够
	CodeMengyiSoupNotEnough  = 5011 // 孟遗汤不足：遗忘所需道具不够

	// ── 技能（502x）──
	CodeSkillFragmentNotEnough = 5020 // 技能碎片不足：合成需要9个碎片
	CodeSkillNotOwned          = 5021 // 未持有该技能（背包中无完整技能）
	CodeSlotInvalid            = 5022 // 技能栏位非法：主动栏1-10/被动栏1-4之外
	CodeSkillNotEquippable     = 5023 // 该技能不可装配：普攻/神位技不占栏，或类型与栏位不匹配
	CodeXiuNotEnough           = 5024 // 修数不足：五行技按修炼五行数量解锁（灵术2修/仙术3修/道术5修）
	CodeSkillAlreadyEquipped   = 5025 // 该技能已装配在其他栏位（同一技能不能重复占栏）

	// ── 打坐（503x）──
	CodeAlreadyMeditating = 5030 // 已在打坐中（不能重复开始）
	CodeNotMeditating     = 5031 // 当前未在打坐（无法结算/结束）
	CodeMeditateDailyCap  = 5032 // 今日打坐已达上限（每日4小时）
	CodeNoLearnedGongfa   = 5033 // 未学习任何功法（无法打坐修炼）
)

// BizError 业务错误：携带错误码与中文提示，service 层返回、handler 层输出
// （与 shenwei 包同模式，各包独立定义避免跨包耦合）
type BizError struct {
	Code int    // 业务错误码
	Msg  string // 中文错误提示
}

// Error 实现 error 接口
func (e *BizError) Error() string { return e.Msg }

// 预定义业务错误实例（Msg 为默认文案，个别场景会补充上下文后再返回）
var (
	ErrGongfaNotEnough = &BizError{Code: CodeGongfaNotEnough, Msg: "功法不足：没有完整功法，且碎片不足9个无法合成"}
	ErrAlreadyLearned  = &BizError{Code: CodeAlreadyLearned, Msg: "已学习过该功法，不能重复学习"}
	ErrNotLearned      = &BizError{Code: CodeNotLearned, Msg: "尚未学习该功法，无法遗忘"}
	ErrLevelNotEnough  = &BizError{Code: CodeLevelNotEnough, Msg: "境界等级不足，未达到该功法的学习要求"}
	ErrAttrNotEnough   = &BizError{Code: CodeAttrNotEnough, Msg: "精气神总和不足，未达到该功法的学习要求"}

	ErrSpiritStoneNotEnough = &BizError{Code: CodeSpiritStoneNotEnough, Msg: "灵石不足，无法支付遗忘费用"}
	ErrMengyiSoupNotEnough  = &BizError{Code: CodeMengyiSoupNotEnough, Msg: "孟遗汤不足，无法遗忘"}

	ErrSkillFragmentNotEnough = &BizError{Code: CodeSkillFragmentNotEnough, Msg: "技能碎片不足，合成需要9个碎片"}
	ErrSkillNotOwned          = &BizError{Code: CodeSkillNotOwned, Msg: "未持有该技能，无法操作"}
	ErrSlotInvalid            = &BizError{Code: CodeSlotInvalid, Msg: "技能栏位非法：主动栏1-10，被动栏1-4"}
	ErrSkillNotEquippable     = &BizError{Code: CodeSkillNotEquippable, Msg: "该技能不可装配到此栏位"}
	ErrXiuNotEnough           = &BizError{Code: CodeXiuNotEnough, Msg: "修炼五行数量不足，无法使用该五行技"}
	ErrSkillAlreadyEquipped   = &BizError{Code: CodeSkillAlreadyEquipped, Msg: "该技能已装配在其他栏位"}

	ErrAlreadyMeditating = &BizError{Code: CodeAlreadyMeditating, Msg: "已在打坐中，请先结束当前打坐"}
	ErrNotMeditating     = &BizError{Code: CodeNotMeditating, Msg: "当前未在打坐"}
	ErrMeditateDailyCap  = &BizError{Code: CodeMeditateDailyCap, Msg: "今日打坐已达4小时上限，明天再来吧"}
	ErrNoLearnedGongfa   = &BizError{Code: CodeNoLearnedGongfa, Msg: "尚未学习任何功法，无法打坐修炼"}
)
