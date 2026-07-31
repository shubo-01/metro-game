/**
 * 寻仙 - V6 背包面板（PRD 3.x 背包系统）
 *
 * 功能：
 *   - 30 格网格展示（PRD 3.1 UI规格 30 格；实际可用容量以接口 capacity.total_slots
 *     为准——基础20格+腰带扩展，超出部分格子画锁定态）
 *   - 类型 Tab：全部/药品/材料/武器/护符（分类值与商店一致：1药2材3武4符，0=全部）
 *   - 顶部显示容量（已用/总数）与灵石余额
 *   - 点物品 → 打开物品详情二级子面板（PanelManager 二级栈）：
 *     使用按钮（usable 才显示；调 /inventory/item/use，展示 heal/CD 反馈）
 *     出售按钮（sellable 才显示；调 /shop/sell 按回收价出售）
 *
 * 事件（生产者-消费者配对）：
 *   - 监听 InventoryEvent.INVENTORY_UPDATED（生产者 InventoryApi.list）渲染网格
 *   - 监听 InventoryEvent.ITEM_USED（生产者 InventoryApi.useItem）弹使用反馈+重拉
 *   - 监听 ShopEvent.SHOP_SOLD（生产者 InventoryApi.sell）出售后重拉背包
 *
 * 节点结构约定（编辑器搭建）：
 *   InventoryPanel（挂本脚本）
 *   ├─ PanelRoot        面板根（平时隐藏，@property panelRoot）
 *   │   ├─ Mask         半透明叠底（@property maskNode，PanelManager 设 alpha=0.7）
 *   │   ├─ CloseBtn     关闭按钮
 *   │   ├─ TabAll/TabPotion/TabMaterial/TabWeapon/TabTalisman  分类页签
 *   │   ├─ CapacityLabel / StoneLabel   容量与灵石
 *   │   ├─ GridContainer  网格容器（30个格子运行时创建）
 *   │   └─ DetailRoot   物品详情二级子面板（平时隐藏）
 *   │       ├─ DetailNameLabel / DetailInfoLabel
 *   │       ├─ UseBtn / SellBtn / DetailCloseBtn
 *   └─ ToastLabel       提示文字
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { PanelManager, PanelType } from '../manager/PanelManager';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';
import { InventoryEvent, ShopEvent, ThemeColor } from '../common/Constants';
import {
    InventoryApi, InventoryListData, InventoryItem, ItemUseData, ShopSellData,
    InventoryErrorText, ERR_ITEM_IN_CD,
} from '../net/InventoryApi';

const { ccclass, property } = _decorator;

/** 网格 UI 规格：30 格（PRD 3.1 背包界面 6列×5行；实际容量以接口为准） */
const GRID_SLOTS = 30;
const GRID_COLS = 6;
/** 格子尺寸与间距px（PRD 未给具体像素，假设值可配） */
const CELL_SIZE = 90;
const CELL_GAP = 8;

/** 分类 Tab：0全部 1药品 2材料 3武器 4护符（与后端 item_type/商店 category 一致） */
const TAB_DEFS: Array<{ type: number; name: string }> = [
    { type: 0, name: '全部' },
    { type: 1, name: '药品' },
    { type: 2, name: '材料' },
    { type: 3, name: '武器' },
    { type: 4, name: '护符' },
];

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {

    // ─── 面板骨架 ───
    @property(Node) panelRoot: Node | null = null;      // 面板根（平时隐藏）
    @property(Node) maskNode: Node | null = null;       // 半透明叠底 alpha=0.7
    @property(Node) closeBtn: Node | null = null;       // 关闭按钮

    // ─── 分类 Tab（顺序对应 TAB_DEFS：全部/药品/材料/武器/护符） ───
    @property(Node) tabAllBtn: Node | null = null;
    @property(Node) tabPotionBtn: Node | null = null;
    @property(Node) tabMaterialBtn: Node | null = null;
    @property(Node) tabWeaponBtn: Node | null = null;
    @property(Node) tabTalismanBtn: Node | null = null;

    // ─── 顶部信息 ───
    @property(Label) capacityLabel: Label | null = null;   // 容量 已用/总数
    @property(Label) stoneLabel: Label | null = null;      // 灵石余额

    // ─── 网格容器（30格子运行时创建） ───
    @property(Node) gridContainer: Node | null = null;

    // ─── 物品详情二级子面板 ───
    @property(Node) detailRoot: Node | null = null;         // 详情根（平时隐藏）
    @property(Label) detailNameLabel: Label | null = null;  // 物品名+数量
    @property(Label) detailInfoLabel: Label | null = null;  // 效果/CD/回收价说明
    @property(Node) useBtn: Node | null = null;             // 使用按钮（usable 才显示）
    @property(Node) sellBtn: Node | null = null;            // 出售按钮（sellable 才显示）
    @property(Node) detailCloseBtn: Node | null = null;     // 详情关闭按钮

    @property(Label) toastLabel: Label | null = null;       // 提示文字（2秒隐藏）

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    private _curTab: number = 0;                    // 当前分类（0=全部）
    private _items: InventoryItem[] = [];           // 当前展示的物品列表
    private _selected: InventoryItem | null = null; // 详情页选中的物品
    private _cells: Node[] = [];                    // 30个格子节点（运行时创建）
    private _requesting: boolean = false;           // 使用/出售请求在途防重入
    private _destroyed: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 注册一级面板（背包）与二级子面板（物品详情）到 PanelManager
        PanelManager.register(PanelType.Inventory, {
            show: () => this._onShow(),
            hide: () => this._onHide(),
            maskNode: this.maskNode,
        });
        PanelManager.register(PanelType.ItemDetail, {
            show: () => { if (this.detailRoot) this.detailRoot.active = true; },
            hide: () => { if (this.detailRoot) this.detailRoot.active = false; },
        });

        // 关闭按钮统一走 PanelManager 出栈（详情开着时先关详情、再点关背包）
        this.closeBtn?.on(Node.EventType.TOUCH_END, () => PanelManager.closeTop(), this);
        this.detailCloseBtn?.on(Node.EventType.TOUCH_END, () => PanelManager.closeTop(), this);

        // 分类 Tab 点击
        const tabBtns = [this.tabAllBtn, this.tabPotionBtn, this.tabMaterialBtn,
                         this.tabWeaponBtn, this.tabTalismanBtn];
        tabBtns.forEach((btn, i) => {
            btn?.on(Node.EventType.TOUCH_END, () => this._onTabClick(TAB_DEFS[i].type), this);
        });

        // 详情操作按钮
        this.useBtn?.on(Node.EventType.TOUCH_END, this._onUseClick, this);
        this.sellBtn?.on(Node.EventType.TOUCH_END, this._onSellClick, this);

        // 事件监听（生产者见 InventoryApi 注释）
        EventManager.on(InventoryEvent.INVENTORY_UPDATED, this._onInventoryUpdated, this);
        EventManager.on(InventoryEvent.ITEM_USED, this._onItemUsed, this);
        EventManager.on(ShopEvent.SHOP_SOLD, this._onItemSold, this);

        // 运行时创建 30 个格子（6列×5行）
        this._buildGrid();

        if (this.panelRoot) this.panelRoot.active = false;
        if (this.detailRoot) this.detailRoot.active = false;
    }

    onDestroy() {
        this._destroyed = true;
        PanelManager.unregister(PanelType.Inventory);
        PanelManager.unregister(PanelType.ItemDetail);
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════
    //  PanelManager 回调
    // ═══════════════════════════════════════

    private _onShow() {
        if (this.panelRoot) this.panelRoot.active = true;
        this._reload();
    }

    private _onHide() {
        if (this.panelRoot) this.panelRoot.active = false;
        if (this.detailRoot) this.detailRoot.active = false;
        this._selected = null;
    }

    // ═══════════════════════════════════════
    //  网格构建与渲染
    // ═══════════════════════════════════════

    /** 运行时创建 30 个格子节点（每格：底 Label 显示"物品名\n×数量"） */
    private _buildGrid() {
        if (!this.gridContainer) return;
        for (let i = 0; i < GRID_SLOTS; i++) {
            const cell = new Node(`Cell_${i}`);
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            // 以容器左上为原点往右下排（锚点由编辑器容器决定，这里用相对偏移）
            cell.setPosition(col * (CELL_SIZE + CELL_GAP), -row * (CELL_SIZE + CELL_GAP), 0);
            const label = cell.addComponent(Label);
            label.fontSize = 16;
            label.string = '';
            // 格子点击：有物品才开详情
            const idx = i;
            cell.on(Node.EventType.TOUCH_END, () => this._onCellClick(idx), this);
            this.gridContainer.addChild(cell);
            this._cells.push(cell);
        }
    }

    /** 重拉背包列表（按当前分类；结果经 INVENTORY_UPDATED 事件回流渲染） */
    private _reload() {
        InventoryApi.list(this._characterId, this._curTab)
            .catch(() => { if (!this._destroyed) this._showToast('网络错误，背包加载失败'); });
    }

    /** 背包数据到达（InventoryApi 广播）：渲染网格/容量/灵石 */
    private _onInventoryUpdated(data: InventoryListData) {
        if (this._destroyed) return;
        this._items = data.items || [];

        // 容量：已用/总数（实际容量以接口为准；UI 固定30格，超出总容量的格子画锁定态）
        const cap = data.capacity;
        if (this.capacityLabel && cap) {
            this.capacityLabel.string = `容量 ${cap.used_slots}/${cap.total_slots}`;
        }
        if (this.stoneLabel) {
            this.stoneLabel.string = `灵石 ${data.spirit_stone}`;
        }

        // 渲染 30 格：前 N 格放物品，容量外格子显示"锁"（腰带未扩展部分）
        const totalSlots = cap ? cap.total_slots : GRID_SLOTS;
        for (let i = 0; i < this._cells.length; i++) {
            const label = this._cells[i].getComponent(Label);
            if (!label) continue;
            if (i < this._items.length) {
                const item = this._items[i];
                label.string = `${item.item_name}\n×${item.quantity}`;
                label.color = new Color().fromHEX(ThemeColor.TEXT_WHITE);
            } else if (i >= totalSlots) {
                label.string = '🔒';   // 超出实际容量：锁定格（腰带扩展后解锁）
                label.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
            } else {
                label.string = '';     // 空格子
            }
        }
    }

    // ═══════════════════════════════════════
    //  交互
    // ═══════════════════════════════════════

    /** 分类 Tab 点击：切换过滤并重拉 */
    private _onTabClick(itemType: number) {
        if (this._curTab === itemType) return;
        this._curTab = itemType;
        this._reload();
    }

    /** 格子点击：有物品才打开详情二级子面板 */
    private _onCellClick(index: number) {
        if (index >= this._items.length) return;   // 空格子/锁定格不响应
        this._selected = this._items[index];
        this._renderDetail();
        PanelManager.openSubPanel(PanelType.ItemDetail);
    }

    /** 渲染物品详情：名称/数量/效果说明 + 使用/出售按钮按可用性显隐 */
    private _renderDetail() {
        const item = this._selected;
        if (!item) return;
        if (this.detailNameLabel) {
            this.detailNameLabel.string = `${item.item_name} ×${item.quantity}`;
        }
        if (this.detailInfoLabel) {
            const lines: string[] = [];
            if (item.usable) {
                lines.push(item.effect_type === 2
                    ? '使用效果：瞬间挪移（纯前端位移演出）'
                    : '使用效果：恢复气血（超出上限部分无效）');
                if (item.cd_seconds > 0) lines.push(`使用冷却：${item.cd_seconds}秒`);
            } else {
                lines.push('该物品不可直接使用');
            }
            lines.push(item.sellable ? `回收价：${item.sell_price} 灵石/个` : '不可出售');
            this.detailInfoLabel.string = lines.join('\n');
        }
        // 按钮显隐：不可用/不可售直接隐藏（PRD 3.3 按物品可用性显隐）
        if (this.useBtn) this.useBtn.active = item.usable;
        if (this.sellBtn) this.sellBtn.active = item.sellable;
    }

    /** 使用按钮：调 /inventory/item/use（6413 CD剩余提示 / 6412不可用 / 6411数量不足） */
    private async _onUseClick() {
        const item = this._selected;
        if (!item || this._requesting) return;   // 防重入
        this._requesting = true;
        try {
            const res = await InventoryApi.useItem(this._characterId, item.item_id);
            if (this._destroyed) return;
            if (res.code !== 0) {
                // CD中：data.cd_remaining 带剩余秒数（后端 handler_inventory.go 契约）
                if (res.code === ERR_ITEM_IN_CD && res.data && (res.data as any).cd_remaining !== undefined) {
                    this._showToast(`冷却中，还需 ${(res.data as any).cd_remaining} 秒`);
                } else {
                    this._showToast(res.msg || InventoryErrorText[res.code] || '使用失败');
                }
            }
            // 成功分支不在这里处理：ITEM_USED 事件回调统一弹反馈+重拉（配对约定）
        } catch {
            if (!this._destroyed) this._showToast('网络错误，使用失败');
        } finally {
            this._requesting = false;
        }
    }

    /** 物品使用成功（InventoryApi 广播）：按效果类型弹反馈，重拉背包 */
    private _onItemUsed(data: ItemUseData) {
        if (this._destroyed) return;
        if (data.effect && data.effect.effect_type === 1) {
            // 治疗：heal 已按上限截断（后端契约），带回当前/最大血量
            this._showToast(`使用【${data.item_name}】恢复 ${data.effect.heal || 0} 气血` +
                `（${data.effect.hp_current}/${data.effect.hp_max}）`);
        } else if (data.effect && data.effect.effect_type === 2) {
            // 挪移符：后端只扣数量，位移是纯前端效果（本期无战斗场景接入点，仅提示）
            this._showToast(`使用【${data.item_name}】，身形一晃瞬移开去！`);
        } else {
            this._showToast(`使用【${data.item_name}】成功，剩余 ${data.left}`);
        }
        this._reload();   // 数量变化重拉列表（详情页数量同步在 INVENTORY_UPDATED 后手动关闭兜底）
        // 用完了就关掉详情页（left=0 时物品行会消失）
        if (data.left <= 0 && this.detailRoot?.active) {
            PanelManager.closeTop();
        }
    }

    /**
     * 出售按钮：按回收价卖 1 个/次（PRD 未给背包内出售的数量选择交互，
     * 按最简"单个出售"处理——假设值可配；批量出售走商店面板的数量确认弹窗）
     */
    private async _onSellClick() {
        const item = this._selected;
        if (!item || this._requesting) return;   // 防重入
        this._requesting = true;
        try {
            const res = await InventoryApi.sell(this._characterId, item.item_id, 1);
            if (this._destroyed) return;
            if (res.code !== 0) {
                this._showToast(res.msg || InventoryErrorText[res.code] || '出售失败');
            }
            // 成功分支走 SHOP_SOLD 事件回调（配对约定）
        } catch {
            if (!this._destroyed) this._showToast('网络错误，出售失败');
        } finally {
            this._requesting = false;
        }
    }

    /** 出售成功（InventoryApi 广播；商店面板卖出同样触发）：弹收入提示并重拉背包 */
    private _onItemSold(data: ShopSellData) {
        if (this._destroyed) return;
        // 背包面板开着才处理（商店面板卖出时它自己也监听同一事件各自刷新）
        if (!this.panelRoot?.active) return;
        this._showToast(`出售【${data.item_name}】×${data.count}，入账 ${data.income} 灵石`);
        this._reload();
        if (data.left <= 0 && this.detailRoot?.active) {
            PanelManager.closeTop();   // 卖光了关详情页
        }
    }

    /** 提示文字：2秒自动隐藏（沿用工程 toast 范式） */
    private _showToast(msg: string) {
        if (!this.toastLabel) return;
        this.toastLabel.string = msg;
        this.toastLabel.node.active = true;
        this.scheduleOnce(() => {
            if (this.toastLabel) this.toastLabel.node.active = false;
        }, 2);
    }
}
