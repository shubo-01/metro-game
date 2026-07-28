/**
 * 寻仙 - 花果山副本战斗场景控制器
 * 
 * 功能:
 *   1. 监听 HuaguoshanEvent.ENTER → 激活战斗层，隐藏大厅世界层
 *   2. 根据 role_type 初始化不同角色操作（大圣/魔王：战斗操作；草木：观测按钮）
 *   3. 300 秒倒计时（5 分钟副本时限）
 *   4. 每 60 秒心跳上报 fatigue/consume
 *   5. 草木石头显示观测事件按钮
 *   6. 时间到 / HP=0 → 调用 DungeonApi.settle() → emit SETTLE
 *   7. 收到 hgs:settle_confirmed → 返回大厅世界层
 * 
 * 严格对齐《花果山副本设计文档 V3》和《花果山副本技术方案》。
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { DungeonApi, HgsRoleType, HgsObserveEvent, EnterDungeonData } from '../../net/DungeonApi';
import { EventManager } from '../../manager/EventManager';
import { PlayerManager } from '../../manager/PlayerManager';
import { HuaguoshanEvent } from '../../ui/HuaguoshanEntryUI';

const { ccclass, property } = _decorator;

@ccclass('HuaguoshanBattle')
export class HuaguoshanBattle extends Component {

    // ── 节点引用 ──
    @property(Node) battleLayer: Node | null = null;
    @property(Node) hallWorldLayer: Node | null = null;

    // ── HUD 元素 ──
    @property(Label) timerLabel: Label | null = null;
    @property(Label) roleNameLabel: Label | null = null;
    @property(Node) hpBarNode: Node | null = null;
    @property(Node) observeBarNode: Node | null = null;

    // ── 观测事件按钮（仅草木可见） ──
    @property(Node) eventButtonsNode: Node | null = null;
    @property(Node) wukongUltimateBtn: Node | null = null;
    @property(Node) mowangSummonBtn: Node | null = null;
    @property(Node) mowangBurstBtn: Node | null = null;
    @property(Node) mowangDeathBtn: Node | null = null;

    // ── 内部状态 ──
    private _playerManager: PlayerManager = new PlayerManager();
    private _playerId: number = 0;
    private _sessionId: number = 0;
    private _roleType: number = 0;
    private _roleName: string = '';
    private _maxDuration: number = 300; // 5分钟
    private _remainingTime: number = 300;
    private _isActive: boolean = false;
    private _observeScore: number = 0;
    private _selfHpLeft: number = 100;
    private _bossHpLeft: number = 100;

    onLoad() {
        this._playerId = this._playerManager.playerId;

        // 监听进入副本事件
        EventManager.on(HuaguoshanEvent.ENTER, this._onEnterDungeon, this);
        // 监听结算确认（玩家点了结算面板的"确认"按钮）
        EventManager.on('hgs:settle_confirmed', this._onSettleConfirmed, this);

        // 绑定观测事件按钮
        this.wukongUltimateBtn?.on(Node.EventType.TOUCH_END, () => this._onObserveEvent(HgsObserveEvent.WukongUltimate), this);
        this.mowangSummonBtn?.on(Node.EventType.TOUCH_END, () => this._onObserveEvent(HgsObserveEvent.MowangSummon), this);
        this.mowangBurstBtn?.on(Node.EventType.TOUCH_END, () => this._onObserveEvent(HgsObserveEvent.MowangBurst), this);
        this.mowangDeathBtn?.on(Node.EventType.TOUCH_END, () => this._onObserveEvent(HgsObserveEvent.MowangDeath), this);

        // 默认隐藏战斗层
        if (this.battleLayer) this.battleLayer.active = false;
    }

    onDestroy() {
        EventManager.off(HuaguoshanEvent.ENTER, this._onEnterDungeon, this);
        EventManager.off('hgs:settle_confirmed', this._onSettleConfirmed, this);
        this.unscheduleAllCallbacks();
    }

    /** 进入副本回调 */
    private _onEnterDungeon(data: EnterDungeonData) {
        this._sessionId = data.session_id;
        this._roleType = data.role_type;
        this._roleName = data.role_name;
        this._maxDuration = data.max_duration || 300;
        this._remainingTime = this._maxDuration;
        this._isActive = true;
        this._observeScore = 0;
        this._selfHpLeft = 100;
        this._bossHpLeft = 100;

        // 切换显示层
        if (this.hallWorldLayer) this.hallWorldLayer.active = false;
        if (this.battleLayer) this.battleLayer.active = true;

        // 更新角色名
        if (this.roleNameLabel) {
            this.roleNameLabel.string = this._roleName;
        }

        // 根据身份类型显示/隐藏观测按钮
        const isGrass = this._roleType === HgsRoleType.Grass;
        if (this.eventButtonsNode) this.eventButtonsNode.active = isGrass;
        if (this.observeBarNode) this.observeBarNode.active = isGrass;

        // 启动倒计时
        this._updateTimerDisplay();
        this.schedule(this._tick, 1);

        // 启动牢结值心跳（每60秒消耗一次）
        this.schedule(this._heartbeat, 60);
    }

    /** 每秒 tick */
    private _tick() {
        if (!this._isActive) return;

        this._remainingTime--;
        this._updateTimerDisplay();

        if (this._remainingTime <= 0) {
            // 时间到，自动结算
            this._doSettle(false);
        }
    }

    /** 牢结值心跳消耗 */
    private async _heartbeat() {
        if (!this._isActive) return;
        try {
            await DungeonApi.consumeFatigue(this._playerId, 60);
        } catch (e) {
            console.warn('[HuaguoshanBattle] 牢结值心跳上报失败', e);
        }
    }

    /** 更新倒计时显示 */
    private _updateTimerDisplay() {
        if (!this.timerLabel) return;
        const min = Math.floor(this._remainingTime / 60);
        const sec = this._remainingTime % 60;
        this.timerLabel.string = `${min}:${sec.toString().padStart(2, '0')}`;

        // 最后30秒变红
        if (this._remainingTime <= 30) {
            this.timerLabel.color = new Color().fromHEX('#E74C3C');
        } else {
            this.timerLabel.color = new Color().fromHEX('#F5F5F5');
        }
    }

    /** 观测事件上报（仅草木石头） */
    private async _onObserveEvent(eventCode: HgsObserveEvent) {
        if (!this._isActive) return;
        try {
            const res = await DungeonApi.reportObserve(this._sessionId, this._playerId, eventCode);
            if (res.code === 0 && res.data) {
                this._observeScore = res.data.observe_score;
                this._updateObserveBar();
            }
        } catch (e) {
            console.warn('[HuaguoshanBattle] 观测事件上报失败', e);
        }
    }

    /** 更新观测度进度条 */
    private _updateObserveBar() {
        if (!this.observeBarNode) return;
        const progress = Math.min(this._observeScore / 100, 1);
        (this.observeBarNode as any).progress = progress;
    }

    /** 触发结算 */
    private async _doSettle(killedByBoss: boolean) {
        if (!this._isActive) return;
        this._isActive = false;
        this.unscheduleAllCallbacks();

        // 判断是否剧情死亡（魔王撑满5分钟）
        const storyDeath = this._roleType === HgsRoleType.Mowang && this._remainingTime <= 0;

        try {
            const res = await DungeonApi.settle({
                sessionId: this._sessionId,
                playerId: this._playerId,
                selfHpLeft: this._selfHpLeft,
                bossHpLeft: this._bossHpLeft,
                killedByBoss: killedByBoss,
                storyDeath: storyDeath,
            });

            if (res.code === 0 && res.data) {
                // 广播结算数据给 HuaguoshanSettleUI
                EventManager.emit(HuaguoshanEvent.SETTLE, res.data);
            }
        } catch (e) {
            console.error('[HuaguoshanBattle] 结算请求失败', e);
        }
    }

    /** 外部调用：角色被击杀 */
    public onPlayerKilled() {
        this._selfHpLeft = 0;
        this._doSettle(true);
    }

    /** 外部调用：更新 HP（用于战斗模拟） */
    public updateHp(selfHp: number, bossHp: number) {
        this._selfHpLeft = selfHp;
        this._bossHpLeft = bossHp;
        if (this.hpBarNode) {
            (this.hpBarNode as any).progress = Math.max(0, selfHp / 100);
        }
    }

    /** 结算确认回调：返回大厅 */
    private _onSettleConfirmed() {
        if (this.battleLayer) this.battleLayer.active = false;
        if (this.hallWorldLayer) this.hallWorldLayer.active = true;
    }
}
