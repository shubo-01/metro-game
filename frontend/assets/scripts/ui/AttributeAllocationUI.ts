/**
 * 寻仙 - 自由属性点分配面板（加点 UI）
 * 功能：精/气/神各一行（当前值、+/- 按钮、本次待分配数），
 *       剩余可分配点数展示、均衡加成实时预判提示、确认/取消
 * 数据源：GET /character/attributes（当前精气神） + POST /character/points/allocate（确认加点）
 *
 * 打开方式：EventManager.emit(CharacterV2Event.OPEN_ALLOCATE, unassignedPoints?)
 *   - 参数可携带最新的待分配点数（升阶/洗点响应里有），不带则沿用本地缓存值
 *   - 说明：后端暂无单独查询 unassigned_points 的 GET 接口，
 *     面板通过 OPEN_ALLOCATE / POINTS_UPDATED 事件与加点/洗点响应同步余额
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { CharacterApi, CharacterV2Event } from '../net/CharacterApi';
import { HttpClient } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

@ccclass('AttributeAllocationUI')
export class AttributeAllocationUI extends Component {

    // ─── 精：当前值 / 本次待分配 / 加减按钮 ───
    @property(Label) jingCurrentLabel: Label | null = null;   // 精当前值
    @property(Label) jingPendingLabel: Label | null = null;   // 精本次待分配数
    @property(Node) jingPlusBtn: Node | null = null;          // 精 + 按钮
    @property(Node) jingMinusBtn: Node | null = null;         // 精 - 按钮

    // ─── 气：当前值 / 本次待分配 / 加减按钮 ───
    @property(Label) qiCurrentLabel: Label | null = null;     // 气当前值
    @property(Label) qiPendingLabel: Label | null = null;     // 气本次待分配数
    @property(Node) qiPlusBtn: Node | null = null;            // 气 + 按钮
    @property(Node) qiMinusBtn: Node | null = null;           // 气 - 按钮

    // ─── 神：当前值 / 本次待分配 / 加减按钮 ───
    @property(Label) shenCurrentLabel: Label | null = null;   // 神当前值
    @property(Label) shenPendingLabel: Label | null = null;   // 神本次待分配数
    @property(Node) shenPlusBtn: Node | null = null;          // 神 + 按钮
    @property(Node) shenMinusBtn: Node | null = null;         // 神 - 按钮

    // ─── 汇总信息 ───
    @property(Label) remainLabel: Label | null = null;         // 剩余可分配点数
    @property(Label) equilibriumTipLabel: Label | null = null; // 均衡加成实时预判提示

    // ─── 操作按钮 ───
    @property(Node) confirmBtn: Node | null = null;   // 确认加点按钮
    @property(Node) cancelBtn: Node | null = null;    // 取消按钮（清空待分配并关闭面板）

    // ─── Toast ───
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    // 服务器上的当前精气神（含固定点+已分配自由点）
    private _jing: number = 0;
    private _qi: number = 0;
    private _shen: number = 0;

    // 本次面板内待分配（尚未提交到服务器）
    private _pendingJing: number = 0;
    private _pendingQi: number = 0;
    private _pendingShen: number = 0;

    // 待分配点数余额（来自 OPEN_ALLOCATE / POINTS_UPDATED 事件与接口响应）
    private _unassigned: number = 0;

    /** 防止重复点击：加点请求进行中时忽略再次确认 */
    private _requesting: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 加减按钮（面板内部交互，走 TOUCH_END，与既有 UI 风格一致）
        this.jingPlusBtn?.on(Node.EventType.TOUCH_END, () => this._adjust('jing', 1), this);
        this.jingMinusBtn?.on(Node.EventType.TOUCH_END, () => this._adjust('jing', -1), this);
        this.qiPlusBtn?.on(Node.EventType.TOUCH_END, () => this._adjust('qi', 1), this);
        this.qiMinusBtn?.on(Node.EventType.TOUCH_END, () => this._adjust('qi', -1), this);
        this.shenPlusBtn?.on(Node.EventType.TOUCH_END, () => this._adjust('shen', 1), this);
        this.shenMinusBtn?.on(Node.EventType.TOUCH_END, () => this._adjust('shen', -1), this);
        this.confirmBtn?.on(Node.EventType.TOUCH_END, this._onConfirm, this);
        this.cancelBtn?.on(Node.EventType.TOUCH_END, this._onCancel, this);

        // 跨面板事件：角色面板"加点"按钮 emit OPEN_ALLOCATE 打开本面板
        EventManager.on(CharacterV2Event.OPEN_ALLOCATE, this._onOpen, this);
        // 待分配点数余额同步（升阶发点/洗点返还等场景广播）
        EventManager.on(CharacterV2Event.POINTS_UPDATED, this._onPointsUpdated, this);

        // 默认隐藏，等待事件打开
        this.node.active = false;
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    /** 打开面板（unassignedPoints 可选：外部已知的最新待分配点数） */
    public show(unassignedPoints?: number) {
        this.node.active = true;
        if (typeof unassignedPoints === 'number') {
            this._unassigned = unassignedPoints;
        }
        this._resetPending();
        this._loadCurrentAttrs();
    }

    private _onOpen(unassignedPoints?: number) {
        this.show(unassignedPoints);
    }

    private _onPointsUpdated(unassignedPoints: number) {
        this._unassigned = unassignedPoints;
        // 余额被外部改变（升阶发点/洗点返还等）后，面板内待分配数可能已超额，
        // 直接清零重新分配，避免"剩余可分配"显示负数
        this._resetPending();
        this._refreshView();
    }

    /** 从服务器加载当前精气神 */
    private async _loadCurrentAttrs() {
        try {
            const res = await HttpClient.get(`/character/attributes?character_id=${this._characterId}`);
            if (res.code !== 0) { this._showToast(res.msg); return; }
            const base = res.data.base_attrs;
            this._jing = base.jing;
            this._qi = base.qi;
            this._shen = base.shen;
            this._refreshView();
        } catch { this._showToast('加载属性失败'); }
    }

    /**
     * 调整某项待分配数
     * @param attr 'jing' | 'qi' | 'shen'
     * @param delta +1 或 -1
     */
    private _adjust(attr: 'jing' | 'qi' | 'shen', delta: number) {
        const pendingTotal = this._pendingJing + this._pendingQi + this._pendingShen;
        // 加点：不能超过剩余可分配点数
        if (delta > 0 && pendingTotal >= this._unassigned) {
            this._showToast('待分配点数不足');
            return;
        }
        if (attr === 'jing') {
            this._pendingJing = Math.max(0, this._pendingJing + delta);
        } else if (attr === 'qi') {
            this._pendingQi = Math.max(0, this._pendingQi + delta);
        } else {
            this._pendingShen = Math.max(0, this._pendingShen + delta);
        }
        this._refreshView();
    }

    /** 刷新面板所有显示 */
    private _refreshView() {
        if (this.jingCurrentLabel) this.jingCurrentLabel.string = `精: ${this._jing}`;
        if (this.qiCurrentLabel) this.qiCurrentLabel.string = `气: ${this._qi}`;
        if (this.shenCurrentLabel) this.shenCurrentLabel.string = `神: ${this._shen}`;

        if (this.jingPendingLabel) this.jingPendingLabel.string = `+${this._pendingJing}`;
        if (this.qiPendingLabel) this.qiPendingLabel.string = `+${this._pendingQi}`;
        if (this.shenPendingLabel) this.shenPendingLabel.string = `+${this._pendingShen}`;

        const pendingTotal = this._pendingJing + this._pendingQi + this._pendingShen;
        if (this.remainLabel) this.remainLabel.string = `剩余可分配: ${this._unassigned - pendingTotal}`;

        this._refreshEquilibriumTip();
    }

    /**
     * 均衡加成本地预判（与后端 CalcEquilibrium 同规则）：
     * 按"当前值 + 本次待分配"计算，max ÷ min ≤ 3 → 均衡加成 ×2 生效
     */
    private _refreshEquilibriumTip() {
        if (!this.equilibriumTipLabel) return;
        const j = this._jing + this._pendingJing;
        const q = this._qi + this._pendingQi;
        const s = this._shen + this._pendingShen;
        const max = Math.max(j, q, s);
        const min = Math.min(j, q, s);
        // min 至少为1（角色创建时精气神各1），防御性判空避免除0
        if (min > 0 && max / min <= 3) {
            this.equilibriumTipLabel.string = '均衡加成生效 ×2';
            this.equilibriumTipLabel.color = new Color().fromHEX('#2ECC71');
        } else {
            this.equilibriumTipLabel.string = '偏科Build 均衡加成未激活 ×1';
            this.equilibriumTipLabel.color = new Color().fromHEX('#E74C3C');
        }
    }

    /** 确认加点：提交到服务器，成功后广播属性更新事件 */
    private async _onConfirm() {
        // 防重入：请求进行中时忽略再次点击，避免连点重复提交（与 WashPointUI 同模式）
        if (this._requesting) return;
        const total = this._pendingJing + this._pendingQi + this._pendingShen;
        if (total <= 0) {
            this._showToast('请先分配至少1点');
            return;
        }
        // 余额边界：外部余额可能已被改变（升阶发点/洗点返还等），提交前再校验一次
        if (total > this._unassigned) {
            this._showToast('待分配点数不足，请重新分配');
            this._resetPending();
            this._refreshView();
            return;
        }
        this._requesting = true;
        try {
            const res = await CharacterApi.allocatePoints(
                this._characterId, this._pendingJing, this._pendingQi, this._pendingShen);
            if (res.code !== 0 || !res.data) {
                // 余额不足等错误直接展示后端提示
                this._showToast(res.msg || '加点失败');
                return;
            }
            // 用服务器返回的真实值刷新本地状态
            this._jing = res.data.jing;
            this._qi = res.data.qi;
            this._shen = res.data.shen;
            this._unassigned = res.data.unassigned_points;
            this._resetPending();
            this._refreshView();
            this._showToast('加点成功');
            // 广播给角色面板等监听者刷新（携带完整响应数据）
            EventManager.emit(CharacterV2Event.ATTR_UPDATED, res.data);
            EventManager.emit(CharacterV2Event.POINTS_UPDATED, res.data.unassigned_points);
        } catch { this._showToast('加点请求失败'); }
        finally { this._requesting = false; }
    }

    /** 取消：清空本次待分配并关闭面板 */
    private _onCancel() {
        this._resetPending();
        this.node.active = false;
    }

    private _resetPending() {
        this._pendingJing = 0;
        this._pendingQi = 0;
        this._pendingShen = 0;
    }

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => {
                if (this.toastLabel) this.toastLabel.node.active = false;
            }, 2);
        }
    }
}
