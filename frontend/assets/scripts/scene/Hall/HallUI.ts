/**
 * 寻仙 - 大厅 UI 面板
 * 角色信息栏、属性快览、小地图、功能入口、快捷操作、聊天栏
 */

import { _decorator, Component, Label, Node, Color, ScrollView } from 'cc';
import { PlayerManager } from '../../manager/PlayerManager';
import { ThemeColor } from '../../common/Constants';

const { ccclass, property } = _decorator;

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
