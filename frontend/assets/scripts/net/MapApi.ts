/**
 * 寻仙 - V5 地图系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 scene-service (端口 8003) 的 /scene/ 前缀 V5 新接口
 *   - 涵盖：地图分区配置查询、进入分区、采集、移动限速/出界校验
 *   - HttpClient 会自动根据 /scene/ 前缀路由到场景服务 8003
 *   - 后端实现见 backend/internal/scene/zone.go
 *   - 接口成功（code===0 且有 data）后由本封装层自动广播对应 MapEvent
 *     事件并携带响应 data，UI（MinimapUI/HallScene）只需监听、无需自行 emit
 *
 * 【坐标单位】本文件所有接口的 x/y 均为"米"（世界 1800×1200 米）；
 * 前端场景像素坐标须先经 MapConfig.pxToMeter 换算再传参，禁止直接传像素值
 *
 * 【采集点镜像表】后端没有"采集点列表"查询接口，采集点是 SQL 种子配置
 * （sql/migrations/v5_battle_map_samsara.sql 的 gather_point_config 表），
 * 前端在本文件镜像一份常量用于小地图金点渲染与"靠近采集点弹按钮"判定；
 * 采集成败/CD/距离的权威判定仍在后端 /scene/gather
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { MapEvent } from '../common/Constants';

// ═══════════════════════════════════════════
//  业务错误码（与后端 zone.go 保持一致）
// ═══════════════════════════════════════════

/** 分区不存在 / 目标点不在任何分区内（边界外） */
export const ERR_ZONE_NOT_FOUND = 6001;
/** 位置非法：出界或落在禁区（空气墙） */
export const ERR_ZONE_ILLEGAL_POS = 6002;
/** 采集点不存在 */
export const ERR_GATHER_POINT_NOT_FOUND = 6011;
/** 采集CD中（data 附 remaining_seconds） */
export const ERR_GATHER_IN_CD = 6012;
/** 移动超速（data 附 correct_x/correct_y 回正坐标） */
export const ERR_MOVE_TOO_FAST = 6013;
/** 距离采集点超过5米 */
export const ERR_GATHER_TOO_FAR = 6014;

/** 地图业务错误码 → 中文兜底文案（msg 为空时展示） */
export const MapErrorText: Record<number, string> = {
    [ERR_ZONE_NOT_FOUND]: '前方已是世界边缘，无法通行',
    [ERR_ZONE_ILLEGAL_POS]: '前方是禁区，无法通行',
    [ERR_GATHER_POINT_NOT_FOUND]: '采集点不存在',
    [ERR_GATHER_IN_CD]: '该采集点冷却中，请稍后再来',
    [ERR_MOVE_TOO_FAST]: '移动过快，位置已回正',
    [ERR_GATHER_TOO_FAR]: '距离太远，请靠近采集点（5米内）',
};

// ═══════════════════════════════════════════
//  接口响应数据类型（字段与后端 json tag 一一对应）
// ═══════════════════════════════════════════

/** 分区矩形配置（map_zone_config 表一行，坐标单位：米） */
export interface ZoneRect {
    zone_id: number;         // 分区ID：1新手营地 2外围原野 3深处峡谷
    name: string;            // 分区名称
    x_min: number;           // 左边界（米）
    y_min: number;           // 下边界（米）
    x_max: number;           // 右边界（米）
    y_max: number;           // 上边界（米）
    is_safe_zone: boolean;   // 是否安全区（怪物不入侵）
    aura_percent: number;    // 灵气浓度加成百分比
    rec_level_min: number;   // 推荐等级下限
    rec_level_max: number;   // 推荐等级上限
    desc: string;            // 分区说明
}

/** 禁区矩形（map_forbidden_area 表一行，空气墙，坐标单位：米） */
export interface ForbiddenArea {
    area_id: number;   // 禁区ID
    zone_id: number;   // 所属分区ID
    name: string;      // 禁区名称（如"峡谷北崖"）
    x_min: number;     // 左边界（米）
    y_min: number;     // 下边界（米）
    x_max: number;     // 右边界（米）
    y_max: number;     // 上边界（米）
}

/** 移动规则（服务端限速配置） */
export interface MoveRule {
    base_speed: number;        // 基础移速（米/秒，5）
    speed_bonus_cap: number;   // 加速上限（0.5=+50%）
    max_speed: number;         // 封顶速度（米/秒，7.5）
}

/** 分区配置响应（GET /scene/zone/info） */
export interface ZoneInfoData {
    zones: ZoneRect[];                 // 全部分区
    forbidden_areas: ForbiddenArea[];  // 全部禁区（空气墙）
    move_rule: MoveRule;               // 移动限速规则
}

/** 进入分区响应（POST /scene/zone/enter） */
export interface ZoneEnterData {
    zone_id: number;         // 进入的分区ID
    name: string;            // 分区名称
    is_safe_zone: boolean;   // 是否安全区
    aura_percent: number;    // 灵气浓度加成
    rec_level_min: number;   // 推荐等级下限
    rec_level_max: number;   // 推荐等级上限
    seamless: boolean;       // 无缝切换标记（true=不加载新场景）
}

/**
 * 采集响应（POST /scene/gather）：
 * success=false 表示读条成功但产出判定失败（灵矿0.30概率），不算业务错误
 */
export interface GatherData {
    success: boolean;       // 产出判定是否成功（碎灵矿有30%概率）
    item_id: number;        // 产出物品ID（失败时为0）
    item_name: string;      // 产出物品名称
    quality: number;        // 品质：1凡品 2珍品 3灵品
    quantity: number;       // 产出数量
    channel_s: number;      // 读条秒数（3秒，前端演出用）
    gather_cd_s: number;    // 该点采集CD秒数（300秒）
    remaining_seconds?: number;  // 【仅6012 CD中】剩余冷却秒数
}

/**
 * 移动校验响应（POST /scene/move/validate）：
 *   - 成功（code===0）：valid=true + 所在分区 + 限速值
 *   - 6013 超速 / 6002 出界禁区：valid=false + 回正坐标（米），前端须把玩家拉回
 */
export interface MoveValidateData {
    valid: boolean;        // 本次移动是否合法
    zone_id?: number;      // 【成功】当前所在分区ID
    max_speed?: number;    // 服务端封顶速度（米/秒）
    correct_x?: number;    // 【6013/6002】回正X坐标（米）
    correct_y?: number;    // 【6013/6002】回正Y坐标（米）
}

// ═══════════════════════════════════════════
//  采集点镜像表（gather_point_config 种子数据，坐标单位：米）
//  仅用于前端渲染与靠近判定，权威判定在后端 /scene/gather
// ═══════════════════════════════════════════

/** 采集点静态配置（镜像后端 SQL 种子，勿凭感觉改坐标） */
export interface GatherPointConfig {
    point_id: number;        // 采集点ID
    zone_id: number;         // 所属分区
    resource_type: number;   // 资源类型：1草药 2铁矿 3灵矿
    item_id: number;         // 产出物品ID
    item_name: string;       // 产出物品名
    quality: number;         // 品质：1凡品 2珍品 3灵品
    x: number;               // X坐标（米）
    y: number;               // Y坐标（米）
}

/** 全部42个采集点（Zone2：草药15+铁矿9；Zone3：灵草9+精铁6+碎灵矿3） */
export const GatherPoints: GatherPointConfig[] = [
    // ── Zone2 草药点15个（灰绿草/枯根交替，凡品） ──
    { point_id: 101, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 100, y: 100 },
    { point_id: 102, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 250, y: 150 },
    { point_id: 103, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 700, y: 120 },
    { point_id: 104, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 880, y: 200 },
    { point_id: 105, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 150, y: 350 },
    { point_id: 106, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 320, y: 300 },
    { point_id: 107, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 750, y: 380 },
    { point_id: 108, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 900, y: 450 },
    { point_id: 109, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 120, y: 600 },
    { point_id: 110, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 300, y: 720 },
    { point_id: 111, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 680, y: 650 },
    { point_id: 112, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 850, y: 700 },
    { point_id: 113, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 200, y: 880 },
    { point_id: 114, zone_id: 2, resource_type: 1, item_id: 3002, item_name: '枯根', quality: 1, x: 500, y: 900 },
    { point_id: 115, zone_id: 2, resource_type: 1, item_id: 3001, item_name: '灰绿草', quality: 1, x: 800, y: 920 },
    // ── Zone2 铁矿点9个（碎铁，凡品） ──
    { point_id: 121, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 80, y: 250 },
    { point_id: 122, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 450, y: 100 },
    { point_id: 123, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 920, y: 300 },
    { point_id: 124, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 100, y: 500 },
    { point_id: 125, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 950, y: 550 },
    { point_id: 126, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 250, y: 850 },
    { point_id: 127, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 620, y: 800 },
    { point_id: 128, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 900, y: 850 },
    { point_id: 129, zone_id: 2, resource_type: 2, item_id: 3003, item_name: '碎铁', quality: 1, x: 480, y: 950 },
    // ── Zone3 草药点9个（灵草，珍品） ──
    { point_id: 201, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1050, y: 200 },
    { point_id: 202, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1200, y: 350 },
    { point_id: 203, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1350, y: 250 },
    { point_id: 204, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1500, y: 500 },
    { point_id: 205, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1150, y: 600 },
    { point_id: 206, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1400, y: 700 },
    { point_id: 207, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1600, y: 800 },
    { point_id: 208, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1250, y: 900 },
    { point_id: 209, zone_id: 3, resource_type: 1, item_id: 3004, item_name: '灵草', quality: 2, x: 1550, y: 1000 },
    // ── Zone3 铁矿点6个（精铁，珍品） ──
    { point_id: 221, zone_id: 3, resource_type: 2, item_id: 3005, item_name: '精铁', quality: 2, x: 1100, y: 450 },
    { point_id: 222, zone_id: 3, resource_type: 2, item_id: 3005, item_name: '精铁', quality: 2, x: 1300, y: 550 },
    { point_id: 223, zone_id: 3, resource_type: 2, item_id: 3005, item_name: '精铁', quality: 2, x: 1450, y: 350 },
    { point_id: 224, zone_id: 3, resource_type: 2, item_id: 3005, item_name: '精铁', quality: 2, x: 1650, y: 600 },
    { point_id: 225, zone_id: 3, resource_type: 2, item_id: 3005, item_name: '精铁', quality: 2, x: 1350, y: 850 },
    { point_id: 226, zone_id: 3, resource_type: 2, item_id: 3005, item_name: '精铁', quality: 2, x: 1700, y: 950 },
    // ── Zone3 灵矿点3个（碎灵矿，灵品，产出概率0.30） ──
    { point_id: 241, zone_id: 3, resource_type: 3, item_id: 3006, item_name: '碎灵矿', quality: 3, x: 1600, y: 300 },
    { point_id: 242, zone_id: 3, resource_type: 3, item_id: 3006, item_name: '碎灵矿', quality: 3, x: 1500, y: 900 },
    { point_id: 243, zone_id: 3, resource_type: 3, item_id: 3006, item_name: '碎灵矿', quality: 3, x: 1750, y: 1050 },
];

/** 找出距离(x,y)（米坐标）最近且在 maxDistM 米内的采集点，找不到返回 null */
export function findNearestGatherPoint(xM: number, yM: number, maxDistM: number): GatherPointConfig | null {
    let best: GatherPointConfig | null = null;
    let bestDist = maxDistM;
    for (const p of GatherPoints) {
        const dx = p.x - xM;
        const dy = p.y - yM;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= bestDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

// ═══════════════════════════════════════════
//  MapApi
// ═══════════════════════════════════════════

export class MapApi {

    /**
     * 拉取地图分区配置：全部分区矩形 + 禁区（空气墙）+ 移动限速规则
     * 成功后自动广播 ZONE_INFO_UPDATED 事件（携带 ZoneInfoData 全量数据），
     * MinimapUI 监听后画分区边界，HallScene 监听后缓存禁区做本地预检
     */
    static async zoneInfo(): Promise<ApiResponse<ZoneInfoData>> {
        const res = await HttpClient.get<ZoneInfoData>('/scene/zone/info');
        if (res.code === 0 && res.data) {
            EventManager.emit(MapEvent.ZONE_INFO_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 进入分区（无缝切换，不加载新场景，仅登记+返回分区信息横幅展示）
     * 6001 分区不存在 / 6002 位置非法（出界或禁区）
     * 成功后自动广播 ZONE_ENTERED 事件（携带 ZoneEnterData）
     * @param x/y 玩家当前坐标（米）
     */
    static async zoneEnter(playerId: number, zoneId: number, x: number, y: number): Promise<ApiResponse<ZoneEnterData>> {
        const res = await HttpClient.post<ZoneEnterData>('/scene/zone/enter', {
            player_id: playerId,
            zone_id: zoneId,
            x,
            y,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(MapEvent.ZONE_ENTERED, res.data);
        }
        return res;
    }

    /**
     * 采集（3秒读条由前端演出，读条结束再调本接口领产出）：
     * 6011 采集点不存在 / 6012 CD中（data.remaining_seconds）/ 6014 距离>5米
     * 【注意】code===0 且 data.success===false 表示碎灵矿30%概率判定失败，
     * 不算错误，也照常进入CD，前端提示"未采到"即可
     * 成功后自动广播 MAP_GATHERED 事件（携带 GatherData）
     * @param x/y 玩家当前坐标（米），后端据此做5米距离权威判定
     */
    static async gather(characterId: number, pointId: number, x: number, y: number): Promise<ApiResponse<GatherData>> {
        const res = await HttpClient.post<GatherData>('/scene/gather', {
            character_id: characterId,
            point_id: pointId,
            x,
            y,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(MapEvent.MAP_GATHERED, res.data);
        }
        return res;
    }

    /**
     * 移动校验（HallScene 按 MOVE_VALIDATE_INTERVAL_S 节流调用）：
     * 服务端按两次上报的位移÷时间算速度，超过 max_speed 判 6013 超速，
     * 落在禁区/出界判 6002；两种错误都带 correct_x/correct_y（米），
     * 前端收到后必须把玩家节点拉回该回正坐标（米→像素换算后）
     * 【事件说明】本接口由 HallScene 节流调用且回正逻辑就在调用点处理，
     * 不广播事件，避免出现"只有生产者没有消费者"的孤儿事件
     * @param x/y 玩家当前坐标（米）
     * @param speedBonus 加速buff百分比（0.5=+50%，无buff传0）
     */
    static moveValidate(playerId: number, x: number, y: number, speedBonus: number = 0): Promise<ApiResponse<MoveValidateData>> {
        return HttpClient.post<MoveValidateData>('/scene/move/validate', {
            player_id: playerId,
            x,
            y,
            speed_bonus: speedBonus,
        });
    }
}
