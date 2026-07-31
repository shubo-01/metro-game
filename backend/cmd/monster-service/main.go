// monster-service 野怪服务入口
// 负责初始之地野怪系统（领地/族群/怪物实体/协战倍率/抓捕/神兽唯一性/世界初始化）。
// 严格按照《寻仙 - 初始之地野怪系统 PRD+技术方案》实现。
// 端口：8008
//
// V5 新增路由（战斗地图轮回夺舍迭代，见 internal/monster/zone_v5.go）：
//   GET  /monster/divine-npc/status  神兽NPC状态（白泽/朱厌沉眠状态机，查询即懒结算）
//   POST /monster/divine-npc/hit     攻击神兽NPC（沉眠→持续攻击唤醒→秒杀反击→回沉眠）
// V5 增量改造（向后兼容）：
//   GET  /monster/list 新增可选参数 zone_id（按地图分区过滤怪物）
//   POST /monster/hit  死亡刷新CD改为分档（普通5分/精英10分/Boss30分/妖2小时）
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
	"xunxian/internal/middleware"
	"xunxian/internal/monster"
	"xunxian/internal/redis"
)

// 配置文件路径命令行参数（默认使用项目工作目录下的 configs/monster.yaml）
var configFile = flag.String("config", "configs/monster.yaml", "配置文件路径")

func main() {
	flag.Parse()

	// 服务启动时初始化全局随机数种子（用于五行随机分配、阶位随机、抓捕掷骰等）
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

	// ── 步骤4：创建野怪服务实例 ──
	svc := monster.NewService(db, rdb, cfg)

	// ── 步骤5：注册路由 ──
	mux := http.NewServeMux()

	// 野怪系统查询接口
	mux.HandleFunc("/monster/territories", svc.HandleTerritories)    // 领地列表
	mux.HandleFunc("/monster/faction", svc.HandleFaction)            // 族群信息（?territory_id=）
	mux.HandleFunc("/monster/list", svc.HandleMonsterList)           // 怪物实体列表（?faction_id=，含懒刷新）
	mux.HandleFunc("/monster/divine/status", svc.HandleDivineStatus) // 全服20只神兽状态
	mux.HandleFunc("/monster/ehp", svc.HandleEhp)                    // EHP查表（功法系统，见 internal/monster/ehp.go）

	// V5 神兽NPC沉眠状态机（白泽/朱厌，见 internal/monster/zone_v5.go）
	mux.HandleFunc("/monster/divine-npc/status", svc.HandleDivineNpcStatus) // 神兽NPC状态（懒结算）
	mux.HandleFunc("/monster/divine-npc/hit", svc.HandleDivineNpcHit)       // 攻击神兽NPC

	// 战斗/协战接口（服务端权威）
	mux.HandleFunc("/monster/coop/calc", svc.HandleCoopCalc) // 协战围攻倍率计算
	mux.HandleFunc("/monster/hit", svc.HandleMonsterHit)     // 怪物受击扣血

	// 抓捕系统接口
	mux.HandleFunc("/capture/attempt", svc.HandleCaptureAttempt) // 抓捕妖幼崽/神兽幼崽

	// 管理接口
	mux.HandleFunc("/monster/admin/init_world", svc.HandleAdminInitWorld) // 世界初始化（幂等）

	// 健康检查接口（供部署/监控用）
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"code":0,"msg":"ok","service":"monster-service"}`))
	})

	// ── 步骤6：启动 HTTP 服务 ──
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      middleware.CORS(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second, // 世界初始化涉及约6300条实体写入，写超时放宽
	}

	go func() {
		log.Printf("[monster-service] 启动于 %s", addr)
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
	log.Println("[monster-service] 已关闭")
}
