/**
 * 寻仙 - 人物属性 V2 & 战斗结算 API 客户端
 *
 * 说明:
 *   - 严格对齐 character-service (端口 8005) 的 V2 REST 接口
 *   - 涵盖：自由属性点分配/洗点、神魔之道积攒/子阶突破、护盾查询、
 *     技能伤害结算、异常状态判定、脱战护盾恢复
 *   - HttpClient 会自动根据 /character/* /combat/* 前缀路由到角色服务
 *   - 后端实现见 backend/internal/character/handler_v2.go
 *   - daoGain / combatAbnormal 成功后由本封装层自动广播对应事件
 *     （DAO_UPDATED / ABNORMAL_TRIGGERED），UI 面板只需监听、无需自行 emit
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';

// ═══════════════════════════════════════════
//  枚举定义（与后端保持一致）
// ═══════════════════════════════════════════

/** 神魔之道类型（对应神魔境界5个子阶） */
export enum DaoType {
    Taiji  = 1,   // 太极之道
    Taisu  = 2,   // 太素之道
    Taishi = 3,   // 太始之道
    Taichu = 4,   // 太初之道
    Taiyi  = 5,   // 太易之道
}

/** 技能类型（决定伤害走哪条乘区链路） */
export enum SkillType {
    Weapon  = 1,   // 武器技（体修，吃体魄）
    Element = 2,   // 五行技（法修，吃功法威力+五行亲和）
    Divine  = 3,   // 神位技（魂修，吃神识）
}

/** 异常状态类型 */
export enum AbnormalType {
    Freeze = 1,   // 冰冻
    Burn   = 2,   // 灼烧
    Stun   = 3,   // 眩晕
}

/** 神魔子阶 → 中文名（1太极 → 5太易） */
export const SubRealmName: Record<number, string> = {
    [DaoType.Taiji]:  '太极',
    [DaoType.Taisu]:  '太素',
    [DaoType.Taishi]: '太始',
    [DaoType.Taichu]: '太初',
    [DaoType.Taiyi]:  '太易',
};

/** 异常状态 → 中文名 */
export const AbnormalName: Record<number, string> = {
    [AbnormalType.Freeze]: '冰冻',
    [AbnormalType.Burn]:   '灼烧',
    [AbnormalType.Stun]:   '眩晕',
};

// ═══════════════════════════════════════════
//  全局事件（人物属性 V2 各面板间通信）
//  项目规范：按钮触发的跨面板动作一律走 EventManager，禁止直接 onClick 回调
// ═══════════════════════════════════════════

export enum CharacterV2Event {
    /** 打开加点面板（CharacterPanel 的"加点"按钮触发，可携带 unassigned_points） */
    OPEN_ALLOCATE = 'charv2:open_allocate',
    /** 打开洗点确认框（CharacterPanel 的"洗点"按钮触发） */
    OPEN_WASH = 'charv2:open_wash',
    /** 属性已变化（加点/洗点成功后广播，携带最新接口返回数据，各面板收到后自行刷新） */
    ATTR_UPDATED = 'charv2:attr_updated',
    /** 待分配点数变化（升阶发点/加点扣点/洗点返还后广播，参数：unassigned_points 数值） */
    POINTS_UPDATED = 'charv2:points_updated',
    /** 道值变化（daoGain 返回后广播，携带 DaoGainData，境界面板据此刷新道进度） */
    DAO_UPDATED = 'charv2:dao_updated',
    /** 异常状态触发（combatAbnormal 判定命中后广播，携带 CombatAbnormalData） */
    ABNORMAL_TRIGGERED = 'charv2:abnormal_triggered',
}

// ═══════════════════════════════════════════
//  接口响应数据类型
// ═══════════════════════════════════════════

/**
 * V2 衍生属性集合（字段与后端 calc.go 的 DerivedAttrs json tag 一一对应）
 * 由精/气/神按固定系数换算而来，角色面板与战斗全部使用这些值
 */
export interface DerivedAttrsV2 {
    hp_max: number;           // 气血上限 = 精 × 50
    mp_max: number;           // 灵力上限 = 气 × 20
    soul_max: number;         // 魂力上限 = 神 × 50
    physique: number;         // 体魄 = 精 × 5
    agility: number;          // 身法 = 精 × 1
    bone_base: number;        // 根骨 = 精 × 3
    skill_power: number;      // 功法威力 = 气 × 2
    sense_range: number;      // 神识范围 = 神 × 1（米）
    affinity: number;         // 五行亲和 = 气 × 0.5
    reaction: number;         // 反应 = 神 × 1（打断抗性）
    abnormal_resist: number;  // 异常抵抗值 = 神 × 0.5
    shield_max: number;       // 护盾上限 = (精+气+神) × 200
    shield_regen: number;     // 护盾恢复速度 = (精+气+神) × 2/秒
    equilibrium: number;      // 均衡加成：2（max÷min≤3）或 1
}

/** 加点响应 */
export interface AllocatePointsData {
    jing: number;               // 加点后的精（固定点+自由点总值）
    qi: number;                 // 加点后的气
    shen: number;               // 加点后的神
    free_jing: number;          // 已分配到精上的自由点
    free_qi: number;            // 已分配到气上的自由点
    free_shen: number;          // 已分配到神上的自由点
    unassigned_points: number;  // 剩余待分配点数
    derived: DerivedAttrsV2;    // 重算后的全部衍生属性
}

/** 洗点响应 */
export interface WashPointsData {
    returned_jing: number;      // 从精上退回的自由点
    returned_qi: number;        // 从气上退回的自由点
    returned_shen: number;      // 从神上退回的自由点
    total_returned: number;     // 本次返还的自由点总数
    unassigned_points: number;  // 洗点后的待分配点数余额
    wash_cost: number;          // 本境界洗点灵石费用（当前未接经济系统，仅展示）
    derived: DerivedAttrsV2;    // 重算后的全部衍生属性
}

/** 积攒神魔之道响应（返回全部5种道值，方便一次刷新全部进度条） */
export interface DaoGainData {
    dao_taiji: number;          // 太极之道
    dao_taisu: number;          // 太素之道
    dao_taishi: number;         // 太始之道
    dao_taichu: number;         // 太初之道
    dao_taiyi: number;          // 太易之道
    breakthrough_need: number;  // 子阶突破所需道值（固定100）
}

/** 神魔子阶突破响应 */
export interface DaoBreakthroughData {
    sub_realm: number;          // 突破后的子阶：1太极 2太素 3太始 4太初 5太易
    sub_realm_name: string;     // 子阶中文名
    dao_consumed: number;       // 本次消耗的道值（100）
    dao_remaining: number;      // 消耗后剩余道值
    fixed_point_bonus: number;  // 新子阶发放的固定点增量
    derived: DerivedAttrsV2;    // 重算后的全部衍生属性
}

/** 护盾/气血状态响应 */
export interface ShieldData {
    shield_current: number;   // 当前护盾
    shield_max: number;       // 护盾上限
    hp_current: number;       // 当前气血
    hp_max: number;           // 气血上限
    shield_regen: number;     // 每秒护盾恢复量（脱战5秒后生效）
    recover_delay: number;    // 脱战后需等待的秒数
}

/** 技能伤害结算的各乘区明细（前端浮字/数值排查用） */
export interface CombatSkillDetail {
    base_damage: number;      // 基础伤害
    skill_mul: number;        // 技能等级乘区
    multi_mul: number;        // 多修乘区
    sheng_mul: number;        // 五行相生乘区
    counter_mul: number;      // 五行相克乘区
    affinity_bonus: number;   // 五行亲和加成
    crit_mul: number;         // 暴击乘区
}

/** 技能伤害结算响应 */
export interface CombatSkillData {
    raw_damage: number;       // 最终伤害值
    shield_absorbed: number;  // 护盾吸收量
    hp_damage: number;        // 打到本体的伤害
    shield_broken: boolean;   // 是否破盾
    is_crit: boolean;         // 是否暴击
    equilibrium: number;      // 均衡加成（2=均衡Build 1=偏科）
    defender_shield: number;  // 防守方剩余护盾
    defender_hp: number;      // 防守方剩余HP
    detail: CombatSkillDetail;
}

/** 异常状态判定响应 */
export interface CombatAbnormalData {
    abnormal_type: number;    // 异常类型：1冰冻 2灼烧 3眩晕
    abnormal_name: string;    // 异常中文名
    base_prob: number;        // 基础触发概率
    resist_rate: number;      // 防守方抵抗率
    trigger_prob: number;     // 最终触发概率
    triggered: boolean;       // 是否触发成功
    duration: number;         // 持续时间（秒，未触发时为0）
    redis_key?: string;       // 后端写入的异常状态 Redis 键名（场景服务/调试使用，触发成功时才返回）
}

/** 脱战护盾恢复响应 */
export interface ShieldRecoverData {
    regen_per_sec: number;    // 每秒恢复量
    seconds: number;          // 本次结算秒数
    recovered: number;        // 实际恢复量（可能因封顶而小于理论值）
    shield_current: number;   // 恢复后的护盾
    shield_max: number;       // 护盾上限
    is_full: boolean;         // 是否已回满
}

/** 灼烧持续掉血单跳结算响应 */
export interface BurnTickData {
    shield_damage: number;    // 本跳扣掉的护盾（护盾上限5%，最少1点）
    hp_damage: number;        // 本跳扣掉的HP（破盾后当前HP5%，最少1点）
    shield_current: number;   // 结算后的护盾
    hp_current: number;       // 结算后的HP
    shield_max: number;       // 护盾上限（前端算比例用）
    is_dead: boolean;         // HP归零提示（后续死亡流程由死亡系统处理）
    burning: boolean;         // 本次结算时灼烧确实生效中
}

// ═══════════════════════════════════════════
//  CharacterApi
// ═══════════════════════════════════════════

export class CharacterApi {
    // ── 自由属性点 ──

    /**
     * 分配自由属性点（把待分配点数按意愿加到精/气/神上）
     * 余额不足时后端返回 HTTP 400，res.code !== 0
     */
    static async allocatePoints(characterId: number, jing: number, qi: number, shen: number): Promise<ApiResponse<AllocatePointsData>> {
        return HttpClient.post<AllocatePointsData>('/character/points/allocate', {
            character_id: characterId,
            jing,
            qi,
            shen,
        });
    }

    /** 洗点：把已分配的自由点全部返还到待分配池（固定点不动） */
    static async washPoints(characterId: number): Promise<ApiResponse<WashPointsData>> {
        return HttpClient.post<WashPointsData>('/character/points/wash', {
            character_id: characterId,
        });
    }

    // ── 神魔之道 ──

    /**
     * 积攒神魔之道（任务/副本获得道值，攒够100可突破子阶）
     * 成功后自动广播 DAO_UPDATED 事件（携带全部5种道值），
     * 境界面板（RealmBreakthroughUI）据此刷新道积攒进度，调用方无需再手动 emit
     */
    static async daoGain(characterId: number, daoType: DaoType | number, amount: number): Promise<ApiResponse<DaoGainData>> {
        const res = await HttpClient.post<DaoGainData>('/character/dao/gain', {
            character_id: characterId,
            dao_type: daoType,
            amount,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(CharacterV2Event.DAO_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 神魔子阶突破（以道证道：当前子阶道值≥100 → 消耗100 → 子阶+1）
     * 非神魔境界或道值不足时后端返回 HTTP 400，res.code !== 0
     */
    static async daoBreakthrough(characterId: number): Promise<ApiResponse<DaoBreakthroughData>> {
        return HttpClient.post<DaoBreakthroughData>('/character/dao/breakthrough', {
            character_id: characterId,
        });
    }

    // ── 护盾 ──

    /** 查询护盾与气血状态 */
    static async getShield(characterId: number): Promise<ApiResponse<ShieldData>> {
        return HttpClient.get<ShieldData>('/character/shield', {
            character_id: String(characterId),
        });
    }

    /**
     * 脱战护盾恢复结算（seconds = 本次脱战恢复的秒数）
     * 调用约定：当前由战斗/场景逻辑或调试工具按需驱动，
     * 本期前端不在心跳中主动触发；正式战斗循环上线后，
     * 由战斗层在"脱战满5秒（recover_delay）"计时结束时开始周期性调用
     */
    static async shieldRecover(characterId: number, seconds: number): Promise<ApiResponse<ShieldRecoverData>> {
        return HttpClient.post<ShieldRecoverData>('/combat/shield/recover', {
            character_id: characterId,
            seconds,
        });
    }

    // ── 战斗结算 ──

    /** 技能伤害结算（读双方属性 → 暴击判定 → 乘区计算 → 先扣盾后扣血） */
    static async combatSkill(params: {
        attackerId: number;
        defenderId: number;
        skillType: SkillType | number;    // 1武器技 2五行技 3神位技
        skillLevel: number;               // 技能等级 1-10
        elementType?: number;             // 五行属性 1-5（五行技必填）
    }): Promise<ApiResponse<CombatSkillData>> {
        return HttpClient.post<CombatSkillData>('/combat/skill', {
            attacker_id:  params.attackerId,
            defender_id:  params.defenderId,
            skill_type:   params.skillType,
            skill_level:  params.skillLevel,
            element_type: params.elementType ?? 0,
        });
    }

    /**
     * 异常状态判定与施加（触发概率 = 基础概率 × (1 - 抵抗率)）
     * 成功后自动广播 ABNORMAL_TRIGGERED 事件（携带判定结果），
     * 异常状态栏（AbnormalStatusUI）监听后在 triggered=true 时亮图标倒计时，调用方无需再手动 emit
     */
    static async combatAbnormal(attackerId: number, defenderId: number, abnormalType: AbnormalType | number): Promise<ApiResponse<CombatAbnormalData>> {
        const res = await HttpClient.post<CombatAbnormalData>('/combat/abnormal', {
            attacker_id:   attackerId,
            defender_id:   defenderId,
            abnormal_type: abnormalType,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(CharacterV2Event.ABNORMAL_TRIGGERED, res.data);
        }
        return res;
    }

    /**
     * 灼烧持续掉血单跳结算：灼烧状态生效时每秒调用一跳
     * （后端按 Redis 键 abnormal:{id}:2 判断灼烧是否还在，未灼烧时返回400）
     * 调用约定：当前由战斗/场景逻辑或调试工具按需驱动，
     * 本期前端不在心跳中主动触发；正式战斗循环上线后，
     * 由战斗层在收到灼烧触发（ABNORMAL_TRIGGERED, type=2）时启动每秒一次的结算定时器
     */
    static async burnTick(characterId: number): Promise<ApiResponse<BurnTickData>> {
        return HttpClient.post<BurnTickData>('/combat/burn/tick', {
            character_id: characterId,
        });
    }
}
