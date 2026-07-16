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

	"xunxian/internal/auth"
	"xunxian/internal/config"
	"xunxian/internal/database"
	"xunxian/internal/redis"
)

var configFile = flag.String("config", "configs/auth.yaml", "配置文件路径")

func main() {
	flag.Parse()

	// 加载配置
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化数据库
	db, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("连接MySQL失败: %v", err)
	}
	defer db.Close()

	// 初始化 Redis
	rdb, err := redis.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("连接Redis失败: %v", err)
	}
	defer rdb.Close()

	// 初始化 auth service
	svc := auth.NewService(db, rdb, cfg)

	// HTTP 路由
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/wx-login", svc.HandleWxLogin)
	mux.HandleFunc("/auth/tt-login", svc.HandleTtLogin)
	mux.HandleFunc("/auth/phone-login", svc.HandlePhoneLogin)
	mux.HandleFunc("/auth/send-code", svc.HandleSendCode)
	mux.HandleFunc("/auth/bind-phone", svc.HandleBindPhone)
	mux.HandleFunc("/auth/confirm-bind", svc.HandleConfirmBind)
	mux.HandleFunc("/auth/refresh-token", svc.HandleRefreshToken)
	mux.HandleFunc("/auth/check", svc.HandleCheckToken)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// 优雅关闭
	go func() {
		log.Printf("[auth-service] 启动于 %s", addr)
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
	log.Println("[auth-service] 已关闭")
}
