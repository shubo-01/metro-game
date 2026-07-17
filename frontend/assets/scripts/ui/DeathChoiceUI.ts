/**
 * 寻仙 - 死亡选择 UI
 * 功能：六道轮回选择界面（6个选项+因果影响提示）、鬼修转换确认
 * 数据源：POST /death/reincarnation + POST /death/ghost/enter
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager, GameEvent } from '../manager/EventManager';

const { ccclass, property } = _decorator;

// 六道信息
const REINCARNATION_PATHS = [
    { type: 1, name: '天道', desc: '悟性+2, 气运+1', color: '#FFD700' },
    { type: 2, name: '阿修罗道', desc: '精+2, 战斗天赋强化', color: '#E74C3C' },
    { type: 3, name: '人道', desc: '全属性+1, 气运+2', color: '#2ECC71' },
    { type: 4, name: '畜生道', desc: '获得特殊异能但肉身受限', color: '#8B4513' },
    { type: 5, name: '饿鬼道', desc: '资源Debuff, 鬼修路线加成', color: '#9B59B6' },
    { type: 6, name: '地狱道', desc: '全属性-1, 熬过有隐藏天赋', color: '#34495E' },
];

@ccclass('DeathChoiceUI')
export class DeathChoiceUI extends Component {

    @property(Label) titleLabel: Label | null = null;
    @property(Label) karmaHintLabel: Label | null = null;
    @property(Label) resultLabel: Label | null = null;

    // 六个轮回道按钮
    @property(Node) tianDaoBtn: Node | null = null;
    @property(Node) xiuluoDaoBtn: Node | null = null;
    @property(Node) renDaoBtn: Node | null = null;
    @property(Node) chushengDaoBtn: Node | null = null;
    @property(Node) eguiDaoBtn: Node | null = null;
    @property(Node) diyuDaoBtn: Node | null = null;

    // 鬼修按钮
    @property(Node) ghostBtn: Node | null = null;
    // 确认轮回按钮（由系统根据因果值分配）
    @property(Node) confirmBtn: Node | null = null;

    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        if (this.titleLabel) this.titleLabel.string = '六道轮回';
        if (this.karmaHintLabel) this.karmaHintLabel.string = '轮回道由因果值决定分配';

        // 绑定按钮
        const btns = [this.tianDaoBtn, this.xiuluoDaoBtn, this.renDaoBtn, this.chushengDaoBtn, this.eguiDaoBtn, this.diyuDaoBtn];
        btns.forEach((btn, i) => {
            btn?.on(Node.EventType.TOUCH_END, () => this._showPathInfo(i + 1), this);
        });

        this.ghostBtn?.on(Node.EventType.TOUCH_END, this._onGhostEnter, this);
        this.confirmBtn?.on(Node.EventType.TOUCH_END, this._onConfirmReincarnation, this);
    }

    private _showPathInfo(pathType: number) {
        const path = REINCARNATION_PATHS[pathType - 1];
        if (this.resultLabel) {
            this.resultLabel.string = `${path.name}: ${path.desc}\n(轮回道由系统根据因果值随机分配，此处仅供参考)`;
            this.resultLabel.color = new Color().fromHEX(path.color);
        }
    }

    /** 确认六道轮回（系统根据因果值分配） */
    private async _onConfirmReincarnation() {
        this._showToast('轮回中...');
        try {
            const res = await HttpClient.post('/death/reincarnation', {
                character_id: this._characterId,
                force_beast: false,
            });
            if (res.code === 0) {
                const path = REINCARNATION_PATHS[res.data.reincarnation_type - 1];
                if (this.resultLabel) {
                    this.resultLabel.string = `轮回到: ${res.data.reincarnation_name}\n${res.msg}`;
                    this.resultLabel.color = new Color().fromHEX(path?.color || '#FFFFFF');
                }
                EventManager.emit(GameEvent.AUTH_LOGIN_SUCCESS); // 通知刷新
            } else {
                this._showToast(res.msg);
            }
        } catch { this._showToast('轮回请求失败'); }
    }

    /** 进入鬼修状态 */
    private async _onGhostEnter() {
        try {
            const res = await HttpClient.post('/death/ghost/enter', { character_id: this._characterId });
            if (res.code === 0) {
                if (this.resultLabel) {
                    this.resultLabel.string = '成为鬼修，以魂力代替血条';
                    this.resultLabel.color = new Color().fromHEX('#9B59B6');
                }
                this.node.active = false;
            } else {
                this._showToast(res.msg);
            }
        } catch { this._showToast('鬼修转换失败'); }
    }

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => { if (this.toastLabel) this.toastLabel.node.active = false; }, 2);
        }
    }
}
