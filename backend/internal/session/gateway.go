package session

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"xunxian/internal/config"
	"xunxian/internal/redis"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ═══════════════════════════════════════════
//  客户端连接
// ═══════════════════════════════════════════

type Client struct {
	PlayerID   int64
	AccountID  int64
	Conn       *websocket.Conn
	LastHeart  time.Time
	LastSeq    uint32
	SendCh     chan []byte
}

// ═══════════════════════════════════════════
//  WebSocket 网关
// ═══════════════════════════════════════════

type Gateway struct {
	rdb     *redis.Client
	cfg     *config.Config
	mu      sync.RWMutex
	clients map[int64]*Client // playerID → client
}

func NewGateway(rdb *redis.Client, cfg *config.Config) *Gateway {
	return &Gateway{
		rdb:     rdb,
		cfg:     cfg,
		clients: make(map[int64]*Client),
	}
}

// HandleWebSocket 处理 WebSocket 升级
func (gw *Gateway) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", 401)
		return
	}

	// 验证 Token
	key := fmt.Sprintf("token:%s", token)
	accountIDStr, err := gw.rdb.Get(key)
	if err != nil {
		http.Error(w, "invalid token", 401)
		return
	}

	var accountID int64
	fmt.Sscanf(accountIDStr, "%d", &accountID)

	playerIDStr := r.URL.Query().Get("playerId")
	var playerID int64
	fmt.Sscanf(playerIDStr, "%d", &playerID)

	// 升级连接
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[session] WebSocket upgrade 失败: %v", err)
		return
	}

	// 单点登录：踢旧连接
	gw.kickOldConnection(playerID)

	client := &Client{
		PlayerID:  playerID,
		AccountID: accountID,
		Conn:      conn,
		LastHeart: time.Now(),
		SendCh:    make(chan []byte, 256),
	}

	gw.mu.Lock()
	gw.clients[playerID] = client
	gw.mu.Unlock()

	log.Printf("[session] 玩家 %d 上线", playerID)

	// 启动读写协程
	go gw.readLoop(client)
	go gw.writeLoop(client)
}

// readLoop 读取客户端消息
func (gw *Gateway) readLoop(client *Client) {
	defer func() {
		gw.disconnect(client)
	}()

	for {
		_, msgBytes, err := client.Conn.ReadMessage()
		if err != nil {
			return
		}

		var msg struct {
			Type    string          `json:"type"`
			Payload json.RawMessage `json:"payload"`
		}
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "heartbeat":
			client.LastHeart = time.Now()
			ack := map[string]interface{}{
				"type":    "heartbeat_ack",
				"payload": map[string]int64{"serverTime": time.Now().UnixMilli()},
			}
			data, _ := json.Marshal(ack)
			client.Conn.WriteMessage(websocket.TextMessage, data)

		case "move":
			var move struct {
				X   float32 `json:"x"`
				Y   float32 `json:"y"`
				Seq uint32  `json:"seq"`
				Dir int     `json:"dir"`
			}
			json.Unmarshal(msg.Payload, &move)
			client.LastSeq = move.Seq
			// TODO: 广播移动给其他可见客户端（通过 scene-service）

		case "chat":
			// TODO: 转发聊天消息

		case "reconnect":
			// 重连：恢复状态
			client.LastHeart = time.Now()
			ack := map[string]interface{}{
				"type":    "reconnect_ack",
				"payload": map[string]interface{}{"serverSeq": client.LastSeq},
			}
			data, _ := json.Marshal(ack)
			client.Conn.WriteMessage(websocket.TextMessage, data)
		}
	}
}

// writeLoop 向客户端发送消息
func (gw *Gateway) writeLoop(client *Client) {
	for msg := range client.SendCh {
		client.Conn.WriteMessage(websocket.TextMessage, msg)
	}
}

// disconnect 断开连接
func (gw *Gateway) disconnect(client *Client) {
	gw.mu.Lock()
	defer gw.mu.Unlock()
	if c, ok := gw.clients[client.PlayerID]; ok && c == client {
		delete(gw.clients, client.PlayerID)
		client.Conn.Close()
		log.Printf("[session] 玩家 %d 下线", client.PlayerID)
	}
}

// kickOldConnection 踢下线旧连接
func (gw *Gateway) kickOldConnection(playerID int64) {
	gw.mu.RLock()
	old, ok := gw.clients[playerID]
	gw.mu.RUnlock()
	if !ok {
		return
	}
	// 发送踢下线消息
	kick := map[string]interface{}{
		"type":    "kick_out",
		"payload": map[string]string{"reason": "账号已在其他设备登录"},
	}
	data, _ := json.Marshal(kick)
	old.SendCh <- data
	time.Sleep(100 * time.Millisecond)
	old.Conn.Close()
}

// HeartbeatLoop 心跳超时检测（30s 无心跳断开）
func (gw *Gateway) HeartbeatLoop() {
	ticker := time.NewTicker(10 * time.Second)
	for range ticker.C {
		gw.mu.RLock()
		now := time.Now()
		var timeout []*Client
		for _, c := range gw.clients {
			if now.Sub(c.LastHeart) > 30*time.Second {
				timeout = append(timeout, c)
			}
		}
		gw.mu.RUnlock()

		for _, c := range timeout {
			log.Printf("[session] 玩家 %d 心跳超时，断开", c.PlayerID)
			gw.disconnect(c)
		}
	}
}

// BroadcastToView 向可视范围内玩家广播（由 scene-service 调用）
func (gw *Gateway) BroadcastToView(playerIDs []int64, msgType string, payload interface{}) {
	data := map[string]interface{}{"type": msgType, "payload": payload}
	msgBytes, _ := json.Marshal(data)
	gw.mu.RLock()
	defer gw.mu.RUnlock()
	for _, pid := range playerIDs {
		if c, ok := gw.clients[pid]; ok {
			select {
			case c.SendCh <- msgBytes:
			default:
			}
		}
	}
}
