/**
 * 寻仙 - V6 面板管理器（纯静态类，非组件）
 *
 * 面板规则（PRD 7.1/7.2）：
 *   - 同时只显示 1 个一级面板：openPanel(A) 会自动关掉正在开着的一级面板 B
 *     （例外：战斗模式 combat_mode=true 时不自动关，避免打断战斗操作）
 *   - 面板层级最多两级：一级面板 → 二级子面板（如背包→物品详情）
 *   - 二级子面板关闭 → 回到一级面板；一级关闭 → 二级一起关
 *   - 面板打开时压半透明叠底遮罩 alpha=0.7（PRD 7.2 数值，由面板自己的
 *     maskNode 承载，PanelManager 统一设置透明度 0.7*255≈179）
 *
 * 接入方式（仅 V6 新四面板走本管理器，既有面板不强制迁移避免回归）：
 *   - 面板在 onLoad 里调 PanelManager.register(type, { show, hide }) 注册；
 *     onDestroy 里调 unregister(type) 防止悬空引用
 *   - 入口按钮调 PanelManager.openPanel(type)；二级子面板调 openSubPanel(type)
 *   - 打开/关闭时广播 UIEvent.PANEL_OPENED / PANEL_CLOSED（携带 {type,level}），
 *     消费者：TutorialSystem（第3步打开背包判定）、TutorialUI（引导层避让）
 */

import { UIOpacity, Node } from 'cc';
import { EventManager } from './EventManager';
import { UIEvent } from '../common/Constants';

/** V6 面板类型标识（新四面板；后续新增面板在此追加） */
export enum PanelType {
    Inventory = 'inventory',       // 背包面板（一级）
    Shop = 'shop',                 // 商店面板（一级）
    Settings = 'settings',         // 设置面板（一级）
    ItemDetail = 'item_detail',    // 物品详情（背包的二级子面板）
    ShopConfirm = 'shop_confirm',  // 买/卖数量确认（商店的二级子面板）
}

/** 面板注册信息：show/hide 由面板自己实现（控制 panelRoot 显隐与数据刷新） */
export interface PanelHandler {
    show: () => void;
    hide: () => void;
    /** 可选：面板的半透明叠底遮罩节点，注册后由 PanelManager 统一设 alpha=0.7 */
    maskNode?: Node | null;
}

/** 半透明叠底透明度（PRD 7.2：alpha=0.7 → 0~255 制式取 179） */
const MASK_ALPHA_255 = Math.round(0.7 * 255);

export class PanelManager {

    /** 已注册面板表 */
    private static _handlers: Map<string, PanelHandler> = new Map();
    /** 面板栈：[0]=一级面板，[1]=二级子面板（最多两级） */
    private static _stack: string[] = [];
    /** 战斗模式标记：true 时 openPanel 不自动关旧一级面板（PRD 7.1 例外条款） */
    private static _combatMode: boolean = false;

    // ═══════════════════════════════════════
    //  注册/注销（面板 onLoad/onDestroy 调用）
    // ═══════════════════════════════════════

    /** 注册面板：同时把叠底遮罩透明度统一设为 0.7（有 UIOpacity 组件才生效） */
    static register(type: string, handler: PanelHandler) {
        PanelManager._handlers.set(type, handler);
        // 统一叠底透明度：面板遮罩节点挂 UIOpacity 时设 alpha=0.7（179/255）
        if (handler.maskNode) {
            const op = handler.maskNode.getComponent(UIOpacity);
            if (op) op.opacity = MASK_ALPHA_255;
        }
    }

    /** 注销面板（面板 onDestroy 调用，防止场景切换后悬空引用） */
    static unregister(type: string) {
        PanelManager._handlers.delete(type);
        // 从栈里移除（面板销毁时若还在栈中，直接剔除）
        PanelManager._stack = PanelManager._stack.filter(t => t !== type);
    }

    /**
     * 设置战斗模式（true 时 openPanel 不自动关旧一级面板，PRD 7.1 例外条款）。
     * 【调用规范与实际调用点（V6 评审修复后）】
     *   - 进战 true：CombatHUDUI.setTarget(defenderId>0) 锁定战斗目标时
     *   - 脱战 false：CombatHUDUI.setTarget(0) 清除目标时
     *   - 兜底 false：CombatHUDUI.onDestroy（HUD 销毁必须置回，防状态泄漏到下个场景）
     * 新接入方必须成对调用 true/false，且在组件销毁时置回 false
     */
    static setCombatMode(on: boolean) {
        PanelManager._combatMode = on;
    }

    // ═══════════════════════════════════════
    //  打开/关闭
    // ═══════════════════════════════════════

    /**
     * 打开一级面板：默认自动关掉当前开着的一级面板（含其二级子面板）；
     * 战斗模式下不自动关旧面板（直接叠加显示，PRD 7.1 例外）
     */
    static openPanel(type: string) {
        const handler = PanelManager._handlers.get(type);
        if (!handler) return;   // 未注册（面板未挂到场景）静默忽略
        if (PanelManager._stack[0] === type) return;   // 已经开着，不重复打开

        // 非战斗模式：先关掉旧一级面板（连带二级）
        if (!PanelManager._combatMode && PanelManager._stack.length > 0) {
            PanelManager.closeAll();
        }

        PanelManager._stack = [type];
        handler.show();
        EventManager.emit(UIEvent.PANEL_OPENED, { type, level: 1 });
    }

    /**
     * 打开二级子面板（如背包→物品详情、商店→数量确认）：
     * 压栈到第二层；已有二级面板时先关旧的再开新的（最多两级，PRD 7.1）
     */
    static openSubPanel(type: string) {
        const handler = PanelManager._handlers.get(type);
        if (!handler) return;
        if (PanelManager._stack.length === 0) return;   // 没有一级面板时不允许开二级

        // 已有二级面板：先弹掉旧二级（最多两级约束）
        if (PanelManager._stack.length >= 2) {
            const oldType = PanelManager._stack[1];
            PanelManager._handlers.get(oldType)?.hide();
            PanelManager._stack.length = 1;
            EventManager.emit(UIEvent.PANEL_CLOSED, { type: oldType, level: 2 });
        }

        PanelManager._stack.push(type);
        handler.show();
        EventManager.emit(UIEvent.PANEL_OPENED, { type, level: 2 });
    }

    /**
     * 关闭栈顶面板：二级开着时只关二级（回到一级）；只有一级时关一级
     * 面板的关闭按钮/遮罩点击统一调本方法
     */
    static closeTop() {
        if (PanelManager._stack.length === 0) return;
        const type = PanelManager._stack[PanelManager._stack.length - 1];
        const level = PanelManager._stack.length;
        PanelManager._stack.pop();
        PanelManager._handlers.get(type)?.hide();
        EventManager.emit(UIEvent.PANEL_CLOSED, { type, level });
    }

    /** 关闭全部面板（一级+二级，从栈顶往下依次关） */
    static closeAll() {
        while (PanelManager._stack.length > 0) {
            PanelManager.closeTop();
        }
    }

    // ═══════════════════════════════════════
    //  查询
    // ═══════════════════════════════════════

    /** 某面板当前是否开着（在栈中） */
    static isOpen(type: string): boolean {
        return PanelManager._stack.indexOf(type) >= 0;
    }

    /** 当前栈顶面板类型（无面板打开返回空串） */
    static topPanel(): string {
        return PanelManager._stack.length > 0
            ? PanelManager._stack[PanelManager._stack.length - 1] : '';
    }

    /** 当前是否有任何面板打开（TutorialUI 引导层避让用） */
    static hasAnyOpen(): boolean {
        return PanelManager._stack.length > 0;
    }
}
