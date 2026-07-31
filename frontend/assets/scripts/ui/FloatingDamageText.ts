/**
 * 寻仙 - V6 浮动伤害数字组件（Label 对象池）
 *
 * 数值权威（PRD 6.1/6.2 + 技术文档 2.4）：
 *   - 大小公式：字号 = 基础12pt × (1 + 伤害/目标最大HP × 2)；暴击再 ×1.5（伪码叠乘）
 *   - 动画：上浮 30px、0.5秒渐隐消失（animate_float_up duration=0.5 distance=30）
 *   - 颜色映射 COLOR_MAP（技术文档 2.4 原文）：
 *       物理(255,255,255)白 / 暴击(212,175,55)金 / 灼烧DoT(255,165,0)橙 /
 *       护盾(128,128,128)灰 / 破盾(212,175,55)金+"破盾"字样 /
 *       闪避(128,128,128)灰"闪避" / 格挡(0,100,255)蓝"格挡" /
 *       治疗(0,255,0)绿 / 自伤(255,0,0)红
 *   - 五行色：PRD 只给文字描述 金(白金)/木(绿)/水(蓝)/火(红)/土(黄)，
 *     具体 RGB 为假设值（可配，见 ELEMENT_COLORS）
 *   - 暴击附加：屏幕轻微震动 intensity=0.3（受设置 screen_shake 开关控制）
 *   - 破盾附加：全屏红光闪一下（碎裂粒子无美术资源，本期用金色大字+红光代替，假设可配）
 *   - 同目标多数字：横向交错偏移堆叠（get_stack_offset，偏移量为假设值可配）
 *   - 总开关：设置 show_damage_numbers=0 时完全不弹（SettingsStorage 读取点）
 *
 * 对象池策略（任务书约定）：
 *   - onLoad 预分配 16 个 Label 节点；全忙时复用"最旧"的一个（打断其动画）
 *
 * 节点结构约定（编辑器搭建）：
 *   FloatingDamageText（挂本脚本，通常放战斗 UI 层顶部）
 *   ├─ （运行时自动创建 16 个池化 Label 子节点，无需编辑器摆放）
 *   ├─ FlashNode   可选：全屏红光节点（破盾闪光用，平时隐藏，@property flashNode）
 *   └─ 摇动目标由 @property shakeTarget 指定（一般绑相机节点或场景根）
 */

import { _decorator, Component, Label, Node, Color, Vec3, UIOpacity, tween, Tween } from 'cc';
import { SettingsStorage } from '../manager/SettingsStorage';

const { ccclass, property } = _decorator;

// ═══════════════════════════════════════════
//  伤害类型枚举（技术文档 2.4 DamageNumber.damage_type 原文顺序）
// ═══════════════════════════════════════════

/** 伤害数字类型：0物理 1暴击 2五行 3异常(灼烧DoT) 4护盾 5破盾 6闪避 7格挡 8治疗 9自伤 */
export enum DamageTextType {
    Physical = 0,
    Crit = 1,
    Element = 2,
    Burn = 3,
    Shield = 4,
    ShieldBreak = 5,
    Dodge = 6,
    Block = 7,
    Heal = 8,
    SelfHit = 9,
}

/** 五行属性：0金 1木 2水 3火 4土；-1无（非五行伤害） */
export enum DamageElement {
    None = -1,
    Metal = 0,
    Wood = 1,
    Water = 2,
    Fire = 3,
    Earth = 4,
}

// ═══════════════════════════════════════════
//  颜色映射（技术文档 2.4 COLOR_MAP 原文 RGB）
// ═══════════════════════════════════════════

/** damage_type → 颜色（五行除外，五行单独查 ELEMENT_COLORS） */
const COLOR_MAP: Record<number, [number, number, number]> = {
    [DamageTextType.Physical]:    [255, 255, 255],   // 物理：白色
    [DamageTextType.Crit]:        [212, 175, 55],    // 暴击：金色
    [DamageTextType.Burn]:        [255, 165, 0],     // 灼烧DoT：橙色
    [DamageTextType.Shield]:      [128, 128, 128],   // 护盾伤害：灰色（本体未受伤）
    [DamageTextType.ShieldBreak]: [212, 175, 55],    // 破盾：金色 + "破盾"字样
    [DamageTextType.Dodge]:       [128, 128, 128],   // 闪避：灰色"闪避"字样
    [DamageTextType.Block]:       [0, 100, 255],     // 格挡：蓝色"格挡"字样
    [DamageTextType.Heal]:        [0, 255, 0],       // 治疗：绿色
    [DamageTextType.SelfHit]:     [255, 0, 0],       // 自己受伤：红色
};

/**
 * 五行 → 颜色。PRD 6.1 只给文字：金(白金)/木(绿)/水(蓝)/火(红)/土(黄)，
 * 具体 RGB 文档未给，以下为假设值（可配）
 */
const ELEMENT_COLORS: Record<number, [number, number, number]> = {
    [DamageElement.Metal]: [229, 228, 226],   // 金：白金色（假设值，可配）
    [DamageElement.Wood]:  [46, 204, 113],    // 木：绿色（假设值，可配）
    [DamageElement.Water]: [52, 152, 219],    // 水：蓝色（假设值，可配）
    [DamageElement.Fire]:  [231, 76, 60],     // 火：红色（假设值，可配）
    [DamageElement.Earth]: [241, 196, 15],     // 土：黄色（假设值，可配）
};

// ═══════════════════════════════════════════
//  演出参数（文档值 + 假设值标注）
// ═══════════════════════════════════════════

/** 基础字号 12pt（技术文档 2.4 base_size = 12 原文） */
const BASE_FONT_SIZE = 12;
/** 上浮距离 30px / 时长 0.5秒（技术文档 animate_float_up 原文） */
const FLOAT_DISTANCE = 30;
const FLOAT_DURATION_S = 0.5;
/** 对象池预分配数量（任务书约定 16，全忙复用最旧） */
const POOL_SIZE = 16;
/** 同目标多数字的横向交错步长px（文档只说"堆叠偏移"，步长为假设值可配） */
const STACK_OFFSET_X = 18;
/** 暴击屏幕震动：intensity 0.3（技术文档原文）；换算像素幅度为假设值可配 */
const SHAKE_INTENSITY = 0.3;
const SHAKE_AMPLITUDE_PX = SHAKE_INTENSITY * 20;   // 0.3×20 = 6px（假设换算，可配）
/** 破盾红光闪烁时长秒（文档只说"全屏红光"，时长为假设值可配） */
const FLASH_DURATION_S = 0.3;
/** 字号上限（防超大伤害把字撑爆屏幕，假设值可配） */
const MAX_FONT_SIZE = 48;

/** 池条目：节点 + 组件引用 + 激活序号（越小越旧，复用时挑最旧） */
interface PoolEntry {
    node: Node;
    label: Label;
    opacity: UIOpacity;
    busy: boolean;
    seq: number;                        // 激活序号（0=空闲）
    tweens: Array<Tween<any>>;          // 在途 tween（复用时打断）
}

@ccclass('FloatingDamageText')
export class FloatingDamageText extends Component {

    /** 可选：破盾全屏红光节点（平时隐藏；不绑则跳过红光演出） */
    @property(Node) flashNode: Node | null = null;
    /** 可选：暴击震动的目标节点（一般绑相机/场景根；不绑则跳过震动） */
    @property(Node) shakeTarget: Node | null = null;

    private _pool: PoolEntry[] = [];
    private _seqCounter: number = 0;
    /** 同目标堆叠计数：targetId → 当前在飘的数字个数（决定横向偏移档位） */
    private _stackCount: Map<number, number> = new Map();
    private _destroyed: boolean = false;

    onLoad() {
        // 预分配 16 个池化 Label 节点（挂 UIOpacity 做渐隐）
        for (let i = 0; i < POOL_SIZE; i++) {
            const node = new Node(`DmgText_${i}`);
            const label = node.addComponent(Label);
            const opacity = node.addComponent(UIOpacity);
            node.active = false;
            this.node.addChild(node);
            this._pool.push({ node, label, opacity, busy: false, seq: 0, tweens: [] });
        }
        if (this.flashNode) this.flashNode.active = false;
    }

    onDestroy() {
        this._destroyed = true;
        // 打断全部在途 tween，防止销毁后回调访问失效节点
        for (const e of this._pool) {
            e.tweens.forEach(t => t.stop());
            e.tweens.length = 0;
        }
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════
    //  对外接口
    // ═══════════════════════════════════════

    /**
     * 弹一个伤害数字（战斗结算方调用）
     * @param damage      伤害/治疗数值（闪避/格挡可传0，只显示字样）
     * @param damageType  DamageTextType（0物理 1暴击 2五行 ... 9自伤）
     * @param element     五行属性（仅 damageType=2 时有效，其余传 -1）
     * @param targetMaxHp 目标最大HP（决定字号；<=0 时按基础字号）
     * @param x/y         显示位置（本组件坐标系，一般传目标头顶位置）
     * @param targetId    目标ID（同目标多数字堆叠偏移用；不传则不堆叠）
     */
    show(damage: number, damageType: number, element: number,
         targetMaxHp: number, x: number, y: number, targetId: number = 0) {
        // 总开关：设置里关了伤害数字就完全不弹（PRD 5.4 伤害数字显示开关）
        if (!SettingsStorage.isDamageNumbersOn()) return;
        if (this._destroyed) return;

        const entry = this._acquire();

        // ── 字号：基础12 × (1 + 伤害/最大HP × 2)，暴击叠乘1.5（技术文档伪码） ──
        let sizeMult = 1;
        if (targetMaxHp > 0 && damage > 0) {
            sizeMult = 1 + (damage / targetMaxHp) * 2;
        }
        if (damageType === DamageTextType.Crit) {
            sizeMult *= 1.5;
        }
        entry.label.fontSize = Math.min(Math.round(BASE_FONT_SIZE * sizeMult), MAX_FONT_SIZE);

        // ── 颜色与文案 ──
        const rgb = this._getColor(damageType, element);
        entry.label.color = new Color(rgb[0], rgb[1], rgb[2], 255);
        entry.label.string = this._getText(damage, damageType);

        // ── 位置：同目标多数字横向交错堆叠（左右交替，步长18px 假设值） ──
        let offsetX = 0;
        if (targetId > 0) {
            const n = this._stackCount.get(targetId) || 0;
            // 0,+18,-18,+36,-36... 交错排开，避免完全重叠
            offsetX = (n % 2 === 0 ? 1 : -1) * Math.ceil(n / 2) * STACK_OFFSET_X;
            this._stackCount.set(targetId, n + 1);
            // 0.5秒（一条数字的生命周期）后堆叠计数递减
            this.scheduleOnce(() => {
                if (this._destroyed) return;
                const cur = this._stackCount.get(targetId) || 0;
                if (cur <= 1) this._stackCount.delete(targetId);
                else this._stackCount.set(targetId, cur - 1);
            }, FLOAT_DURATION_S);
        }
        entry.node.setPosition(x + offsetX, y, 0);
        entry.opacity.opacity = 255;
        entry.node.active = true;

        // ── 动画：上浮30px + 渐隐，0.5秒后回池（文档值） ──
        const moveTween = tween(entry.node)
            .to(FLOAT_DURATION_S, { position: new Vec3(x + offsetX, y + FLOAT_DISTANCE, 0) })
            .call(() => this._release(entry))
            .start();
        const fadeTween = tween(entry.opacity)
            .to(FLOAT_DURATION_S, { opacity: 0 })
            .start();
        entry.tweens.push(moveTween, fadeTween);

        // ── 附加演出 ──
        if (damageType === DamageTextType.Crit) {
            this._playShake();   // 暴击：轻微震动（受 screen_shake 设置控制）
        }
        if (damageType === DamageTextType.ShieldBreak) {
            this._playFlash();   // 破盾：全屏红光（碎裂粒子无资源，红光+金色大字代替）
        }
    }

    // ═══════════════════════════════════════
    //  内部：池管理
    // ═══════════════════════════════════════

    /** 取一个空闲池条目；全忙时复用激活最早（seq最小）的那条（打断其动画） */
    private _acquire(): PoolEntry {
        let oldest: PoolEntry | null = null;
        for (const e of this._pool) {
            if (!e.busy) {
                e.busy = true;
                e.seq = ++this._seqCounter;
                return e;
            }
            if (!oldest || e.seq < oldest.seq) oldest = e;
        }
        // 全忙：复用最旧的一条（先停掉它的在途动画）
        const entry = oldest!;
        entry.tweens.forEach(t => t.stop());
        entry.tweens.length = 0;
        entry.seq = ++this._seqCounter;
        return entry;
    }

    /** 动画结束回池：隐藏节点、清动画引用、标记空闲 */
    private _release(entry: PoolEntry) {
        entry.node.active = false;
        entry.busy = false;
        entry.seq = 0;
        entry.tweens.length = 0;
    }

    // ═══════════════════════════════════════
    //  内部：颜色/文案/附加演出
    // ═══════════════════════════════════════

    /** 按类型+五行取颜色（五行查 ELEMENT_COLORS，其余查 COLOR_MAP，兜底白色） */
    private _getColor(damageType: number, element: number): [number, number, number] {
        if (damageType === DamageTextType.Element) {
            return ELEMENT_COLORS[element] || COLOR_MAP[DamageTextType.Physical];
        }
        return COLOR_MAP[damageType] || COLOR_MAP[DamageTextType.Physical];
    }

    /** 按类型拼显示文案：破盾/闪避/格挡带字样，治疗 +N，其余 -N（PRD 6.1 表格） */
    private _getText(damage: number, damageType: number): string {
        const n = Math.round(damage);
        switch (damageType) {
            case DamageTextType.ShieldBreak: return `-${n} 破盾`;   // 金色+"破盾"字样
            case DamageTextType.Dodge:       return '闪避';         // 灰色"闪避"字样（无数字）
            case DamageTextType.Block:       return n > 0 ? `-${n} 格挡` : '格挡';
            case DamageTextType.Heal:        return `+${n}`;        // 治疗绿色 +N
            default:                         return `-${n}`;        // 其余统一 -N
        }
    }

    /** 暴击屏幕震动：intensity=0.3（文档值），幅度6px假设换算；设置关闭则跳过 */
    private _playShake() {
        if (!this.shakeTarget || !SettingsStorage.isScreenShakeOn()) return;
        const target = this.shakeTarget;
        const base = target.position.clone();
        // 左右各抖一次再回位（简易三段震动，时长共约0.12秒，假设值可配）
        const t = tween(target)
            .to(0.04, { position: new Vec3(base.x + SHAKE_AMPLITUDE_PX, base.y, base.z) })
            .to(0.04, { position: new Vec3(base.x - SHAKE_AMPLITUDE_PX, base.y, base.z) })
            .to(0.04, { position: new Vec3(base.x, base.y, base.z) })
            .start();
        // 不入池条目的 tweens：震动目标是外部节点，组件销毁时 onDestroy 已停全部计时器
        void t;
    }

    /** 破盾全屏红光：闪 0.3秒 后隐藏（时长假设值可配；未绑 flashNode 则跳过） */
    private _playFlash() {
        if (!this.flashNode) return;
        this.flashNode.active = true;
        this.scheduleOnce(() => {
            if (!this._destroyed && this.flashNode) this.flashNode.active = false;
        }, FLASH_DURATION_S);
    }
}
