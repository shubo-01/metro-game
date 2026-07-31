/**
 * 寻仙 - V6 新手引导表现层（PRD 4.x 新手引导系统）
 *
 * 职责分工（与 manager/TutorialSystem.ts 配对）：
 *   - TutorialSystem：状态机（拉状态/判定完成条件/调 advance 上报）
 *   - TutorialUI（本文件）：纯表现——高亮脉冲 + 箭头指向 + 文案提示 + 跳过确认 + 奖励toast
 *
 * 事件（生产者-消费者配对）：
 *   - 监听 TutorialEvent.TUTORIAL_STEP_CHANGED（生产者 TutorialSystem._enterStep）
 *     → 刷新高亮目标/箭头位置/提示文案
 *   - 监听 TutorialEvent.TUTORIAL_FINISHED（生产者 TutorialSystem）
 *     → 隐藏引导层；正常完成（skipped=false）时 toast 展示第4步奖励明细
 *   - 监听 TutorialEvent.TUTORIAL_TOAST（生产者 TutorialSystem._advance 错误分支）
 *     → 用 toastLabel 展示 6402/6403 等业务错误的中文文案（评审修复）
 *   - 监听 UIEvent.PANEL_OPENED / PANEL_CLOSED（生产者 PanelManager）
 *     → 一级面板打开时引导层避让（隐藏箭头/文案，防止盖在背包/商店面板上）
 *
 * 高亮实现（任务书：禁自定义 shader）：
 *   采用「目标缩放脉冲」——schedule 每 PULSE_INTERVAL 秒在 1.0/1.15 倍间交替
 *   setScale，替代遮罩挖孔方案（挖孔需 Mask 反向裁剪+动态网格，收益低复杂度高）
 *
 * 目标节点注册（highlight_target/arrow_target 元素ID → 场景节点映射）：
 *   引导目标分散在不同脚本管辖（NPC 在 HallScene、背包按钮在 HallUI、摇杆在
 *   CombatHUD），由各自持有者在 onLoad 调 TutorialUI.registerTarget(id, node)
 *   注册；未注册的目标只显示文案不做高亮/箭头（引导仍可正常推进）
 *
 * 节点结构约定（编辑器搭建）：
 *   TutorialUI（挂本脚本，建议挂在 Canvas 顶层常驻节点）
 *   ├─ GuideRoot          引导层根（平时隐藏，@property guideRoot）
 *   │   ├─ TipLabel       步骤提示文案（step_name + tip_text）
 *   │   ├─ ArrowNode      箭头 Sprite（指向 arrow_target 对应节点）
 *   │   └─ SkipBtn        跳过按钮（右上角）
 *   ├─ ConfirmRoot        跳过二次确认弹窗（平时隐藏）
 *   │   ├─ ConfirmOkBtn / ConfirmCancelBtn
 *   └─ ToastLabel         提示文字（奖励展示/跳过反馈，2秒隐藏）
 */

import { _decorator, Component, Label, Node } from 'cc';
import { EventManager } from '../manager/EventManager';
import { TutorialSystem } from '../manager/TutorialSystem';
import { TutorialEvent, UIEvent } from '../common/Constants';
import { TutorialStepInfo, TutorialRewards } from '../net/TutorialApi';

const { ccclass, property } = _decorator;

/** 脉冲高亮参数：放大倍率与交替间隔秒（PRD 未给具体值，假设值可配） */
const PULSE_SCALE = 1.15;
const PULSE_INTERVAL = 0.4;
/** 箭头悬于目标上方的偏移px（假设值可配；跨坐标系时箭头留在编辑器摆放位兜底） */
const ARROW_OFFSET_Y = 80;

@ccclass('TutorialUI')
export class TutorialUI extends Component {

    // ─── 引导层 ───
    @property(Node) guideRoot: Node | null = null;      // 引导层根（平时隐藏）
    @property(Label) tipLabel: Label | null = null;     // 步骤提示文案
    @property(Node) arrowNode: Node | null = null;      // 箭头 Sprite
    @property(Node) skipBtn: Node | null = null;        // 跳过按钮

    // ─── 跳过二次确认弹窗（不可逆、不发奖励，必须确认） ───
    @property(Node) confirmRoot: Node | null = null;
    @property(Node) confirmOkBtn: Node | null = null;
    @property(Node) confirmCancelBtn: Node | null = null;

    @property(Label) toastLabel: Label | null = null;   // 提示文字（2秒隐藏）

    /** 元素ID → 场景节点映射（npc_elder/joystick/btn_inventory/camp_exit） */
    private static _targets: { [elementId: string]: Node } = {};

    private _curStep: TutorialStepInfo | null = null;   // 当前展示中的步骤
    private _pulseNode: Node | null = null;             // 正在脉冲的目标节点
    private _pulseOrigin: { x: number; y: number; z: number } | null = null;  // 原始缩放
    private _pulseBig: boolean = false;                 // 脉冲相位（放大/还原交替）
    private _panelCovering: boolean = false;            // 一级面板开着→引导层避让
    private _destroyed: boolean = false;

    // ═══════════════════════════════════════
    //  目标节点注册（供 HallScene/HallUI/CombatHUD 调用）
    // ═══════════════════════════════════════

    /** 注册引导目标节点（各持有者 onLoad 调用；重复注册以后来者为准） */
    static registerTarget(elementId: string, node: Node) {
        TutorialUI._targets[elementId] = node;
    }

    /** 注销引导目标（持有者 onDestroy 调用，防场景切换后残留失效节点） */
    static unregisterTarget(elementId: string) {
        delete TutorialUI._targets[elementId];
    }

    // ═══════════════════════════════════════
    //  生命周期
    // ═══════════════════════════════════════

    onLoad() {
        // 跳过按钮 → 二次确认弹窗（不可逆操作，PRD 4.3 必须确认）
        this.skipBtn?.on(Node.EventType.TOUCH_END, this._onSkipClick, this);
        this.confirmOkBtn?.on(Node.EventType.TOUCH_END, this._onConfirmSkip, this);
        this.confirmCancelBtn?.on(Node.EventType.TOUCH_END, this._onCancelSkip, this);

        // 事件监听（生产者见文件头注释）
        EventManager.on(TutorialEvent.TUTORIAL_STEP_CHANGED, this._onStepChanged, this);
        EventManager.on(TutorialEvent.TUTORIAL_FINISHED, this._onFinished, this);
        // 引导业务错误文案（生产者 TutorialSystem._advance：6402 跳步/6403 已结束）
        EventManager.on(TutorialEvent.TUTORIAL_TOAST, this._onTutorialToast, this);
        EventManager.on(UIEvent.PANEL_OPENED, this._onPanelOpened, this);
        EventManager.on(UIEvent.PANEL_CLOSED, this._onPanelClosed, this);

        // 初始隐藏（状态机启动后经 STEP_CHANGED 显示）
        if (this.guideRoot) this.guideRoot.active = false;
        if (this.confirmRoot) this.confirmRoot.active = false;
        if (this.toastLabel) this.toastLabel.node.active = false;
    }

    start() {
        // 兜底：若 TutorialSystem 在本组件 onLoad 前已经进入某步骤
        // （事件先于监听发出），主动取当前步骤补渲染一次
        const step = TutorialSystem.currentStep();
        if (step) this._renderStep(step);
    }

    onDestroy() {
        this._destroyed = true;
        this._stopPulse();
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════
    //  步骤渲染（TUTORIAL_STEP_CHANGED 消费者）
    // ═══════════════════════════════════════

    private _onStepChanged(step: TutorialStepInfo) {
        if (this._destroyed) return;
        this._renderStep(step);
    }

    /** 渲染一个步骤：文案 + 高亮脉冲 + 箭头指向 */
    private _renderStep(step: TutorialStepInfo) {
        this._curStep = step;
        if (this.guideRoot) this.guideRoot.active = !this._panelCovering;

        // 文案：步骤名 + 提示（如"【前往铁匠铺】跟随箭头..."）
        if (this.tipLabel) {
            this.tipLabel.string = `【${step.step_name}】${step.tip_text}`;
        }

        // 高亮：换目标前先还原旧目标缩放
        this._stopPulse();
        const highlightNode = TutorialUI._targets[step.highlight_target];
        if (highlightNode && highlightNode.isValid) {
            this._startPulse(highlightNode);
        }

        // 箭头：指向 arrow_target 对应节点（目标未注册/跨坐标系时留在编辑器摆放位）
        this._placeArrow(step.arrow_target);
    }

    /** 箭头定位：悬于目标节点上方（假设引导层与目标同 Canvas 坐标系，假设值可配） */
    private _placeArrow(arrowTargetId: string) {
        if (!this.arrowNode) return;
        const target = TutorialUI._targets[arrowTargetId];
        if (target && target.isValid) {
            this.arrowNode.active = true;
            this.arrowNode.setPosition(
                target.position.x,
                target.position.y + ARROW_OFFSET_Y,
                0,
            );
        } else {
            // 目标未注册：隐藏箭头只留文案（引导仍可推进）
            this.arrowNode.active = false;
        }
    }

    // ═══════════════════════════════════════
    //  高亮脉冲（schedule 交替 setScale，禁自定义 shader）
    // ═══════════════════════════════════════

    private _startPulse(target: Node) {
        this._pulseNode = target;
        this._pulseOrigin = {
            x: target.scale.x, y: target.scale.y, z: target.scale.z,
        };
        this._pulseBig = false;
        this.schedule(this._pulseTick, PULSE_INTERVAL);
    }

    /** 脉冲一拍：1.0 ↔ 1.15 倍交替（目标被销毁则自动停止） */
    private _pulseTick = () => {
        const node = this._pulseNode;
        const origin = this._pulseOrigin;
        if (!node || !origin || !node.isValid) {
            this._stopPulse();
            return;
        }
        this._pulseBig = !this._pulseBig;
        const mult = this._pulseBig ? PULSE_SCALE : 1;
        node.setScale(origin.x * mult, origin.y * mult, origin.z);
    };

    /** 停止脉冲并还原目标原始缩放 */
    private _stopPulse() {
        this.unschedule(this._pulseTick);
        if (this._pulseNode && this._pulseNode.isValid && this._pulseOrigin) {
            this._pulseNode.setScale(
                this._pulseOrigin.x, this._pulseOrigin.y, this._pulseOrigin.z);
        }
        this._pulseNode = null;
        this._pulseOrigin = null;
    }

    // ═══════════════════════════════════════
    //  引导结束（TUTORIAL_FINISHED 消费者）
    // ═══════════════════════════════════════

    private _onFinished(info: { skipped: boolean; rewards: TutorialRewards | null }) {
        if (this._destroyed) return;
        this._curStep = null;
        this._stopPulse();
        if (this.guideRoot) this.guideRoot.active = false;
        if (this.confirmRoot) this.confirmRoot.active = false;

        if (!info.skipped && info.rewards) {
            // 第4步正常完成：toast 展示奖励明细（PRD 4.4 灵石1+凡品武器+凡品药×3）
            this._showToast(this._formatRewards(info.rewards));
        } else if (info.skipped) {
            this._showToast('已跳过新手引导');
        }
    }

    /** 奖励明细 → 中文文案（如"引导完成！获得：灵石×1、凡品武器×1、凡品药×3"） */
    private _formatRewards(rewards: TutorialRewards): string {
        const parts: string[] = [];
        if (rewards.spirit_stone && rewards.spirit_stone > 0) {
            parts.push(`灵石×${rewards.spirit_stone}`);
        }
        for (const item of rewards.items || []) {
            parts.push(`${item.name}×${item.count}`);
        }
        return parts.length > 0 ? `引导完成！获得：${parts.join('、')}` : '引导完成！';
    }

    // ═══════════════════════════════════════
    //  跳过流程（二次确认，不可逆不发奖励）
    // ═══════════════════════════════════════

    private _onSkipClick() {
        if (!this._curStep) return;   // 引导没在跑，跳过按钮无效
        if (this.confirmRoot) this.confirmRoot.active = true;
    }

    private _onConfirmSkip() {
        if (this.confirmRoot) this.confirmRoot.active = false;
        // 实际请求走状态机（成功经 TUTORIAL_SKIPPED → FINISHED 事件回流隐藏引导层）
        TutorialSystem.skip();
    }

    private _onCancelSkip() {
        if (this.confirmRoot) this.confirmRoot.active = false;
    }

    /** 引导错误文案到达（TutorialSystem 广播）：用 toast 通道反馈给玩家（评审修复） */
    private _onTutorialToast(text: string) {
        if (this._destroyed || !text) return;
        this._showToast(text);
    }

    // ═══════════════════════════════════════
    //  面板避让（PANEL_OPENED / PANEL_CLOSED 消费者）
    // ═══════════════════════════════════════

    /** 一级面板打开：引导层暂时隐藏，防止箭头/文案盖在背包/商店/设置面板上 */
    private _onPanelOpened(info: { type: string; level: number }) {
        if (this._destroyed || info.level !== 1) return;
        this._panelCovering = true;
        if (this.guideRoot) this.guideRoot.active = false;
    }

    /** 一级面板关闭：引导还在跑则恢复显示 */
    private _onPanelClosed(info: { type: string; level: number }) {
        if (this._destroyed || info.level !== 1) return;
        this._panelCovering = false;
        if (this.guideRoot && this._curStep) this.guideRoot.active = true;
    }

    // ═══════════════════════════════════════
    //  工具
    // ═══════════════════════════════════════

    /** toast 提示（2秒后隐藏，与各面板同款范式） */
    private _showToast(msg: string) {
        if (!this.toastLabel) return;
        this.toastLabel.string = msg;
        this.toastLabel.node.active = true;
        this.unschedule(this._hideToast);
        this.scheduleOnce(this._hideToast, 2);
    }

    private _hideToast = () => {
        if (this._destroyed) return;
        if (this.toastLabel) this.toastLabel.node.active = false;
    };
}
