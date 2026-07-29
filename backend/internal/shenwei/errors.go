// Package shenwei 神位系统错误码定义。
// 与任务书/技术方案对齐的业务错误码，全部带中文提示，
// 由 handler 层直接透传给前端（HTTP 状态码统一 200，业务码区分）。
package shenwei

// 业务错误码常量（神位系统专用 4xxx 段）
const (
	CodeOK                   = 0    // 成功
	CodeFragmentNotEnough    = 4001 // 碎片不足：合成需要7个同种碎片
	CodeFuseNotEnough        = 4002 // 融合材料数量不足：融合需要9个同品级同属性系完整神位
	CodeFuseTopRank          = 4003 // 已是最高阶：帅级(及碎片线神位)没有更高阶融合产物
	CodeAttrNotEnough        = 4010 // 精气神属性不足：裸体精气神总和未达继承门槛
	CodeNeedSubordinate      = 4012 // 需先继承下属神位：如继承齐天大圣前必须先继承美猴王
	CodeSpiritStoneNotEnough = 4020 // 灵石不足：切换神位的灵石费用不够
	CodeTalismanNotEnough    = 4021 // 归元符不足：切换神位的归元符数量不够
)

// BizError 业务错误：携带错误码与中文提示，service 层返回、handler 层输出
type BizError struct {
	Code int    // 业务错误码
	Msg  string // 中文错误提示
}

// Error 实现 error 接口
func (e *BizError) Error() string { return e.Msg }

// 预定义业务错误实例（Msg 为默认文案，个别场景会补充上下文后再返回）
var (
	ErrFragmentNotEnough    = &BizError{Code: CodeFragmentNotEnough, Msg: "神位碎片不足，合成需要7个碎片"}
	ErrFuseNotEnough        = &BizError{Code: CodeFuseNotEnough, Msg: "融合材料不足，需要9个同品级同属性系的完整神位"}
	ErrFuseTopRank          = &BizError{Code: CodeFuseTopRank, Msg: "该神位已是最高阶，无法继续融合"}
	ErrAttrNotEnough        = &BizError{Code: CodeAttrNotEnough, Msg: "精气神属性不足，未达到该品级神位的继承门槛"}
	ErrNeedSubordinate      = &BizError{Code: CodeNeedSubordinate, Msg: "需先继承下属神位，才能继承该上位神位"}
	ErrSpiritStoneNotEnough = &BizError{Code: CodeSpiritStoneNotEnough, Msg: "灵石不足，无法支付神位切换费用"}
	ErrTalismanNotEnough    = &BizError{Code: CodeTalismanNotEnough, Msg: "归元符不足，无法支付神位切换费用"}
)
