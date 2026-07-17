/**
 * 寻仙 - 角色面板 UI
 * 功能：五维属性展示、衍生属性列表、境界进度条、五行修炼列表
 * 数据源：GET /character/attributes + GET /character/qi/elements
 */

import { _decorator, Component, Label, Node, Color, ScrollView } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

// 大境界名称映射
const STAGE_NAMES: Record<number, string> = { 1: '人阶', 2: '真人', 3: '仙', 4: '金仙' };
// 五行名称映射
const ELEMENT_NAMES: Record<number, string> = { 1: '金', 2: '木', 3: '水', 4: '火', 5: '土' };
const ELEMENT_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#2ECC71', 3: '#3498DB', 4: '#E74C3C', 5: '#8B4513' };

@ccclass('CharacterPanel')
export class CharacterPanel extends Component {

    // ─── 五维属性标签 ───
    @property(Label) jingLabel: Label | null = null;
    @property(Label) qiLabel: Label | null = null;
    @property(Label) shenLabel: Label | null = null;
    @property(Label) qiYunLabel: Label | null = null;
    @property(Label) wuXingLabel: Label | null = null;

    // ─── 衍生属性标签 ───
    @property(Label) hpLabel: Label | null = null;
    @property(Label) mpLabel: Label | null = null;
    @property(Label) soulLabel: Label | null = null;
    @property(Label) physiqueLabel: Label | null = null;
    @property(Label) agilityLabel: Label | null = null;
    @property(Label) skillPowerLabel: Label | null = null;
    @property(Label) senseRangeLabel: Label | null = null;

    // ─── 境界信息 ───
    @property(Label) realmLabel: Label | null = null;
    @property(Node) expProgressBar: Node | null = null;
    @property(Label) expLabel: Label | null = null;

    // ─── 五行修炼 ───
    @property(Label) elementCountLabel: Label | null = null;
    @property(Label) expMultiplierLabel: Label | null = null;
    @property(Label) damageMultiplierLabel: Label | null = null;

    // ─── 心魔/因果/道行 ───
    @property(Label) xinmoLabel: Label | null = null;
    @property(Label) karmaLabel: Label | null = null;
    @property(Label) daoXingLabel: Label | null = null;

    // ─── 多修倍率信息 ───
    @property(Label) multiplierInfoLabel: Label | null = null;

    // ─── Toast ───
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        this.refreshAll();
    }

    /** 刷新所有数据 */
    public async refreshAll() {
        await Promise.all([this._loadAttributes(), this._loadQiElements(), this._loadRealm()]);
    }

    /** 加载五维属性及衍生值 */
    private async _loadAttributes() {
        try {
            const res = await HttpClient.get(`/character/attributes?character_id=${this._characterId}`);
            if (res.code !== 0) { this._showToast(res.msg); return; }

            const base = res.data.base_attrs;
            const cur = res.data.current;
            const derived = res.data.derived;

            // 五维基础属性
            if (this.jingLabel) this.jingLabel.string = `精: ${base.jing}`;
            if (this.qiLabel) this.qiLabel.string = `气: ${base.qi}`;
            if (this.shenLabel) this.shenLabel.string = `神: ${base.shen}`;
            if (this.qiYunLabel) this.qiYunLabel.string = `气运: ${base.qi_yun}`;
            if (this.wuXingLabel) this.wuXingLabel.string = `悟性: ${base.wu_xing}`;

            // 当前气血/灵力/魂力
            if (this.hpLabel) this.hpLabel.string = `气血: ${cur.hp_current}/${cur.hp_max}`;
            if (this.mpLabel) this.mpLabel.string = `灵力: ${cur.mp_current}/${cur.mp_max}`;
            if (this.soulLabel) this.soulLabel.string = `魂力: ${cur.soul_current}/${cur.soul_max}`;

            // 衍生属性
            if (this.physiqueLabel) this.physiqueLabel.string = `体魄: ${derived.physique}`;
            if (this.agilityLabel) this.agilityLabel.string = `身法: ${derived.agility}`;
            if (this.skillPowerLabel) this.skillPowerLabel.string = `功法威力: ${derived.skill_power}`;
            if (this.senseRangeLabel) this.senseRangeLabel.string = `神识范围: ${derived.sense_range}`;
        } catch { this._showToast('加载属性失败'); }
    }

    /** 加载五行修炼信息 */
    private async _loadQiElements() {
        try {
            const res = await HttpClient.get(`/character/qi/elements?character_id=${this._characterId}`);
            if (res.code !== 0) return;

            const elements = res.data.elements || [];
            const count = res.data.element_count;
            const expMul = res.data.exp_multiplier;
            const dmgMul = res.data.damage_multiplier;

            if (this.elementCountLabel) this.elementCountLabel.string = `兼修: ${count}种`;
            if (this.expMultiplierLabel) this.expMultiplierLabel.string = `经验倍率: ×${expMul}`;
            if (this.damageMultiplierLabel) this.damageMultiplierLabel.string = `伤害倍率: ×${dmgMul}`;

            // 生成五行修炼列表文字
            let text = '';
            for (const el of elements) {
                const name = ELEMENT_NAMES[el.element_type] || '?';
                const cultStr = el.is_cultivating ? ' [修炼中]' : '';
                text += `${name}: 熟练度${el.proficiency}${cultStr}\n`;
            }
            if (this.multiplierInfoLabel) this.multiplierInfoLabel.string = text || '尚未修炼任何五行属性';
        } catch { /* 静默 */ }
    }

    /** 加载境界信息 */
    private async _loadRealm() {
        try {
            const res = await HttpClient.get(`/character/info?character_id=${this._characterId}`);
            if (res.code !== 0) return;

            const realm = res.data.realm;
            const stageName = STAGE_NAMES[realm.major_stage] || '未知';

            if (this.realmLabel) this.realmLabel.string = `${stageName} ${realm.minor_stage}阶 ${realm.stage_segment}段`;

            // 经验进度条
            const expReq = this._getExpReq(realm.minor_stage);
            const minExp = Math.min(realm.exp_jing, realm.exp_qi, realm.exp_shen);
            const progress = expReq > 0 ? minExp / expReq : 0;
            if (this.expProgressBar) (this.expProgressBar as any).progress = Math.min(progress, 1);
            if (this.expLabel) this.expLabel.string = `${minExp}/${expReq}`;

            // 心魔/因果/道行
            if (this.xinmoLabel) this.xinmoLabel.string = `心魔: ${realm.xinmo_value}`;
            if (this.karmaLabel) this.karmaLabel.string = `因果: ${realm.karma_value >= 0 ? '善' : '恶'}${Math.abs(realm.karma_value)}`;
            if (this.daoXingLabel) this.daoXingLabel.string = `道行: ${realm.dao_xing}`;
        } catch { /* 静默 */ }
    }

    /** 经验需求计算（同后端公式：每阶倍率+0.5） */
    private _getExpReq(minorStage: number): number {
        const multiplier = 1.0 + 0.5 * (minorStage - 1);
        return Math.floor(100 * multiplier);
    }

    /** 选择修炼五行 */
    public async cultivateElement(elementType: number) {
        try {
            const res = await HttpClient.post('/character/qi/cultivate', {
                character_id: this._characterId,
                element_type: elementType,
            });
            if (res.code === 0) {
                this._showToast(res.msg);
                await this._loadQiElements();
            } else {
                this._showToast(res.msg);
            }
        } catch { this._showToast('修炼请求失败'); }
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
