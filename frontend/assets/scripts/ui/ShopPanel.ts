/**
 * 寻仙 - V6 商店面板（PRD 8.x 商店系统）
 *
 * 功能：
 *   - 分类 Tab：全部/药品/材料/武器/护符（category 0-4，与背包 item_type 一致）
 *   - 商品列表：名称 + 购买价 + 回收价（回收价=购买价50%，PRD 8.3；
 *     商品清单 PRD 8.1：凡品药3灵石/挪移符49灵石/铁1灵石）
 *   - 灵石余额实时刷新：买/卖成功后重拉列表（余额以服务端响应为准）
 *   - 买/卖数量确认二级弹窗（PanelManager 二级栈）：+/- 调数量、确认下单
 *
 * 事件（生产者-消费者配对）：
 *   - 监听 ShopEvent.SHOP_UPDATED（生产者 InventoryApi.shopList）渲染商品列表
 *   - 监听 ShopEvent.SHOP_BOUGHT（生产者 InventoryApi.buy）弹购买结果+刷新
 *   - 监听 ShopEvent.SHOP_SOLD（生产者 InventoryApi.sell）弹出售结果+刷新
 *
 * 节点结构约定（编辑器搭建）：
 *   ShopPanel（挂本脚本）
 *   ├─ PanelRoot       面板根（平时隐藏）
 *   │   ├─ Mask        半透明叠底 alpha=0.7
 *   │   ├─ CloseBtn
 *   │   ├─ TabAll/TabPotion/TabMaterial/TabWeapon/TabTalisman
 *   │   ├─ StoneLabel  灵石余额
 *   │   ├─ ListContainer  商品行容器（运行时创建行节点）
 *   │   └─ ConfirmRoot 数量确认二级弹窗（平时隐藏）
 *   │       ├─ ConfirmTitleLabel / ConfirmCountLabel / ConfirmTotalLabel
 *   │       ├─ MinusBtn / PlusBtn / ConfirmOkBtn / ConfirmCancelBtn
 *   └─ ToastLabel
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { PanelManager, PanelType } from '../manager/PanelManager';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';
import { ShopEvent, ThemeColor } from '../common/Constants';
import {
    InventoryApi, ShopListData, ShopGoods, ShopBuyData, ShopSellData,
    InventoryErrorText,
} from '../net/InventoryApi';

const { ccclass, property } = _decorator;

/** 分类 Tab（category：0全部 1药品 2材料 3武器 4护符，PRD 8.1 左侧分类栏） */
const TAB_DEFS: Array<{ category: number; name: string }> = [
    { category: 0, name: '全部' },
    { category: 1, name: '药品' },
    { category: 2, name: '材料' },
    { category: 3, name: '武器' },
    { category: 4, name: '护符' },
];

/** 商品行高px与单页最大行数（PRD 未给具体像素，假设值可配） */
const ROW_HEIGHT = 64;
const MAX_ROWS = 12;

/** 单次交易数量上限（后端 count>999 返回400，前端确认弹窗预检同口径） */
const MAX_TRADE_COUNT = 999;

@ccclass('ShopPanel')
export class ShopPanel extends Component {

    // ─── 面板骨架 ───
    @property(Node) panelRoot: Node | null = null;      // 面板根（平时隐藏）
    @property(Node) maskNode: Node | null = null;       // 半透明叠底 alpha=0.7
    @property(Node) closeBtn: Node | null = null;       // 关闭按钮

    // ─── 分类 Tab（顺序对应 TAB_DEFS） ───
    @property(Node) tabAllBtn: Node | null = null;
    @property(Node) tabPotionBtn: Node | null = null;
    @property(Node) tabMaterialBtn: Node | null = null;
    @property(Node) tabWeaponBtn: Node | null = null;
    @property(Node) tabTalismanBtn: Node | null = null;

    @property(Label) stoneLabel: Label | null = null;   // 灵石余额
    @property(Node) listContainer: Node | null = null;  // 商品行容器（行节点运行时创建）

    // ─── 数量确认二级弹窗 ───
    @property(Node) confirmRoot: Node | null = null;          // 弹窗根（平时隐藏）
    @property(Label) confirmTitleLabel: Label | null = null;  // "购买【凡品药】"/"出售【铁】"
    @property(Label) confirmCountLabel: Label | null = null;  // 当前数量
    @property(Label) confirmTotalLabel: Label | null = null;  // 总价/总收入
    @property(Node) minusBtn: Node | null = null;             // 数量 -1
    @property(Node) plusBtn: Node | null = null;              // 数量 +1
    @property(Node) confirmOkBtn: Node | null = null;         // 确认下单
    @property(Node) confirmCancelBtn: Node | null = null;     // 取消

    @property(Label) toastLabel: Label | null = null;         // 提示文字（2秒隐藏）

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    private _curTab: number = 0;                 // 当前分类（0=全部）
    private _goods: ShopGoods[] = [];            // 当前商品列表
    private _rows: Node[] = [];                  // 商品行节点（复用）
    private _spiritStone: number = 0;            // 最近一次拉到的灵石余额（确认弹窗预检用）

    // 确认弹窗状态：mode buy/sell + 目标商品 + 数量
    private _confirmMode: 'buy' | 'sell' = 'buy';
    private _confirmGoods: ShopGoods | null = null;
    private _confirmCount: number = 1;

    private _requesting: boolean = false;        // 买/卖请求在途防重入
    private _destroyed: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 注册一级面板（商店）与二级子面板（数量确认）到 PanelManager
        PanelManager.register(PanelType.Shop, {
            show: () => this._onShow(),
            hide: () => this._onHide(),
            maskNode: this.maskNode,
        });
        PanelManager.register(PanelType.ShopConfirm, {
            show: () => { if (this.confirmRoot) this.confirmRoot.active = true; },
            hide: () => { if (this.confirmRoot) this.confirmRoot.active = false; },
        });

        // 关闭/取消统一走 PanelManager 出栈
        this.closeBtn?.on(Node.EventType.TOUCH_END, () => PanelManager.closeTop(), this);
        this.confirmCancelBtn?.on(Node.EventType.TOUCH_END, () => PanelManager.closeTop(), this);

        // 分类 Tab
        const tabBtns = [this.tabAllBtn, this.tabPotionBtn, this.tabMaterialBtn,
                         this.tabWeaponBtn, this.tabTalismanBtn];
        tabBtns.forEach((btn, i) => {
            btn?.on(Node.EventType.TOUCH_END, () => this._onTabClick(TAB_DEFS[i].category), this);
        });

        // 确认弹窗按钮
        this.minusBtn?.on(Node.EventType.TOUCH_END, () => this._changeCount(-1), this);
        this.plusBtn?.on(Node.EventType.TOUCH_END, () => this._changeCount(1), this);
        this.confirmOkBtn?.on(Node.EventType.TOUCH_END, this._onConfirmOk, this);

        // 事件监听（生产者见 InventoryApi 注释）
        EventManager.on(ShopEvent.SHOP_UPDATED, this._onShopUpdated, this);
        EventManager.on(ShopEvent.SHOP_BOUGHT, this._onBought, this);
        EventManager.on(ShopEvent.SHOP_SOLD, this._onSold, this);

        if (this.panelRoot) this.panelRoot.active = false;
        if (this.confirmRoot) this.confirmRoot.active = false;
    }

    onDestroy() {
        this._destroyed = true;
        PanelManager.unregister(PanelType.Shop);
        PanelManager.unregister(PanelType.ShopConfirm);
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
        if (this.confirmRoot) this.confirmRoot.active = false;
        this._confirmGoods = null;
    }

    // ═══════════════════════════════════════
    //  列表渲染
    // ═══════════════════════════════════════

    /** 重拉商店列表（按当前分类；结果经 SHOP_UPDATED 事件回流渲染） */
    private _reload() {
        InventoryApi.shopList(this._characterId, this._curTab)
            .catch(() => { if (!this._destroyed) this._showToast('网络错误，商店加载失败'); });
    }

    /** 商店数据到达（InventoryApi 广播）：渲染商品行与灵石余额 */
    private _onShopUpdated(data: ShopListData) {
        if (this._destroyed) return;
        this._goods = data.goods || [];
        this._spiritStone = data.spirit_stone;
        if (this.stoneLabel) this.stoneLabel.string = `灵石 ${data.spirit_stone}`;
        this._renderRows();
    }

    /** 渲染商品行：行节点按需创建后复用；每行"名称 分类 | 价格 / 回收价 [买][卖]" */
    private _renderRows() {
        if (!this.listContainer) return;
        const count = Math.min(this._goods.length, MAX_ROWS);

        // 按需补建行节点（每行：主 Label + BuyBtn/SellBtn 两个子按钮）
        while (this._rows.length < count) {
            const i = this._rows.length;
            const row = new Node(`GoodsRow_${i}`);
            row.setPosition(0, -i * ROW_HEIGHT, 0);
            const label = row.addComponent(Label);
            label.fontSize = 18;
            label.horizontalAlign = 0;

            // 买按钮（行内子节点，点击开数量确认弹窗）
            const buyBtn = new Node('BuyBtn');
            buyBtn.setPosition(300, 0, 0);   // 行内偏移，假设值可配
            const buyLabel = buyBtn.addComponent(Label);
            buyLabel.string = '购买';
            buyLabel.color = new Color().fromHEX(ThemeColor.GOLD);
            buyBtn.on(Node.EventType.TOUCH_END, () => this._openConfirm('buy', i), this);
            row.addChild(buyBtn);

            // 卖按钮（sellable 才显示）
            const sellBtn = new Node('SellBtn');
            sellBtn.setPosition(380, 0, 0);
            const sellLabel = sellBtn.addComponent(Label);
            sellLabel.string = '出售';
            sellLabel.color = new Color().fromHEX(ThemeColor.JADE);
            sellBtn.on(Node.EventType.TOUCH_END, () => this._openConfirm('sell', i), this);
            row.addChild(sellBtn);

            this.listContainer.addChild(row);
            this._rows.push(row);
        }

        // 填充/隐藏行
        for (let i = 0; i < this._rows.length; i++) {
            const row = this._rows[i];
            if (i < count) {
                const g = this._goods[i];
                row.active = true;
                const label = row.getComponent(Label);
                if (label) {
                    label.string = `${g.item_name}（${g.category_name}）  ` +
                        `价格 ${g.price} 灵石  回收 ${g.sell_price} 灵石`;
                }
                const sellBtn = row.getChildByName('SellBtn');
                if (sellBtn) sellBtn.active = g.sellable;
            } else {
                row.active = false;
            }
        }
    }

    // ═══════════════════════════════════════
    //  交互
    // ═══════════════════════════════════════

    /** 分类 Tab 点击：切换过滤并重拉 */
    private _onTabClick(category: number) {
        if (this._curTab === category) return;
        this._curTab = category;
        this._reload();
    }

    /** 打开数量确认弹窗（二级子面板）：mode=buy 购买 / sell 出售 */
    private _openConfirm(mode: 'buy' | 'sell', rowIndex: number) {
        if (rowIndex >= this._goods.length) return;
        this._confirmMode = mode;
        this._confirmGoods = this._goods[rowIndex];
        this._confirmCount = 1;
        this._renderConfirm();
        PanelManager.openSubPanel(PanelType.ShopConfirm);
    }

    /** 数量 +/-（下限1，上限999 与后端 400 拦截同口径） */
    private _changeCount(delta: number) {
        this._confirmCount = Math.max(1, Math.min(MAX_TRADE_COUNT, this._confirmCount + delta));
        this._renderConfirm();
    }

    /** 渲染确认弹窗：标题/数量/总价（买按价格算，卖按回收价算） */
    private _renderConfirm() {
        const g = this._confirmGoods;
        if (!g) return;
        const isBuy = this._confirmMode === 'buy';
        if (this.confirmTitleLabel) {
            this.confirmTitleLabel.string = isBuy ? `购买【${g.item_name}】` : `出售【${g.item_name}】`;
        }
        if (this.confirmCountLabel) {
            this.confirmCountLabel.string = String(this._confirmCount);
        }
        if (this.confirmTotalLabel) {
            const unit = isBuy ? g.price : g.sell_price;
            const total = unit * this._confirmCount;
            this.confirmTotalLabel.string = isBuy
                ? `合计 ${total} 灵石（余额 ${this._spiritStone}）`
                : `可得 ${total} 灵石`;
        }
    }

    /** 确认下单：买走 /shop/buy（前端预检灵石），卖走 /shop/sell */
    private async _onConfirmOk() {
        const g = this._confirmGoods;
        if (!g || this._requesting) return;   // 防重入
        const isBuy = this._confirmMode === 'buy';

        // 购买前端预检：灵石不够直接提示（权威判定仍在后端 6421）
        if (isBuy && g.price * this._confirmCount > this._spiritStone) {
            this._showToast('灵石不足，无法购买');
            return;
        }

        this._requesting = true;
        try {
            const res = isBuy
                ? await InventoryApi.buy(this._characterId, g.item_id, this._confirmCount)
                : await InventoryApi.sell(this._characterId, g.item_id, this._confirmCount);
            if (this._destroyed) return;
            if (res.code !== 0) {
                this._showToast(res.msg || InventoryErrorText[res.code] || (isBuy ? '购买失败' : '出售失败'));
            } else {
                // 成功：关掉确认弹窗（结果提示走 SHOP_BOUGHT/SHOP_SOLD 事件回调，配对约定）
                if (this.confirmRoot?.active) PanelManager.closeTop();
            }
        } catch {
            if (!this._destroyed) this._showToast('网络错误，交易失败');
        } finally {
            this._requesting = false;
        }
    }

    /** 购买成功（InventoryApi 广播）：弹结果并重拉列表（余额实时刷新） */
    private _onBought(data: ShopBuyData) {
        if (this._destroyed || !this.panelRoot?.active) return;
        this._showToast(`购买【${data.item_name}】×${data.count}，花费 ${data.cost} 灵石`);
        this._reload();   // 买卖后重拉：余额与商品状态以服务端为准
    }

    /** 出售成功（InventoryApi 广播；背包面板出售也触发，各自判断面板开着才刷） */
    private _onSold(data: ShopSellData) {
        if (this._destroyed || !this.panelRoot?.active) return;
        this._showToast(`出售【${data.item_name}】×${data.count}，入账 ${data.income} 灵石`);
        this._reload();
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
