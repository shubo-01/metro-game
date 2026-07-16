package auth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// Service 认证服务
type Service struct {
	db  *sql.DB
	rdb *redis.Client
	cfg *config.Config
}

func NewService(db *sql.DB, rdb *redis.Client, cfg *config.Config) *Service {
	return &Service{db: db, rdb: rdb, cfg: cfg}
}

// ═══════════════════════════════════════════
//  数据模型
// ═══════════════════════════════════════════

type Account struct {
	ID           int64
	Phone        string
	PasswordHash *string
	Status       int
	CreatedAt    time.Time
}

type PlatformBinding struct {
	ID        int64
	AccountID int64
	Platform  string
	OpenID    string
	UnionID   *string
}

type Player struct {
	ID         int64
	AccountID  int64
	Name       string
	Gender     int
	LevelStage int
	LevelTier  int
	LevelStep  int
	SceneID    int
	PosX       float32
	PosY       float32
}

// ═══════════════════════════════════════════
//  API 响应结构
// ═══════════════════════════════════════════

type APIResponse struct {
	Code    int         `json:"code"`
	Msg     string      `json:"msg"`
	Data    interface{} `json:"data,omitempty"`
}

type LoginResult struct {
	Token         string       `json:"token"`
	RefreshToken  string       `json:"refreshToken"`
	NeedBindPhone bool         `json:"needBindPhone,omitempty"`
	OpenID        string       `json:"openid,omitempty"`
	HasCharacter  bool         `json:"hasCharacter"`
	NeedConfirm   bool         `json:"needConfirm,omitempty"`
	PlayerInfo    *PlayerBrief `json:"playerInfo,omitempty"`
}

type PlayerBrief struct {
	PlayerID   int64   `json:"playerId"`
	Name       string  `json:"name"`
	Gender     int     `json:"gender"`
	LevelStage int     `json:"levelStage"`
	LevelTier  int     `json:"levelTier"`
	LevelStep  int     `json:"levelStep"`
	SceneID    int     `json:"sceneId"`
	PosX       float32 `json:"posX"`
	PosY       float32 `json:"posY"`
}

// ═══════════════════════════════════════════
//  微信登录 POST /auth/wx-login
// ═══════════════════════════════════════════

func (s *Service) HandleWxLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		Code     string `json:"code"`
		DeviceID string `json:"device_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 1. code2Session → 获取 openid
	openid, sessionKey, err := s.wxCode2Session(req.Code)
	if err != nil {
		log.Printf("[auth] wx code2Session 失败: %v", err)
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "微信授权失败"})
		return
	}
	_ = sessionKey // sessionKey 存 Redis，后续解密手机号用

	// 2. 查 platform_bindings
	binding := s.findBinding("wechat", openid)
	if binding == nil {
		// 未绑定 → 需要绑定手机号
		writeJSON(w, 200, APIResponse{
			Code: 0,
			Data: LoginResult{NeedBindPhone: true, OpenID: openid},
		})
		return
	}

	// 3. 已绑定 → 签发 Token
	result, err := s.buildLoginResult(binding.AccountID, "wechat", req.DeviceID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: err.Error()})
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Data: result})
}

// ═══════════════════════════════════════════
//  抖音登录 POST /auth/tt-login
// ═══════════════════════════════════════════

func (s *Service) HandleTtLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		Code     string `json:"code"`
		DeviceID string `json:"device_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 抖音 code2Session（接口类似微信）
	openid, _, err := s.ttCode2Session(req.Code)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "抖音授权失败"})
		return
	}

	binding := s.findBinding("douyin", openid)
	if binding == nil {
		writeJSON(w, 200, APIResponse{
			Code: 0,
			Data: LoginResult{NeedBindPhone: true, OpenID: openid},
		})
		return
	}

	result, err := s.buildLoginResult(binding.AccountID, "douyin", req.DeviceID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: err.Error()})
		return
	}

	// 检查是否需要跨平台关联确认
	needConfirm := s.checkCrossPlatform(binding.AccountID, "douyin")
	result.NeedConfirm = needConfirm

	writeJSON(w, 200, APIResponse{Code: 0, Data: result})
}

// ═══════════════════════════════════════════
//  手机号登录 POST /auth/phone-login
// ═══════════════════════════════════════════

func (s *Service) HandlePhoneLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		DeviceID string `json:"device_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 校验验证码
	if !s.verifyCode(req.Phone, req.Code, "login") {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "验证码错误或已过期"})
		return
	}

	// 查账号
	account := s.findAccountByPhone(req.Phone)
	if account == nil {
		// 新建账号
		var err error
		account, err = s.createAccount(req.Phone)
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建账号失败"})
			return
		}
	}

	result, err := s.buildLoginResult(account.ID, "app", req.DeviceID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: err.Error()})
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Data: result})
}

// ═══════════════════════════════════════════
//  发送验证码 POST /auth/send-code
// ═══════════════════════════════════════════

func (s *Service) HandleSendCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		Phone   string `json:"phone"`
		Purpose string `json:"purpose"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 限流：同手机号60s内只能发一次
	key := fmt.Sprintf("sms:limit:%s", req.Phone)
	exists, _ := s.rdb.Exists(key)
	if exists {
		writeJSON(w, 429, APIResponse{Code: 429, Msg: "发送过于频繁，请60秒后重试"})
		return
	}

	// 生成6位验证码
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// 写入数据库
	_, err := s.db.Exec(
		"INSERT INTO game_session.sms_codes (phone, code, purpose, expires_at) VALUES (?, ?, ?, ?)",
		req.Phone, code, req.Purpose, time.Now().Add(5*time.Minute),
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}

	// Redis 限流标记
	s.rdb.Set(key, "1", 60*time.Second)

	// 调用阿里云 SMS API（异步，此处简化为日志）
	log.Printf("[SMS] 发送验证码 %s -> %s", code, req.Phone)
	// TODO: 实际调用阿里云SMS

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "发送成功", Data: map[string]bool{"success": true}})
}

// ═══════════════════════════════════════════
//  绑定手机号 POST /auth/bind-phone
// ═══════════════════════════════════════════

func (s *Service) HandleBindPhone(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		OpenID   string `json:"openid"`
		Platform string `json:"platform"`
		Phone    string `json:"phone"`
		Code     string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 校验验证码
	if !s.verifyCode(req.Phone, req.Code, "bind") {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "验证码错误或已过期"})
		return
	}

	// 查账号或新建
	account := s.findAccountByPhone(req.Phone)
	needConfirm := false
	if account == nil {
		var err error
		account, err = s.createAccount(req.Phone)
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建账号失败"})
			return
		}
	} else {
		// 已有账号 → 跨平台关联
		needConfirm = s.checkCrossPlatform(account.ID, req.Platform)
	}

	// 写入 platform_bindings
	_, err := s.db.Exec(
		"INSERT IGNORE INTO game_main.platform_bindings (account_id, platform, openid) VALUES (?, ?, ?)",
		account.ID, req.Platform, req.OpenID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "绑定失败"})
		return
	}

	result, err := s.buildLoginResult(account.ID, req.Platform, "")
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: err.Error()})
		return
	}
	result.NeedConfirm = needConfirm
	writeJSON(w, 200, APIResponse{Code: 0, Data: result})
}

// ═══════════════════════════════════════════
//  确认关联 POST /auth/confirm-bind
// ═══════════════════════════════════════════

func (s *Service) HandleConfirmBind(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		OpenID   string `json:"openid"`
		Platform string `json:"platform"`
		Phone    string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	account := s.findAccountByPhone(req.Phone)
	if account == nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "账号不存在"})
		return
	}

	_, err := s.db.Exec(
		"INSERT IGNORE INTO game_main.platform_bindings (account_id, platform, openid) VALUES (?, ?, ?)",
		account.ID, req.Platform, req.OpenID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "关联失败"})
		return
	}

	result, err := s.buildLoginResult(account.ID, req.Platform, "")
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: err.Error()})
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Data: result})
}

// ═══════════════════════════════════════════
//  Token 刷新 POST /auth/refresh-token
// ═══════════════════════════════════════════

func (s *Service) HandleRefreshToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 从 Redis 查 refresh token
	key := fmt.Sprintf("refresh:%s", req.RefreshToken)
	accountIDStr, err := s.rdb.Get(key)
	if err != nil {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "RefreshToken无效或已过期"})
		return
	}

	var accountID int64
	fmt.Sscanf(accountIDStr, "%d", &accountID)

	// 签发新 Token
	newToken := s.generateToken(accountID)
	newRefresh := uuid.New().String()

	s.rdb.Set(fmt.Sprintf("token:%s", newToken), fmt.Sprintf("%d", accountID),
		time.Duration(s.cfg.JWT.AccessExpires)*time.Hour)
	s.rdb.Set(fmt.Sprintf("refresh:%s", newRefresh), fmt.Sprintf("%d", accountID),
		time.Duration(s.cfg.JWT.RefreshExpires)*24*time.Hour)

	// 删除旧 refresh token
	s.rdb.Del(key)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]string{"token": newToken, "refreshToken": newRefresh},
	})
}

// ═══════════════════════════════════════════
//  Token 校验 GET /auth/check
// ═══════════════════════════════════════════

func (s *Service) HandleCheckToken(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if len(token) > 7 {
		token = token[7:] // 去掉 "Bearer "
	}
	if token == "" {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未提供Token"})
		return
	}

	// 从 Redis 查 Token
	key := fmt.Sprintf("token:%s", token)
	accountIDStr, err := s.rdb.Get(key)
	if err != nil {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "Token无效或已过期"})
		return
	}

	var accountID int64
	fmt.Sscanf(accountIDStr, "%d", &accountID)

	// 查是否有角色
	player := s.findPlayerByAccount(accountID)
	result := map[string]interface{}{
		"hasCharacter": player != nil,
	}
	if player != nil {
		result["playerInfo"] = &PlayerBrief{
			PlayerID: player.ID, Name: player.Name, Gender: player.Gender,
			LevelStage: player.LevelStage, LevelTier: player.LevelTier,
			LevelStep: player.LevelStep, SceneID: player.SceneID,
			PosX: player.PosX, PosY: player.PosY,
		}
	}
	writeJSON(w, 200, APIResponse{Code: 0, Data: result})
}

// ═══════════════════════════════════════════
//  内部方法
// ═══════════════════════════════════════════

func (s *Service) wxCode2Session(code string) (openid, sessionKey string, err error) {
	// 调用微信 code2Session API
	url := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		s.cfg.Wechat.AppID, s.cfg.Wechat.AppSecret, code,
	)
	resp, err := http.Get(url)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var result struct {
		OpenID     string `json:"openid"`
		SessionKey string `json:"session_key"`
		ErrCode    int    `json:"errcode"`
		ErrMsg     string `json:"errmsg"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if result.ErrCode != 0 {
		return "", "", fmt.Errorf("wx error: %s", result.ErrMsg)
	}
	return result.OpenID, result.SessionKey, nil
}

func (s *Service) ttCode2Session(code string) (openid, sessionKey string, err error) {
	// 抖音 code2Session（类似微信，URL不同）
	// TODO: 实际调用抖音API
	return "tt_" + code, "", nil
}

func (s *Service) findBinding(platform, openid string) *PlatformBinding {
	row := s.db.QueryRow(
		"SELECT id, account_id, platform, openid FROM game_main.platform_bindings WHERE platform=? AND openid=?",
		platform, openid,
	)
	b := &PlatformBinding{}
	if err := row.Scan(&b.ID, &b.AccountID, &b.Platform, &b.OpenID); err != nil {
		return nil
	}
	return b
}

func (s *Service) findAccountByPhone(phone string) *Account {
	row := s.db.QueryRow(
		"SELECT id, phone, status, created_at FROM game_main.accounts WHERE phone=?",
		phone,
	)
	a := &Account{}
	if err := row.Scan(&a.ID, &a.Phone, &a.Status, &a.CreatedAt); err != nil {
		return nil
	}
	return a
}

func (s *Service) createAccount(phone string) (*Account, error) {
	result, err := s.db.Exec("INSERT INTO game_main.accounts (phone) VALUES (?)", phone)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	return &Account{ID: id, Phone: phone, Status: 1}, nil
}

func (s *Service) findPlayerByAccount(accountID int64) *Player {
	row := s.db.QueryRow(
		"SELECT id, account_id, name, gender, level_stage, level_tier, level_step, scene_id, pos_x, pos_y FROM game_main.players WHERE account_id=?",
		accountID,
	)
	p := &Player{}
	if err := row.Scan(&p.ID, &p.AccountID, &p.Name, &p.Gender,
		&p.LevelStage, &p.LevelTier, &p.LevelStep, &p.SceneID, &p.PosX, &p.PosY); err != nil {
		return nil
	}
	return p
}

func (s *Service) verifyCode(phone, code, purpose string) bool {
	row := s.db.QueryRow(
		"SELECT id FROM game_session.sms_codes WHERE phone=? AND code=? AND purpose=? AND status=0 AND expires_at > NOW()",
		phone, code, purpose,
	)
	var id int64
	if err := row.Scan(&id); err != nil {
		return false
	}
	// 标记为已使用
	s.db.Exec("UPDATE game_session.sms_codes SET status=1 WHERE id=?", id)
	return true
}

func (s *Service) checkCrossPlatform(accountID int64, platform string) bool {
	row := s.db.QueryRow(
		"SELECT COUNT(*) FROM game_main.platform_bindings WHERE account_id=? AND platform!=?",
		accountID, platform,
	)
	var count int
	row.Scan(&count)
	return count > 0
}

func (s *Service) generateToken(accountID int64) string {
	claims := jwt.MapClaims{
		"account_id": accountID,
		"exp":        time.Now().Add(time.Duration(s.cfg.JWT.AccessExpires) * time.Hour).Unix(),
		"iat":        time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(s.cfg.JWT.Secret))
	return tokenStr
}

func (s *Service) buildLoginResult(accountID int64, platform, deviceID string) (*LoginResult, error) {
	token := s.generateToken(accountID)
	refreshToken := uuid.New().String()

	// 存 Redis
	s.rdb.Set(fmt.Sprintf("token:%s", token), fmt.Sprintf("%d", accountID),
		time.Duration(s.cfg.JWT.AccessExpires)*time.Hour)
	s.rdb.Set(fmt.Sprintf("refresh:%s", refreshToken), fmt.Sprintf("%d", accountID),
		time.Duration(s.cfg.JWT.RefreshExpires)*24*time.Hour)

	// 单点登录检查
	s.kickOldSession(accountID, token)

	result := &LoginResult{
		Token:        token,
		RefreshToken: refreshToken,
	}

	// 查角色
	player := s.findPlayerByAccount(accountID)
	if player != nil {
		result.HasCharacter = true
		result.PlayerInfo = &PlayerBrief{
			PlayerID: player.ID, Name: player.Name, Gender: player.Gender,
			LevelStage: player.LevelStage, LevelTier: player.LevelTier,
			LevelStep: player.LevelStep, SceneID: player.SceneID,
			PosX: player.PosX, PosY: player.PosY,
		}
	}
	return result, nil
}

func (s *Service) kickOldSession(accountID int64, newSessionID string) {
	key := fmt.Sprintf("online:%d", accountID)
	oldSession, _ := s.rdb.Get(key)
	if oldSession != "" && oldSession != newSessionID {
		// 向旧会话发踢下线标记
		s.rdb.Set(fmt.Sprintf("kick:%s", oldSession), "账号在其他设备登录", 30*time.Second)
	}
	s.rdb.Set(key, newSessionID, 2*time.Hour)
}

// ═══════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
