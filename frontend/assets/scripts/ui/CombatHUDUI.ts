/**
 * 寻仙 - V5 战斗 HUD UI
 *
 * 功能：
 *   - 技能栏（4格）：点击施放（POST /combat/cast），CD 遮罩倒计时，
 *     6301 CD中按剩余秒数刷新遮罩，6302 灵力不足红框闪烁+提示；
 *     cast 成功后若已设置目标（targetId/setTarget），追加调 POST /combat/skill
 *     做伤害结算，把 hp_damage/stagger_s 喂给 applyHit（最小可验证链路，
 *     详见 _settleSkillHit 注释）
 *   - HP / 灵力 / 护盾 三条状态条（Graphics 绘制，精简 cc.d.ts 无 fillRange）
 *   - 翻滚按钮：前端 CD 表现，点击广播 BATTLE_ROLL（HallScene 执行位移）
 *   - 浮字伤害：applyHit() 弹出伤害数字上飘
 *   - 受击硬直：applyHit() 读 /combat/skill 响应的 stagger_s，硬直期间锁技能，
 *     并广播 BATTLE_STAGGER（HallScene 锁移动）
 *   - 护盾懒结算：定时调 POST /combat/shield/settle 刷新护盾条
 *
 * 事件：
 *   - 监听 BattleEvent.BATTLE_SHIELD_SETTLED（生产者 BattleApi）刷新护盾条
 *   - 监听 BattleEvent.BATTLE_SKILL_CAST（生产者 BattleApi）刷新灵力条
 *   - 广播 BattleEvent.BATTLE_ROLL（消费者 HallScene）
 *   - 广播 BattleEvent.BATTLE_STAGGER（消费者 HallScene）
 *
 * 节点结构约定（编辑器搭建）：
 *   CombatHUDUI（挂本脚本）
 *   ├─ Bars        状态条画布（Graphics，@property barsGraphics）
 *   ├─ HpLabel     血量数值（Label）    ├─ MpLabel 灵力数值  ├─ ShieldLabel 护盾数值
 *   ├─ SkillBtn1~4 技能格子（Node，各含子节点 CDLabel(Label遮罩文字)、RedFrame(红框图)）
 *   ├─ RollBtn     翻滚按钮（Node，含子节点 CDLabel）
 *   ├─ FloatLabel  浮字伤害（Label，平时隐藏）
 *   ├─ StaggerLabel 硬直提示（Label，平时隐藏）
 *   └─ ToastLabel  提示文字（Label，平时隐藏）
 */

import { _decorator, Component, Label, Node, Color, Graphics } from 'cc';
import { BattleApi, ERR_SKILL_IN_CD, ERR_MP_NOT_ENOUGH, BattleErrorText, ShieldSettleData, CombatCastData } from '../net/BattleApi';
import { CharacterApi } from '../net/CharacterApi';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';
import { BattleEvent } from '../common/Constants';

const { ccclass, property } = _decorator;

/** 翻滚前端CD（秒），纯表现层限制 */
const ROLL_CD_S = 3;
/** 护盾懒结算轮询间隔（秒） */
const SHIELD_SETTLE_INTERVAL_S = 10;
/** 状态条尺寸（像素） */
const BAR_WIDTH = 300;
const BAR_HEIGHT = 14;
const BAR_GAP = 6;

@ccclass('CombatHUDUI')
export class CombatHUDUI extends Component {

    @property(Graphics) barsGraphics: Graphics | null = null;   // 三条状态条画布
    @property(Label) hpLabel: Label | null = null;              // 血量数值
    @property(Label) mpLabel: Label | null = null;              // 灵力数值
    @property(Label) shieldLabel: Label | null = null;          // 护盾数值

    // 技能栏4格（每格子节点约定：CDLabel=CD倒计时文字，RedFrame=灵力不足红框）
    @property(Node) skillBtn1: Node | null = null;
    @property(Node) skillBtn2: Node | null = null;
    @property(Node) skillBtn3: Node | null = null;
    @property(Node) skillBtn4: Node | null = null;
    // 4格对应的技能ID（编辑器配置，0=空格子不可点）
    @property({}) skillId1: number = 0;
    @property({}) skillId2: number = 0;
    @property({}) skillId3: number = 0;
    @property({}) skillId4: number = 0;
    // 结算目标ID（编辑器可配调试目标，运行时由 setTarget 更新；0=无目标，cast 后跳过伤害结算）
    @property({}) targetId: number = 0;

    @property(Node) rollBtn: Node | null = null;          // 翻滚按钮（含子节点 CDLabel）
    @property(Label) floatLabel: Label | null = null;     // 浮字伤害
    @property(Label) staggerLabel: Label | null = null;   // 硬直提示
    @property(Label) toastLabel: Label | null = null;     // 提示文字

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    // ── 三条数值（护盾由懒结算刷新，血量/灵力由外部战斗结算喂入） ──
    private _hp: number = 0;
    private _hpMax: number = 1;
    private _mp: number = 0;
    private _mpMax: number = 1;
    private _shield: number = 0;
    private _shieldMax: number = 1;

    // ── CD 状态（剩余秒数，<=0 表示可用） ──
    private _skillCds: number[] = [0, 0, 0, 0];
    private _rollCd: number = 0;
    // 施放防重入：请求在途时不允许再点
    private _casting: boolean = false;
    // 受击硬直剩余秒数（>0 时锁技能）
    private _staggerRemain: number = 0;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 技能格子点击（防重入 + CD/硬直前端预检）
        const btns = [this.skillBtn1, this.skillBtn2, this.skillBtn3, this.skillBtn4];
        btns.forEach((btn, i) => {
            btn?.on(Node.EventType.TOUCH_END, () => this._onSkillClick(i), this);
        });
        this.rollBtn?.on(Node.EventType.TOUCH_END, this._onRollClick, this);

        // 监听 BattleApi 广播：护盾结算/技能施放成功（灵力刷新）
        EventManager.on(BattleEvent.BATTLE_SHIELD_SETTLED, this._onShieldSettled, this);
        EventManager.on(BattleEvent.BATTLE_SKILL_CAST, this._onSkillCasted, this);

        // 护盾懒结算轮询：后端无定时器，前端定时触发结算
        this.schedule(this._settleShield, SHIELD_SETTLE_INTERVAL_S);
        this._settleShield();

        this._redrawBars();
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    update(dt: number) {
        // 技能CD倒计时 + 遮罩文字刷新
        const btns = [this.skillBtn1, this.skillBtn2, this.skillBtn3, this.skillBtn4];
        for (let i = 0; i < 4; i++) {
            if (this._skillCds[i] > 0) {
                this._skillCds[i] -= dt;
                this._setSlotCdText(btns[i], this._skillCds[i]);
            }
        }
        // 翻滚CD倒计时
        if (this._rollCd > 0) {
            this._rollCd -= dt;
            this._setSlotCdText(this.rollBtn, this._rollCd);
        }
        // 硬直倒计时
        if (this._staggerRemain > 0) {
            this._staggerRemain -= dt;
            if (this.staggerLabel) {
                this.staggerLabel.node.active = this._staggerRemain > 0;
                this.staggerLabel.string = this._staggerRemain > 0
                    ? `硬直 ${this._staggerRemain.toFixed(1)}s` : '';
            }
        }
    }

    // ═══════════════════════════════════════
    //  对外方法（HallScene / 战斗结算流程调用）
    // ═══════════════════════════════════════

    /** 设置血量（战斗结算/角色数据刷新时调用） */
    setHp(cur: number, max: number) {
        this._hp = Math.max(0, cur);
        this._hpMax = Math.max(1, max);
        this._redrawBars();
    }

    /** 设置灵力（战斗结算/角色数据刷新时调用） */
    setMp(cur: number, max: number) {
        this._mp = Math.max(0, cur);
        this._mpMax = Math.max(1, max);
        this._redrawBars();
    }

    /** 设置护盾（角色数据初始化时调用，之后由懒结算事件自动刷新） */
    setShield(cur: number, max: number) {
        this._shield = Math.max(0, cur);
        this._shieldMax = Math.max(1, max);
        this._redrawBars();
    }

    /**
     * 受击处理（战斗结算方把 /combat/skill 响应喂进来）：
     * 弹浮字伤害 + 按 stagger_s 进入硬直（硬直期间锁技能），
     * 并广播 BATTLE_STAGGER 事件（HallScene 收到后锁移动）
     * @param damage 本次受到的伤害
     * @param staggerS /combat/skill 响应新增的受击硬直秒数（旧数据无此字段传0）
     */
    applyHit(damage: number, staggerS: number) {
        this.showDamage(damage);
        if (staggerS > 0) {
            this._staggerRemain = staggerS;
            if (this.staggerLabel) {
                this.staggerLabel.node.active = true;
                this.staggerLabel.color = new Color().fromHEX('#E74C3C');
            }
            EventManager.emit(BattleEvent.BATTLE_STAGGER, staggerS);
        }
    }

    /** 弹浮字伤害：数字上飘1秒后隐藏 */
    showDamage(damage: number) {
        if (!this.floatLabel) return;
        const node = this.floatLabel.node;
        this.floatLabel.string = `-${damage}`;
        this.floatLabel.color = new Color().fromHEX('#E74C3C');
        node.active = true;
        node.setPosition(0, 0, 0);
        // 简易上飘动画：每帧上移，1秒后隐藏（精简型桩无 UIOpacity，用位移代替淡出）
        let elapsed = 0;
        this.schedule((dt: number) => {
            elapsed += dt;
            node.setPosition(0, elapsed * 80, 0);
        }, 0, 60, 0);
        this.scheduleOnce(() => { node.active = false; }, 1.0);
    }

    // ═══════════════════════════════════════
    //  技能施放
    // ═══════════════════════════════════════

    private async _onSkillClick(slot: number) {
        const skillIds = [this.skillId1, this.skillId2, this.skillId3, this.skillId4];
        const btns = [this.skillBtn1, this.skillBtn2, this.skillBtn3, this.skillBtn4];
        const skillId = skillIds[slot];
        if (!skillId || skillId <= 0) {
            this._showToast('该技能格为空');
            return;
        }
        // 前端预检：硬直中/CD中/请求在途（权威判定仍在后端）
        if (this._staggerRemain > 0) {
            this._showToast('受击硬直中，无法施放');
            return;
        }
        if (this._skillCds[slot] > 0) {
            this._showToast(`技能冷却中 ${Math.ceil(this._skillCds[slot])}s`);
            return;
        }
        if (this._casting) return;   // 防重入

        this._casting = true;
        try {
            const res = await BattleApi.cast(this._characterId, skillId);
            if (res.code === 0 && res.data) {
                // 成功：启动CD遮罩倒计时（BATTLE_SKILL_CAST 事件里刷灵力条）
                this._skillCds[slot] = res.data.cooldown_s || 0;
                if (res.data.cd_record_failed) {
                    this._showToast('技能已施放（CD记录延迟，以服务端为准）');
                }
                // 【接入点】cast 只管 CD/灵力，伤害数值走 /combat/skill 结算，
                // 这里 cast 成功后立刻对目标做一次结算打通浮字/硬直链路
                this._settleSkillHit();
            } else if (res.code === ERR_SKILL_IN_CD) {
                // 6301 CD中：按服务端剩余秒数刷新遮罩（前端CD丢失时对齐）
                this._skillCds[slot] = res.data?.cd_remain_s || 1;
                this._showToast(res.msg || BattleErrorText[ERR_SKILL_IN_CD]);
            } else if (res.code === ERR_MP_NOT_ENOUGH) {
                // 6302 灵力不足：红框闪烁 + 明细提示
                this._flashRedFrame(btns[slot]);
                const d = res.data;
                const detail = (d && d.mp_cost !== undefined)
                    ? `（当前${d.mp_current}/需要${d.mp_cost}）` : '';
                this._showToast((res.msg || BattleErrorText[ERR_MP_NOT_ENOUGH]) + detail);
            } else {
                this._showToast(res.msg || '技能施放失败');
            }
        } catch {
            this._showToast('网络错误，技能施放失败');
        } finally {
            this._casting = false;
        }
    }

    /** 技能施放成功事件（BattleApi 广播）：刷新灵力条 */
    private _onSkillCasted(data: CombatCastData) {
        if (data.mp_current !== undefined) {
            this._mp = data.mp_current;
            this._redrawBars();
        }
    }

    /** 设置伤害结算目标（战斗流程锁定敌人时调用；传0清除目标） */
    setTarget(defenderId: number) {
        this.targetId = defenderId;
    }

    /**
     * 最小可验证结算链路（评审修复接入点）：
     * 前端当前没有完整战斗循环，/combat/skill 此前无任何调用点，导致
     * applyHit 浮字伤害与 BATTLE_STAGGER 硬直整条链路不通。这里在
     * /combat/cast 成功后，对 targetId（编辑器配置或 setTarget 设置，
     * 0=无目标直接跳过）做一次 /combat/skill 结算，把响应的
     * hp_damage / stagger_s 喂给 applyHit，让浮字与硬直链路可验证。
     * 正式战斗循环上线后，把本调用挪到战斗层按技能配置传参，仍复用 applyHit 入口
     */
    private async _settleSkillHit() {
        if (this.targetId <= 0) return;   // 无目标：cast 只走CD/灵力，不做伤害结算
        try {
            const res = await CharacterApi.combatSkill({
                attackerId: this._characterId,
                defenderId: this.targetId,
                skillType: 1,    // 武器技（最小链路固定值，正式战斗层按技能配置传）
                skillLevel: 1,
            });
            if (res.code === 0 && res.data) {
                // 浮字显示打到本体的伤害；stagger_s 为受击硬直秒数（旧响应无此字段按0处理）
                this.applyHit(res.data.hp_damage || 0, res.data.stagger_s || 0);
            }
        } catch {
            // 结算失败静默：不影响已完成的 cast（CD/灵力已生效）
        }
    }

    /** 灵力不足红框闪烁：显示子节点 RedFrame 1.5秒 */
    private _flashRedFrame(btn: Node | null) {
        if (!btn) return;
        const frame = btn.getChildByName('RedFrame');
        if (!frame) return;
        frame.active = true;
        this.scheduleOnce(() => { frame.active = false; }, 1.5);
    }

    /** 刷新格子CD遮罩文字（<=0 清空隐藏） */
    private _setSlotCdText(btn: Node | null, remainS: number) {
        if (!btn) return;
        const cdNode = btn.getChildByName('CDLabel');
        if (!cdNode) return;
        const label = cdNode.getComponent(Label);
        if (remainS > 0) {
            cdNode.active = true;
            if (label) label.string = Math.ceil(remainS).toString();
        } else {
            cdNode.active = false;
            if (label) label.string = '';
        }
    }

    // ═══════════════════════════════════════
    //  翻滚
    // ═══════════════════════════════════════

    private _onRollClick() {
        if (this._staggerRemain > 0) {
            this._showToast('受击硬直中，无法翻滚');
            return;
        }
        if (this._rollCd > 0) return;   // CD中静默忽略
        this._rollCd = ROLL_CD_S;
        // 广播翻滚事件：HallScene 收到后按当前朝向做位移（翻滚是纯前端表现+位移）
        EventManager.emit(BattleEvent.BATTLE_ROLL);
    }

    // ═══════════════════════════════════════
    //  护盾懒结算
    // ═══════════════════════════════════════

    /** 定时触发护盾结算（结果经 BATTLE_SHIELD_SETTLED 事件回流刷新） */
    private _settleShield() {
        if (this._characterId <= 0) return;
        BattleApi.shieldSettle(this._characterId).catch(() => { /* 网络异常静默，下轮再试 */ });
    }

    /** 护盾结算完成事件（BattleApi 广播）：刷新护盾条 */
    private _onShieldSettled(data: ShieldSettleData) {
        this._shield = data.shield_current;
        this._shieldMax = Math.max(1, data.shield_max);
        this._redrawBars();
        if (data.recovered > 0) {
            this._showToast(`护盾恢复 +${data.recovered}`);
        }
    }

    // ═══════════════════════════════════════
    //  状态条绘制（Graphics：底槽深色 + 填充色按比例）
    // ═══════════════════════════════════════

    private _redrawBars() {
        const g = this.barsGraphics;
        if (!g) return;
        g.clear();
        // 从上到下：HP(红) / 灵力(蓝) / 护盾(金)
        this._drawBar(g, 0, this._hp / this._hpMax, '#E74C3C');
        this._drawBar(g, 1, this._mp / this._mpMax, '#3498DB');
        this._drawBar(g, 2, this._shield / this._shieldMax, '#D4A843');
        // 数值文字
        if (this.hpLabel) this.hpLabel.string = `${Math.floor(this._hp)}/${Math.floor(this._hpMax)}`;
        if (this.mpLabel) this.mpLabel.string = `${Math.floor(this._mp)}/${Math.floor(this._mpMax)}`;
        if (this.shieldLabel) this.shieldLabel.string = `${Math.floor(this._shield)}/${Math.floor(this._shieldMax)}`;
    }

    /** 画第 row 行状态条（row 0/1/2 自上而下），ratio 为填充比例 0~1 */
    private _drawBar(g: Graphics, row: number, ratio: number, hexColor: string) {
        const y = -row * (BAR_HEIGHT + BAR_GAP);
        const r = Math.max(0, Math.min(1, ratio));
        // 底槽（深色）
        g.fillColor = new Color().fromHEX('#2A2A4A');
        g.rect(0, y, BAR_WIDTH, BAR_HEIGHT);
        g.fill();
        // 填充
        if (r > 0) {
            g.fillColor = new Color().fromHEX(hexColor);
            g.rect(0, y, BAR_WIDTH * r, BAR_HEIGHT);
            g.fill();
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
