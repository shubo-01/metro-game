/**
 * 寻仙 - 功法·打坐·经验系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 character-service (端口 8005) 的 /gongfa/ 前缀 REST 接口
 *   - 涵盖：功法学习(完整优先/9碎片自动合成)、功法遗忘(按品级扣灵石+孟遗汤)、
 *     功法总览(定义+背包+已学+走火+打坐状态)、打坐开始/结算/结束、杀怪经验入账
 *   - HttpClient 会自动根据 /gongfa/ 前缀路由到角色服务 8005
 *   - 后端实现见 backend/internal/gongfa/（handler.go / service.go / model.go）
 *   - 每个接口成功（code===0 且有 data）后由本封装层自动广播对应 GongfaEvent
 *     事件并携带响应 data，UI 面板只需监听、无需自行 emit
 *
 * 【两套打坐体系隔离说明】
 *   本文件的 /gongfa/meditate/*（8005）是"功法修炼打坐"，产出精气神经验（XP），
 *   采用结算制（settle 按上次结算点计算完整10分钟单位数发经验）；
 *   而副本服务 8009 的 /fatigue/meditate/*（牢结值打坐）是另一套完全独立的体系，
 *   用于恢复牢结值，两者互不引用、互不影响，前端也分别由不同面板驱动。
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { GongfaEvent } from '../common/Constants';
import { DerivedAttrsV2 } from './CharacterApi';

// ═══════════════════════════════════════════
//  枚举与展示映射（与后端 model.go 保持一致）
// ═══════════════════════════════════════════

/** 功法/技能品级（gongfa_def.tier / skill_def.tier，功法四品与技能四档同一套编号） */
export enum GongfaTier {
    Fan  = 1,   // 凡法 / 凡术
    Ling = 2,   // 灵法 / 灵术
    Xian = 3,   // 仙法 / 仙术
    Dao  = 4,   // 道法 / 道术
}

/** 功法属性系（gongfa_def.attr_type）：决定学习后主加哪一维 */
export enum GongfaAttrType {
    Yao = 1,   // 妖属：主加精
    Mo  = 2,   // 魔属：主加气
    Dao = 3,   // 道属：主加神
}

/** 品级 → 中文名（功法口径） */
export const TierName: Record<number, string> = {
    [GongfaTier.Fan]:  '凡法',
    [GongfaTier.Ling]: '灵法',
    [GongfaTier.Xian]: '仙法',
    [GongfaTier.Dao]:  '道法',
};

/** 属性系 → 中文名（含主加维度提示） */
export const GongfaAttrTypeName: Record<number, string> = {
    [GongfaAttrType.Yao]: '妖属(加精)',
    [GongfaAttrType.Mo]:  '魔属(加气)',
    [GongfaAttrType.Dao]: '道属(加神)',
};

/** 大境界 → 中文名（学习要求展示用，与 character 包口径一致） */
export const MajorStageName: Record<number, string> = {
    1: '人阶',
    2: '真人',
    3: '地仙',
    4: '天仙',
    5: '金仙',
    6: '太乙',
    7: '大罗',
    8: '神魔',
};

// ═══════════════════════════════════════════
//  业务数值常量镜像（UI 展示/前端预检用，权威判定以后端为准）
//  数值全部对照 backend/internal/gongfa/model.go，勿凭 PRD 口头数值改动
// ═══════════════════════════════════════════

/** 9碎片合成1个完整功法/技能（后端 FuseNeed） */
export const GONGFA_FUSE_NEED = 9;
/** 孟遗汤商城单价（灵石），与归元符同价（后端 SoupPrice） */
export const SOUP_PRICE = 99;
/** 打坐结算单位：10分钟=600秒，不满一个整单位不发经验（后端 MeditateUnitSec） */
export const MEDITATE_UNIT_SEC = 600;
/** 每日打坐上限：4小时=14400秒（后端 MeditateDayCap） */
export const MEDITATE_DAY_CAP = 14400;
/** 走火入魔持续时长：72小时（后端 ZouhuoHours） */
export const ZOUHUO_HOURS = 72;

/**
 * 遗忘费用表（后端 ForgetCostTable 镜像）：
 * 凡法免费 / 灵法30灵石+2孟遗汤 / 仙法80+3 / 道法150+5；
 * 折算总成本（灵石当量 = 灵石 + 孟遗汤数×99）：凡0 / 灵228 / 仙377 / 道645
 */
export const ForgetCostTable: Record<number, { spirit_stone: number; mengyi_soup: number }> = {
    [GongfaTier.Fan]:  { spirit_stone: 0,   mengyi_soup: 0 },
    [GongfaTier.Ling]: { spirit_stone: 30,  mengyi_soup: 2 },
    [GongfaTier.Xian]: { spirit_stone: 80,  mengyi_soup: 3 },
    [GongfaTier.Dao]:  { spirit_stone: 150, mengyi_soup: 5 },
};

/**
 * 学习要求表（后端 LearnReqTable 镜像）：
 * 凡法无要求 / 灵法 人阶50级+裸精气神总和120 / 仙法 真人20级+300 / 道法 金仙50级+2000。
 * 说明："级内等级"= (小阶-1)×10 + 段格 + 1；精气神一律用裸值总和（防加成套娃）
 */
export const LearnReqTable: Record<number, { major_stage: number; level: number; attr_total: number }> = {
    [GongfaTier.Fan]:  { major_stage: 0, level: 0,  attr_total: 0 },
    [GongfaTier.Ling]: { major_stage: 1, level: 50, attr_total: 120 },
    [GongfaTier.Xian]: { major_stage: 2, level: 20, attr_total: 300 },
    [GongfaTier.Dao]:  { major_stage: 5, level: 50, attr_total: 2000 },
};

/**
 * 打坐XP速率表（后端 MeditateXPTable 镜像）：每10分钟发放的XP，三属性同额。
 * 凡1 / 灵2 / 仙3 / 道5；运行时实际速率取"已学最高品级功法"，
 * 由接口返回的 xp_per_10min 为准，本表仅作展示兜底
 */
export const MeditateXPTable: Record<number, number> = {
    [GongfaTier.Fan]:  1,
    [GongfaTier.Ling]: 2,
    [GongfaTier.Xian]: 3,
    [GongfaTier.Dao]:  5,
};

/**
 * 等级差经验倍率表（后端 LevelDiffMult 镜像，仅供前端展示"打这只怪划不划算"）。
 * diff = 玩家级内等级 - 怪物级内等级
 */
export const LevelDiffMultTable: { min: number; max: number; mult: number; desc: string }[] = [
    { min: -9999, max: -4,   mult: 0,   desc: '怪物高4级以上：无经验' },
    { min: -3,    max: -1,   mult: 0.5, desc: '怪物高1-3级：经验×0.5' },
    { min: 0,     max: 0,    mult: 1.0, desc: '同级：经验×1.0' },
    { min: 1,     max: 3,    mult: 1.2, desc: '玩家高1-3级：经验×1.2' },
    { min: 4,     max: 6,    mult: 1.5, desc: '玩家高4-6级：经验×1.5' },
    { min: 7,     max: 10,   mult: 1.8, desc: '玩家高7-10级：经验×1.8' },
    { min: 11,    max: 9999, mult: 2.0, desc: '玩家高11级以上：经验×2.0（封顶）' },
];

/** 遗忘总成本（灵石当量）= 灵石 + 孟遗汤数 × 99，与后端 CalcForgetTotalCost 同公式 */
export function calcForgetTotalCost(cost: { spirit_stone: number; mengyi_soup: number }): number {
    return cost.spirit_stone + cost.mengyi_soup * SOUP_PRICE;
}

/** 由境界小阶+段格换算"该大境界内等级"：Lv = (小阶-1)×10 + 段格 + 1（与后端 CharLevel 同公式） */
export function calcCharLevel(minorStage: number, stageSegment: number): number {
    const minor = minorStage < 1 ? 1 : minorStage;
    const seg = stageSegment < 0 ? 0 : stageSegment;
    return (minor - 1) * 10 + seg + 1;
}

/** 等级差 → 经验倍率（与后端 LevelDiffMult 同规则，仅前端展示用） */
export function levelDiffMult(diff: number): number {
    for (const row of LevelDiffMultTable) {
        if (diff >= row.min && diff <= row.max) return row.mult;
    }
    return 0;
}

/**
 * 走火入魔前端预判（与后端 ZouhuoTriggered 同规则，仅作学习前提示）：
 * 功法品级×10 > max(裸精, 裸气, 裸神) 时触发；
 * 触发【不阻断学习】，只是 72 小时内有效精×0.5
 */
export function willTriggerZouhuo(tier: number, jing: number, qi: number, shen: number): boolean {
    return tier * 10 > Math.max(jing, qi, shen);
}

/**
 * 功法/技能业务错误码 → 中文提示文案（5xxx 段）
 * 后端 msg 已是中文详细描述，此表提供兜底短文案（msg 为空或异常时展示）
 */
export const GongfaErrorText: Record<number, string> = {
    5001: '功法不足：没有完整功法，且碎片不足9个无法合成',
    5002: '已学习过该功法，不能重复学习',
    5003: '尚未学习该功法，无法遗忘',
    5004: '境界等级不足，未达到学习要求',
    5005: '精气神总和不足（按裸值计算），未达到学习要求',
    5010: '灵石不足，无法支付遗忘费用',
    5011: '孟遗汤不足，无法遗忘（副本掉落或商城99灵石/个）',
    5020: '技能碎片不足，合成需要9个碎片',
    5021: '未持有该技能，无法操作',
    5022: '技能栏位非法：主动栏1-10，被动栏1-4',
    5023: '该技能不可装配到此栏位（普攻/神位技不占栏）',
    5024: '修炼五行数量不足，无法使用该五行技',
    5025: '该技能已装配在其他栏位',
    5030: '已在打坐中，请先结束当前打坐',
    5031: '当前未在打坐',
    5032: '今日打坐已达4小时上限，明天再来吧',
    5033: '尚未学习任何功法，无法打坐修炼',
};

// ═══════════════════════════════════════════
//  接口响应数据类型（字段与后端 json tag 一一对应）
// ═══════════════════════════════════════════

/** 功法定义（gongfa_def 表一行） */
export interface GongfaDef {
    id: number;                       // 功法ID
    name: string;                     // 功法名称
    attr_type: number;                // 属性系：1妖(加精) 2魔(加气) 3道(加神)
    tier: number;                     // 品级：1凡法 2灵法 3仙法 4道法
    meditate_xp_per_10min: number;    // 打坐XP/10分钟（凡1 灵2 仙3 道5）
    shield_recover_mult: number;      // 护盾恢复倍率
    bonus_jing: number;               // 学习后精加成
    bonus_qi: number;                 // 学习后气加成
    bonus_shen: number;               // 学习后神加成
    is_fragment: boolean;             // 是否碎片产出（需9碎片合成）
    fuse_count: number;               // 合成所需碎片数（9）
    req_major_stage: number;          // 学习要求-大境界下限（0=无要求）
    req_level: number;                // 学习要求-级内等级下限
    req_attr_total: number;           // 学习要求-裸值精气神总和下限
    source_desc: string;              // 来源说明
}

/** 遗忘费用（灵石 + 孟遗汤） */
export interface ForgetCost {
    spirit_stone: number;   // 灵石费用
    mengyi_soup: number;    // 孟遗汤数量
}

/** 功法总览中的单条功法（定义 + 持有情况 + 是否已学 + 遗忘费用） */
export interface GongfaListItem {
    def: GongfaDef;            // 功法定义
    fragments: number;         // 持有碎片数
    complete: number;          // 持有完整功法数
    learned: boolean;          // 是否已学习
    forget_cost: ForgetCost;   // 该品级的遗忘费用
}

/** 走火入魔状态 */
export interface ZouhuoStatus {
    active: boolean;      // 是否处于走火入魔生效期（有效精×0.5）
    remain_sec: number;   // 剩余秒数（未走火时为0）
}

/** 打坐状态（总览接口返回的只读快照） */
export interface MeditationStatus {
    status: number;              // 0=未打坐 1=打坐中
    xp_per_10min: number;        // 当前打坐速率（已学最高品级功法决定，未学功法为0）
    today_seconds: number;       // 今日已计入的打坐秒数
    today_remain_sec: number;    // 今日剩余额度秒数
    daily_cap_seconds: number;   // 每日上限秒数（14400=4小时）
}

/** 功法总览响应（GET /gongfa/list） */
export interface GongfaListData {
    gongfa_list: GongfaListItem[];   // 全部功法（含持有/已学状态）
    mengyi_soup: number;             // 孟遗汤持有数
    spirit_stone: number;            // 灵石余额
    soup_price: number;              // 孟遗汤商城单价（99）
    zouhuo: ZouhuoStatus;            // 走火入魔状态
    meditation: MeditationStatus;    // 打坐状态
}

/** 精气神加成（学习功法响应中的 bonus 字段） */
export interface GongfaBonus {
    jing: number;   // 精加成
    qi: number;     // 气加成
    shen: number;   // 神加成
}

/** 学习功法响应（POST /gongfa/learn） */
export interface LearnData {
    gongfa: GongfaDef;          // 学到的功法完整定义
    consumed: string;           // 消耗方式：complete=扣1个完整功法 fragments=9碎片自动合成
    bonus: GongfaBonus;         // 本次获得的精气神加成
    zouhuo: boolean;            // 是否触发走火入魔（true=触发，但学习依然成功）
    derived: DerivedAttrsV2;    // 重算后的最新衍生属性
}

/** 遗忘功法响应（POST /gongfa/forget） */
export interface ForgetData {
    gongfa_id: number;          // 被遗忘的功法ID
    cost: ForgetCost;           // 本次实际扣的灵石与孟遗汤
    derived: DerivedAttrsV2;    // 加成回退后重算的衍生属性
}

/**
 * 打坐响应（start / settle / end 三接口共用一个类型）：
 *   - start 返回：status(=1) gongfa_tier xp_per_10min today_seconds today_remain_sec
 *   - settle/end 返回：status units xp_gained xp_per_10min today_seconds today_remain_sec；
 *     且仅当本次发放了XP（xp_gained>0）时才追加 exp_jing/exp_qi/exp_shen/can_upgrade
 *   - end 的 status 固定为 0（已结束打坐）
 * 因此除公共字段外一律声明为可选，读取时需做存在性判断
 */
export interface MeditateData {
    status: number;              // 0=未打坐 1=打坐中
    xp_per_10min: number;        // 打坐速率（XP/10分钟）
    today_seconds: number;       // 今日已计入的打坐秒数
    today_remain_sec: number;    // 今日剩余额度秒数
    gongfa_tier?: number;        // 【仅start】决定速率的功法品级
    units?: number;              // 【仅settle/end】本次结算的完整10分钟单位数
    xp_gained?: number;          // 【仅settle/end】本次发放的XP（三属性同额）
    exp_jing?: number;           // 【发放XP时】入账后的精经验
    exp_qi?: number;             // 【发放XP时】入账后的气经验
    exp_shen?: number;           // 【发放XP时】入账后的神经验
    can_upgrade?: boolean;       // 【发放XP时】三属性经验是否均已达升级要求
}

/** 杀怪经验入账响应（POST /gongfa/exp/kill） */
export interface KillExpData {
    xp_gained: number;             // 本次获得XP（已乘等级差/多修/伤害占比，向下取整）
    monster_base_xp: number;       // 怪物基础XP（未乘倍率）
    player_level: number;          // 玩家级内等级（(小阶-1)×10+段格+1）
    level_diff_mult: number;       // 等级差倍率（0/0.5/1.0/1.2/1.5/1.8/2.0）
    xiu_mult: number;              // 多修经验倍率（1/2/3/4/9）
    damage_ratio: number;          // 本次采用的伤害占比（单人=1.0）
    exp_jing: number;              // 入账后的精经验
    exp_qi: number;                // 入账后的气经验
    exp_shen: number;              // 入账后的神经验
    can_upgrade: boolean;          // 三属性经验是否均已达升级要求
    upgrade_exp_req_doc: number;   // 文档口径的升级XP（神兽base×(等级+1)×50，仅展示）
}

// ═══════════════════════════════════════════
//  GongfaApi
// ═══════════════════════════════════════════

export class GongfaApi {

    /**
     * 功法总览：全部功法定义 + 背包碎片/完整数 + 已学标记 + 遗忘费用
     *           + 孟遗汤/灵石余额 + 走火入魔状态 + 打坐状态
     * 成功后自动广播 GONGFA_UPDATED 事件（携带 GongfaListData 全量数据），
     * 功法面板（GongfaPanel）监听后渲染，调用方无需再手动 emit
     */
    static async list(characterId: number): Promise<ApiResponse<GongfaListData>> {
        const res = await HttpClient.get<GongfaListData>('/gongfa/list', {
            character_id: String(characterId),
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(GongfaEvent.GONGFA_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 学习功法：优先扣1个完整功法，没有完整功法时用9个碎片自动合成后学习
     * 功法不足 5001；已学习过 5002；境界等级不足 5004；裸精气神总和不足 5005
     * 【注意】学习功法品级过高会触发走火入魔（data.zouhuo=true），
     * 但后端不阻断学习，只是 72 小时内有效精×0.5
     * 成功后自动广播 GONGFA_LEARNED 事件（携带 LearnData，含重算衍生值）
     */
    static async learn(characterId: number, gongfaId: number): Promise<ApiResponse<LearnData>> {
        const res = await HttpClient.post<LearnData>('/gongfa/learn', {
            character_id: characterId,
            gongfa_id: gongfaId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(GongfaEvent.GONGFA_LEARNED, res.data);
        }
        return res;
    }

    /**
     * 遗忘功法：按品级扣灵石+孟遗汤（凡法免费/灵30+2/仙80+3/道150+5），
     * 学习时获得的精气神加成同时回退，功法本体【不返还】
     * 未学习该功法 5003；灵石不足 5010；孟遗汤不足 5011
     * 成功后自动广播 GONGFA_FORGOTTEN 事件（携带 ForgetData）
     */
    static async forget(characterId: number, gongfaId: number): Promise<ApiResponse<ForgetData>> {
        const res = await HttpClient.post<ForgetData>('/gongfa/forget', {
            character_id: characterId,
            gongfa_id: gongfaId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(GongfaEvent.GONGFA_FORGOTTEN, res.data);
        }
        return res;
    }

    /**
     * 开始打坐修炼（功法体系，非牢结值打坐）：速率取已学最高品级功法
     * 未学任何功法 5033；已在打坐中 5030；今日已达4小时上限 5032
     * 成功后自动广播 GONGFA_MEDITATION 事件（携带 MeditateData）
     */
    static async meditateStart(characterId: number): Promise<ApiResponse<MeditateData>> {
        const res = await HttpClient.post<MeditateData>('/gongfa/meditate/start', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(GongfaEvent.GONGFA_MEDITATION, res.data);
        }
        return res;
    }

    /**
     * 打坐结算：按距上次结算点的完整10分钟单位数发XP（三属性同额），
     * 不满10分钟的零头留到下次结算；今日额度不足时按剩余额度截断
     * 未在打坐 5031；不满一个整单位时 units=0、xp_gained=0（不算错误）
     * 成功后自动广播 GONGFA_MEDITATION 事件（携带 MeditateData）
     */
    static async meditateSettle(characterId: number): Promise<ApiResponse<MeditateData>> {
        const res = await HttpClient.post<MeditateData>('/gongfa/meditate/settle', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(GongfaEvent.GONGFA_MEDITATION, res.data);
        }
        return res;
    }

    /**
     * 结束打坐：后端先做最后一次结算再把状态归零（返回 status=0）
     * 未在打坐 5031
     * 成功后自动广播 GONGFA_MEDITATION 事件（携带 MeditateData）
     */
    static async meditateEnd(characterId: number): Promise<ApiResponse<MeditateData>> {
        const res = await HttpClient.post<MeditateData>('/gongfa/meditate/end', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(GongfaEvent.GONGFA_MEDITATION, res.data);
        }
        return res;
    }

    /**
     * 杀怪经验入账：最终XP = 怪物基础XP × 等级差倍率 × 多修倍率 × 伤害占比
     *   - monsterStage 怪物阶段1-8；monsterType 类型1-5（普通/精英/Boss/妖/神兽）
     *   - monsterLevel 怪物等级；damageRatio 组队伤害占比（不传按 1.0 单人独享）
     * 【事件说明】本接口由战斗结算流程调用（不是面板交互），功法面板不订阅其结果，
     * 因此不广播事件，避免出现"只有生产者没有消费者"的孤儿事件；
     * 调用方如需刷新界面，请在成功后自行调用 GongfaApi.list()
     */
    static async killExp(
        characterId: number,
        monsterStage: number,
        monsterType: number,
        monsterLevel: number,
        damageRatio: number = 1.0,
    ): Promise<ApiResponse<KillExpData>> {
        return HttpClient.post<KillExpData>('/gongfa/exp/kill', {
            character_id: characterId,
            monster_stage: monsterStage,
            monster_type: monsterType,
            monster_level: monsterLevel,
            damage_ratio: damageRatio,
        });
    }
}
