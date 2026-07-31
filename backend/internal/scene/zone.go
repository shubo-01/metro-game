// zone.go 战斗地图轮回夺舍迭代（V5）新增：地图分区管理 + 采集系统 + 移动限速校验。
// 依据《战斗操作层与地图系统和轮回夺舍系统PRD》第二章地图系统与采集系统。
//
// 本文件新增路由（在 cmd/scene-service/main.go 注册）：
//   GET  /scene/zone/info      查询全部分区配置（边界/空气墙/禁区/推荐等级）
//   POST /scene/zone/enter     进入分区（合法性校验 + 无缝切换标记）
//   POST /scene/gather         采集资源（存在性+距离+CD校验，产出写 player_inventory）
//   POST /scene/move/validate  移动限速校验（基础5m/s + 装备加成上限50% = 7.5m/s封顶）
//
// 单位说明：Zone/采集点坐标单位为"米"（与 PRD 一致），与 AOI 的像素坐标是两套体系，
// 前端负责米↔像素换算；本文件的校验全部在"米"坐标系下进行。
//
// 配置缓存：map_zone_config / map_forbidden_area / gather_point_config 是低频变更的
// 配置表，首次使用时从数据库加载进内存缓存（进程内只加载一次，改表后重启服务生效）。
package scene

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

// ═══════════════════════════════════════════
//  V5 常量（数值出处均为 PRD 原文）
// ═══════════════════════════════════════════

const (
	// MoveBaseSpeed 基础移动速度（PRD：5米/秒）
	MoveBaseSpeed = 5.0

	// MoveSpeedBonusCap 装备移速加成上限（PRD：+50%，封顶7.5米/秒）
	MoveSpeedBonusCap = 0.50

	// MoveGraceMeters 限速判定的网络抖动宽容值（米）：
	// 客户端上报有网络延迟，给2米余量避免正常玩家被误判（服务端权威仍然守住上限）
	MoveGraceMeters = 2.0

	// GatherMaxDistance 采集判定距离（米）：离采集点超过该距离不允许采集
	GatherMaxDistance = 5.0
)

// ═══════════════════════════════════════════
//  V5 纯函数（表驱动单测见 zone_test.go）
// ═══════════════════════════════════════════

// ZoneRect 分区矩形（ValidatePosition 的输入，从 map_zone_config 加载）
type ZoneRect struct {
	ZoneID      int    `json:"zone_id"`
	Name        string `json:"name"`
	XMin        int    `json:"x_min"`
	YMin        int    `json:"y_min"`
	XMax        int    `json:"x_max"`
	YMax        int    `json:"y_max"`
	IsSafeZone  bool   `json:"is_safe_zone"`
	AuraPercent int    `json:"aura_percent"`
	RecLevelMin int    `json:"rec_level_min"`
	RecLevelMax int    `json:"rec_level_max"`
	DescText    string `json:"desc"`
}

// ForbiddenRect 禁区矩形（从 map_forbidden_area 加载）
type ForbiddenRect struct {
	AreaID int    `json:"area_id"`
	ZoneID int    `json:"zone_id"`
	Name   string `json:"name"`
	XMin   int    `json:"x_min"`
	YMin   int    `json:"y_min"`
	XMax   int    `json:"x_max"`
	YMax   int    `json:"y_max"`
}

// ValidatePosition 判定坐标 (x,y) 的合法性（PRD：空气墙 + 禁区）。
// 返回：所在分区ID（0=出界）、是否合法、不合法原因。
// 规则：
//  1. 不落在任何 Zone 矩形内 → 出界（空气墙），非法；
//  2. 落在某个禁区矩形内 → 禁区（崖壁等），非法；
//  3. 多个 Zone 嵌套时（Zone1营地嵌在Zone2原野中央），归属"面积最小"的 Zone
//     ——这样营地内的点归 Zone1 而不是外层的 Zone2。
// 纯函数：不查库不依赖 Service，方便表驱动单测。
func ValidatePosition(x, y float64, zones []ZoneRect, forbidden []ForbiddenRect) (zoneID int, ok bool, reason string) {
	// 第一步：找出所有包含该点的 Zone，取面积最小者（嵌套时内层优先）
	bestArea := math.MaxFloat64
	for _, z := range zones {
		if x >= float64(z.XMin) && x <= float64(z.XMax) && y >= float64(z.YMin) && y <= float64(z.YMax) {
			area := float64(z.XMax-z.XMin) * float64(z.YMax-z.YMin)
			if area < bestArea {
				bestArea = area
				zoneID = z.ZoneID
			}
		}
	}
	if zoneID == 0 {
		return 0, false, "出界：撞到空气墙（坐标不在任何分区内）"
	}

	// 第二步：禁区判定（崖壁/深潭等 Zone 内不可进入的矩形）
	for _, f := range forbidden {
		if x >= float64(f.XMin) && x <= float64(f.XMax) && y >= float64(f.YMin) && y <= float64(f.YMax) {
			return zoneID, false, "禁区：" + f.Name + " 不可进入"
		}
	}
	return zoneID, true, ""
}

// MaxAllowedSpeed 计算允许的最大移动速度（米/秒）。
// PRD：基础5m/s，装备移速加成上限+50%（即封顶7.5m/s）。
// bonusPercent 为装备加成比例（0.2=+20%），服务端强制 clamp 到 [0, 0.5]
// ——客户端传多少不重要，超过上限一律按上限算（服务端权威）。
func MaxAllowedSpeed(bonusPercent float64) float64 {
	if bonusPercent < 0 {
		bonusPercent = 0
	}
	if bonusPercent > MoveSpeedBonusCap {
		bonusPercent = MoveSpeedBonusCap
	}
	return MoveBaseSpeed * (1.0 + bonusPercent)
}

// ═══════════════════════════════════════════
//  配置缓存（进程内一次加载）
// ═══════════════════════════════════════════

// zoneCache 分区与禁区配置的内存缓存。
// 低频配置表首次使用时加载一次；加载失败不缓存，下次请求会重试。
type zoneCache struct {
	mu        sync.RWMutex
	loaded    bool
	zones     []ZoneRect
	forbidden []ForbiddenRect
}

var zcache zoneCache

// loadZoneConfig 从数据库加载分区/禁区配置（带缓存，线程安全）
func (s *Service) loadZoneConfig() ([]ZoneRect, []ForbiddenRect, error) {
	zcache.mu.RLock()
	if zcache.loaded {
		z, f := zcache.zones, zcache.forbidden
		zcache.mu.RUnlock()
		return z, f, nil
	}
	zcache.mu.RUnlock()

	zcache.mu.Lock()
	defer zcache.mu.Unlock()
	if zcache.loaded { // 双检：等锁期间可能已被其他请求加载完
		return zcache.zones, zcache.forbidden, nil
	}

	var zones []ZoneRect
	rows, err := s.db.Query(
		"SELECT zone_id, name, x_min, y_min, x_max, y_max, is_safe_zone, aura_percent, rec_level_min, rec_level_max, desc_text FROM map_zone_config")
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var z ZoneRect
		var safe int
		if err := rows.Scan(&z.ZoneID, &z.Name, &z.XMin, &z.YMin, &z.XMax, &z.YMax, &safe, &z.AuraPercent, &z.RecLevelMin, &z.RecLevelMax, &z.DescText); err != nil {
			rows.Close()
			return nil, nil, err
		}
		z.IsSafeZone = safe == 1
		zones = append(zones, z)
	}
	rows.Close()

	var forbidden []ForbiddenRect
	rows, err = s.db.Query("SELECT area_id, zone_id, name, x_min, y_min, x_max, y_max FROM map_forbidden_area")
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var f ForbiddenRect
		if err := rows.Scan(&f.AreaID, &f.ZoneID, &f.Name, &f.XMin, &f.YMin, &f.XMax, &f.YMax); err != nil {
			rows.Close()
			return nil, nil, err
		}
		forbidden = append(forbidden, f)
	}
	rows.Close()

	zcache.zones, zcache.forbidden, zcache.loaded = zones, forbidden, true
	return zones, forbidden, nil
}

// ═══════════════════════════════════════════
//  GET /scene/zone/info  查询全部分区配置
// ═══════════════════════════════════════════
//
// 请求：GET /scene/zone/info（无参数，一次拉全量，前端缓存）
// 返回：zones（3个分区的边界/安全区/灵气/推荐等级）+ forbidden_areas（禁区矩形）
//       + move_rule（限速规则，前端做本地预测用）。
func (s *Service) HandleZoneInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	zones, forbidden, err := s.loadZoneConfig()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "分区配置加载失败: " + err.Error()})
		return
	}
	writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]interface{}{
		"zones":           zones,
		"forbidden_areas": forbidden,
		"move_rule": map[string]interface{}{ // 移动限速规则（服务端权威值下发）
			"base_speed":      MoveBaseSpeed,     // 基础5米/秒
			"speed_bonus_cap": MoveSpeedBonusCap, // 装备加成上限+50%
			"max_speed":       MaxAllowedSpeed(MoveSpeedBonusCap),
		},
	}})
}

// ═══════════════════════════════════════════
//  POST /scene/zone/enter  进入分区
// ═══════════════════════════════════════════
//
// 请求：{"player_id":1, "zone_id":2, "x":500, "y":300}
// 校验：目标分区存在 + 落点坐标合法（在该分区内、不在禁区）。
// 无缝切换：三个分区在世界坐标上连续拼接（Zone1嵌在Zone2内、Zone3与Zone2共边），
// 客户端跨分区不需要 Loading，本接口只做合法性登记并返回 seamless=true 标记。
func (s *Service) HandleZoneEnter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID int64   `json:"player_id"`
		ZoneID   int     `json:"zone_id"`
		X        float64 `json:"x"`
		Y        float64 `json:"y"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.PlayerID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 必填"})
		return
	}

	zones, forbidden, err := s.loadZoneConfig()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "分区配置加载失败: " + err.Error()})
		return
	}

	// 目标分区存在性
	var target *ZoneRect
	for i := range zones {
		if zones[i].ZoneID == req.ZoneID {
			target = &zones[i]
			break
		}
	}
	if target == nil {
		writeJSON(w, 404, APIResponse{Code: 6001, Msg: "分区不存在"})
		return
	}

	// 落点合法性：必须真的落在目标分区且不在禁区（防瞬移进崖壁）
	zoneID, ok, reason := ValidatePosition(req.X, req.Y, zones, forbidden)
	if !ok {
		writeJSON(w, 400, APIResponse{Code: 6002, Msg: "非法位置：" + reason})
		return
	}
	if zoneID != req.ZoneID {
		writeJSON(w, 400, APIResponse{Code: 6002,
			Msg: fmt.Sprintf("坐标(%.0f,%.0f)实际位于分区%d，与声明的分区%d不符", req.X, req.Y, zoneID, req.ZoneID)})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "进入" + target.Name, Data: map[string]interface{}{
		"zone_id":       target.ZoneID,
		"name":          target.Name,
		"is_safe_zone":  target.IsSafeZone,  // 安全区：怪物不入侵、不可PVP（Zone1营地）
		"aura_percent":  target.AuraPercent, // 灵气浓度（营地10%，打坐修炼效率相关）
		"rec_level_min": target.RecLevelMin,
		"rec_level_max": target.RecLevelMax,
		"seamless":      true, // 无缝切换标记：客户端不需要Loading
	}})
}

// ═══════════════════════════════════════════
//  POST /scene/gather  采集资源
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "point_id":101, "x":100, "y":100}
// 流程（PRD 采集系统：3秒读条无需工具，读条由客户端演出，服务端管结果）：
//  1. 采集点存在性校验（gather_point_config）
//  2. 距离校验：离采集点 ≤5米 才能采（防远程刷采集）
//  3. CD 校验：同角色同点位距上次采集 < gather_cd_s 秒 → 拒绝（错误码6012）
//  4. 概率掷骰：success_rate（灵矿0.30低概率，其余1.00必得）
//  5. 产出写 player_inventory（凡品→item_type=1普通材料，珍品/灵品→2稀有材料，
//     source='gather' 自动堆叠）；无论成败写 char_gather_log（失败quantity=0，CD照吃）
func (s *Service) HandleGather(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		CharacterID int64   `json:"character_id"`
		PointID     int     `json:"point_id"`
		X           float64 `json:"x"`
		Y           float64 `json:"y"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.CharacterID <= 0 || req.PointID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 与 point_id 必填"})
		return
	}

	// 1. 采集点存在性
	var itemID, quality, gatherCD, channelS int
	var itemName string
	var posX, posY float64
	var successRate float64
	err := s.db.QueryRow(
		"SELECT item_id, item_name, quality, pos_x, pos_y, gather_cd_s, channel_s, success_rate FROM gather_point_config WHERE point_id=?",
		req.PointID,
	).Scan(&itemID, &itemName, &quality, &posX, &posY, &gatherCD, &channelS, &successRate)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 6011, Msg: "采集点不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "采集点查询失败: " + err.Error()})
		return
	}

	// 2. 距离校验（米坐标系，欧氏距离 ≤5米）
	dist := math.Hypot(req.X-posX, req.Y-posY)
	if dist > GatherMaxDistance {
		writeJSON(w, 400, APIResponse{Code: 6014,
			Msg: fmt.Sprintf("距离采集点%.1f米，需靠近到%.0f米以内", dist, GatherMaxDistance)})
		return
	}

	// 3. CD 校验：查该角色在该点位的最近一次采集时间
	var lastAt sql.NullTime
	s.db.QueryRow(
		"SELECT MAX(gathered_at) FROM char_gather_log WHERE character_id=? AND point_id=?",
		req.CharacterID, req.PointID,
	).Scan(&lastAt)
	if lastAt.Valid {
		elapsed := time.Since(lastAt.Time)
		if elapsed < time.Duration(gatherCD)*time.Second {
			remaining := gatherCD - int(elapsed.Seconds())
			writeJSON(w, 400, APIResponse{Code: 6012,
				Msg:  fmt.Sprintf("采集点冷却中，还需等待%d秒", remaining),
				Data: map[string]interface{}{"remaining_seconds": remaining}})
			return
		}
	}

	// 4. 概率掷骰（服务端随机，客户端无法预测；灵矿0.30低概率）
	success := rand.Float64() < successRate
	quantity := 0
	if success {
		quantity = 1
	}

	// 5. 落库：产出进背包 + 流水记录（失败也记，CD照吃，防反复白嫖掷骰）
	//    品质→背包类型映射：1凡品→1普通材料；2珍品/3灵品→2稀有材料（player_inventory 体系）
	if success {
		itemType := 1
		if quality >= 2 {
			itemType = 2
		}
		if _, err := s.db.Exec(
			`INSERT INTO player_inventory (player_id, item_id, item_type, quantity, source)
			 VALUES (?, ?, ?, ?, 'gather')
			 ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)`,
			req.CharacterID, itemID, itemType, quantity,
		); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "产出入包失败: " + err.Error()})
			return
		}
	}
	s.db.Exec(
		"INSERT INTO char_gather_log (character_id, point_id, item_id, quantity) VALUES (?, ?, ?, ?)",
		req.CharacterID, req.PointID, itemID, quantity,
	)

	msg := "采集成功，获得【" + itemName + "】×1"
	if !success {
		msg = "采集完成，可惜【" + itemName + "】品相不佳未能收取（低概率资源）"
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: msg, Data: map[string]interface{}{
		"success":     success,
		"item_id":     itemID,
		"item_name":   itemName,
		"quality":     quality,  // 1凡品 2珍品 3灵品
		"quantity":    quantity, // 成功=1 失败=0
		"channel_s":   channelS, // 读条秒数（前端演出用）
		"gather_cd_s": gatherCD, // 本点位CD（前端倒计时用）
	}})
}

// ═══════════════════════════════════════════
//  POST /scene/move/validate  移动限速校验
// ═══════════════════════════════════════════
//
// 在现有 WS 移动同步链路（session-service gateway BroadcastToView）之上的
// 增量反作弊校验：客户端周期性上报米坐标，服务端按两次上报间的位移/时间差
// 验证速度 ≤ 7.5m/s（基础5 + 装备上限50%）+ 2米网络抖动余量。
// 超速 → 拒绝并回传最后合法坐标（前端拉回）；出界/禁区 → 同样拒绝。
//
// lastMoveRecords 用进程内存即可：限速校验是"软对抗"（拉回+日志），
// 服务重启丢失记录只是漏掉一次判定，无资产风险，不值得为它上 Redis。
var lastMoveRecords sync.Map // playerID(int64) → *moveRecord

type moveRecord struct {
	X, Y float64   // 最后一次合法坐标（米）
	At   time.Time // 上报时间
}

func (s *Service) HandleMoveValidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}
	var req struct {
		PlayerID   int64   `json:"player_id"`
		X          float64 `json:"x"`           // 当前上报坐标（米）
		Y          float64 `json:"y"`
		SpeedBonus float64 `json:"speed_bonus"` // 装备移速加成（0.2=+20%），服务端clamp到≤0.5
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.PlayerID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "player_id 必填"})
		return
	}

	// 出界/禁区校验（空气墙）
	zones, forbidden, err := s.loadZoneConfig()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "分区配置加载失败: " + err.Error()})
		return
	}
	zoneID, posOK, reason := ValidatePosition(req.X, req.Y, zones, forbidden)

	now := time.Now()
	maxSpeed := MaxAllowedSpeed(req.SpeedBonus)

	// 限速校验：与上一次合法坐标比位移
	speedOK := true
	actualSpeed := 0.0
	if v, ok := lastMoveRecords.Load(req.PlayerID); ok {
		rec := v.(*moveRecord)
		dt := now.Sub(rec.At).Seconds()
		if dt > 0.01 { // 间隔过小的重复上报不做判定（除零保护）
			dist := math.Hypot(req.X-rec.X, req.Y-rec.Y)
			allowed := maxSpeed*dt + MoveGraceMeters
			actualSpeed = dist / dt
			if dist > allowed {
				speedOK = false
			}
		}
	}

	if !posOK || !speedOK {
		// 拒绝：回传最后合法坐标让前端拉回（首次上报就非法则回传原点营地中心）
		lastX, lastY := 500.0, 500.0 // Zone1营地中心兜底
		if v, ok := lastMoveRecords.Load(req.PlayerID); ok {
			rec := v.(*moveRecord)
			lastX, lastY = rec.X, rec.Y
		}
		msg := reason
		code := 6002
		if posOK { // 位置合法但超速
			code = 6013
			msg = fmt.Sprintf("移动超速：%.1fm/s 超过上限 %.1fm/s", actualSpeed, maxSpeed)
		}
		writeJSON(w, 400, APIResponse{Code: code, Msg: msg, Data: map[string]interface{}{
			"valid":      false,
			"correct_x":  lastX, // 前端应把角色拉回到这个坐标
			"correct_y":  lastY,
			"max_speed":  maxSpeed,
		}})
		return
	}

	// 合法：更新最后合法坐标记录
	lastMoveRecords.Store(req.PlayerID, &moveRecord{X: req.X, Y: req.Y, At: now})
	writeJSON(w, 200, APIResponse{Code: 0, Data: map[string]interface{}{
		"valid":     true,
		"zone_id":   zoneID,
		"max_speed": maxSpeed,
	}})
}
