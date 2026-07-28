package main

// equipment-service 装备服务入口
// 负责装备系统（穿戴/加成/套装/升级/耐久修理/打造/掉落/碎片合成/神位继承/交易/背包容量）。
// 严格按照《寻仙·装备系统 PRD+技术方案》实现。
// 端口：8009
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
	"xunxian/internal/equipment"
	"xunxian/internal/middleware"
	"xunxian/internal/redis"
)

// 配置文件路径命令行参数（默认使用项目工作目录下的 configs/equipment.yaml）
var configFile = flag.String("config", "configs/equipment.yaml", "配置文件路径")

func main() {
	flag.Parse()

	// 服务启动时初始化全局随机数种子（用于掉落判定、升级/打造掷骰、附加属性随机等）
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

	// ── 步骤4：创建装备服务实例 ──
	svc := equipment.NewService(db, rdb, cfg)

	// ── 步骤5：注册路由 ──
	mux := http.NewServeMux()

	// 装备查询/穿戴接口
	mux.HandleFunc("/equipment/list", svc.HandleList)         // 玩家全部装备列表
	mux.HandleFunc("/equipment/equipped", svc.HandleEquipped) // 已穿戴装备列表
	mux.HandleFunc("/equipment/equip", svc.HandleEquip)       // 穿戴（含境界校验+套装触发）
	mux.HandleFunc("/equipment/unequip", svc.HandleUnequip)   // 卸下（套装解除）
	mux.HandleFunc("/equipment/bonus", svc.HandleBonus)       // 加成汇总（精/神/气+附加属性+套装）

	// 升级/耐久/修理接口
	mux.HandleFunc("/equipment/upgrade", svc.HandleUpgrade)                      // 装备升级（失败惩罚分段）
	mux.HandleFunc("/equipment/repair", svc.HandleRepair)                        // 修理（耐久恢复300）
	mux.HandleFunc("/equipment/durability/consume", svc.HandleDurabilityConsume) // 耐久消耗（战斗调用）

	// 掉落接口（击杀怪物后由野怪/副本服务调用）
	mux.HandleFunc("/equipment/drop/roll", svc.HandleDropRoll) // 掉落判定（含神话50%转3碎片）

	// 打造系统接口
	mux.HandleFunc("/craft/do", svc.HandleCraftDo)            // 执行打造（品级×品质矩阵）
	mux.HandleFunc("/craft/level", svc.HandleCraftLevel)      // 打造品级查询
	mux.HandleFunc("/craft/daobao", svc.HandleDaobaoCombine)  // 道宝合成（宗师满级10仙宝）

	// 神话碎片/神位继承接口
	mux.HandleFunc("/shard/combine", svc.HandleShardCombine)         // 碎片合成（3片合1）
	mux.HandleFunc("/inherit/activate", svc.HandleInheritActivate)   // 神位继承激活
	mux.HandleFunc("/inherit/duel-lost", svc.HandleInheritDuelLost)  // 大道争锋失败结算

	// 交易系统接口
	mux.HandleFunc("/trade/create", svc.HandleTradeCreate)   // 创建挂单
	mux.HandleFunc("/trade/execute", svc.HandleTradeExecute) // 成交

	// 背包容量接口（腰带扩展）
	mux.HandleFunc("/inventory/capacity", svc.HandleInventoryCapacity)

	// 健康检查接口（供部署/监控用）
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"code":0,"msg":"ok","service":"equipment-service"}`))
	})

	// ── 步骤6：启动 HTTP 服务 ──
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      middleware.CORS(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	go func() {
		log.Printf("[equipment-service] 启动于 %s", addr)
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
	log.Println("[equipment-service] 已关闭")
}
