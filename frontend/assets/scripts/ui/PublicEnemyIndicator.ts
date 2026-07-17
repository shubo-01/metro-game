/**
 * 寻仙 - 公敌状态指示器 UI
 * 功能：公敌标记图标、天雷预警倒计时、悬赏面板入口
 * 数据源：GET /death/public-enemy/status
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

@ccclass('PublicEnemyIndicator')
export class PublicEnemyIndicator extends Component {

    @property(Node) enemyIcon: Node | null = null;       // 公敌标记图标
    @property(Label) bountyLabel: Label | null = null;    // 悬赏总额
    @property(Label) thunderCountLabel: Label | null = null; // 已遭天雷次数
    @property(Label) thunderWarningLabel: Label | null = null; // 天雷预警
    @property(Label) statusLabel: Label | null = null;    // 状态描述

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    private _isPublicEnemy: boolean = false;
    private _thunderRemaining: number = -1;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        // 每10秒刷新一次公敌状态
        this.schedule(this._refresh, 10);
        this._refresh();
    }

    private _refresh() {
        this._loadStatus();
    }

    update(dt: number) {
        // 天雷倒计时
        if (this._thunderRemaining > 0) {
            this._thunderRemaining -= dt;
            if (this.thunderWarningLabel) {
                const seconds = Math.max(0, Math.ceil(this._thunderRemaining));
                const minutes = Math.floor(seconds / 60);
                const secs = seconds % 60;
                this.thunderWarningLabel.string = `天雷预警: ${minutes}:${secs.toString().padStart(2, '0')}`;
                this.thunderWarningLabel.color = new Color().fromHEX(seconds < 30 ? '#E74C3C' : '#F39C12');
            }
        }
    }

    /** 加载公敌状态 */
    private async _loadStatus() {
        try {
            const res = await HttpClient.get(`/death/public-enemy/status?character_id=${this._characterId}`);
            if (res.code !== 0) return;

            this._isPublicEnemy = res.data.is_public_enemy;

            if (this._isPublicEnemy) {
                // 显示公敌状态
                if (this.enemyIcon) this.enemyIcon.active = true;
                if (this.statusLabel) {
                    this.statusLabel.string = '全世界公敌';
                    this.statusLabel.color = new Color().fromHEX('#E74C3C');
                }
                if (this.bountyLabel) this.bountyLabel.string = `悬赏: ${res.data.bounty_total || 0}`;
                if (this.thunderCountLabel) this.thunderCountLabel.string = `天雷次数: ${res.data.thunder_count || 0}`;

                // 天雷预警
                if (res.data.thunder_remaining_seconds && res.data.thunder_remaining_seconds > 0) {
                    this._thunderRemaining = res.data.thunder_remaining_seconds;
                    if (this.thunderWarningLabel) this.thunderWarningLabel.node.active = true;
                }
            } else {
                if (this.enemyIcon) this.enemyIcon.active = false;
                if (this.statusLabel) this.statusLabel.string = '';
                if (this.thunderWarningLabel) this.thunderWarningLabel.node.active = false;
            }
        } catch { /* 静默 */ }
    }
}
