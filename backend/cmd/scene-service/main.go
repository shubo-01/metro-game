// scene-service 场景服务入口
// 负责场景进出、AOI视野同步、场景交互、场景聊天
//
// V5 新增路由（战斗地图轮回夺舍迭代，见 internal/scene/zone.go）：
//   GET  /scene/zone/info      地图分区信息（Zone1营地/Zone2外围/Zone3峡谷+空气墙禁区+移速规则）
//   POST /scene/zone/enter     进入分区（边界合法性校验+无缝切换标记）
//   POST /scene/gather         采集（存在性+距离≤5米+CD校验，产出进 player_inventory）
//   POST /scene/move/validate  移动限速校验（基础5m/s+装备加成上限50%）
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"xunxian/internal/middleware"
	"xunxian/internal/config"
	"xunxian/internal/database"
	"xunxian/internal/redis"
	"xunxian/internal/scene"
)

var configFile = flag.String("config", "configs/scene.yaml", "配置文件路径")

func main() {
	flag.Parse()

	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	db, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("连接MySQL失败: %v", err)
	}
	defer db.Close()

	rdb, err := redis.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("连接Redis失败: %v", err)
	}
	defer rdb.Close()

	svc := scene.NewService(db, rdb, cfg)

	mux := http.NewServeMux()
	mux.HandleFunc("/scene/enter", svc.HandleEnter)
	mux.HandleFunc("/scene/leave", svc.HandleLeave)
	mux.HandleFunc("/scene/interact", svc.HandleInteract)
	mux.HandleFunc("/scene/chat", svc.HandleChat)
	// ── V5 战斗地图轮回夺舍迭代新增（zone.go）──
	mux.HandleFunc("/scene/zone/info", svc.HandleZoneInfo)           // 分区信息
	mux.HandleFunc("/scene/zone/enter", svc.HandleZoneEnter)         // 进入分区
	mux.HandleFunc("/scene/gather", svc.HandleGather)                // 采集
	mux.HandleFunc("/scene/move/validate", svc.HandleMoveValidate)   // 移动限速校验

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{Addr: addr, Handler: middleware.CORS(mux), ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second}

	go func() {
		log.Printf("[scene-service] 启动于 %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务异常: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Println("[scene-service] 已关闭")
}
