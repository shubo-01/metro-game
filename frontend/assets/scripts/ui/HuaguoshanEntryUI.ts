/**
 * 寻仙 - 花果山副本入口 UI
 * 
 * 功能:
 *   1. 展示花果山副本简介 + 当前玩家运气加权后的六种身份概率
 *   2. 展示剩余牢结值 / 是否处于负状态
 *   3. 点击"进入副本"按钮 → POST /dungeon/huaguoshan/enter，服务端随机分配身份
 *   4. 分配结果通过事件 GameEvent.HGS_ENTER 广播给场景层
 * 
 * 数据源:
 *   - GET /dungeon/huaguoshan/probs  概率预览
 *   - GET /fatigue/state             牢结值状态
 *   - POST /dungeon/huaguoshan/enter 正式进入
 * 
 * 严格按照《花果山副本设计文档 V3》第7章「副本入口」实现。
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { DungeonApi, HgsRoleType, HgsRoleName } from '../net/DungeonApi';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';

const { ccclass, property } = _decorator;

/** 花果山副本相关事件（追加到全局事件系统） */
export const HuaguoshanEvent = {
    /** 玩家成功进入副本，携带 EnterDungeonData */
    ENTER:  'hgs:enter',
    /** 玩家结算完成，携带 SettleData */
    SETTLE: 'hgs:settle',
};

/** 六种身份的颜色（与《PRD》色卡对齐） */
const RoleColor: Record<number, string> = {
    [HgsRoleType.Wukong]: '#FFD700',  // 金色 - 稀有
    [HgsRoleType.Mowang]: '#8B0000',  // 暗红 - 稀有
    [HgsRoleType.Shouxa]: '#8B4513',  // 棕色 - 普通
    [HgsRoleType.Monkey]: '#A0522D',  // 浅棕 - 普通
    [HgsRoleType.OldMon]: '#696969',  // 灰色 - 普通
    [HgsRoleType.Grass]:  '#2E8B57',  // 墨绿 - 特殊
};

@ccclass('HuaguoshanEntryUI')
export class HuaguoshanEntryUI extends Component {

    @property(Label) titleLabel:      Label | null = null;
    @property(Label) descLabel:       Label | null = null;
    @property(Label) luckLabel:       Label | null = null;
    @property(Label) fatigueLabel:    Label | null = null;
    @property(Label) toastLabel:      Label | null = null;

    /** 六个概率显示 Label（大圣/魔王/手下/普通猴/老猴/草木） */
    @property(Label) probWukongLabel: Label | null = null;
    @property(Label) probMowangLabel: Label | null = null;
    @property(Label) probShouxaLabel: Label | null = null;
    @property(Label) probMonkeyLabel: Label | null = null;
    @property(Label) probOldMonLabel: Label | null = null;
    @property(Label) probGrassLabel:  Label | null = null;

    /** 进入按钮 / 打坐按钮 / 关闭按钮 */
    @property(Node) enterBtn:    Node | null = null;
    @property(Node) meditateBtn: Node | null = null;
    @property(Node) closeBtn:    Node | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _playerId: number = 0;
    /** 最新一次查询到的剩余牢结值，用于按钮可用性判断 */
    private _remainingFatigue: number = 0;
    /** 是否处于负状态（牢结值耗尽） */
    private _isPenalty: boolean = false;

    onLoad() {
        this._playerId = this._playerManager.playerId;

        if (this.titleLabel) this.titleLabel.string = '花果山秘境';
        if (this.descLabel) {
            this.descLabel.string =
                '「石破天惊，猴王出世。此地灵气钟秀，机缘深藏，然身份随缘而定，慎入。」';
        }

        // 绑定按钮
        this.enterBtn?.on(Node.EventType.TOUCH_END, this._onEnterClick, this);
        this.meditateBtn?.on(Node.EventType.TOUCH_END, this._onMeditateClick, this);
        this.closeBtn?.on(Node.EventType.TOUCH_END, this._onCloseClick, this);

        // 打开面板时刷新数据
        this._refreshData();
    }

    /** 刷新概率 + 牢结值 */
    private async _refreshData() {
        try {
            // 并行请求，缩短打开延迟
            const [probsRes, fatigueRes] = await Promise.all([
                DungeonApi.previewProbs(this._playerId),
                DungeonApi.getFatigue(this._playerId),
            ]);

            // ── 概率 ──
            if (probsRes.code === 0 && probsRes.data) {
                if (this.luckLabel) {
                    // 运气值 0-1.0 归一化，转换为百分比展示
                    this.luckLabel.string = `当前运气：${(probsRes.data.luck * 100).toFixed(1)}%`;
                    this.luckLabel.color = new Color().fromHEX('#D4A843');
                }
                for (const entry of probsRes.data.probs) {
                    this._renderProbLabel(entry.role_type, entry.base_prob, entry.final_prob);
                }
            } else {
                this._showToast(probsRes.msg || '概率查询失败');
            }

            // ── 牢结值 ──
            if (fatigueRes.code === 0 && fatigueRes.data) {
                this._remainingFatigue = fatigueRes.data.remaining_sec;
                this._isPenalty = fatigueRes.data.is_penalty;
                this._renderFatigueLabel();
            }
        } catch (e) {
            this._showToast('数据刷新失败');
        }
    }

    /** 单条身份概率渲染 */
    private _renderProbLabel(roleType: number, baseProb: number, finalProb: number) {
        const label = this._getProbLabelByRole(roleType);
        if (!label) return;

        const name = HgsRoleName[roleType] || '未知';
        const basePct = (baseProb * 100).toFixed(2);
        const finalPct = (finalProb * 100).toFixed(2);
        // 稀有身份用醒目色，其余身份用普通色
        const isRare = roleType === HgsRoleType.Wukong || roleType === HgsRoleType.Mowang;

        // 展示格式：身份名 基础X% → 加权后Y%
        label.string = `${name}  ${basePct}% → ${finalPct}%`;
        label.color = new Color().fromHEX(RoleColor[roleType] || (isRare ? '#FFD700' : '#F5F5F5'));
    }

    private _getProbLabelByRole(roleType: number): Label | null {
        switch (roleType) {
            case HgsRoleType.Wukong: return this.probWukongLabel;
            case HgsRoleType.Mowang: return this.probMowangLabel;
            case HgsRoleType.Shouxa: return this.probShouxaLabel;
            case HgsRoleType.Monkey: return this.probMonkeyLabel;
            case HgsRoleType.OldMon: return this.probOldMonLabel;
            case HgsRoleType.Grass:  return this.probGrassLabel;
        }
        return null;
    }

    /** 牢结值 Label 渲染（含负状态高亮） */
    private _renderFatigueLabel() {
        if (!this.fatigueLabel) return;
        const min = Math.floor(this._remainingFatigue / 60);
        const sec = this._remainingFatigue % 60;
        if (this._isPenalty || this._remainingFatigue <= 0) {
            this.fatigueLabel.string = `牢结值：0 / 18000（已耗尽，请打坐恢复）`;
            this.fatigueLabel.color = new Color().fromHEX('#E74C3C');
        } else {
            this.fatigueLabel.string = `牢结值：${this._remainingFatigue}秒（约${min}分${sec}秒）`;
            this.fatigueLabel.color = new Color().fromHEX('#2ECC71');
        }
    }

    /** 点击"进入副本"按钮 */
    private async _onEnterClick() {
        if (this._isPenalty || this._remainingFatigue <= 0) {
            this._showToast('牢结值已耗尽，需先打坐恢复');
            return;
        }

        this._showToast('进入花果山...');
        try {
            // enter_x / enter_y 使用玩家当前世界坐标，用于结算后返回原位
            const enterX = this._playerManager.data?.posX ?? 0;
            const enterY = this._playerManager.data?.posY ?? 0;
            const res = await DungeonApi.enterDungeon(this._playerId, enterX, enterY);
            if (res.code === 0 && res.data) {
                this._showToast(`身份：${res.data.role_name}`);
                // 广播身份分配结果给副本战斗场景
                EventManager.emit(HuaguoshanEvent.ENTER, res.data);
                // 关闭入口面板
                this.node.active = false;
            } else {
                this._showToast(res.msg || '进入失败');
            }
        } catch (e) {
            this._showToast('网络异常');
        }
    }

    /** 点击"打坐"按钮 —— 直接调用打坐开始接口 */
    private async _onMeditateClick() {
        try {
            const res = await DungeonApi.startMeditate(this._playerId);
            if (res.code === 0) {
                this._showToast('打坐中，每秒恢复2秒牢结值');
            } else {
                this._showToast(res.msg || '打坐启动失败');
            }
        } catch {
            this._showToast('打坐启动失败');
        }
    }

    private _onCloseClick() {
        this.node.active = false;
    }

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => { if (this.toastLabel) this.toastLabel.node.active = false; }, 2);
        }
    }
}
