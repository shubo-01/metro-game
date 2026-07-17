/**
 * 寻仙 - 境界突破 UI
 * 功能：心魔劫动画/天劫动画/大道试炼、突破结果展示
 * 数据源：POST /character/realm/breakthrough + POST /character/realm/upgrade
 */

import { _decorator, Component, Label, Node, Color, Tween, tween } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

const STAGE_NAMES: Record<number, string> = { 1: '人阶', 2: '真人', 3: '仙', 4: '金仙' };

@ccclass('RealmBreakthroughUI')
export class RealmBreakthroughUI extends Component {

    @property(Label) currentRealmLabel: Label | null = null;
    @property(Label) nextRealmLabel: Label | null = null;
    @property(Label) requirementLabel: Label | null = null;
    @property(Label) resultLabel: Label | null = null;
    @property(Node) upgradeBtn: Node | null = null;       // 小阶升级按钮
    @property(Node) breakthroughBtn: Node | null = null;   // 大境界突破按钮
    @property(Node) animNode: Node | null = null;          // 突破动画容器
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        this.upgradeBtn?.on(Node.EventType.TOUCH_END, this._onUpgrade, this);
        this.breakthroughBtn?.on(Node.EventType.TOUCH_END, this._onBreakthrough, this);
        this._refreshInfo();
    }

    private async _refreshInfo() {
        try {
            const res = await HttpClient.get(`/character/info?character_id=${this._characterId}`);
            if (res.code !== 0) return;
            const realm = res.data.realm;
            const curName = `${STAGE_NAMES[realm.major_stage]} ${realm.minor_stage}阶`;
            if (this.currentRealmLabel) this.currentRealmLabel.string = `当前: ${curName}`;

            // 显示下一境界要求
            if (realm.minor_stage < 9) {
                if (this.nextRealmLabel) this.nextRealmLabel.string = `下一阶: ${realm.minor_stage + 1}阶`;
                if (this.requirementLabel) this.requirementLabel.string = '经验达标后自动升阶';
            } else {
                const nextMajor = realm.major_stage + 1;
                if (nextMajor > 4) {
                    if (this.nextRealmLabel) this.nextRealmLabel.string = '已达最高境界';
                } else {
                    if (this.nextRealmLabel) this.nextRealmLabel.string = `突破: ${STAGE_NAMES[nextMajor]}`;
                    const reqs: Record<number, string> = {
                        2: '悟性≥5, 气运≥3, 通过心魔劫',
                        3: '悟性≥15, 气运≥10, 通过天劫+因果审判',
                        4: '悟性≥30, 气运≥20, 通过大道试炼',
                    };
                    if (this.requirementLabel) this.requirementLabel.string = reqs[nextMajor] || '';
                }
            }
        } catch { /* 静默 */ }
    }

    /** 小阶升级 */
    private async _onUpgrade() {
        try {
            const res = await HttpClient.post('/character/realm/upgrade', { character_id: this._characterId });
            if (this.resultLabel) {
                this.resultLabel.string = res.msg;
                this.resultLabel.color = res.code === 0 ? new Color().fromHEX('#2ECC71') : new Color().fromHEX('#E74C3C');
            }
            if (res.code === 0) this._playUpgradeAnim();
            await this._refreshInfo();
        } catch { this._showToast('请求失败'); }
    }

    /** 大境界突破 */
    private async _onBreakthrough() {
        if (this.animNode) this.animNode.active = true;
        this._playBreakthroughAnim();

        try {
            const res = await HttpClient.post('/character/realm/breakthrough', { character_id: this._characterId });
            if (this.resultLabel) {
                this.resultLabel.string = res.msg;
                if (res.data?.result === 'success') {
                    this.resultLabel.color = new Color().fromHEX('#FFD700');
                } else {
                    this.resultLabel.color = new Color().fromHEX('#E74C3C');
                }
            }
            await this._refreshInfo();
        } catch {
            this._showToast('突破请求失败');
        } finally {
            if (this.animNode) {
                this.scheduleOnce(() => { this.animNode!.active = false; }, 2);
            }
        }
    }

    private _playUpgradeAnim() {
        if (this.resultLabel?.node) {
            tween(this.resultLabel.node)
                .to(0.3, { scale: { x: 1.3, y: 1.3, z: 1 } })
                .to(0.3, { scale: { x: 1, y: 1, z: 1 } })
                .start();
        }
    }

    private _playBreakthroughAnim() {
        if (this.animNode) {
            tween(this.animNode)
                .to(0.5, { scale: { x: 1.5, y: 1.5, z: 1 } })
                .to(0.5, { scale: { x: 1, y: 1, z: 1 } })
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
