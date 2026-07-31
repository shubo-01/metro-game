/**
 * 寻仙 - V6 背包+商店 API 客户端
 *
 * 说明:
 *   - 对接 equipment-service (端口 8009) 的 /inventory/ 与 /shop/ 前缀接口，
 *     后端实现见 backend/internal/equipment/handler_inventory.go
 *   - HttpClient 已配置 /inventory/ 与 /shop/ 前缀路由到 8009
 *   - 背包与商店同属一个交互闭环（背包出售 = 商店回收价），按任务口径合并放本文件
 *   - 每个接口成功（code===0 且有 data）后自动广播对应事件
 *     （InventoryEvent / ShopEvent），面板只需监听、无需自行 emit
 *   - 物品使用效果：effect_type=1 治疗（heal 已按上限截断），
 *     effect_type=2 挪移符纯前端效果（后端只扣数量，位移由前端自行执行）
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { InventoryEvent, ShopEvent } from '../common/Constants';

// ═══════════════════════════════════════════
//  背包数据结构（对齐 handler_inventory.go）
// ═══════════════════════════════════════════

/** 背包物品条目（同 item_id 跨来源聚合后的展示行） */
export interface InventoryItem {
    item_id: number;
    item_type: number;      // 物品分类：1药品 2材料 3武器 4护符（与商店分类一致）
    item_name: string;
    quantity: number;
    usable: boolean;        // 是否可使用（决定详情页"使用"按钮显隐）
    effect_type: number;    // 使用效果：0无 1治疗回血 2纯前端效果（挪移符）
    cd_seconds: number;     // 使用冷却（秒），0=无CD
    sellable: boolean;      // 是否可出售（决定详情页"出售"按钮显隐）
    sell_price: number;     // 单个回收价（灵石），不可售为0
}

/** 背包容量明细（基础20格+腰带扩展，UI 网格固定画30格、实际以 total_slots 为准） */
export interface InventoryCapacity {
    base_slots: number;
    belt_extra_slots: number;
    belt_quick_slots: number;
    total_slots: number;
    used_slots: number;
    warehouse_used: number;
}

/** GET /inventory/list 响应 */
export interface InventoryListData {
    items: InventoryItem[];
    spirit_stone: number;
    capacity: InventoryCapacity;
}

/** 物品使用效果明细（effect_type=1 时带 heal/hp_current/hp_max） */
export interface ItemUseEffect {
    effect_type: number;
    heal?: number;          // 实际回血量（已按血量上限截断）
    hp_current?: number;
    hp_max?: number;
}

/** POST /inventory/item/use 响应 */
export interface ItemUseData {
    item_id: number;
    item_name: string;
    left: number;           // 使用后剩余数量
    cd_seconds: number;     // 该物品使用CD（秒）
    effect: ItemUseEffect;
}

// ═══════════════════════════════════════════
//  商店数据结构（对齐 handler_inventory.go）
// ═══════════════════════════════════════════

/** 商店商品条目（PRD 8.1：凡品药3灵石/挪移符49灵石/铁1灵石） */
export interface ShopGoods {
    shop_item_id: number;
    category: number;       // 分类：1药品 2材料 3武器 4护符
    category_name: string;
    item_id: number;
    item_type: number;
    item_name: string;
    price: number;          // 购买价（灵石）
    sell_price: number;     // 回收价 = 购买价50%向下取整（PRD 8.3）
    sellable: boolean;
}

/** GET /shop/list 响应 */
export interface ShopListData {
    goods: ShopGoods[];
    spirit_stone: number;
    categories: Array<{ category: number; name: string }>;
}

/** POST /shop/buy 响应 */
export interface ShopBuyData {
    item_id: number;
    item_name: string;
    count: number;
    cost: number;           // 实际扣灵石
    spirit_stone: number;   // 扣后余额
}

/** POST /shop/sell 响应 */
export interface ShopSellData {
    item_id: number;
    item_name: string;
    count: number;
    income: number;         // 实际入账灵石
    left: number;           // 出售后剩余数量
    spirit_stone: number;   // 入账后余额
}

// ═══════════════════════════════════════════
//  业务错误码与提示文案（HTTP 200 但 code!==0）
// ═══════════════════════════════════════════

/** 6411 = 物品数量不足（使用/出售时背包里不够） */
export const ERR_ITEM_NOT_ENOUGH = 6411;
/** 6412 = 物品不可使用（usable=false 的物品调 use） */
export const ERR_ITEM_NOT_USABLE = 6412;
/** 6413 = 物品使用冷却中（data.cd_remaining 为剩余秒数） */
export const ERR_ITEM_IN_CD = 6413;
/** 6421 = 灵石不足（购买时余额不够） */
export const ERR_SHOP_STONE_NOT_ENOUGH = 6421;
/** 6422 = 商品不存在或已下架 */
export const ERR_SHOP_ITEM_NOT_FOUND = 6422;
/** 6423 = 该物品不可出售（sellable=false） */
export const ERR_SHOP_NOT_SELLABLE = 6423;

/** 背包/商店业务错误码 → 中文提示 */
export const InventoryErrorText: Record<number, string> = {
    [ERR_ITEM_NOT_ENOUGH]: '物品数量不足',
    [ERR_ITEM_NOT_USABLE]: '该物品不可使用',
    [ERR_ITEM_IN_CD]: '物品使用冷却中，请稍后再试',
    [ERR_SHOP_STONE_NOT_ENOUGH]: '灵石不足，无法购买',
    [ERR_SHOP_ITEM_NOT_FOUND]: '商品不存在或已下架',
    [ERR_SHOP_NOT_SELLABLE]: '该物品不可出售',
};

// ═══════════════════════════════════════════
//  InventoryApi（背包 + 商店）
// ═══════════════════════════════════════════

export class InventoryApi {

    /**
     * 背包列表：物品聚合 + 灵石余额 + 容量明细
     * @param itemType 分类过滤（0=全部，不传 item_type 参数）
     * 成功后自动广播 INVENTORY_UPDATED（携带 InventoryListData）
     */
    static async list(playerId: number, itemType: number = 0): Promise<ApiResponse<InventoryListData>> {
        const params: Record<string, string> = { player_id: String(playerId) };
        if (itemType > 0) params.item_type = String(itemType);
        const res = await HttpClient.get<InventoryListData>('/inventory/list', params);
        if (res.code === 0 && res.data) {
            EventManager.emit(InventoryEvent.INVENTORY_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 使用物品：治疗药回血（heal 已按上限截断）/ 挪移符纯前端效果
     * 6411数量不足 / 6412不可用 / 6413冷却中（res.data.cd_remaining 剩余秒数）
     * 成功后自动广播 ITEM_USED（携带 ItemUseData，含 effect 明细）
     */
    static async useItem(playerId: number, itemId: number): Promise<ApiResponse<ItemUseData>> {
        const res = await HttpClient.post<ItemUseData>('/inventory/item/use', {
            player_id: playerId,
            item_id: itemId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(InventoryEvent.ITEM_USED, res.data);
        }
        return res;
    }

    /**
     * 商店列表：商品（含价格/回收价）+ 灵石余额 + 分类清单
     * @param category 分类过滤（0=全部，不传 category 参数）
     * 成功后自动广播 SHOP_UPDATED（携带 ShopListData）
     */
    static async shopList(playerId: number, category: number = 0): Promise<ApiResponse<ShopListData>> {
        const params: Record<string, string> = { player_id: String(playerId) };
        if (category > 0) params.category = String(category);
        const res = await HttpClient.get<ShopListData>('/shop/list', params);
        if (res.code === 0 && res.data) {
            EventManager.emit(ShopEvent.SHOP_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 购买商品：扣灵石入物品（count 负数/超999由后端 400 拦截，前端确认弹窗预检）
     * 6421灵石不足 / 6422商品不存在或下架
     * 成功后自动广播 SHOP_BOUGHT（携带 ShopBuyData，含扣费与余额）
     */
    static async buy(playerId: number, itemId: number, count: number): Promise<ApiResponse<ShopBuyData>> {
        const res = await HttpClient.post<ShopBuyData>('/shop/buy', {
            player_id: playerId,
            item_id: itemId,
            count: count,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShopEvent.SHOP_BOUGHT, res.data);
        }
        return res;
    }

    /**
     * 出售物品：按回收价（购买价50%）入账灵石
     * 6411数量不足 / 6423不可出售
     * 成功后自动广播 SHOP_SOLD（携带 ShopSellData；InventoryPanel 也监听刷新背包）
     */
    static async sell(playerId: number, itemId: number, count: number): Promise<ApiResponse<ShopSellData>> {
        const res = await HttpClient.post<ShopSellData>('/shop/sell', {
            player_id: playerId,
            item_id: itemId,
            count: count,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShopEvent.SHOP_SOLD, res.data);
        }
        return res;
    }
}
