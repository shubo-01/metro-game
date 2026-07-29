/**
 * 寻仙 - 洗点确认框
 * 功能：提示洗点将返还的自由点与灵石花费，确认后调用洗点接口
 * 数据源：POST /character/points/wash
 *
 * 打开方式：EventManager.emit(CharacterV2Event.OPEN_WASH)
 *   - 说明：后端暂无单独查询 free_jing/free_qi/free_shen 的接口，
 *     打开时展示通用提示文案，洗点成功后用响应数据展示实际返还明细与费用
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { CharacterApi, CharacterV2Event } from '../net/CharacterApi';
import { EventManager } from '../manager/EventManager';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

@ccclass('WashPointUI')
export class WashPointUI extends Component {

    @property(Label) tipLabel: Label | null = null;      // 洗点说明提示（返还规则与费用提醒）
    @property(Label) resultLabel: Label | null = null;   // 洗点结果明细（返还点数/费用）
    @property(Node) confirmBtn: Node | null = null;      // 确认洗点按钮
    @property(Node) cancelBtn: Node | null = null;       // 取消按钮（关闭确认框）
    @property(Label) toastLabel: Label | null = null;    // Toast 提示

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    /** 防止重复点击：请求进行中时忽略再次确认 */
    private _requesting: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        this.confirmBtn?.on(Node.EventType.TOUCH_END, this._onConfirm, this);
        this.cancelBtn?.on(Node.EventType.TOUCH_END, this._onCancel, this);

        // 跨面板事件：角色面板"洗点"按钮 emit OPEN_WASH 打开本确认框
        EventManager.on(CharacterV2Event.OPEN_WASH, this._onOpen, this);

        // 默认隐藏，等待事件打开
        this.node.active = false;
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    /** 打开确认框 */
    public show() {
        this.node.active = true;
        if (this.tipLabel) {
            this.tipLabel.string = '洗点将返还所有已分配的自由属性点\n（固定点不受影响），并按当前境界收取灵石费用。\n确定要洗点吗？';
        }
        if (this.resultLabel) this.resultLabel.string = '';
    }

    private _onOpen() {
        this.show();
    }

    /** 确认洗点 */
    private async _onConfirm() {
        if (this._requesting) return;
        this._requesting = true;
        try {
            const res = await CharacterApi.washPoints(this._characterId);
            if (res.code !== 0 || !res.data) {
                // 没有已分配自由点等错误直接展示后端提示
                this._showToast(res.msg || '洗点失败');
                return;
            }
            const d = res.data;
            // 展示返还明细与费用
            if (this.resultLabel) {
                this.resultLabel.string =
                    `返还自由点：精+${d.returned_jing} 气+${d.returned_qi} 神+${d.returned_shen}\n`
                    + `共返还 ${d.total_returned} 点，当前待分配 ${d.unassigned_points} 点\n`
                    + `灵石花费：${d.wash_cost}`;
                this.resultLabel.color = new Color().fromHEX('#2ECC71');
            }
            this._showToast('洗点成功');
            // 广播给角色面板/加点面板刷新
            EventManager.emit(CharacterV2Event.ATTR_UPDATED, d);
            EventManager.emit(CharacterV2Event.POINTS_UPDATED, d.unassigned_points);
            // 停留2秒让玩家看清明细后自动关闭
            this.scheduleOnce(() => { this.node.active = false; }, 2);
        } catch {
            this._showToast('洗点请求失败');
        } finally {
            this._requesting = false;
        }
    }

    /** 取消：直接关闭确认框 */
    private _onCancel() {
        this.node.active = false;
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
