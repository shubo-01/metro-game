package scene

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sync"

	"xunxian/internal/config"
	"xunxian/internal/redis"
)

// ═══════════════════════════════════════════
//  AOI 参数（技术方案定义）
// ═══════════════════════════════════════════
const (
	GridSize     = 256  // 每个网格 256 像素
	ViewRadius   = 768  // 可视半径 768 像素（3×3 网格）
	SyncInterval = 100  // 同步间隔 100ms
	MaxPerGrid   = 100  // 单网格最大实体数
)

// ═══════════════════════════════════════════
//  实体与 AOI 管理
// ═══════════════════════════════════════════

type Entity struct {
	ID         int64   `json:"entityId"`
	Name       string  `json:"name"`
	Gender     int     `json:"gender"`
	EntityType int     `json:"entityType"` // 1=player 2=npc
	LevelStage int     `json:"levelStage"`
	LevelTier  int     `json:"levelTier"`
	X          float32 `json:"x"`
	Y          float32 `json:"y"`
	Dir        int     `json:"dir"`
	Action     int     `json:"action"`
}

type AOIManager struct {
	mu     sync.RWMutex
	grids  map[string][]int64           // gridKey → entityIDs
	entities map[int64]*Entity           // entityID → entity
}

func NewAOIManager() *AOIManager {
	return &AOIManager{
		grids:    make(map[string][]int64),
		entities: make(map[int64]*Entity),
	}
}

func gridKey(gx, gy int) string {
	return fmt.Sprintf("%d:%d", gx, gy)
}

func calcGrid(x, y float32) (int, int) {
	return int(x) / GridSize, int(y) / GridSize
}

func (aoi *AOIManager) AddEntity(e *Entity) {
	aoi.mu.Lock()
	defer aoi.mu.Unlock()
	gx, gy := calcGrid(e.X, e.Y)
	key := gridKey(gx, gy)
	aoi.grids[key] = append(aoi.grids[key], e.ID)
	aoi.entities[e.ID] = e
}

func (aoi *AOIManager) RemoveEntity(id int64) {
	aoi.mu.Lock()
	defer aoi.mu.Unlock()
	e, ok := aoi.entities[id]
	if !ok {
		return
	}
	gx, gy := calcGrid(e.X, e.Y)
	key := gridKey(gx, gy)
	ids := aoi.grids[key]
	for i, v := range ids {
		if v == id {
			aoi.grids[key] = append(ids[:i], ids[i+1:]...)
			break
		}
	}
	delete(aoi.entities, id)
}

func (aoi *AOIManager) UpdatePosition(id int64, x, y float32) {
	aoi.mu.Lock()
	defer aoi.mu.Unlock()
	e, ok := aoi.entities[id]
	if !ok {
		return
	}
	oldGx, oldGy := calcGrid(e.X, e.Y)
	newGx, newGy := calcGrid(x, y)
	if oldGx != newGx || oldGy != newGy {
		// 移动到新网格
		oldKey := gridKey(oldGx, oldGy)
		newKey := gridKey(newGx, newGy)
		ids := aoi.grids[oldKey]
		for i, v := range ids {
			if v == id {
				aoi.grids[oldKey] = append(ids[:i], ids[i+1:]...)
				break
			}
		}
		aoi.grids[newKey] = append(aoi.grids[newKey], id)
	}
	e.X = x
	e.Y = y
}

func (aoi *AOIManager) GetEntitiesInView(x, y float32) []*Entity {
	aoi.mu.RLock()
	defer aoi.mu.RUnlock()
	gx, gy := calcGrid(x, y)
	var result []*Entity
	// 3×3 网格范围
	for dx := -1; dx <= 1; dx++ {
		for dy := -1; dy <= 1; dy++ {
			key := gridKey(gx+dx, gy+dy)
			for _, id := range aoi.grids[key] {
				if e, ok := aoi.entities[id]; ok {
					result = append(result, e)
				}
			}
		}
	}
	return result
}

// ═══════════════════════════════════════════
//  Scene Service
// ═══════════════════════════════════════════

type Service struct {
	db  *sql.DB
	rdb *redis.Client
	cfg *config.Config
	aoi *AOIManager
}

func NewService(db *sql.DB, rdb *redis.Client, cfg *config.Config) *Service {
	svc := &Service{db: db, rdb: rdb, cfg: cfg, aoi: NewAOIManager()}
	// 预加载 NPC
	svc.loadNPCs()
	return svc
}

func (s *Service) loadNPCs() {
	npcs := []*Entity{
		{ID: -1, Name: "张真人", X: 500, Y: 400, EntityType: 2},
		{ID: -2, Name: "药铺掌柜", X: 900, Y: 350, EntityType: 2},
		{ID: -3, Name: "铸器师", X: 1300, Y: 500, EntityType: 2},
	}
	for _, npc := range npcs {
		s.aoi.AddEntity(npc)
	}
}

type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

func (s *Service) HandleEnter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		PlayerID int64 `json:"playerId"`
		SceneID  int   `json:"sceneId"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 查角色信息
	row := s.db.QueryRow(
		"SELECT p.name, p.gender, p.level_stage, p.level_tier, p.pos_x, p.pos_y FROM game_main.players p WHERE p.id=?",
		req.PlayerID,
	)
	var name string
	var gender, levelStage, levelTier int
	var posX, posY float32
	if err := row.Scan(&name, &gender, &levelStage, &levelTier, &posX, &posY); err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 加入 AOI
	entity := &Entity{
		ID: req.PlayerID, Name: name, Gender: gender, EntityType: 1,
		LevelStage: levelStage, LevelTier: levelTier,
		X: posX, Y: posY, Dir: 0, Action: 0,
	}
	s.aoi.AddEntity(entity)

	// 更新在线状态
	s.db.Exec("UPDATE game_main.players SET is_online=1 WHERE id=?", req.PlayerID)

	// 获取可见实体
	entities := s.aoi.GetEntitiesInView(posX, posY)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"entities": entities,
			"posX":     posX,
			"posY":     posY,
		},
	})
}

func (s *Service) HandleLeave(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PlayerID int64 `json:"playerId"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	s.aoi.RemoveEntity(req.PlayerID)
	s.db.Exec("UPDATE game_main.players SET is_online=0 WHERE id=?", req.PlayerID)
	writeJSON(w, 200, APIResponse{Code: 0})
}

func (s *Service) HandleInteract(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PlayerID int64  `json:"playerId"`
		NPCID    int    `json:"npcId"`
		Action   string `json:"action"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// 检查距离
	s.aoi.mu.RLock()
	player := s.aoi.entities[req.PlayerID]
	npc := s.aoi.entities[int64(-req.NPCID)]
	s.aoi.mu.RUnlock()

	if player == nil || npc == nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "NPC不存在"})
		return
	}

	dist := math.Sqrt(float64((player.X-npc.X)*(player.X-npc.X) + (player.Y-npc.Y)*(player.Y-npc.Y)))
	if dist > 150 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "距离过远"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]string{"type": req.Action, "data": "{}"},
	})
}

func (s *Service) HandleChat(w http.ResponseWriter, r *http.Request) {
	// TODO: 聊天功能实现
	writeJSON(w, 200, APIResponse{Code: 0})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
