/**
 * 寻仙 - 兽身化形 UI
 * 功能：兽形/人形切换按钮、精属性加成变化显示
 * 数据源：POST /death/beast/transform
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

const FORM_NAMES: Record<number, string> = { 1: '兽形', 2: '人形' };
const BEAST_NAMES: Record<number, string> = { 1: '狮', 2: '虎', 3: '蛇', 4: '鹰', 5: '狼' };
const EVOLUTION_NAMES: Record<number, string> = { 1: '妖修', 2: '妖仙', 3: '妖神' };

@ccclass('BeastTransformUI')
export class BeastTransformUI extends Component {

    @property(Label) currentFormLabel: Label | null = null;
    @property(Label) beastTypeLabel: Label | null = null;
    @property(Label) evolutionLabel: Label | null = null;
    @property(Label) jingBonusLabel: Label | null = null;
    @property(Label) resultLabel: Label | null = null;

    @property(Node) transformBtn: Node | null = null;
    @property(Label) transformBtnLabel: Label | null = null;
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    private _currentForm: number = 1; // 1=兽形 2=人形

    onLoad() {
        this._characterId = this._playerManager.playerId;
        this.transformBtn?.on(Node.EventType.TOUCH_END, this._onTransform, this);
        this._loadBeastState();
    }

    /** 加载兽身状态 */
    private async _loadBeastState() {
        try {
            const res = await HttpClient.get(`/character/info?character_id=${this._characterId}`);
            if (res.code !== 0) return;

            const base = res.data.base;
            this._currentForm = base.form_state || 1;

            if (base.race === 3) {
                // 兽身状态
                if (this.currentFormLabel) this.currentFormLabel.string = `当前形态: ${FORM_NAMES[this._currentForm] || '兽形'}`;
                if (this.jingBonusLabel) {
                    const bonus = this._currentForm === 1 ? '×1.5 (兽形加成)' : '×1.0 (人形无加成)';
                    this.jingBonusLabel.string = `精属性倍率: ${bonus}`;
                }
                if (this.transformBtnLabel) {
                    this.transformBtnLabel.string = this._currentForm === 1 ? '化为人形' : '变为兽形';
                }
            } else {
                if (this.currentFormLabel) this.currentFormLabel.string = '非兽身状态';
                if (this.transformBtn) this.transformBtn.active = false;
            }
        } catch { /* 静默 */ }
    }

    /** 切换形态 */
    private async _onTransform() {
        const toHuman = this._currentForm === 1;

        try {
            const res = await HttpClient.post('/death/beast/transform', {
                character_id: this._characterId,
                to_human: toHuman,
            });

            if (res.code === 0) {
                this._currentForm = toHuman ? 2 : 1;

                if (this.resultLabel) {
                    this.resultLabel.string = res.msg;
                    this.resultLabel.color = new Color().fromHEX(toHuman ? '#2ECC71' : '#E74C3C');
                }
                if (this.currentFormLabel) this.currentFormLabel.string = `当前形态: ${FORM_NAMES[this._currentForm]}`;
                if (this.jingBonusLabel) {
                    const bonus = this._currentForm === 1 ? '×1.5 (兽形加成)' : '×1.0 (人形无加成)';
                    this.jingBonusLabel.string = `精属性倍率: ${bonus}`;
                }
                if (this.transformBtnLabel) {
                    this.transformBtnLabel.string = this._currentForm === 1 ? '化为人形' : '变为兽形';
                }
            } else {
                this._showToast(res.msg);
            }
        } catch { this._showToast('化形请求失败'); }
    }

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => { if (this.toastLabel) this.toastLabel.node.active = false; }, 2);
        }
    }
}
