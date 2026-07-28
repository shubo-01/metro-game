// character-service 角色服务入口
// 负责角色创建、属性读写、境界管理、经验累积、五行修炼
// 端口：8005
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
	"xunxian/internal/character"
	"xunxian/internal/config"
	"xunxian/internal/database"
	"xunxian/internal/redis"
)

var configFile = flag.String("config", "configs/character.yaml", "配置文件路径")

func main() {
	flag.Parse()

	// 加载配置
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 连接 MySQL
	db, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("连接MySQL失败: %v", err)
	}
	defer db.Close()

	// 连接 Redis
	rdb, err := redis.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("连接Redis失败: %v", err)
	}
	defer rdb.Close()

	// 创建角色服务
	svc := character.NewService(db, rdb, cfg)

	// 注册路由
	mux := http.NewServeMux()
	mux.HandleFunc("/character/create", svc.HandleCreate)
	mux.HandleFunc("/character/info", svc.HandleInfo)
	mux.HandleFunc("/character/attributes", svc.HandleAttributes)
	mux.HandleFunc("/character/exp/add", svc.HandleExpAdd)
	mux.HandleFunc("/character/realm/upgrade", svc.HandleRealmUpgrade)
	mux.HandleFunc("/character/realm/breakthrough", svc.HandleBreakthrough)
	mux.HandleFunc("/character/qi/cultivate", svc.HandleQiCultivate)
	mux.HandleFunc("/character/qi/elements", svc.HandleQiElements)

	// 启动服务
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{Addr: addr, Handler: middleware.CORS(mux), ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second}

	go func() {
		log.Printf("[character-service] 启动于 %s", addr)
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
	log.Println("[character-service] 已关闭")
}
