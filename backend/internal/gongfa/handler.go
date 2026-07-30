// Package gongfa HTTP 接口层：11个功法·技能·经验系统接口。
// 统一响应格式 APIResponse{code,msg,data}，与 character/shenwei 包完全一致。
// 全部接口走 X-Account-ID 归属校验（401未认证/404角色不存在/403非本人）。
// 路由清单（character-service :8005 注册）：
//
//	POST /gongfa/learn           学习功法（完整优先/9碎片自动合成）
//	POST /gongfa/forget          遗忘功法（按品级扣灵石+孟遗汤）
//	GET  /gongfa/list            功法总览（定义+背包+已学+走火+打坐状态）
//	POST /gongfa/meditate/start  开始打坐
//	POST /gongfa/meditate/settle 打坐结算（完整10分钟单位发XP）
//	POST /gongfa/meditate/end    结束打坐（最后结算+状态归零）
//	POST /gongfa/exp/kill        杀怪经验入账（文档公式，三属性同额）
//	POST /skill/learn            技能碎片合成学习（9碎片→1完整）
//	POST /skill/forget           遗忘技能（扣费+完整-1+卸栏）
//	GET  /skill/list             技能总览（定义+背包+装配栏+修数）
//	POST /skill/slot/set         技能装配/卸下（skill_id=0卸下）
package gongfa

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// APIResponse 统一响应结构（与 character/shenwei 包同构：code=0 成功）
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
// 校验规则（与 character/shenwei 包完全一致）：
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
//  POST /gongfa/learn  学习功法
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "gongfa_id":4}
// 功法不足 5001；已学习 5002；等级不足 5004；精气神不足 5005
// 触发走火入魔时学习依然成功，data.zouhuo=true（PRD 2.5 不阻断）
func (s *Service) HandleLearn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		GongfaID    int   `json:"gongfa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.GongfaID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 gongfa_id"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.Learn(req.CharacterID, req.GongfaID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "学习成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /gongfa/forget  遗忘功法
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "gongfa_id":4}
// 未学习 5003；灵石不足 5010；孟遗汤不足 5011（凡法免费）
func (s *Service) HandleForget(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		GongfaID    int   `json:"gongfa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.GongfaID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 gongfa_id"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.Forget(req.CharacterID, req.GongfaID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "遗忘成功", Data: data})
}

// ═══════════════════════════════════════════
//  GET /gongfa/list?character_id=  功法总览
// ═══════════════════════════════════════════
func (s *Service) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持GET"})
		return
	}
	charID, err := strconv.ParseInt(r.URL.Query().Get("character_id"), 10, 64)
	if err != nil || charID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必须为正整数"})
		return
	}
	if !s.assertCharacterOwner(w, r, charID) {
		return
	}

	data, err := s.List(charID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "查询成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /gongfa/meditate/start  开始打坐
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 无已学功法 5033；已在打坐 5030；今日上限 5032
func (s *Service) HandleMeditateStart(w http.ResponseWriter, r *http.Request) {
	charID, ok := s.parseMeditateReq(w, r)
	if !ok {
		return
	}
	data, err := s.MeditateStart(charID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "开始打坐", Data: data})
}

// ═══════════════════════════════════════════
//  POST /gongfa/meditate/settle  打坐结算
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 未在打坐 5031；不满10分钟单位 units=0 xp=0（不算错误）
func (s *Service) HandleMeditateSettle(w http.ResponseWriter, r *http.Request) {
	charID, ok := s.parseMeditateReq(w, r)
	if !ok {
		return
	}
	data, err := s.MeditateSettle(charID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "结算成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /gongfa/meditate/end  结束打坐
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 未在打坐 5031；结束前自动做最后一次结算
func (s *Service) HandleMeditateEnd(w http.ResponseWriter, r *http.Request) {
	charID, ok := s.parseMeditateReq(w, r)
	if !ok {
		return
	}
	data, err := s.MeditateEnd(charID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "已结束打坐", Data: data})
}

// parseMeditateReq 打坐三接口共用的参数解析+归属校验（只需 character_id）
func (s *Service) parseMeditateReq(w http.ResponseWriter, r *http.Request) (int64, bool) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return 0, false
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id"})
		return 0, false
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return 0, false
	}
	return req.CharacterID, true
}

// ═══════════════════════════════════════════
//  POST /gongfa/exp/kill  杀怪经验入账
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "monster_stage":1, "monster_type":1,
//
//	"monster_level":10, "damage_ratio":1.0}
//
// damage_ratio 组队伤害占比，不传按1.0（单人独享）
func (s *Service) HandleKillExp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID  int64   `json:"character_id"`
		MonsterStage int     `json:"monster_stage"`
		MonsterType  int     `json:"monster_type"`
		MonsterLevel int     `json:"monster_level"`
		DamageRatio  float64 `json:"damage_ratio"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 ||
		req.MonsterStage <= 0 || req.MonsterType <= 0 || req.MonsterLevel <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id/monster_stage/monster_type/monster_level"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.KillExp(req.CharacterID, req.MonsterStage, req.MonsterType, req.MonsterLevel, req.DamageRatio)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "经验入账成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /skill/learn  技能碎片合成学习（9碎片→1完整）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "skill_id":21}
// 碎片不足 5020；等级不足 5004；精气神不足 5005；走火同功法不阻断
func (s *Service) HandleSkillLearn(w http.ResponseWriter, r *http.Request) {
	charID, skillID, ok := s.parseSkillReq(w, r)
	if !ok {
		return
	}
	data, err := s.SkillLearn(charID, skillID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "学习成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /skill/forget  遗忘技能
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "skill_id":21}
// 未持有 5021；灵石不足 5010；孟遗汤不足 5011
func (s *Service) HandleSkillForget(w http.ResponseWriter, r *http.Request) {
	charID, skillID, ok := s.parseSkillReq(w, r)
	if !ok {
		return
	}
	data, err := s.SkillForget(charID, skillID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "遗忘成功", Data: data})
}

// parseSkillReq 技能学习/遗忘共用的参数解析+归属校验
func (s *Service) parseSkillReq(w http.ResponseWriter, r *http.Request) (int64, int, bool) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return 0, 0, false
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		SkillID     int   `json:"skill_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 || req.SkillID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id 和 skill_id"})
		return 0, 0, false
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return 0, 0, false
	}
	return req.CharacterID, req.SkillID, true
}

// ═══════════════════════════════════════════
//  GET /skill/list?character_id=  技能总览
// ═══════════════════════════════════════════
func (s *Service) HandleSkillList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持GET"})
		return
	}
	charID, err := strconv.ParseInt(r.URL.Query().Get("character_id"), 10, 64)
	if err != nil || charID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必须为正整数"})
		return
	}
	if !s.assertCharacterOwner(w, r, charID) {
		return
	}

	data, err := s.SkillList(charID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "查询成功", Data: data})
}

// ═══════════════════════════════════════════
//  POST /skill/slot/set  技能装配/卸下
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "slot_type":1, "slot_index":3, "skill_id":7}
// skill_id=0 表示卸下该栏位；
// 栏位非法 5022；类型不匹配 5023；修数不足 5024；未持有 5021；重复装配 5025
func (s *Service) HandleSlotSet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持POST"})
		return
	}
	var req struct {
		CharacterID int64 `json:"character_id"`
		SlotType    int   `json:"slot_type"`
		SlotIndex   int   `json:"slot_index"`
		SkillID     int   `json:"skill_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 ||
		req.SlotType <= 0 || req.SlotIndex <= 0 || req.SkillID < 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 character_id/slot_type/slot_index/skill_id(0=卸下)"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	data, err := s.SlotSet(req.CharacterID, req.SlotType, req.SlotIndex, req.SkillID)
	if err != nil {
		writeBizErr(w, err)
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "操作成功", Data: data})
}
