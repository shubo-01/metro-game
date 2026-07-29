/**
 * 寻仙 - 境界突破 UI
 * 功能：心魔劫动画/天劫动画/大道试炼、突破结果展示
 *       V2 新增：神魔阶段（major_stage=8）道积攒进度展示 + 子阶突破（以道证道）
 * 数据源：POST /character/realm/breakthrough + POST /character/realm/upgrade
 *         + POST /character/dao/breakthrough（神魔子阶突破）
 */

import { _decorator, Component, Label, Node, Color, Tween, tween } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { CharacterApi, CharacterV2Event, DaoGainData, SubRealmName } from '../net/CharacterApi';
import { EventManager } from '../manager/EventManager';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

// 大境界名称映射（V2 八大境界，与后端 calc.go 的 realmTable 对齐）
const STAGE_NAMES: Record<number, string> = {
    1: '人', 2: '真人', 3: '地仙', 4: '天仙',
    5: '金仙', 6: '太乙金仙', 7: '大罗金仙', 8: '神魔',
};

// 神魔境界的大境界编号
const SHENMO_STAGE = 8;
// 子阶突破所需道值（与后端固定值一致）
const DAO_BREAKTHROUGH_NEED = 100;

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

    // ─── V2 神魔子阶（仅 major_stage=8 时显示） ───
    @property(Node) daoSectionNode: Node | null = null;        // 道进度区域容器（非神魔阶段隐藏）
    @property(Label) daoProgressLabel: Label | null = null;    // 当前子阶道积攒进度（道值/100）
    @property(Node) daoBreakthroughBtn: Node | null = null;    // "子阶突破"按钮

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    /** 当前大境界（用于判断是否处于神魔阶段） */
    private _majorStage: number = 0;
    /** 神魔子阶：1太极 2太素 3太始 4太初 5太易（来自子阶突破响应，默认太极） */
    private _subRealm: number = 1;
    /** 最近一次 daoGain 返回的5种道值缓存（后端无单独查询接口，靠事件同步） */
    private _daoData: DaoGainData | null = null;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        this.upgradeBtn?.on(Node.EventType.TOUCH_END, this._onUpgrade, this);
        this.breakthroughBtn?.on(Node.EventType.TOUCH_END, this._onBreakthrough, this);
        this.daoBreakthroughBtn?.on(Node.EventType.TOUCH_END, this._onDaoBreakthrough, this);

        // 战斗/任务处调用 daoGain 后广播道值，本面板据此刷新进度
        EventManager.on(CharacterV2Event.DAO_UPDATED, this._onDaoUpdated, this);

        this._refreshInfo();
    }

    onDestroy() {
        EventManager.offAll(this);
    }

    private async _refreshInfo() {
        try {
            const res = await HttpClient.get(`/character/info?character_id=${this._characterId}`);
            if (res.code !== 0) return;
            const realm = res.data.realm;
            this._majorStage = realm.major_stage;
            const curName = `${STAGE_NAMES[realm.major_stage] || '未知'} ${realm.minor_stage}阶`;
            if (this.currentRealmLabel) this.currentRealmLabel.string = `当前: ${curName}`;

            // 神魔阶段：显示道积攒进度区域，隐藏则反之
            const isShenmo = realm.major_stage >= SHENMO_STAGE;
            if (this.daoSectionNode) this.daoSectionNode.active = isShenmo;
            if (isShenmo) this._refreshDaoProgress();

            // 显示下一境界要求
            if (realm.minor_stage < 9) {
                if (this.nextRealmLabel) this.nextRealmLabel.string = `下一阶: ${realm.minor_stage + 1}阶`;
                if (this.requirementLabel) this.requirementLabel.string = '经验达标后自动升阶';
            } else {
                const nextMajor = realm.major_stage + 1;
                if (nextMajor > SHENMO_STAGE) {
                    // 神魔已是最高大境界，内部通过"子阶突破"继续修行（太极→太易）
                    if (this.nextRealmLabel) this.nextRealmLabel.string = '已达最高大境界';
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

    // ═══════════════════════════════════════════
    //  V2 神魔子阶（以道证道）
    // ═══════════════════════════════════════════

    /** 道值更新事件：daoGain 响应广播后刷新进度（携带全部5种道值） */
    private _onDaoUpdated(data: DaoGainData) {
        this._daoData = data;
        this._refreshDaoProgress();
    }

    /** 刷新当前子阶的道积攒进度（当前道值/100） */
    private _refreshDaoProgress() {
        if (!this.daoProgressLabel) return;
        const subName = SubRealmName[this._subRealm] || '太极';
        if (!this._daoData) {
            // 后端无单独查询道值的接口，daoGain 响应到达前先显示占位
            this.daoProgressLabel.string = `${subName}之道: --/${DAO_BREAKTHROUGH_NEED}`;
            return;
        }
        // 当前子阶对应的道值（突破太极消耗太极之道，以此类推）
        const daoValues: Record<number, number> = {
            1: this._daoData.dao_taiji,
            2: this._daoData.dao_taisu,
            3: this._daoData.dao_taishi,
            4: this._daoData.dao_taichu,
            5: this._daoData.dao_taiyi,
        };
        const cur = daoValues[this._subRealm] ?? 0;
        this.daoProgressLabel.string = `${subName}之道: ${cur}/${DAO_BREAKTHROUGH_NEED}`;
        this.daoProgressLabel.color = new Color().fromHEX(cur >= DAO_BREAKTHROUGH_NEED ? '#FFD700' : '#F5F5F5');
    }

    /** 神魔子阶突破（道值≥100 → 消耗100 → 子阶+1） */
    private async _onDaoBreakthrough() {
        // 本地先拦一道：非神魔阶段不发请求（后端同样会校验返回400）
        if (this._majorStage < SHENMO_STAGE) {
            this._showToast('只有神魔境界才能进行子阶突破');
            return;
        }
        try {
            const res = await CharacterApi.daoBreakthrough(this._characterId);
            if (this.resultLabel) {
                this.resultLabel.string = res.msg;
                this.resultLabel.color = new Color().fromHEX(res.code === 0 ? '#FFD700' : '#E74C3C');
            }
            if (res.code === 0 && res.data) {
                // 记录新子阶，进度改为显示突破后剩余道值
                this._subRealm = res.data.sub_realm;
                if (this.daoProgressLabel) {
                    this.daoProgressLabel.string =
                        `已破入 神魔·${res.data.sub_realm_name}！剩余道值 ${res.data.dao_remaining}，固定点+${res.data.fixed_point_bonus}`;
                }
                this._playUpgradeAnim();
                // 精气神固定点提升，通知角色面板等刷新
                EventManager.emit(CharacterV2Event.ATTR_UPDATED, res.data);
            }
        } catch { this._showToast('子阶突破请求失败'); }
    }

    /** 小阶升级 */
    private async _onUpgrade() {
        try {
            const res = await HttpClient.post('/character/realm/upgrade', { character_id: this._characterId });
            if (this.resultLabel) {
                this.resultLabel.string = res.msg;
                this.resultLabel.color = res.code === 0 ? new Color().fromHEX('#2ECC71') : new Color().fromHEX('#E74C3C');
            }
            if (res.code === 0) {
                this._playUpgradeAnim();
                // 升阶会发放自由属性点，广播最新余额给加点面板
                if (typeof res.data?.unassigned_points === 'number') {
                    EventManager.emit(CharacterV2Event.POINTS_UPDATED, res.data.unassigned_points);
                }
            }
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
