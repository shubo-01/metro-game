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

	"xunxian/internal/character"
	"xunxian/internal/config"
	"xunxian/internal/database"
	"xunxian/internal/gongfa"
	"xunxian/internal/middleware"
	"xunxian/internal/redis"
	"xunxian/internal/shenwei"
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

	// 创建神位服务（花果山神位继承系统，实现见 internal/shenwei）
	swSvc := shenwei.NewService(db)

	// 创建功法服务（功法/技能/经验/打坐系统，实现见 internal/gongfa）
	gfSvc := gongfa.NewService(db)

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

	// ── 人物系统属性 V2 新增路由（实现见 internal/character/handler_v2.go）──
	mux.HandleFunc("/character/points/allocate", svc.HandleAllocatePoints)   // 分配自由属性点
	mux.HandleFunc("/character/points/wash", svc.HandleWashPoints)           // 洗点（重置自由点）
	mux.HandleFunc("/character/dao/gain", svc.HandleDaoGain)                 // 积攒神魔之道
	mux.HandleFunc("/character/dao/breakthrough", svc.HandleDaoBreakthrough) // 神魔子阶突破
	mux.HandleFunc("/character/shield", svc.HandleShield)                    // 查询护盾/气血状态
	mux.HandleFunc("/combat/skill", svc.HandleCombatSkill)                   // 技能伤害结算（全链路）
	mux.HandleFunc("/combat/abnormal", svc.HandleCombatAbnormal)             // 异常状态判定与施加
	mux.HandleFunc("/combat/shield/recover", svc.HandleShieldRecover)        // 脱战护盾恢复
	mux.HandleFunc("/combat/burn/tick", svc.HandleBurnTick)                  // 灼烧持续掉血结算（每秒一跳）

	// ── 神位系统路由（实现见 internal/shenwei/handler.go）──
	mux.HandleFunc("/shenwei/info", swSvc.HandleInfo)             // 神位总览（当前/背包/碎片/归元符/灵石）
	mux.HandleFunc("/shenwei/synthesize", swSvc.HandleSynthesize) // 碎片合成（7碎片→1神位）
	mux.HandleFunc("/shenwei/fuse", swSvc.HandleFuse)             // 神位融合（9同品级同属性系→高一阶）
	mux.HandleFunc("/shenwei/inherit", swSvc.HandleInherit)       // 神位继承（门槛校验+永久解锁+激活）
	mux.HandleFunc("/shenwei/switch", swSvc.HandleSwitch)         // 神位切换（付费，晋升免费）
	mux.HandleFunc("/shenwei/grant", swSvc.HandleGrant)           // 内部发放（仅信任本机/共享密钥）

	// ── 功法技能经验系统路由（实现见 internal/gongfa/handler.go）──
	mux.HandleFunc("/gongfa/learn", gfSvc.HandleLearn)                    // 学习功法（完整优先/9碎片合成，含走火判定）
	mux.HandleFunc("/gongfa/forget", gfSvc.HandleForget)                  // 遗忘功法（灵石+孟遗汤扣费，不返还）
	mux.HandleFunc("/gongfa/list", gfSvc.HandleList)                      // 功法总览（背包/已学/打坐状态/走火状态）
	mux.HandleFunc("/gongfa/meditate/start", gfSvc.HandleMeditateStart)   // 开始打坐（需已学功法，日上限4小时）
	mux.HandleFunc("/gongfa/meditate/settle", gfSvc.HandleMeditateSettle) // 打坐中途结算（10分钟/单位）
	mux.HandleFunc("/gongfa/meditate/end", gfSvc.HandleMeditateEnd)       // 结束打坐（结算后停止）
	mux.HandleFunc("/gongfa/exp/kill", gfSvc.HandleKillExp)               // 击杀怪物获得功法XP（三属性同额）
	mux.HandleFunc("/skill/learn", gfSvc.HandleSkillLearn)                // 学习技能（9碎片合成1完整，含走火判定）
	mux.HandleFunc("/skill/forget", gfSvc.HandleSkillForget)              // 遗忘技能（扣费+卸下所有栏位）
	mux.HandleFunc("/skill/list", gfSvc.HandleSkillList)                  // 技能总览（背包/栏位/可装配状态）
	mux.HandleFunc("/skill/slot/set", gfSvc.HandleSlotSet)                // 技能栏装配/卸下（主动1-10/被动1-4）

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
