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
