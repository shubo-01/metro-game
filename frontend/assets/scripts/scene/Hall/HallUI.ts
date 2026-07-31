/**
 * 寻仙 - 大厅 UI 面板
 * 角色信息栏、属性快览、小地图、功能入口、快捷操作、聊天栏
 *
 * V6 变更：功能入口/快捷操作运行时构建为可点按钮；
 * 背包/商店/设置三个入口接 PanelManager.openPanel（面板脚本见 ui/ 下同名文件）；
 * 「背包」入口节点注册为引导目标 btn_inventory（第3步高亮用）
 */

import { _decorator, Component, Label, Node, Color, ScrollView } from 'cc';
import { PlayerManager } from '../../manager/PlayerManager';
import { PanelManager, PanelType } from '../../manager/PanelManager';
import { ThemeColor } from '../../common/Constants';
import { TutorialUI } from '../../ui/TutorialUI';

const { ccclass, property } = _decorator;

/** 入口按钮排布px（每格宽度/行高；PRD 未给具体像素，假设值可配） */
const ENTRY_WIDTH = 96;
const ENTRY_HEIGHT = 80;

@ccclass('HallUI')
export class HallUI extends Component {

    // ─── UI 引用 ───

    @property(Label)
    playerNameLabel: Label | null = null;

    @property(Label)
    playerLevelLabel: Label | null = null;

    @property(Label)
    attrsLabel: Label | null = null;

    @property(Label)
    toastLabel: Label | null = null;

    @property(Label)
    reconnectLabel: Label | null = null;

    @property(Label)
    chatLabel: Label | null = null;

    @property(Node)
    funcEntryContainer: Node | null = null;

    @property(Node)
    quickActionContainer: Node | null = null;

    // 功能入口配置
    private readonly _funcEntries = [
        { name: '副本', icon: '🏔️', unlocked: true },
        { name: '阵营', icon: '⚔️', unlocked: true },
        { name: '神位', icon: '👑', unlocked: false, reqStage: 3 },
        { name: '飞升', icon: '☁️', unlocked: false, reqStage: 4 },
        { name: '背包', icon: '🎒', unlocked: true },
        { name: '商店', icon: '🏪', unlocked: true },
        { name: '排行', icon: '📊', unlocked: true },
        { name: '功法', icon: '📜', unlocked: true },
    ];

    private readonly _quickActions = [
        { name: '修炼', icon: '🧘' },
        { name: '传送', icon: '🌀' },
        { name: '好友', icon: '👥' },
        { name: '帮派', icon: '🏯' },
        { name: '设置', icon: '⚙️' },
    ];

    onLoad() {
        // 运行时构建功能入口/快捷操作按钮（配置见上方数组）
        this._buildEntries();
    }

    onDestroy() {
        // 注销引导目标，防场景切换后 TutorialUI 持有失效节点
        TutorialUI.unregisterTarget('btn_inventory');
    }

    // ═══════════════════════════════════════
    //  V6 入口构建（背包/商店/设置接 PanelManager）
    // ═══════════════════════════════════════

    /** 按配置数组创建入口按钮（每格：Label 显示"图标\n名称"，横向排布） */
    private _buildEntries() {
        // 功能入口栏（副本/阵营/.../背包/商店/...）
        this._funcEntries.forEach((entry, i) => {
            const node = this._createEntryNode(this.funcEntryContainer, entry.name,
                entry.icon, i, entry.unlocked);
            if (!node) return;
            if (entry.name === '背包') {
                node.on(Node.EventType.TOUCH_END,
                    () => PanelManager.openPanel(PanelType.Inventory), this);
                // 引导第3步「装备武器」高亮/箭头目标（元素ID见 tutorial_step_config）
                TutorialUI.registerTarget('btn_inventory', node);
            } else if (entry.name === '商店') {
                node.on(Node.EventType.TOUCH_END,
                    () => PanelManager.openPanel(PanelType.Shop), this);
            } else if (!entry.unlocked) {
                // reqStage 只在未解锁项上有（混合数组推导为联合类型，这里窄化读取）
                const reqStage = (entry as { reqStage?: number }).reqStage;
                node.on(Node.EventType.TOUCH_END,
                    () => this.showToast(`${entry.name}未解锁（需境界 ${reqStage ?? '-'}）`), this);
            }
            // 其余已解锁入口（副本/阵营等）由各自场景/面板既有逻辑接管，这里不绑定
        });

        // 快捷操作栏（修炼/传送/.../设置）
        this._quickActions.forEach((action, i) => {
            const node = this._createEntryNode(this.quickActionContainer, action.name,
                action.icon, i, true);
            if (!node) return;
            if (action.name === '设置') {
                node.on(Node.EventType.TOUCH_END,
                    () => PanelManager.openPanel(PanelType.Settings), this);
            }
            // 其余快捷操作由既有逻辑接管，这里不绑定
        });
    }

    /** 创建单个入口按钮节点（横排；未解锁灰显） */
    private _createEntryNode(container: Node | null, name: string, icon: string,
                             index: number, unlocked: boolean): Node | null {
        if (!container) return null;
        const node = new Node(`Entry_${name}`);
        node.setPosition(index * ENTRY_WIDTH, 0, 0);
        const label = node.addComponent(Label);
        label.string = `${icon}\n${name}`;
        label.fontSize = 20;
        label.lineHeight = ENTRY_HEIGHT / 2;
        label.color = new Color().fromHEX(unlocked ? ThemeColor.TEXT_WHITE : ThemeColor.TEXT_GRAY);
        container.addChild(node);
        return node;
    }

    // ═══════════════════════════════════════
    //  公开方法
    // ═══════════════════════════════════════

    /** 更新玩家信息显示 */
    updatePlayerInfo(pm: PlayerManager) {
        if (this.playerNameLabel) {
            this.playerNameLabel.string = pm.name;
            this.playerNameLabel.color = new Color().fromHEX(ThemeColor.GOLD);
        }
        if (this.playerLevelLabel) {
            this.playerLevelLabel.string = pm.getLevelText();
            this.playerLevelLabel.color = new Color().fromHEX(ThemeColor.TEXT_WHITE);
        }
        if (this.attrsLabel) {
            const attrs = pm.data?.attrs;
            if (attrs) {
                this.attrsLabel.string = `精${attrs.jing} 气${attrs.qiMetal + attrs.qiWood + attrs.qiWater + attrs.qiFire + attrs.qiEarth} 神${attrs.shen}`;
                this.attrsLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
            }
        }
    }

    /** 显示 Toast 提示 */
    showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => {
                if (this.toastLabel) this.toastLabel.node.active = false;
            }, 2);
        }
    }

    /** 显示重连提示 */
    showReconnectTip(msg: string) {
        if (this.reconnectLabel) {
            this.reconnectLabel.string = msg;
            this.reconnectLabel.node.active = true;
        }
    }

    /** 显示 NPC 对话 */
    showNPCDialog(npcName: string, data: any) {
        this.showToast(`${npcName}：仙友，有何贵干？`);
    }

    /** 添加聊天消息 */
    addChatMessage(senderName: string, text: string) {
        if (this.chatLabel) {
            const current = this.chatLabel.string || '';
            const lines = current.split('\n').slice(-9); // 保留最近10条
            lines.push(`[${senderName}] ${text}`);
            this.chatLabel.string = lines.join('\n');
        }
    }
}
