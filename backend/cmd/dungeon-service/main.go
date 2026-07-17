package main
// dungeon-service 副本服务入口
// 负责花果山副本流程（进入/观测/结算/奖励）以及牢结值系统（消耗/打坐/道具）。
// 严格按照《寻仙-花果山副本设计文档 V3》和《花果山副本技术方案》实现。
// 端口：8007
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"xunxian/internal/config"
	"xunxian/internal/database"
	"xunxian/internal/dungeon"
	"xunxian/internal/redis"
)

// 配置文件路径命令行参数（默认使用项目工作目录下的 configs/dungeon.yaml）
var configFile = flag.String("config", "configs/dungeon.yaml", "配置文件路径")

func main() {
	flag.Parse()

	// 服务启动时初始化全局随机数种子（用于身份抽取、掉率判定、死亡描述加权采样等）
	// Go 1.20+ 已默认自动种子化，但显式设置以保证兼容性
	rand.Seed(time.Now().UnixNano())

	// ── 步骤1：加载 YAML 配置 ──
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// ── 步骤2：连接 MySQL ──
	db, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("连接MySQL失败: %v", err)
	}
	defer db.Close()

	// ── 步骤3：连接 Redis（Memurai 兼容）──
	rdb, err := redis.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("连接Redis失败: %v", err)
	}
	defer rdb.Close()

	// ── 步骤4：创建副本服务实例 ──
	svc := dungeon.NewService(db, rdb, cfg)

	// ── 步骤5：注册路由 ──
	mux := http.NewServeMux()

	// 花果山副本相关接口（技术方案 P193-P240 REST 定义）
	mux.HandleFunc("/dungeon/huaguoshan/enter", svc.HandleEnter)       // 进入副本，抽取身份
	mux.HandleFunc("/dungeon/huaguoshan/observe", svc.HandleObserve)   // 上报观测事件（草木石头）
	mux.HandleFunc("/dungeon/huaguoshan/settle", svc.HandleSettle)     // 结算副本
	mux.HandleFunc("/dungeon/huaguoshan/session", svc.HandleSessionInfo) // 查询会话状态（断线重连）
	mux.HandleFunc("/dungeon/huaguoshan/probs", svc.HandleProbsPreview)  // 查询当前概率（入口预览）

	// 牢结值系统相关接口（技术方案第5章）
	mux.HandleFunc("/fatigue/state", svc.HandleFatigueState)                  // 查询牢结值
	mux.HandleFunc("/fatigue/consume", svc.HandleFatigueConsume)              // 在线消耗
	mux.HandleFunc("/fatigue/meditate/start", svc.HandleMeditateStart)        // 开始打坐
	mux.HandleFunc("/fatigue/meditate/end", svc.HandleMeditateEnd)            // 结束打坐
	mux.HandleFunc("/fatigue/item/use", svc.HandleFatigueItemUse)             // 使用恢复道具

	// 健康检查接口（供部署/监控用）
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"code":0,"msg":"ok","service":"dungeon-service"}`))
	})

	// ── 步骤6：启动 HTTP 服务 ──
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second, // 结算涉及多次DB写入，读写超时相对宽松
	}

	go func() {
		log.Printf("[dungeon-service] 启动于 %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务异常: %v", err)
		}
	}()

	// ── 步骤7：优雅关闭 ──
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	log.Println("[dungeon-service] 已关闭")
}
