// Package shenwei HTTP 接口层：6个神位系统接口。
// 统一响应格式 APIResponse{code,msg,data}，与 character 包完全一致。
// 除 /shenwei/grant（内部发放，X-Internal-Key/本机回环放行）外，
// 其余接口全部走 X-Account-ID 归属校验（401未认证/404角色不存在/403非本人）。
package shenwei

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// APIResponse 统一响应结构（与 character 包同构：code=0 成功，非0为业务/系统错误码）
type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

// writeJSON 统一 JSON 输出
func writeJSON(w http.ResponseWriter, status int, resp APIResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// writeBizErr 统一错误输出：业务错误(*BizError)透传 code+中文msg（HTTP 200），
// 其他错误按系统错误 500 处理（不向前端暴露内部细节）
func writeBizErr(w http.ResponseWriter, err error) {
	if be, ok := err.(*BizError); ok {
		writeJSON(w, 200, APIResponse{Code: be.Code, Msg: be.Msg})
		return
	}
	writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误，请稍后重试"})
}

// getAccountID 从请求头 X-Account-ID 读取账号ID（网关注入，与 character 包同约定）
func getAccountID(r *http.Request) int64 {
	v := r.Header.Get("X-Account-ID")
	if v == "" {
		return 0
	}
	var id int64
	fmt.Sscanf(v, "%d", &id)
	return id
}

// assertCharacterOwner 校验"当前请求的账号"是否是指定角色的主人（防越权核心）。
// 校验规则（与 character 包 assertCharacterOwner 完全一致）：
//   - 请求头没带账号（未登录/未认证）→ 401 未认证
//   - 角色在 character_base 里查不到 → 404 角色不存在
//   - 角色的 account_id 与请求账号不一致 → 403 无权操作
//
// 返回值：true=校验通过可以继续；false=校验失败，本函数已写好错误响应，调用方直接 return。
func (s *Service) assertCharacterOwner(w http.ResponseWriter, r *http.Request, characterID int64) bool {
	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未认证"})
		return false
	}
	var ownerID int64
	err := s.db.QueryRow("SELECT account_id FROM character_base WHERE character_id=?", characterID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return false
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询角色归属失败"})
		return false
	}
	if ownerID != accountID {
		writeJSON(w, 403, APIResponse{Code: 403, Msg: "无权操作他人角色"})
		return false
	}
	return true
}

// ═══════════════════════════════════════════
//  GET /shenwei/info?character_id=  神位总览
// ═══════════════════════════════════════════
//
// 返回：当前激活神位 + 背包列表 + 碎片列表 + 归元符数 + 灵石余额
func (s *Service) HandleInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持GET"})
		return
	}
	charID, err := strconv.ParseInt(r.URL.Query().Get("character_id"), 10, 64)
	if err != nil || charID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必须为正整数"})
		return
	}
	// 归属校验：只能查自己角色的神位信息
	if !s.assertCharacterOwner(w, r, charID) {
		return
	}

	data, err := s.Info(charID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "查询成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /shenwei/synthesize  碎片合成（7碎片 → 1完整神位）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "shenwei_id":10}
// 碎片不足返回业务码 4001
func (s *Service) HandleSynthesize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		ShenweiID   int   `json:"shenwei_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.ShenweiID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 shenwei_id"})
		return
	}
	// 归属校验：只能用自己角色的碎片合成
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.Synthesize(req.CharacterID, req.ShenweiID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "合成成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /shenwei/fuse  神位融合（9同品级同属性系 → 1高一阶）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "shenwei_id":1}（shenwei_id 为材料神位，如 9妖兵→1妖将）
// 材料不足 4002；已是最高阶（帅/碎片线）4003
func (s *Service) HandleFuse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		ShenweiID   int   `json:"shenwei_id"`          // 材料神位ID
		MaterialID  int   `json:"material_shenwei_id"` // 别名参数，与技术方案接口文档兼容
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 shenwei_id"})
		return
	}
	// 两个参数名等价，shenwei_id 优先；都没传报参数错误
	materialID := req.ShenweiID
	if materialID <= 0 {
		materialID = req.MaterialID
	}
	if materialID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要材料神位 shenwei_id"})
		return
	}
	// 归属校验：只能融合自己角色背包里的神位
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.Fuse(req.CharacterID, materialID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "融合成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /shenwei/inherit  神位继承（消耗1完整神位，永久解锁+立即激活）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "shenwei_id":10}
// 裸体精气神未达门槛 4010；有下属且下属未继承 4012
func (s *Service) HandleInherit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		ShenweiID   int   `json:"shenwei_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.ShenweiID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 shenwei_id"})
		return
	}
	// 归属校验：只能继承到自己的角色上
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.Inherit(req.CharacterID, req.ShenweiID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "继承成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /shenwei/switch  神位切换（已继承神位间付费切换，晋升免费）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "shenwei_id":12}
// 灵石不足 4020；归元符不足 4021；目标在上位链上则免费晋升
func (s *Service) HandleSwitch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		ShenweiID   int   `json:"shenwei_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.ShenweiID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 shenwei_id"})
		return
	}
	// 归属校验：只能切换自己角色的神位
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.Switch(req.CharacterID, req.ShenweiID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "切换成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /shenwei/grant  内部发放（仅信任本机/共享密钥）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "grant_type":1, "shenwei_id":10, "count":2}
// grant_type：1碎片 / 2归元符 / 3灵石 / 4自由属性点 / 5完整神位
// 供 dungeon-service 副本结算掉落回调，不做玩家归属校验，
// 但必须通过内部信任校验：X-Internal-Key 共享密钥 或 RemoteAddr 本机回环。
func (s *Service) HandleGrant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	// 内部信任校验：密钥匹配 或 请求来自本机回环地址（127.0.0.1 / [::1]）
	if !isInternalTrusted(r) {
		writeJSON(w, 403, APIResponse{Code: 403, Msg: "内部接口，禁止外部调用"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		GrantType   int   `json:"grant_type"`
		ShenweiID   int   `json:"shenwei_id"` // 仅 grant_type=1碎片/5完整神位 需要
		Count       int   `json:"count"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.GrantType <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 grant_type"})
		return
	}

	data, err := s.Grant(req.CharacterID, req.GrantType, req.ShenweiID, req.Count)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "发放成功", Data: data})
}

// isInternalTrusted 内部调用信任判定：
//  1. 请求头 X-Internal-Key 等于共享密钥常量 → 放行（跨机部署用）；
//  2. RemoteAddr 为本机回环（127.0.0.1 或 IPv6 ::1）→ 放行（同机微服务用）。
func isInternalTrusted(r *http.Request) bool {
	if r.Header.Get("X-Internal-Key") == InternalKey {
		return true
	}
	// RemoteAddr 形如 "127.0.0.1:54321" 或 "[::1]:54321"，取 host 部分判断
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	host = strings.Trim(host, "[]")
	return host == "127.0.0.1" || host == "::1"
}
