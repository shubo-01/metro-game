package player

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"unicode/utf8"

	"xunxian/internal/config"
	"xunxian/internal/redis"
)

type Service struct {
	db  *sql.DB
	rdb *redis.Client
	cfg *config.Config
}

func NewService(db *sql.DB, rdb *redis.Client, cfg *config.Config) *Service {
	return &Service{db: db, rdb: rdb, cfg: cfg}
}

// 名称词库
var namePrefixes = []string{"云", "风", "雪", "月", "星", "霜", "青", "墨", "玄", "道", "凌", "寒", "夜", "白", "紫", "苏", "楚", "叶", "柳", "沈"}
var nameSuffixes = []string{"轩", "尘", "影", "音", "归", "鸿", "鹤", "寒", "澜", "渊", "歌", "瑶", "辰", "衍", "清", "远", "行", "落", "笙", "渡"}

type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

// ═══════════════════════════════════════════
//  创建角色 POST /player/create
// ═══════════════════════════════════════════

func (s *Service) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		Name   string `json:"name"`
		Gender int    `json:"gender"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 从 Token 获取 account_id
	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未认证"})
		return
	}

	// 校验链
	if err := s.validateName(req.Name); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: err.Error()})
		return
	}

	// 检查该 account 是否已有角色
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM game_main.players WHERE account_id=?", accountID).Scan(&count)
	if count > 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "该账号已创建角色"})
		return
	}

	// 事务创建角色
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 插入 players
	result, err := tx.Exec(
		"INSERT INTO game_main.players (account_id, name, gender, level_stage, level_tier, level_step, scene_id, pos_x, pos_y) VALUES (?, ?, ?, 1, 1, 1, 1001, 0, 0)",
		accountID, req.Name, req.Gender,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建失败"})
		return
	}
	playerID, _ := result.LastInsertId()

	// 插入 player_attrs（初始属性：精=1 神=1 其余=0）
	_, err = tx.Exec(
		"INSERT INTO game_main.player_attrs (player_id, jing, shen, qi_metal, qi_wood, qi_water, qi_fire, qi_earth, luck, savvy) VALUES (?, 1, 1, 0, 0, 0, 0, 0, 0, 0)",
		playerID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建属性失败"})
		return
	}

	tx.Commit()

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"playerId": playerID,
			"name":     req.Name,
			"gender":   req.Gender,
			"attrs":    map[string]int{"jing": 1, "shen": 1, "luck": 0, "savvy": 0},
			"sceneId":  1001,
			"pos":      map[string]float32{"x": 0, "y": 0},
		},
	})
}

// ═══════════════════════════════════════════
//  查询角色 GET /player/get
// ═══════════════════════════════════════════

func (s *Service) HandleGet(w http.ResponseWriter, r *http.Request) {
	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未认证"})
		return
	}

	row := s.db.QueryRow(
		"SELECT p.id, p.account_id, p.name, p.gender, p.race, p.level_stage, p.level_tier, p.level_step, p.scene_id, p.pos_x, p.pos_y FROM game_main.players p WHERE p.account_id=?",
		accountID,
	)

	var p struct {
		ID, AccountID         int64
		Name                  string
		Gender, Race          int
		LevelStage, LevelTier, LevelStep, SceneID int
		PosX, PosY            float32
	}
	if err := row.Scan(&p.ID, &p.AccountID, &p.Name, &p.Gender, &p.Race,
		&p.LevelStage, &p.LevelTier, &p.LevelStep, &p.SceneID, &p.PosX, &p.PosY); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Data: p})
}

// ═══════════════════════════════════════════
//  查询属性 GET /player/attrs
// ═══════════════════════════════════════════

func (s *Service) HandleGetAttrs(w http.ResponseWriter, r *http.Request) {
	playerID := r.URL.Query().Get("playerId")
	if playerID == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少playerId"})
		return
	}

	row := s.db.QueryRow(
		"SELECT jing, qi_metal, qi_wood, qi_water, qi_fire, qi_earth, shen, luck, savvy, causality, inner_demon, dao_age, tribulation_count FROM game_main.player_attrs WHERE player_id=?",
		playerID,
	)

	var a struct {
		Jing, QiMetal, QiWood, QiWater, QiFire, QiEarth, Shen int
		Luck, Savvy                                           float64
		Causality, InnerDemon, DaoAge, TribulationCount       int
	}
	if err := row.Scan(&a.Jing, &a.QiMetal, &a.QiWood, &a.QiWater, &a.QiFire, &a.QiEarth,
		&a.Shen, &a.Luck, &a.Savvy, &a.Causality, &a.InnerDemon, &a.DaoAge, &a.TribulationCount); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "属性不存在"})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Data: a})
}

// ═══════════════════════════════════════════
//  随机名称 GET /player/random-name
// ═══════════════════════════════════════════

func (s *Service) HandleRandomName(w http.ResponseWriter, r *http.Request) {
	name := namePrefixes[rand.Intn(len(namePrefixes))] + nameSuffixes[rand.Intn(len(nameSuffixes))]

	// 确保唯一
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM game_main.players WHERE name=?", name).Scan(&count)
	if count > 0 {
		// 重试一次
		name = namePrefixes[rand.Intn(len(namePrefixes))] + nameSuffixes[rand.Intn(len(nameSuffixes))]
	}

	writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]string{"name": name}})
}

// ═══════════════════════════════════════════
//  名称校验 POST /player/validate-name
// ═══════════════════════════════════════════

func (s *Service) HandleValidateName(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	err := s.validateName(req.Name)
	if err != nil {
		writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]interface{}{"valid": false, "reason": err.Error()}})
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]interface{}{"valid": true}})
}

// ═══════════════════════════════════════════
//  名称校验逻辑
// ═══════════════════════════════════════════

func (s *Service) validateName(name string) error {
	runeCount := utf8.RuneCountInString(name)
	if runeCount < 2 || runeCount > 8 {
		return fmt.Errorf("名称需为2-8个汉字")
	}

	for _, r := range name {
		if !isChineseRune(r) && !isAlphaNumeric(r) {
			return fmt.Errorf("名称含有非法字符")
		}
	}

	// 敏感词检测（查数据库）
	var count int
	s.db.QueryRow(
		"SELECT COUNT(*) FROM game_config.sensitive_words WHERE ? LIKE CONCAT('%', word, '%')",
		name,
	).Scan(&count)
	if count > 0 {
		return fmt.Errorf("名称含有不当内容，请修改")
	}

	// 唯一性校验
	s.db.QueryRow("SELECT COUNT(*) FROM game_main.players WHERE name=?", name).Scan(&count)
	if count > 0 {
		return fmt.Errorf("该名称已被使用，请更换")
	}

	return nil
}

func isChineseRune(r rune) bool {
	return r >= 0x4e00 && r <= 0x9fff
}

func isAlphaNumeric(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
}

func getAccountID(r *http.Request) int64 {
	// 从中间件注入的 context 或 header 获取
	v := r.Header.Get("X-Account-ID")
	if v == "" {
		return 0
	}
	var id int64
	fmt.Sscanf(v, "%d", &id)
	return id
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
