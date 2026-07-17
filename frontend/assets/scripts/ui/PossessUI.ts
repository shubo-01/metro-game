/**
 * 寻仙 - 夺舍界面 UI
 * 功能：目标选择、成功率预览、夺舍结果动画
 * 数据源：POST /death/possess/start + POST /death/possess/result
 */

import { _decorator, Component, Label, Node, Color, Tween, tween } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

@ccclass('PossessUI')
export class PossessUI extends Component {

    @property(Label) titleLabel: Label | null = null;
    @property(Label) targetNameLabel: Label | null = null;
    @property(Label) targetShenLabel: Label | null = null;
    @property(Label) successRateLabel: Label | null = null;
    @property(Label) resultLabel: Label | null = null;
    @property(Label) possessCountLabel: Label | null = null;

    @property(Node) possessBtn: Node | null = null;
    @property(Node) animNode: Node | null = null;
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    // 当前选中的夺舍目标
    private _targetType: number = 1; // 1=NPC 2=玩家
    private _targetId: number = 0;
    private _targetName: string = '';
    private _targetShen: number = 5;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        if (this.titleLabel) this.titleLabel.string = '夺舍';
        this.possessBtn?.on(Node.EventType.TOUCH_END, this._onPossess, this);
        this._loadPossessCount();
    }

    /** 设置夺舍目标（由外部调用，如选择NPC列表） */
    public setTarget(targetType: number, targetId: number, targetName: string, targetShen: number) {
        this._targetType = targetType;
        this._targetId = targetId;
        this._targetName = targetName;
        this._targetShen = targetShen;

        if (this.targetNameLabel) this.targetNameLabel.string = `目标: ${targetName}`;
        if (this.targetShenLabel) this.targetShenLabel.string = `目标神属性: ${targetShen}`;
    }

    /** 加载夺舍次数（从死亡服务获取真实数据） */
    private async _loadPossessCount() {
        try {
            const res = await HttpClient.get(`/death/state`, { character_id: String(this._characterId) });
            if (res.code === 0) {
                const remaining = res.data.possess_remaining;
                const used = res.data.possess_count;
                if (this.possessCountLabel) {
                    this.possessCountLabel.string = `已夺舍: ${used}次 | 剩余: ${remaining}次机会`;
                }
            }
        } catch { /* 静默 */ }
    }

    /** 发起夺舍 */
    private async _onPossess() {
        if (!this._targetId) {
            this._showToast('请先选择夺舍目标');
            return;
        }

        this._showToast('夺舍中...');
        if (this.animNode) this.animNode.active = true;

        try {
            // 第一步：发起夺舍
            const startRes = await HttpClient.post('/death/possess/start', {
                character_id: this._characterId,
                target_type: this._targetType,
                target_id: this._targetId,
                target_name: this._targetName,
            });

            if (startRes.code !== 0) {
                this._showToast(startRes.msg);
                return;
            }

            // 显示成功率
            if (this.successRateLabel) {
                this.successRateLabel.string = `成功率: ${Math.round(startRes.data.success_rate * 100)}%`;
            }

            // 第二步：夺舍结算
            const resultRes = await HttpClient.post('/death/possess/result', {
                character_id: this._characterId,
                success: startRes.data.success,
                target_id: this._targetId,
            });

            // 显示结果
            if (this.resultLabel) {
                this.resultLabel.string = resultRes.msg;
                this.resultLabel.color = startRes.data.success
                    ? new Color().fromHEX('#FFD700')
                    : new Color().fromHEX('#E74C3C');
            }

            // 播放结果动画
            this._playResultAnim(startRes.data.success);

            await this._loadPossessCount();

        } catch {
            this._showToast('夺舍请求失败');
        } finally {
            if (this.animNode) {
                this.scheduleOnce(() => { this.animNode!.active = false; }, 2);
            }
        }
    }

    private _playResultAnim(success: boolean) {
        if (this.resultLabel?.node) {
            tween(this.resultLabel.node)
                .to(0.2, { scale: { x: 1.5, y: 1.5, z: 1 } })
                .to(0.3, { scale: { x: 1, y: 1, z: 1 } })
                .start();
        }
    }

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => { if (this.toastLabel) this.toastLabel.node.active = false; }, 2);
        }
    }
}
