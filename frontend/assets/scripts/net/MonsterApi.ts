/**
 * 寻仙 - 初始之地野怪系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 monster-service (端口 8008) 的 REST 接口
 *   - 严格按照《寻仙 - 初始之地野怪系统 PRD+技术方案》定义
 *   - HttpClient 会自动根据 /monster/* /capture/* 前缀路由到野怪服务
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';

// ═══════════════════════════════════════════
//  枚举定义（与后端保持一致）
// ═══════════════════════════════════════════

/** 怪物类型 */
export enum MonsterType {
    Normal    = 1,   // 普通怪（单修）
    Elite     = 2,   // 精英怪（双修）
    Boss      = 3,   // Boss怪（三修）
    Yao       = 4,   // 妖（四修）
    YaoCub    = 5,   // 妖幼崽（可抓捕，600s CD刷新）
    Divine    = 6,   // 神兽（五修，全服唯一）
    DivineCub = 7,   // 神兽幼崽（可抓捕，全服唯一不刷新）
}

/** 怪物状态 */
export enum MonsterState {
    Idle     = 0,   // 待机
    Patrol   = 1,   // 巡逻
    Combat   = 2,   // 战斗
    Dead     = 3,   // 死亡（等待复活）
    Captured = 4,   // 已被抓捕
}

/** 五行属性（与人物系统一致） */
export enum WuxingElement {
    Jin  = 1,   // 金
    Mu   = 2,   // 木
    Shui = 3,   // 水
    Huo  = 4,   // 火
    Tu   = 5,   // 土
}

/** 抓捕道具品质 */
export enum CaptureItemQuality {
    Common    = 1,   // 普通 ×1.0
    Rare      = 2,   // 稀有 ×1.5
    Legendary = 3,   // 传说 ×2.0
}

/** 怪物类型 → 中文名 */
export const MonsterTypeName: Record<number, string> = {
    [MonsterType.Normal]:    '普通怪',
    [MonsterType.Elite]:     '精英怪',
    [MonsterType.Boss]:      'Boss',
    [MonsterType.Yao]:       '妖',
    [MonsterType.YaoCub]:    '妖幼崽',
    [MonsterType.Divine]:    '神兽',
    [MonsterType.DivineCub]: '神兽幼崽',
};

/** 五行 → 中文名 */
export const WuxingName: Record<number, string> = {
    [WuxingElement.Jin]:  '金',
    [WuxingElement.Mu]:   '木',
    [WuxingElement.Shui]: '水',
    [WuxingElement.Huo]:  '火',
    [WuxingElement.Tu]:   '土',
};

// ═══════════════════════════════════════════
//  接口响应数据类型
// ═══════════════════════════════════════════

/** 领地信息 */
export interface TerritoryInfo {
    territory_id: number;
    name: string;
    center_x: number;
    center_y: number;
    radius: number;
}

/** 族群信息 */
export interface FactionInfo {
    faction_id: number;
    territory_id: number;
    species_id: number;
    species_name: string;
    faction_group: number;
}

/** 怪物实体信息 */
export interface MonsterEntityInfo {
    entity_id: number;
    faction_id: number;
    type: number;        // MonsterType
    tier: number;        // 阶位
    element: number;     // WuxingElement
    state: number;       // MonsterState
    hp: number;
    max_hp: number;
    atk: number;
    def: number;
    spd: number;
    pos_x: number;
    pos_y: number;
}

/** 神兽状态信息 */
export interface DivineStatusInfo {
    faction_group: number;
    entity_id: number;
    species_name: string;
    is_captured: boolean;
    cub_entity_id: number;
    cub_captured: boolean;
}

/** 协战倍率计算结果 */
export interface CoopCalcData {
    surround_count: number;    // 有效围攻数量
    same_element: boolean;     // 是否全同属性
    is_sheng_cycle: boolean;   // 是否构成五行相生链
    manman_paired: boolean;    // 是否触发蛮蛮成对翻倍
    coop_multiplier: number;   // 最终协战伤害倍率
}

/** 怪物受击结果 */
export interface MonsterHitData {
    hp: number;
    max_hp: number;
    is_dead: boolean;
    hp_percent: number;
}

/** 抓捕结果 */
export interface CaptureAttemptData {
    success: boolean;
    capture_rate: number;
    hp_percent: number;
}

// ═══════════════════════════════════════════
//  V5 新增：地图分区怪物 + 神兽NPC（白泽/朱厌）
// ═══════════════════════════════════════════

/** 神兽NPC不存在（/monster/divine-npc/hit 业务错误码） */
export const ERR_DIVINE_NPC_NOT_FOUND = 6021;

/**
 * 神兽NPC状态信息（GET /monster/divine-npc/status 响应 divine_npcs 数组一项）
 * V5 白泽(Zone2)/朱厌(Zone3)：平时沉睡不还手，10秒内连击10次将其唤醒，
 * 唤醒后30秒暴走反击（大罗金妖仙99级，基本必死）
 */
export interface DivineNpcInfo {
    npc_id: number;          // NPC ID：1白泽 2朱厌
    name: string;            // 名称
    zone_id: number;         // 所在分区
    pos_x: number;           // X坐标（米）
    pos_y: number;           // Y坐标（米）
    realm_desc: string;      // 境界描述（大罗金妖仙）
    level: number;           // 等级（99）
    state: number;           // 状态：0沉睡 1暴走
    wake_progress: number;   // 当前连击窗口内累计次数
    wake_threshold: number;  // 唤醒阈值（10次）
    awake_remain_s: number;  // 【暴走中】剩余暴走秒数
    kill_count: number;      // 该神兽累计击杀玩家数
}

/** 攻击神兽NPC响应（POST /monster/divine-npc/hit） */
export interface DivineNpcHitData {
    npc_id: number;          // NPC ID
    name: string;            // 名称
    state: number;           // 攻击后状态：0沉睡 1暴走
    wake_progress: number;   // 连击窗口内累计次数
    wake_threshold: number;  // 唤醒阈值
    awakened: boolean;       // 本次攻击是否触发唤醒（true=开始30秒暴走）
    killed: boolean;         // 玩家是否被神兽反杀（true=前端走死亡流程）
    awake_remain_s: number;  // 剩余暴走秒数
}

// ═══════════════════════════════════════════
//  API 客户端
// ═══════════════════════════════════════════

export class MonsterApi {
    /** 领地列表（100块外围领地） */
    static territories(): Promise<ApiResponse<{ territories: TerritoryInfo[] }>> {
        return HttpClient.get('/monster/territories');
    }

    /** 查询指定领地的族群信息 */
    static faction(territoryId: number): Promise<ApiResponse<FactionInfo>> {
        return HttpClient.get('/monster/faction', { territory_id: String(territoryId) });
    }

    /** 查询族群怪物实体列表（服务端懒刷新复活/妖幼崽CD） */
    static monsterList(factionId: number): Promise<ApiResponse<{ monsters: MonsterEntityInfo[] }>> {
        return HttpClient.get('/monster/list', { faction_id: String(factionId) });
    }

    /**
     * 【V5】按地图分区查询怪物列表（小地图红点数据源）：
     * 后端 /monster/list 兼容 zone_id 与 faction_id 两种查询参数（至少传一个），
     * 本方法走 zone_id 口径，返回该分区内全部存活怪物
     */
    static monsterListByZone(zoneId: number): Promise<ApiResponse<{ monsters: MonsterEntityInfo[] }>> {
        return HttpClient.get('/monster/list', { zone_id: String(zoneId) });
    }

    /**
     * 【V5】神兽NPC（白泽/朱厌）状态列表：沉睡/暴走状态 + 唤醒进度 + 击杀数
     * 小地图绿点与神兽交互提示的数据源
     */
    static divineNpcStatus(): Promise<ApiResponse<{ divine_npcs: DivineNpcInfo[] }>> {
        return HttpClient.get('/monster/divine-npc/status');
    }

    /**
     * 【V5】攻击神兽NPC：沉睡时不还手只累计连击（10秒窗口内攒满10次唤醒），
     * awakened=true 表示本次触发唤醒（30秒暴走），killed=true 表示玩家被反杀
     * （调用方须走死亡流程 SamsaraApi.trigger）。6021 NPC不存在
     */
    static divineNpcHit(playerId: number, npcId: number): Promise<ApiResponse<DivineNpcHitData>> {
        return HttpClient.post('/monster/divine-npc/hit', { player_id: playerId, npc_id: npcId });
    }

    /** 全服20只神兽状态（唯一性展示） */
    static divineStatus(): Promise<ApiResponse<{ divines: DivineStatusInfo[] }>> {
        return HttpClient.get('/monster/divine/status');
    }

    /**
     * 协战围攻倍率计算（服务端权威）
     * @param playerId 玩家ID
     * @param entityIds 围攻玩家的怪物实体ID列表
     */
    static coopCalc(playerId: number, entityIds: number[]): Promise<ApiResponse<CoopCalcData>> {
        return HttpClient.post('/monster/coop/calc', { player_id: playerId, entity_ids: entityIds });
    }

    /** 怪物受击扣血（服务端结算，死亡自动记录复活CD） */
    static hit(playerId: number, entityId: number, damage: number): Promise<ApiResponse<MonsterHitData>> {
        return HttpClient.post('/monster/hit', { player_id: playerId, entity_id: entityId, damage });
    }

    /**
     * 抓捕妖幼崽/神兽幼崽（目标血量须≤30%）
     * @param itemQuality 抓捕道具品质：1普通 2稀有 3传说
     */
    static captureAttempt(playerId: number, entityId: number, itemQuality: number): Promise<ApiResponse<CaptureAttemptData>> {
        return HttpClient.post('/capture/attempt', {
            player_id: playerId, entity_id: entityId, item_quality: itemQuality,
        });
    }

    /** 世界初始化（管理接口，幂等） */
    static adminInitWorld(): Promise<ApiResponse<any>> {
        return HttpClient.post('/monster/admin/init_world', {});
    }
}
