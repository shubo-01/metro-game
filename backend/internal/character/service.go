// Package character 实现人物系统的角色服务。
// 负责角色创建、属性读写、境界管理、经验累积、五行修炼等核心功能。
// 严格按照《寻仙-人物系统PRD》和《人物系统技术方案》实现。
package character

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"time"
	"unicode/utf8"

	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// Service 角色服务，持有数据库连接和配置
type Service struct {
	db  *sql.DB
	rdb *redis.Client
	cfg *config.Config
}

// NewService 创建角色服务实例
func NewService(db *sql.DB, rdb *redis.Client, cfg *config.Config) *Service {
	return &Service{db: db, rdb: rdb, cfg: cfg}
}

// APIResponse 统一 API 响应格式
type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

// ═══════════════════════════════════════════
//  核心算法（严格按照技术方案第五章实现）
// ═══════════════════════════════════════════

// GetExpMultiplier 多修经验倍率计算
// 单修x1, 双修x2, 三修x3, 四修x4, 五修x9（质变门槛）
func GetExpMultiplier(elementCount int) float64 {
	switch elementCount {
	case 1:
		return 1.0
	case 2:
		return 2.0
	case 3:
		return 3.0
	case 4:
		return 4.0
	case 5:
		return 9.0
	default:
		return 9.0
	}
}

// GetDamageMultiplier 多修伤害倍率计算
// 单修x1, 双修x3, 三修x6, 四修x10, 五修x15
func GetDamageMultiplier(elementCount int) float64 {
	switch elementCount {
	case 1:
		return 1.0
	case 2:
		return 3.0
	case 3:
		return 6.0
	case 4:
		return 10.0
	case 5:
		return 15.0
	default:
		return 15.0
	}
}

// GetRealmExpReq 境界经验递增公式
// 人一阶=100，二阶=x1.5，三阶=x2.0，四阶=x2.5...九阶=x5.0
// 每升一阶倍率增加0.5，即 multiplier = 1.0 + 0.5 × (minorStage - 1)
func GetRealmExpReq(minorStage int) int64 {
	base := int64(100)
	multiplier := 1.0 + 0.5*float64(minorStage-1)
	return int64(float64(base) * multiplier)
}

// CalcElementCounter 五行克制计算
// 同等级克制x1.5，威力碾压可逆克（上限x2）
func CalcElementCounter(attackerElement, defenderElement int, attackerPower, defenderPower int) float64 {
	baseMultiplier := 1.0

	// 五行相克关系: 金克木、木克土、土克水、水克火、火克金
	counterMap := map[int]int{1: 2, 2: 5, 5: 3, 3: 4, 4: 1}
	if counterMap[attackerElement] == defenderElement {
		baseMultiplier = 1.5
	}

	// 威力碾压可逆克：攻击方威力远大于防守方
	if attackerPower > defenderPower*2 {
		ratio := float64(attackerPower) / float64(defenderPower)
		baseMultiplier = math.Min(ratio*0.5, 2.0)
	}

	return baseMultiplier
}

// 属性衍生计算已升级为 V2 版本，全部实现在 calc.go 中：
// CalcDerivedAttrs / CalcShieldCapacity / CalcEquilibrium / CalcDamage / ApplyDamage 等。
// V1 旧系数（气血=精×100 等）已废弃，请勿再使用。

// recalcAndSaveDerived 按 V2 公式重算指定角色的衍生属性并落库。
// 任何改变精/气/神的操作（加点/洗点/突破/心魔劫惩罚）之后都必须调用本函数，
// 否则数据库里的 hp_max/shield_max 等会和根属性对不上。
// Execer 兼容 *sql.DB 和 *sql.Tx，事务内外都能用。
// 注意：接口本身导出（供 death 等其他包传参），实现仍是标准库类型，无需额外适配。
type Execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	QueryRow(query string, args ...interface{}) *sql.Row
}

func recalcAndSaveDerived(e Execer, characterID int64) (DerivedAttrs, error) {
	// 1. 读出当前“有效精气神” = 裸值(固定点+自由点) + 神位加成 shenwei_* 三列。
	//    COALESCE 兼容旧数据：v3 迁移前建的行 shenwei_* 可能为 NULL，按 0 处理。
	//    注意：洗点/加点只动 free_* 和 jing/qi/shen 裸值，不碰 shenwei_* 列，
	//    神位加成由 shenwei 包在继承/切换时快照式覆盖写入，两者互不干扰。
	var jing, qi, shen int
	if err := e.QueryRow(`SELECT jing + COALESCE(shenwei_jing, 0),
		       qi + COALESCE(shenwei_qi, 0),
		       shen + COALESCE(shenwei_shen, 0)
		FROM character_attributes WHERE character_id=?`, characterID).
		Scan(&jing, &qi, &shen); err != nil {
		return DerivedAttrs{}, err
	}
	// 2. 按 V2 公式计算全部衍生值
	d := CalcDerivedAttrs(jing, qi, shen)
	// 3. 写回数据库：上限直接覆盖；当前值超过新上限时压到上限（LEAST），避免"血比血条还多"
	_, err := e.Exec(`UPDATE character_attributes SET
		hp_max=?, hp_current=LEAST(hp_current, ?),
		mp_max=?, mp_current=LEAST(mp_current, ?),
		soul_max=?, soul_current=LEAST(soul_current, ?),
		shield_max=?, shield_current=LEAST(shield_current, ?),
		affinity=?, reaction=?, abnormal_resist=?
		WHERE character_id=?`,
		d.HPMax, d.HPMax, d.MpMax, d.MpMax, d.SoulMax, d.SoulMax,
		d.ShieldMax, d.ShieldMax, d.Affinity, d.Reaction, d.AbnormalResist,
		characterID)
	return d, err
}

// RecalcAndSaveDerived 导出版的衍生属性重算函数，供其他服务包（如 death 死亡服务）复用。
// 背景：death 包在"六道轮回/重聚肉身"时会重置精气神，重置后必须按同一套 V2 公式重算衍生值，
// 否则会出现跨服务口径不一致（death 用 V1 旧公式、character 用 V2 新公式）的严重问题。
// 用法：传入 *sql.DB（自动提交）或 *sql.Tx（事务内），效果与包内 recalcAndSaveDerived 完全一致。
func RecalcAndSaveDerived(e Execer, characterID int64) (DerivedAttrs, error) {
	return recalcAndSaveDerived(e, characterID)
}

// ═══════════════════════════════════════════
//  POST /character/create  创建角色
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

	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未认证"})
		return
	}

	// 名称校验
	if err := s.validateName(req.Name); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: err.Error()})
		return
	}

	// 性别校验
	if req.Gender != 1 && req.Gender != 2 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "性别只能为1(男)或2(女)"})
		return
	}

	// 检查是否已有角色
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM character_base WHERE account_id=?", accountID).Scan(&count)
	if count > 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "该账号已创建角色"})
		return
	}

	// 事务创建角色（4张表：character_base + character_attributes + character_realm + character_death_state）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 1. 插入 character_base
	result, err := tx.Exec(
		"INSERT INTO character_base (account_id, name, gender, race, form_state) VALUES (?, ?, ?, 1, 1)",
		accountID, req.Name, req.Gender,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建角色失败: " + err.Error()})
		return
	}
	charID, _ := result.LastInsertId()

	// 2. 插入 character_attributes（初始值：精1 气1 神1 气运0 悟性0）
	// 衍生值按 V2 公式初始化：气血=1×50=50、灵力=1×20=20、魂力=1×50=50、
	// 护盾=(1+1+1)×200=600、亲和=1×0.5=0.5、反应=1、异常抵抗=1×0.5=0.5
	initDerived := CalcDerivedAttrs(1, 1, 1)
	_, err = tx.Exec(
		`INSERT INTO character_attributes (character_id, jing, qi, shen, qi_yun, wu_xing,
		 hp_max, hp_current, mp_max, mp_current, soul_max, soul_current,
		 free_jing, free_qi, free_shen, shield_max, shield_current, affinity, reaction, abnormal_resist)
		 VALUES (?, 1, 1, 1, 0, 0, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)`,
		charID,
		initDerived.HPMax, initDerived.HPMax,
		initDerived.MpMax, initDerived.MpMax,
		initDerived.SoulMax, initDerived.SoulMax,
		initDerived.ShieldMax, initDerived.ShieldMax,
		initDerived.Affinity, initDerived.Reaction, initDerived.AbnormalResist,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建属性失败"})
		return
	}

	// 3. 插入 character_realm（初始：人阶一阶0段）
	_, err = tx.Exec(
		"INSERT INTO character_realm (character_id) VALUES (?)",
		charID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建境界失败"})
		return
	}

	// 4. 插入 character_death_state（初始：全部正常）
	_, err = tx.Exec(
		"INSERT INTO character_death_state (character_id) VALUES (?)",
		charID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "创建死亡状态失败"})
		return
	}

	tx.Commit()

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "创建成功",
		Data: map[string]interface{}{
			"character_id": charID,
			"name":         req.Name,
			"gender":       req.Gender,
			"race":         1,
			"attrs": map[string]int{
				"jing": 1, "qi": 1, "shen": 1, "qi_yun": 0, "wu_xing": 0,
			},
			"realm": map[string]int{
				"major_stage": 1, "minor_stage": 1, "stage_segment": 0,
			},
		},
	})
}

// ═══════════════════════════════════════════
//  GET /character/info  获取角色完整信息
// ═══════════════════════════════════════════

func (s *Service) HandleInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID := r.URL.Query().Get("character_id")
	if charID == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return
	}

	// 查 character_base
	var base struct {
		CharacterID int64  `json:"character_id"`
		AccountID   int64  `json:"account_id"`
		Name        string `json:"name"`
		Gender      int    `json:"gender"`
		Race        int    `json:"race"`
		FormState   int    `json:"form_state"`
	}
	err := s.db.QueryRow("SELECT character_id, account_id, name, gender, race, form_state FROM character_base WHERE character_id=?", charID).
		Scan(&base.CharacterID, &base.AccountID, &base.Name, &base.Gender, &base.Race, &base.FormState)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 查 character_attributes（每个字段单独声明，确保 JSON 标签正确映射）
	var attrs struct {
		Jing    int `json:"jing"`         // 精（肉身强度）
		Qi      int `json:"qi"`           // 气（修炼能量）
		Shen    int `json:"shen"`         // 神（灵魂之力）
		QiYun   int `json:"qi_yun"`       // 气运（命运属性）
		WuXing  int `json:"wu_xing"`      // 悟性（成长天赋）
		HPMax   int `json:"hp_max"`       // 气血上限
		HPCur   int `json:"hp_current"`   // 当前气血
		MPMax   int `json:"mp_max"`       // 灵力上限
		MPCur   int `json:"mp_current"`   // 当前灵力
		SoulMax int `json:"soul_max"`     // 魂力上限
		SoulCur int `json:"soul_current"` // 当前魂力
	}
	// 两种口径说明：
	//   基础值（裸值）= jing/qi/shen 列本身（固定点+自由点），attributes 字段返回裸值，
	//     前端继承门槛预检（神位继承要求按裸值判定，防加成套娃）必须用它；
	//   有效值 = 裸值 + 神位加成 shenwei_*（COALESCE 兼容 v3 迁移前的 NULL 旧行），
	//     衍生属性（hp_max 等）按有效值计算，与 recalcAndSaveDerived 落库口径一致，
	//     否则同一响应里 attributes.hp_max（含加成）与 derived.hp_max（不含）会互相矛盾。
	var effJing, effQi, effShen int
	err = s.db.QueryRow(`SELECT jing, qi, shen, qi_yun, wu_xing,
			hp_max, hp_current, mp_max, mp_current, soul_max, soul_current,
			jing + COALESCE(shenwei_jing, 0), qi + COALESCE(shenwei_qi, 0), shen + COALESCE(shenwei_shen, 0)
		FROM character_attributes WHERE character_id=?`, charID).
		Scan(&attrs.Jing, &attrs.Qi, &attrs.Shen, &attrs.QiYun, &attrs.WuXing,
			&attrs.HPMax, &attrs.HPCur, &attrs.MPMax, &attrs.MPCur, &attrs.SoulMax, &attrs.SoulCur,
			&effJing, &effQi, &effShen)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "角色属性数据缺失"})
		return
	}

	// 查 character_realm（每个字段单独声明，确保 JSON 标签正确映射）
	var realm struct {
		MajorStage       int   `json:"major_stage"`       // 大境界：1=人阶 2=真人 3=仙 4=金仙
		MinorStage       int   `json:"minor_stage"`       // 小阶：1-9
		StageSegment     int   `json:"stage_segment"`     // 段格：0-9
		ExpJing          int64 `json:"exp_jing"`          // 精经验值
		ExpQi            int64 `json:"exp_qi"`            // 气经验值
		ExpShen          int64 `json:"exp_shen"`          // 神经验值
		XinmoValue       int   `json:"xinmo_value"`       // 心魔值
		DaoXing          int   `json:"dao_xing"`          // 道行
		KarmaValue       int   `json:"karma_value"`       // 因果值
		TribulationCount int   `json:"tribulation_count"` // 已渡天劫次数
	}
	err = s.db.QueryRow("SELECT major_stage, minor_stage, stage_segment, exp_jing, exp_qi, exp_shen, tribulation_count, xinmo_value, dao_xing, karma_value FROM character_realm WHERE character_id=?", charID).
		Scan(&realm.MajorStage, &realm.MinorStage, &realm.StageSegment,
			&realm.ExpJing, &realm.ExpQi, &realm.ExpShen,
			&realm.TribulationCount, &realm.XinmoValue, &realm.DaoXing, &realm.KarmaValue)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "角色境界数据缺失"})
		return
	}

	// 查五行修炼列表
	rows, _ := s.db.Query("SELECT element_type, proficiency, is_cultivating FROM character_qi_elements WHERE character_id=? ORDER BY element_type", charID)
	var qiElements []map[string]int
	for rows.Next() {
		var et, prof, cult int
		rows.Scan(&et, &prof, &cult)
		qiElements = append(qiElements, map[string]int{"element_type": et, "proficiency": prof, "is_cultivating": cult})
	}
	rows.Close()

	// 计算衍生属性：输入用有效精气神（裸值+神位加成），与落库口径保持一致
	derived := CalcDerivedAttrs(effJing, effQi, effShen)
	elementCount := len(qiElements)
	if elementCount == 0 {
		elementCount = 1
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"base":              base,
			"attributes":        attrs,
			"derived":           derived,
			"realm":             realm,
			"qi_elements":       qiElements,
			"element_count":     elementCount,
			"exp_multiplier":    GetExpMultiplier(elementCount),
			"damage_multiplier": GetDamageMultiplier(elementCount),
		},
	})
}

// ═══════════════════════════════════════════
//  GET /character/attributes  获取五维属性及衍生值
// ═══════════════════════════════════════════

func (s *Service) HandleAttributes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID := r.URL.Query().Get("character_id")
	if charID == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return
	}

	// 两种口径说明（与 HandleInfo 一致）：
	//   base_attrs 返回【裸值】jing/qi/shen —— 前端神位继承门槛预检要按裸值判定，不能给加成污染；
	//   derived 按【有效值】= 裸值 + COALESCE(shenwei_*, 0) 计算 —— 与 recalcAndSaveDerived
	//   落库的 current.hp_max 等口径对齐，避免同一响应中 current 含加成而 derived 不含的矛盾。
	var jing, qi, shen, qiYun, wuXing int
	var hpMax, hpCur, mpMax, mpCur, soulMax, soulCur int
	var effJing, effQi, effShen int
	err := s.db.QueryRow(
		`SELECT jing, qi, shen, qi_yun, wu_xing,
			hp_max, hp_current, mp_max, mp_current, soul_max, soul_current,
			jing + COALESCE(shenwei_jing, 0), qi + COALESCE(shenwei_qi, 0), shen + COALESCE(shenwei_shen, 0)
		FROM character_attributes WHERE character_id=?`,
		charID,
	).Scan(&jing, &qi, &shen, &qiYun, &wuXing, &hpMax, &hpCur, &mpMax, &mpCur, &soulMax, &soulCur,
		&effJing, &effQi, &effShen)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色属性不存在"})
		return
	}

	// 衍生属性按有效精气神现算（裸值口径见上方注释）
	derived := CalcDerivedAttrs(effJing, effQi, effShen)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"base_attrs": map[string]int{
				"jing": jing, "qi": qi, "shen": shen, "qi_yun": qiYun, "wu_xing": wuXing,
			},
			"current": map[string]int{
				"hp_max": hpMax, "hp_current": hpCur,
				"mp_max": mpMax, "mp_current": mpCur,
				"soul_max": soulMax, "soul_current": soulCur,
			},
			"derived": derived,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/exp/add  增加经验
// ═══════════════════════════════════════════

func (s *Service) HandleExpAdd(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		ExpJing     int64 `json:"exp_jing"` // 精经验
		ExpQi       int64 `json:"exp_qi"`   // 气经验
		ExpShen     int64 `json:"exp_shen"` // 神经验
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 读取当前经验
	var curExpJing, curExpQi, curExpShen int64
	var minorStage int
	err := s.db.QueryRow("SELECT exp_jing, exp_qi, exp_shen, minor_stage FROM character_realm WHERE character_id=?", req.CharacterID).
		Scan(&curExpJing, &curExpQi, &curExpShen, &minorStage)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 查询兼修数量（决定经验倍率）
	var elementCount int
	s.db.QueryRow("SELECT COUNT(*) FROM character_qi_elements WHERE character_id=? AND is_cultivating=1", req.CharacterID).Scan(&elementCount)
	if elementCount == 0 {
		elementCount = 1
	}
	multiplier := GetExpMultiplier(elementCount)

	// 悟性加成：悟性每1点增加5%修炼速度
	var wuXing int
	s.db.QueryRow("SELECT wu_xing FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&wuXing)
	wuXingBonus := 1.0 + float64(wuXing)*0.05

	// 计算最终经验 = 原始经验 × 多修倍率 × 悟性加成
	finalJing := int64(float64(req.ExpJing) * multiplier * wuXingBonus)
	finalQi := int64(float64(req.ExpQi) * multiplier * wuXingBonus)
	finalShen := int64(float64(req.ExpShen) * multiplier * wuXingBonus)

	// 累加经验
	newExpJing := curExpJing + finalJing
	newExpQi := curExpQi + finalQi
	newExpShen := curExpShen + finalShen

	// 检查是否可以升阶（三项经验都达标）
	expReq := GetRealmExpReq(minorStage)
	canUpgrade := newExpJing >= expReq && newExpQi >= expReq && newExpShen >= expReq

	s.db.Exec("UPDATE character_realm SET exp_jing=?, exp_qi=?, exp_shen=? WHERE character_id=?",
		newExpJing, newExpQi, newExpShen, req.CharacterID)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"exp_jing":    newExpJing,
			"exp_qi":      newExpQi,
			"exp_shen":    newExpShen,
			"exp_req":     expReq,
			"can_upgrade": canUpgrade,
			"multiplier":  multiplier,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/realm/upgrade  境界升级（小阶提升）
// ═══════════════════════════════════════════

func (s *Service) HandleRealmUpgrade(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var majorStage, minorStage int
	var expJing, expQi, expShen int64
	err := s.db.QueryRow("SELECT major_stage, minor_stage, exp_jing, exp_qi, exp_shen FROM character_realm WHERE character_id=?", req.CharacterID).
		Scan(&majorStage, &minorStage, &expJing, &expQi, &expShen)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	expReq := GetRealmExpReq(minorStage)
	if expJing < expReq || expQi < expReq || expShen < expReq {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "经验不足，无法升阶"})
		return
	}

	if minorStage >= 9 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "已达当前大境界最高阶，需突破大境界"})
		return
	}

	// 升阶：小阶+1，经验清零，同时发放自由属性点（写入 unassigned_points 待玩家分配）。
	// V2 规则：每升1级发放自由点，数量随境界递增（人+2/级、真人+3/级、地仙+5/级...）。
	var subRealm int
	s.db.QueryRow("SELECT sub_realm FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&subRealm)
	freePoints := GetFreePointsPerLevel(RealmIndex(majorStage, subRealm))
	s.db.Exec("UPDATE character_realm SET minor_stage=minor_stage+1, exp_jing=0, exp_qi=0, exp_shen=0, stage_segment=0, unassigned_points=unassigned_points+? WHERE character_id=?",
		freePoints, req.CharacterID)

	// 查询发放后的待分配点数余额，一并返回给前端展示
	var unassigned int
	s.db.QueryRow("SELECT unassigned_points FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&unassigned)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "升阶成功",
		Data: map[string]interface{}{
			"major_stage":       majorStage,
			"minor_stage":       minorStage + 1,
			"free_points_grant": freePoints, // 本次发放的自由点
			"unassigned_points": unassigned, // 当前待分配点数总余额
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/realm/breakthrough  境界突破（大境界）
// ═══════════════════════════════════════════

func (s *Service) HandleBreakthrough(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 读取境界数据
	var majorStage, minorStage int
	var xinmoValue int
	err := s.db.QueryRow("SELECT major_stage, minor_stage, xinmo_value FROM character_realm WHERE character_id=?", req.CharacterID).
		Scan(&majorStage, &minorStage, &xinmoValue)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	if minorStage < 9 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "需达到九阶才能突破大境界"})
		return
	}

	// 读取属性（检查悟性和气运要求）
	var wuXing, qiYun int
	if err := s.db.QueryRow("SELECT wu_xing, qi_yun FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&wuXing, &qiYun); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "读取角色属性失败"})
		return
	}

	// 突破要求检查（V2：8大境界，悟性/气运门槛按PRD 2.4 境界突破条件表）
	nextStage := majorStage + 1
	switch nextStage {
	case 2: // 人→真人
		if wuXing < 5 || qiYun < 3 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破真人需要悟性>=5、气运>=3"})
			return
		}
	case 3: // 真人→地仙
		if wuXing < 10 || qiYun < 6 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破地仙需要悟性>=10、气运>=6"})
			return
		}
	case 4: // 地仙→天仙
		if wuXing < 15 || qiYun < 10 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破天仙需要悟性>=15、气运>=10"})
			return
		}
	case 5: // 天仙→金仙
		if wuXing < 20 || qiYun < 15 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破金仙需要悟性>=20、气运>=15"})
			return
		}
	case 6: // 金仙→太乙金仙
		if wuXing < 30 || qiYun < 20 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破太乙金仙需要悟性>=30、气运>=20"})
			return
		}
	case 7: // 太乙金仙→大罗金仙
		if wuXing < 50 || qiYun < 30 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破大罗金仙需要悟性>=50、气运>=30"})
			return
		}
	case 8: // 大罗金仙→神魔·太极
		if wuXing < 80 || qiYun < 50 {
			writeJSON(w, 400, APIResponse{Code: 400, Msg: "突破神魔需要悟性>=80、气运>=50"})
			return
		}
	default:
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "已达最高境界（神魔内部子阶突破请走 /character/dao/breakthrough）"})
		return
	}

	// 心魔劫判定（真人以上需要）
	// 心魔值超过悟性值时，心魔劫成功率骤降
	xinmoPassed := true
	if nextStage >= 2 {
		xinmoCheckRate := 0.8
		if xinmoValue > wuXing {
			xinmoCheckRate = 0.3 // 心魔过高，成功率骤降
		}
		if rand.Float64() > xinmoCheckRate {
			xinmoPassed = false
		}
	}

	if !xinmoPassed {
		// 心魔劫失败：属性暴降（精/气/神各降30%），心魔值翻倍，但不降阶
		s.db.Exec("UPDATE character_attributes SET jing=GREATEST(1, FLOOR(jing*0.7)), qi=GREATEST(1, FLOOR(qi*0.7)), shen=GREATEST(1, FLOOR(shen*0.7)) WHERE character_id=?", req.CharacterID)
		s.db.Exec("UPDATE character_realm SET xinmo_value=xinmo_value*2 WHERE character_id=?", req.CharacterID)
		// 精气神降了，衍生属性（气血/护盾等）必须按 V2 公式同步重算落库
		recalcAndSaveDerived(s.db, req.CharacterID)
		writeJSON(w, 200, APIResponse{
			Code: 0,
			Msg:  "心魔劫失败！精/气/神各降30%，心魔值翻倍",
			Data: map[string]interface{}{
				"result":       "xinmo_fail",
				"xinmo_value":  xinmoValue * 2,
				"attr_penalty": "精气神各-30%",
			},
		})
		return
	}

	// 天劫判定（仙以上需要）
	if nextStage >= 3 {
		var tribCount int
		s.db.QueryRow("SELECT tribulation_count FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&tribCount)

		// 天劫难度 = 基础难度 × (1 + 天劫次数×0.1) × 兼修数量
		var elementCount int
		s.db.QueryRow("SELECT COUNT(*) FROM character_qi_elements WHERE character_id=?", req.CharacterID).Scan(&elementCount)
		if elementCount == 0 {
			elementCount = 1
		}
		difficulty := 0.5 * (1.0 + float64(tribCount)*0.1) * float64(elementCount)
		passRate := math.Max(0.1, 1.0-difficulty) // 最低10%通过率

		if rand.Float64() > passRate {
			// 天劫失败：降回上一大境界，损失30%实力，天劫+1
			s.db.Exec("UPDATE character_realm SET major_stage=?, minor_stage=9, tribulation_count=tribulation_count+1 WHERE character_id=?",
				majorStage, req.CharacterID)
			writeJSON(w, 200, APIResponse{
				Code: 0,
				Msg:  "天劫失败！降回上一境界，损失30%实力",
				Data: map[string]interface{}{
					"result":      "tribulation_fail",
					"major_stage": majorStage,
					"minor_stage": 9,
				},
			})
			return
		}
	}

	// 突破成功！境界+1；若突破进入神魔阶段，子阶从太极(1)开始
	subRealmAfter := 0
	if nextStage == 8 {
		subRealmAfter = 1
	}
	s.db.Exec("UPDATE character_realm SET major_stage=?, minor_stage=1, stage_segment=0, sub_realm=?, exp_jing=0, exp_qi=0, exp_shen=0, xinmo_value=xinmo_value+1, tribulation_count=tribulation_count+1, dao_xing=dao_xing+100 WHERE character_id=?",
		nextStage, subRealmAfter, req.CharacterID)

	// V2 固定点发放：大境界突破时精气神各自动"加到"新境界固定点（不占自由点）。
	// 固定点表：人1/真人6/地仙16/天仙31/金仙51/太乙76/大罗106/神魔·太极141...
	// 实际加的增量 = 新境界固定点 - 旧境界固定点（例：人→真人 加 6-1=5 点/属性）。
	fixedDelta := GetFixedPoints(RealmIndex(nextStage, subRealmAfter)) - GetFixedPoints(RealmIndex(majorStage, 0))
	if fixedDelta > 0 {
		s.db.Exec("UPDATE character_attributes SET jing=jing+?, qi=qi+?, shen=shen+? WHERE character_id=?",
			fixedDelta, fixedDelta, fixedDelta, req.CharacterID)
	}
	// 精气神变了，按 V2 公式重算衍生属性并落库
	derived, _ := recalcAndSaveDerived(s.db, req.CharacterID)

	stageName := GetRealmName(RealmIndex(nextStage, subRealmAfter))

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  fmt.Sprintf("突破成功！晋升为 %s", stageName),
		Data: map[string]interface{}{
			"result":            "success",
			"major_stage":       nextStage,
			"minor_stage":       1,
			"stage_name":        stageName,
			"fixed_point_bonus": fixedDelta, // 本次突破精气神各获得的固定点
			"derived":           derived,    // 重算后的最新衍生属性
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/qi/cultivate  修炼五行属性
// ═══════════════════════════════════════════

func (s *Service) HandleQiCultivate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		ElementType int   `json:"element_type"` // 1=金 2=木 3=水 4=火 5=土
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.ElementType < 1 || req.ElementType > 5 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "五行类型只能为1-5（金木水火土）"})
		return
	}

	// 检查角色是否存在
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&count)
	if count == 0 {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 停止其他正在修炼的属性
	s.db.Exec("UPDATE character_qi_elements SET is_cultivating=0 WHERE character_id=?", req.CharacterID)

	// 插入或更新修炼记录
	_, err := s.db.Exec(
		`INSERT INTO character_qi_elements (character_id, element_type, is_cultivating)
		 VALUES (?, ?, 1)
		 ON DUPLICATE KEY UPDATE is_cultivating=1`,
		req.CharacterID, req.ElementType,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "修炼失败"})
		return
	}

	// 查询当前兼修数量
	var elementCount int
	s.db.QueryRow("SELECT COUNT(*) FROM character_qi_elements WHERE character_id=?", req.CharacterID).Scan(&elementCount)

	elementNames := map[int]string{1: "金", 2: "木", 3: "水", 4: "火", 5: "土"}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  fmt.Sprintf("开始修炼 %s 属性", elementNames[req.ElementType]),
		Data: map[string]interface{}{
			"element_type":   req.ElementType,
			"element_name":   elementNames[req.ElementType],
			"element_count":  elementCount,
			"exp_multiplier": GetExpMultiplier(elementCount),
		},
	})
}

// ═══════════════════════════════════════════
//  GET /character/qi/elements  查询已修属性
// ═══════════════════════════════════════════

func (s *Service) HandleQiElements(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID := r.URL.Query().Get("character_id")
	if charID == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return
	}

	rows, err := s.db.Query(
		"SELECT element_type, proficiency, is_cultivating, created_at FROM character_qi_elements WHERE character_id=? ORDER BY element_type",
		charID,
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询失败"})
		return
	}
	defer rows.Close()

	elementNames := map[int]string{1: "金", 2: "木", 3: "水", 4: "火", 5: "土"}
	var elements []map[string]interface{}
	for rows.Next() {
		var et, prof, cult int
		var createdAt time.Time
		rows.Scan(&et, &prof, &cult, &createdAt)
		elements = append(elements, map[string]interface{}{
			"element_type":   et,
			"element_name":   elementNames[et],
			"proficiency":    prof,
			"is_cultivating": cult == 1,
			"started_at":     createdAt.Format("2006-01-02 15:04:05"),
		})
	}

	elementCount := len(elements)
	if elementCount == 0 {
		elementCount = 1
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"elements":          elements,
			"element_count":     len(elements),
			"exp_multiplier":    GetExpMultiplier(elementCount),
			"damage_multiplier": GetDamageMultiplier(elementCount),
		},
	})
}

// ═══════════════════════════════════════════
//  工具函数
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
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM game_config.sensitive_words WHERE ? LIKE CONCAT('%', word, '%')", name).Scan(&count)
	if count > 0 {
		return fmt.Errorf("名称含有不当内容")
	}
	s.db.QueryRow("SELECT COUNT(*) FROM character_base WHERE name=?", name).Scan(&count)
	if count > 0 {
		return fmt.Errorf("该名称已被使用")
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
