/**
 * 寻仙 - 角色面板 UI
 * 功能：五维属性展示、衍生属性列表、境界进度条、五行修炼列表
 *       V2 新增：护盾/五行亲和/反应/异常抵抗/均衡状态展示，加点/洗点入口
 * 数据源：GET /character/attributes + GET /character/qi/elements + GET /character/shield
 */

import { _decorator, Component, Label, Node, Color, ScrollView } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { CharacterApi, CharacterV2Event } from '../net/CharacterApi';
import { EventManager } from '../manager/EventManager';
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

    // ─── V2 衍生值标签 ───
    @property(Label) shieldLabel: Label | null = null;          // 护盾 当前/上限
    @property(Label) affinityLabel: Label | null = null;        // 五行亲和
    @property(Label) reactionLabel: Label | null = null;        // 反应（打断抗性）
    @property(Label) abnormalResistLabel: Label | null = null;  // 异常抵抗值
    @property(Label) equilibriumLabel: Label | null = null;     // 均衡状态（×2生效/×1偏科）

    // ─── V2 加点/洗点入口按钮 ───
    @property(Node) allocateBtn: Node | null = null;   // "加点"按钮（emit OPEN_ALLOCATE 打开加点面板）
    @property(Node) washBtn: Node | null = null;       // "洗点"按钮（emit OPEN_WASH 打开洗点确认框）

    // ─── Toast ───
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 加点/洗点入口：项目规范要求跨面板动作走 EventManager，由对应面板监听打开
        this.allocateBtn?.on(Node.EventType.TOUCH_END, () => {
            EventManager.emit(CharacterV2Event.OPEN_ALLOCATE);
        }, this);
        this.washBtn?.on(Node.EventType.TOUCH_END, () => {
            EventManager.emit(CharacterV2Event.OPEN_WASH);
        }, this);

        // 加点/洗点成功后刷新面板数据
        EventManager.on(CharacterV2Event.ATTR_UPDATED, this._onAttrUpdated, this);

        this.refreshAll();
    }

    onDestroy() {
        EventManager.offAll(this);
    }

    /** 属性变化事件（加点/洗点成功后广播）：重新拉取全部数据 */
    private _onAttrUpdated() {
        this.refreshAll();
    }

    /** 刷新所有数据 */
    public async refreshAll() {
        await Promise.all([this._loadAttributes(), this._loadQiElements(), this._loadRealm(), this._loadShield()]);
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

            // V2 衍生值
            if (this.affinityLabel) this.affinityLabel.string = `五行亲和: ${derived.affinity}`;
            if (this.reactionLabel) this.reactionLabel.string = `反应: ${derived.reaction}`;
            if (this.abnormalResistLabel) this.abnormalResistLabel.string = `异常抵抗: ${derived.abnormal_resist}`;
            if (this.equilibriumLabel) {
                // 均衡加成：max÷min≤3 时后端返回2，否则返回1
                const balanced = derived.equilibrium >= 2;
                this.equilibriumLabel.string = balanced ? '均衡加成 ×2' : '偏科Build ×1';
                this.equilibriumLabel.color = new Color().fromHEX(balanced ? '#2ECC71' : '#8A8A9A');
            }
        } catch { this._showToast('加载属性失败'); }
    }

    /** 加载护盾状态（V2：护盾当前值/上限单独接口查询） */
    private async _loadShield() {
        try {
            const res = await CharacterApi.getShield(this._characterId);
            if (res.code !== 0 || !res.data) return;
            if (this.shieldLabel) {
                this.shieldLabel.string = `护盾: ${res.data.shield_current}/${res.data.shield_max}`;
            }
        } catch { /* 静默 */ }
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
