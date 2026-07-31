/**
 * 寻仙 - V5 轮回夺舍系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 death-service (端口 8006) 的 /death/ 前缀 V5 新接口
 *   - 涵盖：死亡触发三选一（含尸修入口与夺舍提示）、尸修进入/退出、
 *     天雷懒结算检查、秘境设立/更新、秘境继承（四种领取方式）
 *   - HttpClient 会自动根据 /death/ 前缀路由到死亡服务 8006，
 *     并自动附带 X-Account-ID 请求头（尸修/天雷接口做归属校验：401未认证/403非本人）
 *   - 后端实现见 backend/internal/death/（handler_v5.go / service.go）
 *   - 接口成功（code===0 且有 data）后由本封装层自动广播对应 SamsaraEvent
 *     事件并携带响应 data，UI（CorpseCultivationUI/SecretRealmPanel/HallScene）只需监听
 *
 * 【与既有死亡流程的关系】旧的死亡三选一（DeathChoiceUI）走 /death/reincarnation
 * 与 /death/ghost/enter，本文件只补 V5 新增的尸修/天雷/秘境接口，不重复封装旧接口
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { SamsaraEvent } from '../common/Constants';

// ═══════════════════════════════════════════
//  业务错误码（与后端 handler_v5.go / service.go 保持一致）
// ═══════════════════════════════════════════

/** 尸修与鬼修互斥（已是鬼修不能再入尸修） */
export const ERR_CORPSE_GHOST_CONFLICT = 6101;
/** 已在尸修状态，不能重复进入 */
export const ERR_CORPSE_ALREADY_IN = 6102;
/** 秘境密码错误 */
export const ERR_RUIN_PASSWORD_WRONG = 6201;
/** 强破门槛不足（攻击力未达 break_threshold） */
export const ERR_RUIN_BREAK_NOT_ENOUGH = 6202;
/** 秘境已被开启/掠夺 */
export const ERR_RUIN_ALREADY_OPENED = 6203;

/** 轮回夺舍业务错误码 → 中文兜底文案（msg 为空时展示） */
export const SamsaraErrorText: Record<number, string> = {
    [ERR_CORPSE_GHOST_CONFLICT]: '鬼修状态下不能转入尸修（两者互斥）',
    [ERR_CORPSE_ALREADY_IN]: '已在尸修状态，不能重复进入',
    [ERR_RUIN_PASSWORD_WRONG]: '秘境密码错误',
    [ERR_RUIN_BREAK_NOT_ENOUGH]: '攻击力不足，无法强破秘境禁制',
    [ERR_RUIN_ALREADY_OPENED]: '该秘境已被开启，宝物已被取走',
};

// ═══════════════════════════════════════════
//  接口响应数据类型（字段与后端 json tag 一一对应）
// ═══════════════════════════════════════════

/** 死亡三选一选项（/death/trigger 响应 options 数组一项） */
export interface DeathOption {
    key: string;            // reincarnation / ghost_cultivation / corpse_cultivation
    name: string;           // 中文名：六道轮回 / 鬼修 / 尸修
    api: string;            // 对应的后端接口路径
    desc: string;           // 说明文案（尸修项含属性转换说明）
    can_possess?: boolean;  // 【仅尸修项】false=选尸修即放弃夺舍（机器可读标记）
}

/** 死亡触发响应（POST /death/trigger，V5 扩展字段） */
export interface DeathTriggerData {
    death_type: number;        // 死亡类型：1自由探索死 2魂飞魄散 3夺舍失败
    ruin_id: number;           // 死亡自动设立的秘境ID（已有未掠夺秘境时为0，不重复建）
    ruin_stone: number;        // 自动存入秘境的灵石数（原余额1/3）
    options: DeathOption[];    // 三选一选项列表
    possess_hint: string;      // 夺舍规则速览（死亡弹窗直接展示）
    is_dungeon_death?: boolean; // 【仅副本内死亡】true=被踢出副本无永久惩罚，无三选一
}

/** 精气神三维（尸修属性转换前后对照用） */
export interface JingQiShen {
    jing: number;   // 精
    qi: number;     // 气
    shen: number;   // 神
}

/** 进入尸修响应（POST /death/corpse/enter） */
export interface CorpseEnterData {
    corpse_mode: number;       // 尸修标记（1=已入尸修）
    old_attrs: JingQiShen;     // 转换前精气神
    new_attrs: JingQiShen;     // 转换后精气神（神→0永久，精=原精+神×2/3，气÷3）
    warning: string;           // 后端警示文案（不可夺舍等）
}

/**
 * 天雷懒结算响应（POST /death/thunder/check）：
 *   - 非公敌：只有 is_public_enemy=false
 *   - 公敌未到劫雷时间：triggered=false + remaining_seconds 倒计时
 *   - 公敌劫雷落下：triggered=true + 伤害结算明细（is_fatal=true 时前端走死亡流程）
 * 因此除 is_public_enemy/triggered 外一律声明为可选，读取时需做存在性判断
 */
export interface ThunderCheckData {
    is_public_enemy: boolean;    // 是否公敌（杀气值达标）
    triggered: boolean;          // 本次检查是否落雷
    remaining_seconds?: number;  // 【未落雷】距下次天雷剩余秒数（前端倒计时警告用）
    thunder_count?: number;      // 累计遭雷次数
    damage?: number;             // 【落雷】天雷总伤害
    element?: string;            // 【落雷】天雷五行属性
    shield_absorbed?: number;    // 【落雷】护盾吸收量
    hp_damage?: number;          // 【落雷】血量实际扣减
    shield_broken?: boolean;     // 【落雷】护盾是否被打碎
    is_fatal?: boolean;          // 【落雷】是否致死（true=前端走死亡流程）
    hp_current?: number;         // 【落雷】结算后血量
    shield_current?: number;     // 【落雷】结算后护盾
    next_thunder_at?: string;    // 【落雷】下次天雷时间
}

/** 秘境材料明细（继承/创建响应 materials 数组一项） */
export interface RuinMaterial {
    item_id: number;     // 材料物品ID
    item_type: number;   // 材料类型：1普通 2稀有
    count: number;       // 数量
}

/**
 * 秘境设立/更新响应（POST /death/ruins/create）：
 * updated=true 表示本人已有未掠夺秘境，仅更新密码/禁制/分区设置（无 materials，
 * 不二次划拨资产）；updated=false 表示新建秘境并划拨资产（灵石1/3+材料2/3）
 */
export interface RuinCreateData {
    ruin_id: number;            // 秘境ID
    updated: boolean;           // true=仅更新已有秘境设置 / false=新建并划拨资产
    stone_amount: number;       // 秘境内灵石数
    break_threshold: number;    // 强破门槛（按死亡时境界算的100级裸装攻击力）
    has_password: boolean;      // 是否设了密码
    restriction_level: number;  // 禁制等级 0-9（老字段保留）
    zone_id: number;            // 所在分区
    expires_in_days: number;    // 过期天数（7天后可 expired_loot 拾取）
    materials?: RuinMaterial[]; // 【仅新建】划入秘境的材料快照
}

/**
 * 秘境继承响应（POST /death/ruins/inherit）：
 * method 四种领取方式：
 *   - owner_inherit：本人转世后凭本尊身份继承（全额）
 *   - password_open：他人凭密码开启
 *   - expired_loot：过期(7天)后任何人拾取
 *   - force_break：他人凭攻击力强破禁制
 */
export interface RuinInheritData {
    method: string;             // 领取方式（见上）
    spirit_stone: number;       // 获得的灵石数
    materials: RuinMaterial[];  // 获得的材料列表
    is_owner: boolean;          // 是否秘境本尊（转世继承）
}

// ═══════════════════════════════════════════
//  SamsaraApi
// ═══════════════════════════════════════════

export class SamsaraApi {

    /**
     * 触发死亡（战斗死亡/天雷致死时调用）：
     * 后端标记死亡状态 + 自动设立秘境（本人已有未掠夺秘境时不重复建，ruin_id=0），
     * 返回三选一选项（六道轮回/鬼修/尸修）+ 夺舍规则速览 possess_hint
     * 成功后自动广播 DEATH_OPTIONS_UPDATED 事件（携带 DeathTriggerData），
     * CorpseCultivationUI 监听后渲染死亡三选一弹窗
     * @param deathType 1=自由探索死 2=魂飞魄散 3=夺舍失败
     * @param x/y 死亡地点坐标（米），秘境按此坐标定位分区
     */
    static async trigger(characterId: number, deathType: number, x: number, y: number, isDungeon: boolean = false): Promise<ApiResponse<DeathTriggerData>> {
        const res = await HttpClient.post<DeathTriggerData>('/death/trigger', {
            character_id: characterId,
            death_type: deathType,
            is_dungeon: isDungeon,
            location_x: Math.round(x),
            location_y: Math.round(y),
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SamsaraEvent.DEATH_OPTIONS_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 进入尸修（死亡三选一之一）：神→0永久，精=原精+神×2/3，气÷3，且【放弃夺舍资格】
     * 6101 与鬼修互斥 / 6102 重复进入
     * 需 X-Account-ID 请求头（HttpClient 自动附带）：401未认证 / 403非本人
     * 成功后自动广播 CORPSE_ENTERED 事件（携带 CorpseEnterData 属性转换前后对照）
     */
    static async corpseEnter(characterId: number): Promise<ApiResponse<CorpseEnterData>> {
        const res = await HttpClient.post<CorpseEnterData>('/death/corpse/enter', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SamsaraEvent.CORPSE_ENTERED, res.data);
        }
        return res;
    }

    /**
     * 退出尸修（成功仅返回 msg，无 data）
     * 需 X-Account-ID 请求头（HttpClient 自动附带）：401未认证 / 403非本人
     * 成功后自动广播 CORPSE_EXITED 事件（无携带数据）
     */
    static async corpseExit(characterId: number): Promise<ApiResponse<any>> {
        const res = await HttpClient.post<any>('/death/corpse/exit', {
            character_id: characterId,
        });
        if (res.code === 0) {
            EventManager.emit(SamsaraEvent.CORPSE_EXITED);
        }
        return res;
    }

    /**
     * 天雷懒结算检查（后端无定时器，由前端在登录时与定时轮询时调用）：
     *   - 非公敌直接返回 is_public_enemy=false
     *   - 公敌未到时间：triggered=false + remaining_seconds 倒计时（前端警告横幅）
     *   - 到点落雷：triggered=true + 伤害明细，is_fatal=true 时前端走死亡流程
     * 需 X-Account-ID 请求头（HttpClient 自动附带）：401未认证 / 403非本人
     * 成功后自动广播 THUNDER_CHECKED 事件（携带 ThunderCheckData），
     * HallScene 监听后做天雷警告/掉血演出/死亡跳转
     * @param isLogin true=登录时首查（后端补算离线期间积欠的天雷）
     */
    static async thunderCheck(characterId: number, isLogin: boolean): Promise<ApiResponse<ThunderCheckData>> {
        const res = await HttpClient.post<ThunderCheckData>('/death/thunder/check', {
            character_id: characterId,
            is_login: isLogin,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SamsaraEvent.THUNDER_CHECKED, res.data);
        }
        return res;
    }

    /**
     * 设立/更新秘境（夺舍前必须先设立秘境）：
     *   - 本人已有未掠夺秘境：仅更新密码/禁制/分区（data.updated=true，不二次划拨资产）
     *   - 没有：新建并划拨资产（灵石1/3+普通稀有材料2/3，data.updated=false 含 materials）
     * 成功后自动广播 RUIN_CREATED 事件（携带 RuinCreateData）
     * @param password 秘境密码（可中文，最多约20个汉字，空串=不设密码）
     * @param restrictionLevel 禁制等级 0-9（老字段保留）
     */
    static async ruinsCreate(characterId: number, x: number, y: number, zoneId: number, password: string, restrictionLevel: number): Promise<ApiResponse<RuinCreateData>> {
        const res = await HttpClient.post<RuinCreateData>('/death/ruins/create', {
            character_id: characterId,
            location_x: Math.round(x),
            location_y: Math.round(y),
            zone_id: zoneId,
            password,
            restriction_level: restrictionLevel,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SamsaraEvent.RUIN_CREATED, res.data);
        }
        return res;
    }

    /**
     * 秘境继承/开启/强破（四种 method 由服务端判定返回）：
     *   - 本人转世 → owner_inherit 全额继承
     *   - 他人对密码 → password_open（密码错 6201）
     *   - 过期7天 → expired_loot 任何人可拾取
     *   - 强破禁制 → force_break（攻击力 breakAtk 未达门槛 6202）
     * 已被开启 6203
     * 【强破参数说明】新秘境强破判定用 break_atk（当前攻击力）对比 break_threshold；
     * break_level 仅老数据（无 break_threshold 的旧秘境）回退用，正常调用两个都传
     * 成功后自动广播 RUIN_INHERITED 事件（携带 RuinInheritData）
     */
    static async ruinsInherit(ruinId: number, characterId: number, password: string, breakAtk: number, breakLevel: number = 0): Promise<ApiResponse<RuinInheritData>> {
        const res = await HttpClient.post<RuinInheritData>('/death/ruins/inherit', {
            ruin_id: ruinId,
            character_id: characterId,
            password,
            break_atk: breakAtk,
            break_level: breakLevel,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SamsaraEvent.RUIN_INHERITED, res.data);
        }
        return res;
    }
}
