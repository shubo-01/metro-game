/**
 * 寻仙 - 异常状态图标 UI
 * 功能：冰冻/灼烧/眩晕三个异常状态图标位 + 剩余时间倒计时，到时自动消失
 * 数据源：POST /combat/abnormal 的判定结果（triggered=true 时显示）
 *
 * 用法：
 *   1. 代码直接调用：abnormalStatusUI.showAbnormal(AbnormalType.Freeze, 3)
 *   2. 事件驱动：战斗逻辑拿到 combatAbnormal 响应后
 *      EventManager.emit(CharacterV2Event.ABNORMAL_TRIGGERED, res.data)
 *      本组件监听后自动展示（仅 triggered=true 时生效）
 */

import { _decorator, Component, Label, Node } from 'cc';
import { AbnormalType, CharacterV2Event, CombatAbnormalData } from '../net/CharacterApi';
import { EventManager } from '../manager/EventManager';

const { ccclass, property } = _decorator;

@ccclass('AbnormalStatusUI')
export class AbnormalStatusUI extends Component {

    // ─── 冰冻 ───
    @property(Node) freezeIcon: Node | null = null;             // 冰冻图标节点
    @property(Label) freezeCountdownLabel: Label | null = null; // 冰冻剩余秒数

    // ─── 灼烧 ───
    @property(Node) burnIcon: Node | null = null;               // 灼烧图标节点
    @property(Label) burnCountdownLabel: Label | null = null;   // 灼烧剩余秒数

    // ─── 眩晕 ───
    @property(Node) stunIcon: Node | null = null;               // 眩晕图标节点
    @property(Label) stunCountdownLabel: Label | null = null;   // 眩晕剩余秒数

    /** 各异常类型的剩余持续时间（秒），<=0 表示未生效 */
    private _remaining: Record<number, number> = {
        [AbnormalType.Freeze]: 0,
        [AbnormalType.Burn]: 0,
        [AbnormalType.Stun]: 0,
    };

    /** 每秒倒计时是否在运行（避免重复 schedule） */
    private _ticking: boolean = false;

    onLoad() {
        // 监听战斗异常判定结果广播
        EventManager.on(CharacterV2Event.ABNORMAL_TRIGGERED, this._onAbnormalEvent, this);

        // 初始全部隐藏
        this._refreshIcon(AbnormalType.Freeze);
        this._refreshIcon(AbnormalType.Burn);
        this._refreshIcon(AbnormalType.Stun);
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    /**
     * 显示某个异常状态并自动倒计时消失
     * @param type 异常类型：1冰冻 2灼烧 3眩晕
     * @param duration 持续时间（秒）
     */
    public showAbnormal(type: AbnormalType | number, duration: number) {
        if (duration <= 0) return;
        // 同类型异常重复触发时取剩余时间更长的那个（刷新持续时间）
        this._remaining[type] = Math.max(this._remaining[type] || 0, duration);
        this._refreshIcon(type);
        // 启动每秒 tick（已在跑则不重复启动；本组件只有这一个定时器）
        if (!this._ticking) {
            this._ticking = true;
            this.schedule(this._tick, 1);
        }
    }

    /** 事件入口：combatAbnormal 响应广播（未触发时忽略） */
    private _onAbnormalEvent(data: CombatAbnormalData) {
        if (data && data.triggered) {
            this.showAbnormal(data.abnormal_type, data.duration);
        }
    }

    /** 每秒倒计时：各异常剩余时间-1，归零后隐藏图标 */
    private _tick() {
        let anyActive = false;
        for (const key of Object.keys(this._remaining)) {
            const type = Number(key);
            if (this._remaining[type] > 0) {
                this._remaining[type] -= 1;
                this._refreshIcon(type);
                if (this._remaining[type] > 0) anyActive = true;
            }
        }
        // 全部结束后停止 tick，避免空转（本组件仅此一个定时器，可安全全清）
        if (!anyActive) {
            this._ticking = false;
            this.unscheduleAllCallbacks();
        }
    }

    /** 按剩余时间刷新指定类型的图标与倒计时文字 */
    private _refreshIcon(type: number) {
        const remaining = this._remaining[type] || 0;
        const active = remaining > 0;
        const text = active ? `${remaining}s` : '';

        switch (type) {
            case AbnormalType.Freeze:
                if (this.freezeIcon) this.freezeIcon.active = active;
                if (this.freezeCountdownLabel) this.freezeCountdownLabel.string = text;
                break;
            case AbnormalType.Burn:
                if (this.burnIcon) this.burnIcon.active = active;
                if (this.burnCountdownLabel) this.burnCountdownLabel.string = text;
                break;
            case AbnormalType.Stun:
                if (this.stunIcon) this.stunIcon.active = active;
                if (this.stunCountdownLabel) this.stunCountdownLabel.string = text;
                break;
        }
    }
}
