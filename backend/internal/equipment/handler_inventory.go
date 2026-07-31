// handler_inventory.go 基础UI交互逻辑迭代（V6）新增：背包列表 + 消耗品使用 + 商店买卖。
// 依据《基础UI交互逻辑PRD》第7章（背包面板交互）、第8章（商店面板交互）、
// 9.1（战斗中使用背包举例：凡品药回复精×5、CD10秒）与《基础UI交互逻辑-技术文档》。
//
// 本文件新增路由（在 cmd/equipment-service/main.go 注册）：
//   GET  /inventory/list       背包物品聚合列表（分 item_type）+ 容量信息
//   POST /inventory/item/use   使用消耗品（数量-1，事务+FOR UPDATE）
//   GET  /shop/list            商店商品分类列表（读 shop_item_config）
//   POST /shop/buy             购买（扣灵石，物品入背包）
//   POST /shop/sell            出售（扣物品，灵石入账，回收价=购买价50%）
//
// 错误码分配（64xx 段：背包/商店）：
//   6411 物品数量不足        6412 该物品不可使用（无使用效果配置）
//   6413 物品冷却中          6421 灵石不足
//   6422 商品不存在或已下架  6423 该物品不可出售
//
// 复用既有资产（不新建重复表）：
//   - 物品仓库 player_inventory（花果山/采集/秘境三处已在写），灵石 char_currency
//   - 背包容量沿用装备系统腰带扩展（calcInventoryCapacity 与 /inventory/capacity 同一份逻辑）
//   - 物品的装备/分解/修理/强化等操作走既有 /equipment/* 接口，本文件不重复实现
//
// 【偏离文档说明·既定裁决】技术文档 6.1/6.2 的 UIPanelService（面板状态）与
// DamageNumberService（伤害数字 Redis 队列）不做后端实现，由前端承担。
package equipment

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

// ═══════════════════════════════════════════
//  V6 常量（数值出处：PRD 第8章 + v6_ui_system.sql 注释约定）
// ═══════════════════════════════════════════

const (
	// player_inventory.item_type 的 UI 系统新增段（与 character 包 handler_ui.go 一致，
	// 既有 1=普通材料 2=稀有材料 3=功法残卷 4=兵器残块 5=铠甲残块 6=唯一性）
	UIItemTypeConsumable = 7 // 消耗品（药品/符箓）
	UIItemTypeWeaponItem = 8 // 武器物品

	// 使用效果类型（item_use_config.effect_type）
	UseEffectHealHP   = 1 // 恢复气血：回复量 = 有效精 × effect_param（PRD 9.1：精×5）
	UseEffectFrontend = 2 // 纯前端效果（如挪移符传送），服务端只扣数量

	// 物品来源标记（player_inventory.source，唯一键 player_id+item_id+source）
	SourceShop = "shop" // 商店购买入包
)

// ═══════════════════════════════════════════
//  V6 归属校验（新接口会动灵石与背包，必须防越权）
// ═══════════════════════════════════════════

// getAccountID 从请求头 X-Account-ID 读取账号ID（与 character/death 两服务口径完全一致）。
// 头缺失或非数字返回0（视为未认证）。
func getAccountID(r *http.Request) int64 {
	v := r.Header.Get("X-Account-ID")
	if v == "" {
		return 0
	}
	var id int64
	fmt.Sscanf(v, "%d", &id)
	return id
}

// assertPlayerOwner 校验"当前请求的账号"是否是该角色的主人（防越权核心）。
// 与 character 包 handler_v2.go / death 包 handler_v5.go 的同名函数同一套判定：
//   未带账号头 → 401；角色不存在 → 404；account_id 不匹配 → 403。
// 返回 false 时错误响应已写好，调用方直接 return。
func (s *Service) assertPlayerOwner(w http.ResponseWriter, r *http.Request, playerID int64) bool {
	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Code: 401, Msg: "未认证"})
		return false
	}
	var ownerID int64
	err := s.db.QueryRow("SELECT account_id FROM character_base WHERE character_id=?", playerID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, APIResponse{Code: 404, Msg: "角色不存在"})
		return false
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询角色归属失败"})
		return false
	}
	if ownerID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Code: 403, Msg: "无权操作他人角色"})
		return false
	}
	return true
}

// ═══════════════════════════════════════════
//  背包容量共用逻辑（HandleInventoryCapacity 与 /inventory/list 共用一份，绝不复制）
// ═══════════════════════════════════════════

// calcInventoryCapacity 计算玩家背包容量（基础20格 + 已穿腰带品质扩展）。
// 腰带扩展：凡+2 珍+4 灵+6 仙+8 神话+10 道+12 先天+16（equip_quality_config 配置）；
// 快捷栏格数为腰带扩展格数减半（PRD 第十三章腰带扩展 + 技术方案第十一章）。
// 返回：腰带扩展格数、腰带快捷栏格数、仓库已占用格数。
func (s *Service) calcInventoryCapacity(playerID int64) (beltExtra, beltQuick, warehouseUsed int) {
	// 查询已穿戴的腰带（slot_type=8），品质决定扩展格数
	var beltQuality int
	err := s.db.QueryRow(`SELECT quality FROM equipment_instance
		WHERE owner_id = ? AND slot_type = ? AND is_equipped = 1 AND status = 0`,
		playerID, SlotBelt).Scan(&beltQuality)
	if err == nil {
		if qc, ok := s.getQualityConfig(beltQuality); ok {
			beltExtra = qc.BeltExtraSlots
			beltQuick = qc.BeltQuickSlots
		}
	}

	// 仓库容量（房产系统预留，当前返回已占用格数）
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM player_warehouse WHERE player_id = ?`, playerID).Scan(&warehouseUsed)
	return beltExtra, beltQuick, warehouseUsed
}

// ═══════════════════════════════════════════
//  GET /inventory/list  背包物品聚合列表
// ═══════════════════════════════════════════
//
// 请求：GET /inventory/list?player_id=1[&item_type=7]
//   item_type 可选，传了就只返回该类型（背包面板的类型 Tab 用）；不传返回全部。
//
// 返回：物品清单（同物品跨来源合并数量）+ 灵石余额 + 容量信息 + 已占格数。
// 物品名称来源优先级：商店配置(shop_item_config) → 采集点配置(gather_point_config)
// → 兜底"物品{id}"（两张配置表都是只读，不改 scene/装备两包任何逻辑）。
func (s *Service) HandleInventoryList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}
	// 归属校验：只能查自己的背包（未认证401/角色不存在404/非本人403）
	if !s.assertPlayerOwner(w, r, playerID) {
		return
	}
	itemTypeFilter := int(queryInt64(r, "item_type")) // 0=不过滤

	// 同物品可能有多条来源行（唯一键 player_id+item_id+source），按 item_id 合并数量；
	// 名称/售价/可否出售/使用效果全部左连配置表，一次查完给前端渲染格子用。
	rows, err := s.db.Query(`
		SELECT pi.item_id, pi.item_type, SUM(pi.quantity) AS qty,
		       COALESCE(sc.item_name, gc.item_name, uc.item_name, CONCAT('物品', pi.item_id)) AS item_name,
		       COALESCE(sc.sell_price, 0)  AS sell_price,
		       COALESCE(sc.sellable, 0)    AS sellable,
		       COALESCE(uc.effect_type, 0) AS effect_type,
		       COALESCE(uc.cd_seconds, 0)  AS cd_seconds
		  FROM player_inventory pi
		  LEFT JOIN shop_item_config sc ON sc.item_id = pi.item_id
		  LEFT JOIN item_use_config  uc ON uc.item_id = pi.item_id
		  LEFT JOIN (SELECT item_id, MIN(item_name) AS item_name FROM gather_point_config GROUP BY item_id) gc
		         ON gc.item_id = pi.item_id
		 WHERE pi.player_id = ? AND pi.quantity > 0 AND (? = 0 OR pi.item_type = ?)
		 GROUP BY pi.item_id, pi.item_type, item_name, sell_price, sellable, effect_type, cd_seconds
		 ORDER BY pi.item_type, pi.item_id`,
		playerID, itemTypeFilter, itemTypeFilter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询背包失败"})
		return
	}
	defer rows.Close()

	items := make([]map[string]interface{}, 0, 32)
	usedSlots := 0
	for rows.Next() {
		var itemID, itemType, qty, sellPrice, sellable, effectType, cdSeconds int
		var itemName string
		if err := rows.Scan(&itemID, &itemType, &qty, &itemName, &sellPrice, &sellable, &effectType, &cdSeconds); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "读取背包数据失败"})
			return
		}
		usedSlots++ // 同物品堆叠算1格（PRD 图7-1 的格子即"一种物品一格"）
		items = append(items, map[string]interface{}{
			"item_id":     itemID,
			"item_type":   itemType,
			"item_name":   itemName,
			"quantity":    qty,
			"usable":      effectType > 0,  // 有使用效果配置才显示"使用"按钮
			"effect_type": effectType,      // 1=回复气血 2=前端效果
			"cd_seconds":  cdSeconds,       // 使用CD（秒）
			"sellable":    sellable == 1,   // 是否可出售（PRD 8.2）
			"sell_price":  sellPrice,       // 出售价（灵石）
		})
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "读取背包数据失败"})
		return
	}

	// 灵石余额（背包面板右上角显示，PRD 图7-1"灵石:50"）
	var spiritStone int64
	_ = s.db.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=?", playerID).Scan(&spiritStone)

	// 容量信息与 /inventory/capacity 完全同源（同一个 calcInventoryCapacity）
	beltExtra, beltQuick, warehouseUsed := s.calcInventoryCapacity(playerID)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"items":        items,
		"spirit_stone": spiritStone,
		"capacity": map[string]interface{}{
			"base_slots":       BaseInventorySlots,
			"belt_extra_slots": beltExtra,
			"belt_quick_slots": beltQuick,
			"total_slots":      BaseInventorySlots + beltExtra,
			"used_slots":       usedSlots,
			"warehouse_used":   warehouseUsed,
		},
	}})
}

// ═══════════════════════════════════════════
//  POST /inventory/item/use  使用消耗品
// ═══════════════════════════════════════════
//
// 请求：{"player_id":1, "item_id":4001}
// 规则（PRD 7.2"使用物品"+ 9.1 举例原文）：
//   - 药品：回复气血 = 有效精 × effect_param（PRD 9.1：精=5 时回复25点），不超过上限
//   - 挪移符等前端效果物品：服务端只扣数量，效果由前端执行
//   - 数量-1；CD 未结束不允许再用（PRD 9.1：药品CD 10秒）
// 事务 + FOR UPDATE：数量不足返回6411，防并发一瓶药喝两次。
//
// 锁序（本包内新接口统一）：player_item_cd → player_inventory → character_attributes
// （与 death 包"char_currency → player_inventory"不交叉，无环路等待）。
func (s *Service) HandleItemUse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}

	var req struct {
		PlayerID int64 `json:"player_id"`
		ItemID   int   `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.PlayerID <= 0 || req.ItemID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "player_id 与 item_id 必填"})
		return
	}
	if !s.assertPlayerOwner(w, r, req.PlayerID) {
		return
	}

	// 使用效果配置：没配就是"不可使用"的物品（材料/装备走 /equipment/* 接口）
	var effectType, effectParam, cdSeconds int
	var itemName string
	err := s.db.QueryRow(`SELECT item_name, effect_type, effect_param, cd_seconds
		 FROM item_use_config WHERE item_id=?`, req.ItemID).
		Scan(&itemName, &effectType, &effectParam, &cdSeconds)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6412, Msg: "该物品不能直接使用"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询使用效果配置失败"})
		return
	}

	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// ── 1. CD 判定（延迟结算：只在使用时比对时间戳，无定时器）──
	if cdSeconds > 0 {
		var remaining int
		err = tx.QueryRow(`SELECT GREATEST(0, ? - TIMESTAMPDIFF(SECOND, last_used_at, NOW()))
			 FROM player_item_cd WHERE player_id=? AND item_id=? FOR UPDATE`,
			cdSeconds, req.PlayerID, req.ItemID).Scan(&remaining)
		if err != nil && err != sql.ErrNoRows {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询物品冷却失败"})
			return
		}
		if err == nil && remaining > 0 {
			writeJSON(w, http.StatusOK, APIResponse{Code: 6413, Msg: fmt.Sprintf("%s 冷却中，还需 %d 秒", itemName, remaining),
				Data: map[string]interface{}{"cd_remaining": remaining}})
			return
		}
	}

	// ── 2. 扣数量（跨来源行按 inv_id 升序扣，数量不足6411）──
	left, ok, err := consumeInventoryTx(tx, req.PlayerID, req.ItemID, 1)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "扣减物品失败"})
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6411, Msg: "物品数量不足"})
		return
	}

	// ── 3. 生效：药品回血（有效精×倍率），前端效果物品只扣数量 ──
	effect := map[string]interface{}{"effect_type": effectType}
	if effectType == UseEffectHealHP {
		// 有效精 = 裸精 + 神位加成 + 功法加成（与 character.RecalcAndSaveDerived 同口径）
		var jing, shenweiJing, gongfaJing, hpCur, hpMax int
		err = tx.QueryRow(`SELECT jing, shenwei_jing, gongfa_jing, hp_current, hp_max
			 FROM character_attributes WHERE character_id=? FOR UPDATE`, req.PlayerID).
			Scan(&jing, &shenweiJing, &gongfaJing, &hpCur, &hpMax)
		if err != nil {
			writeJSON(w, http.StatusNotFound, APIResponse{Code: 404, Msg: "角色属性不存在"})
			return
		}
		heal := (jing + shenweiJing + gongfaJing) * effectParam // PRD 9.1：精×5
		newHP := hpCur + heal
		if newHP > hpMax {
			newHP = hpMax // 回复量不能溢出上限，实际回复量按差值算
		}
		if _, err := tx.Exec("UPDATE character_attributes SET hp_current=? WHERE character_id=?",
			newHP, req.PlayerID); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "回复气血失败"})
			return
		}
		effect["heal"] = newHP - hpCur // 实际回复点数（撞上限时小于理论值）
		effect["hp_current"] = newHP
		effect["hp_max"] = hpMax
	}

	// ── 4. 写 CD 锚点（有CD的物品才记）──
	if cdSeconds > 0 {
		if _, err := tx.Exec(`INSERT INTO player_item_cd (player_id, item_id, last_used_at)
			 VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_used_at=NOW()`,
			req.PlayerID, req.ItemID); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "记录物品冷却失败"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "已使用" + itemName, Data: map[string]interface{}{
		"item_id":     req.ItemID,
		"item_name":   itemName,
		"left":        left,      // 使用后剩余数量
		"cd_seconds":  cdSeconds, // 本次进入的CD时长（前端起倒计时）
		"effect":      effect,
	}})
}

// consumeInventoryTx 在事务内扣减玩家某物品指定数量（跨来源行合并扣）。
// player_inventory 唯一键是 (player_id,item_id,source)，同一物品可能有采集/商店/
// 副本多行，因此先按 inv_id 升序锁全部行、汇总数量，够了才逐行扣（先扣旧行）。
// 返回：扣减后剩余总数、是否扣成功（false=数量不足，调用方回6411）。
func consumeInventoryTx(tx *sql.Tx, playerID int64, itemID, need int) (left int, ok bool, err error) {
	rows, err := tx.Query(`SELECT inv_id, quantity FROM player_inventory
		 WHERE player_id=? AND item_id=? AND quantity>0 ORDER BY inv_id FOR UPDATE`,
		playerID, itemID)
	if err != nil {
		return 0, false, err
	}
	type invRow struct {
		invID int64
		qty   int
	}
	var invRows []invRow
	total := 0
	for rows.Next() {
		var ir invRow
		if err := rows.Scan(&ir.invID, &ir.qty); err != nil {
			rows.Close()
			return 0, false, err
		}
		invRows = append(invRows, ir)
		total += ir.qty
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, false, err
	}
	if total < need {
		return total, false, nil
	}

	remain := need
	for _, ir := range invRows {
		if remain <= 0 {
			break
		}
		take := ir.qty
		if take > remain {
			take = remain
		}
		if _, err := tx.Exec("UPDATE player_inventory SET quantity=quantity-? WHERE inv_id=?", take, ir.invID); err != nil {
			return 0, false, err
		}
		remain -= take
	}
	return total - need, true, nil
}

// ═══════════════════════════════════════════
//  GET /shop/list  商店商品列表
// ═══════════════════════════════════════════
//
// 请求：GET /shop/list?player_id=1[&category=1]
//   category 可选：1=药品 2=材料 3=武器 4=护符（PRD 8.1 左侧分类栏），不传=全部。
// 只返回上架商品（enabled=1），并附带玩家灵石余额（PRD 图8-1 右上角"灵石:50"）。
func (s *Service) HandleShopList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持GET"})
		return
	}
	playerID := queryInt64(r, "player_id")
	if playerID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "缺少player_id"})
		return
	}
	if !s.assertPlayerOwner(w, r, playerID) {
		return
	}
	category := int(queryInt64(r, "category")) // 0=全部

	rows, err := s.db.Query(`
		SELECT shop_item_id, category, item_id, item_type, item_name, price, sell_price, sellable
		  FROM shop_item_config
		 WHERE enabled = 1 AND (? = 0 OR category = ?)
		 ORDER BY category, sort_order, shop_item_id`, category, category)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询商品失败"})
		return
	}
	defer rows.Close()

	categoryNames := map[int]string{1: "药品", 2: "材料", 3: "武器", 4: "护符"}
	goods := make([]map[string]interface{}, 0, 8)
	for rows.Next() {
		var shopItemID, cate, itemID, itemType, price, sellPrice, sellable int
		var itemName string
		if err := rows.Scan(&shopItemID, &cate, &itemID, &itemType, &itemName, &price, &sellPrice, &sellable); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "读取商品数据失败"})
			return
		}
		goods = append(goods, map[string]interface{}{
			"shop_item_id":  shopItemID,
			"category":      cate,
			"category_name": categoryNames[cate],
			"item_id":       itemID,
			"item_type":     itemType,
			"item_name":     itemName,
			"price":         price,      // 购买价（灵石）
			"sell_price":    sellPrice,  // 回收价（=购买价50%，PRD 8.2）
			"sellable":      sellable == 1,
		})
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "读取商品数据失败"})
		return
	}

	var spiritStone int64
	_ = s.db.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=?", playerID).Scan(&spiritStone)

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"goods":        goods,
		"spirit_stone": spiritStone,
		"categories": []map[string]interface{}{ // PRD 8.1 分类栏（"全部"=category 传0）
			{"category": 1, "name": "药品"}, {"category": 2, "name": "材料"},
			{"category": 3, "name": "武器"}, {"category": 4, "name": "护符"},
		},
	}})
}

// ═══════════════════════════════════════════
//  POST /shop/buy  购买商品
// ═══════════════════════════════════════════
//
// 请求：{"player_id":1, "item_id":4001, "count":2}（count 省略按1）
// 规则（PRD 8.2）：消耗灵石，物品直接入背包。
// 事务：char_currency FOR UPDATE 扣灵石（不足6421）→ player_inventory 入包
//       （source='shop'，同物品同来源自动堆叠）。
// 锁序：char_currency → player_inventory（与 death 包 createRuinInTx 一致）。
func (s *Service) HandleShopBuy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}

	var req struct {
		PlayerID int64 `json:"player_id"`
		ItemID   int   `json:"item_id"`
		Count    int   `json:"count"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	// count 参数校验：没传（JSON 缺字段，Go 里就是 0）按买1个处理，保持旧调用方兼容；
	// 但显式传负数（如 count=-5）是前端算错了，不能默默当成1个买，
	// 否则玩家根本不知道自己买了东西、灵石也少了，必须直接 400 报错。
	if req.Count < 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "count 必须为正整数"})
		return
	}
	if req.Count == 0 {
		req.Count = 1
	}
	if req.PlayerID <= 0 || req.ItemID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "player_id 与 item_id 必填"})
		return
	}
	// 单次购买数量上限（防误传大数把灵石一次清空；假设值，可配）
	if req.Count > 999 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "单次购买数量不能超过999"})
		return
	}
	if !s.assertPlayerOwner(w, r, req.PlayerID) {
		return
	}

	// 商品配置（下架/不存在都按6422拒绝）
	var itemType, price int
	var itemName string
	err := s.db.QueryRow(`SELECT item_name, item_type, price FROM shop_item_config
		 WHERE item_id=? AND enabled=1`, req.ItemID).Scan(&itemName, &itemType, &price)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6422, Msg: "商品不存在或已下架"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询商品失败"})
		return
	}
	cost := int64(price) * int64(req.Count)

	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 扣灵石：锁余额行（无货币行按0余额处理，买不起直接6421）
	var stone int64
	err = tx.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=? FOR UPDATE", req.PlayerID).Scan(&stone)
	if err != nil && err != sql.ErrNoRows {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询灵石余额失败"})
		return
	}
	if stone < cost {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6421, Msg: fmt.Sprintf("灵石不足，需要%d，当前%d", cost, stone)})
		return
	}
	if _, err := tx.Exec("UPDATE char_currency SET spirit_stone=spirit_stone-? WHERE character_id=?",
		cost, req.PlayerID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "扣除灵石失败"})
		return
	}

	// 入包：同物品同来源堆叠（唯一键 player_id+item_id+source）
	if _, err := tx.Exec(`INSERT INTO player_inventory (player_id, item_id, item_type, quantity, source)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)`,
		req.PlayerID, req.ItemID, itemType, req.Count, SourceShop); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "物品入背包失败"})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: fmt.Sprintf("购买成功：%s×%d", itemName, req.Count),
		Data: map[string]interface{}{
			"item_id":      req.ItemID,
			"item_name":    itemName,
			"count":        req.Count,
			"cost":         cost,
			"spirit_stone": stone - cost, // 购买后余额
		}})
}

// ═══════════════════════════════════════════
//  POST /shop/sell  出售物品
// ═══════════════════════════════════════════
//
// 请求：{"player_id":1, "item_id":4001, "count":1}（count 省略按1）
// 规则（PRD 8.2）：物品卖出获得灵石，出售价=购买价的50%（配置表 sell_price 已按此算好）；
// 部分物品不可出售（任务物品/绑定物品，sellable=0 → 6423）。
// 事务：物品扣减（不足6411）+ 灵石入账 同一事务，锁序 char_currency → player_inventory。
func (s *Service) HandleShopSell(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Code: 405, Msg: "仅支持POST"})
		return
	}

	var req struct {
		PlayerID int64 `json:"player_id"`
		ItemID   int   `json:"item_id"`
		Count    int   `json:"count"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	// count 参数校验（与 /shop/buy 完全对齐）：没传按 1 个处理，
	// 显式传负数直接 400（否则玩家会莫名少一个物品）。
	if req.Count < 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "count 必须为正整数"})
		return
	}
	if req.Count == 0 {
		req.Count = 1
	}
	if req.PlayerID <= 0 || req.ItemID <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Code: 400, Msg: "player_id 与 item_id 必填"})
		return
	}
	if !s.assertPlayerOwner(w, r, req.PlayerID) {
		return
	}

	// 回收价与可否出售取配置表（PRD 8.2：未登记的物品一律不可出售，避免凭空造灵石）
	var sellPrice, sellable int
	var itemName string
	err := s.db.QueryRow(`SELECT item_name, sell_price, sellable FROM shop_item_config WHERE item_id=?`,
		req.ItemID).Scan(&itemName, &sellPrice, &sellable)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6423, Msg: "该物品不可出售"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询商品失败"})
		return
	}
	if sellable != 1 {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6423, Msg: "该物品不可出售（任务物品/绑定物品）"})
		return
	}
	income := int64(sellPrice) * int64(req.Count)

	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 锁序与购买一致：先锁灵石余额行，再锁背包行
	var stone int64
	err = tx.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=? FOR UPDATE", req.PlayerID).Scan(&stone)
	if err != nil && err != sql.ErrNoRows {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "查询灵石余额失败"})
		return
	}

	left, ok, err := consumeInventoryTx(tx, req.PlayerID, req.ItemID, req.Count)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "扣减物品失败"})
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, APIResponse{Code: 6411, Msg: "物品数量不足"})
		return
	}

	// 灵石入账（无货币行则建行）
	if _, err := tx.Exec(`INSERT INTO char_currency (character_id, spirit_stone) VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE spirit_stone=spirit_stone+VALUES(spirit_stone)`,
		req.PlayerID, income); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "灵石入账失败"})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Code: 0, Msg: fmt.Sprintf("出售成功：%s×%d", itemName, req.Count),
		Data: map[string]interface{}{
			"item_id":      req.ItemID,
			"item_name":    itemName,
			"count":        req.Count,
			"income":       income,        // 本次获得灵石
			"left":         left,          // 出售后剩余数量
			"spirit_stone": stone + income, // 出售后余额
		}})
}
