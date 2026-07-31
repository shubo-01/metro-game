// death-service 死亡服务入口
// 负责死亡处理、六道轮回、鬼修转换、尸修转换、夺舍、兽身、遗迹洞府（秘境）、公敌与天雷系统
// 端口：8006
//
// V5 新增路由（战斗地图轮回夺舍迭代，见 internal/death/handler_v5.go）：
//   POST /death/corpse/enter   转入尸修（神→0、精=原精+神×2/3、气=气/3，与鬼修互斥）
//   POST /death/corpse/exit    退出尸修（神仍为0不可逆）
//   POST /death/thunder/check  天雷懒结算（公敌登录/到期触发，伤害=800×4×ratio×9）
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
	"xunxian/internal/death"
	"xunxian/internal/redis"
)

var configFile = flag.String("config", "configs/death.yaml", "配置文件路径")

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

	svc := death.NewService(db, rdb, cfg)

	mux := http.NewServeMux()
	mux.HandleFunc("/death/trigger", svc.HandleTrigger)
	mux.HandleFunc("/death/reincarnation", svc.HandleReincarnation)
	mux.HandleFunc("/death/ghost/enter", svc.HandleGhostEnter)
	mux.HandleFunc("/death/ghost/exit", svc.HandleGhostExit)
	mux.HandleFunc("/death/possess/start", svc.HandlePossessStart)
	mux.HandleFunc("/death/possess/result", svc.HandlePossessResult)
	mux.HandleFunc("/death/beast/transform", svc.HandleBeastTransform)
	mux.HandleFunc("/death/ruins/create", svc.HandleRuinsCreate)
	mux.HandleFunc("/death/ruins/inherit", svc.HandleRuinsInherit)
	mux.HandleFunc("/death/state", svc.HandleDeathState) // 查询角色死亡状态（含夺舍次数）
	mux.HandleFunc("/death/public-enemy/status", svc.HandlePublicEnemyStatus)
	// ── V5 战斗地图轮回夺舍迭代新增（handler_v5.go）──
	mux.HandleFunc("/death/corpse/enter", svc.HandleCorpseEnter)     // 转入尸修
	mux.HandleFunc("/death/corpse/exit", svc.HandleCorpseExit)       // 退出尸修
	mux.HandleFunc("/death/thunder/check", svc.HandleThunderCheck)   // 天雷懒结算

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{Addr: addr, Handler: middleware.CORS(mux), ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second}

	go func() {
		log.Printf("[death-service] 启动于 %s", addr)
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
	log.Println("[death-service] 已关闭")
}
