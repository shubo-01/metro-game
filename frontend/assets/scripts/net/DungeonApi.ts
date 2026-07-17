/**
 * 寻仙 - 花果山副本 & 牢结值 API 客户端
 * 
 * 说明:
 *   - 严格对齐 dungeon-service (端口 8007) 的 REST 接口
 *   - 严格按照《寻仙-花果山副本设计文档 V3》和《花果山副本技术方案》定义
 *   - HttpClient 会自动根据 /dungeon/* /fatigue/* 前缀路由到副本服务
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';

// ═══════════════════════════════════════════
//  枚举定义（与后端保持一致）
// ═══════════════════════════════════════════

/** 花果山六种身份 */
export enum HgsRoleType {
    Wukong  = 1,   // 孙悟空（0.01基础概率）
    Mowang  = 2,   // 混世魔王（0.09基础概率）
    Shouxa  = 3,   // 魔王手下（0.30基础概率）
    Monkey  = 4,   // 普通猴子（0.35基础概率）
    OldMon  = 5,   // 老猴子（0.10基础概率）
    Grass   = 6,   // 草木石头（0.15基础概率）
}

/** 副本结局 */
export enum HgsOutcome {
    InProgress  = 0,
    Win         = 1,   // 完胜（大圣）
    Hurt        = 2,   // 受伤（大圣）
    Dead        = 3,   // 死亡
    Survive     = 4,   // 生存成功
    Observe     = 5,   // 观测完成（草木石头）
    StoryDeath  = 6,   // 剧情死亡（魔王撑满5分钟）
}

/** 观测事件代号 */
export enum HgsObserveEvent {
    WukongUltimate = 'wukong_ultimate',   // 大圣大招 +10
    MowangSummon   = 'mowang_summon',     // 魔王召唤 +5
    MowangBurst    = 'mowang_burst',      // 魔王爆绝招 +10
    MowangDeath    = 'mowang_death',      // 魔王死亡 +15
}

/** 身份类型 → 中文名 */
export const HgsRoleName: Record<number, string> = {
    [HgsRoleType.Wukong]: '孙悟空',
    [HgsRoleType.Mowang]: '混世魔王',
    [HgsRoleType.Shouxa]: '魔王手下',
    [HgsRoleType.Monkey]: '普通猴子',
    [HgsRoleType.OldMon]: '老猴子',
    [HgsRoleType.Grass]:  '草木石头',
};

// ═══════════════════════════════════════════
//  接口响应数据类型
// ═══════════════════════════════════════════

/** 单个身份的概率条目 */
export interface RoleProbEntry {
    role_type: number;
    role_name: string;
    base_prob: number;
    final_prob: number;
}

/** 概率预览响应 */
export interface ProbsPreviewData {
    luck: number;
    probs: RoleProbEntry[];
}

/** 进入副本响应 */
export interface EnterDungeonData {
    session_id: number;
    role_type: number;
    role_name: string;
    luck: number;
    scene_id: number;
    max_duration: number;
    remaining_sec: number;
    probs: Record<number, number>; // role_type → prob
}

/** 观测事件响应 */
export interface ObserveEventData {
    observe_score: number;
    event_code: string;
    bonus: number;
}

/** 结算响应中的单条奖励 */
export interface RewardEntry {
    item_id: number;
    item_type: number;
    quantity: number;
    is_unique?: number;
}

/** 结算响应 */
export interface SettleData {
    session_id: number;
    role_type: number;
    role_name: string;
    outcome: number;
    grade: string;         // S/A/B/C/D
    duration_sec: number;
    observe_score: number;
    death_text: string;
    comment_text: string;
    rewards: RewardEntry[];
}

/** 会话信息（断线重连用） */
export interface SessionInfoData {
    session_id: number;
    role_type: number;
    role_name: string;
    outcome: number;
    grade: string;
    elapsed_sec: number;
    remaining_sec: number;
    observe_score: number;
    is_in_progress: boolean;
}

/** 牢结值状态 */
export interface FatigueStateData {
    player_id: number;
    remaining_sec: number;
    daily_max_sec: number;
    is_penalty: boolean;
    is_meditating: boolean;
    next_reset_time: string;
}

// ═══════════════════════════════════════════
//  DungeonApi
// ═══════════════════════════════════════════

export class DungeonApi {
    // ── 花果山副本 ──

    /** 副本入口概率预览（不消耗资源） */
    static async previewProbs(playerId: number): Promise<ApiResponse<ProbsPreviewData>> {
        return HttpClient.get<ProbsPreviewData>('/dungeon/huaguoshan/probs', { player_id: String(playerId) });
    }

    /** 进入副本，服务端随机分配身份 */
    static async enterDungeon(playerId: number, enterX: number, enterY: number): Promise<ApiResponse<EnterDungeonData>> {
        return HttpClient.post<EnterDungeonData>('/dungeon/huaguoshan/enter', {
            player_id: playerId,
            enter_x: enterX,
            enter_y: enterY,
        });
    }

    /** 上报观测事件（仅草木石头身份需要） */
    static async reportObserve(sessionId: number, playerId: number, eventCode: HgsObserveEvent | string): Promise<ApiResponse<ObserveEventData>> {
        return HttpClient.post<ObserveEventData>('/dungeon/huaguoshan/observe', {
            session_id: sessionId,
            player_id: playerId,
            event_code: eventCode,
        });
    }

    /** 结算副本 */
    static async settle(params: {
        sessionId: number;
        playerId: number;
        selfHpLeft: number;
        bossHpLeft?: number;
        killedByBoss?: boolean;
        storyDeath?: boolean;
    }): Promise<ApiResponse<SettleData>> {
        return HttpClient.post<SettleData>('/dungeon/huaguoshan/settle', {
            session_id:      params.sessionId,
            player_id:       params.playerId,
            self_hp_left:    params.selfHpLeft,
            boss_hp_left:    params.bossHpLeft ?? 0,
            killed_by_boss:  params.killedByBoss ?? false,
            story_death:     params.storyDeath ?? false,
        });
    }

    /** 查询会话状态（断线重连用） */
    static async getSession(sessionId: number, playerId: number): Promise<ApiResponse<SessionInfoData>> {
        return HttpClient.get<SessionInfoData>('/dungeon/huaguoshan/session', {
            session_id: String(sessionId),
            player_id:  String(playerId),
        });
    }

    // ── 牢结值系统 ──

    /** 查询牢结值 */
    static async getFatigue(playerId: number): Promise<ApiResponse<FatigueStateData>> {
        return HttpClient.get<FatigueStateData>('/fatigue/state', { player_id: String(playerId) });
    }

    /** 消耗牢结值（心跳上报） */
    static async consumeFatigue(playerId: number, consumeSec: number): Promise<ApiResponse<{ remaining_sec: number; is_penalty: boolean }>> {
        return HttpClient.post('/fatigue/consume', {
            player_id: playerId,
            consume_sec: consumeSec,
        });
    }

    /** 开始打坐（1:2 恢复） */
    static async startMeditate(playerId: number): Promise<ApiResponse<{ meditate_start: string }>> {
        return HttpClient.post('/fatigue/meditate/start', { player_id: playerId });
    }

    /** 结束打坐 */
    static async endMeditate(playerId: number): Promise<ApiResponse<{
        meditate_sec: number;
        recover_sec: number;
        remaining_sec: number;
        is_penalty: boolean;
    }>> {
        return HttpClient.post('/fatigue/meditate/end', { player_id: playerId });
    }

    /** 使用恢复道具 */
    static async useItem(playerId: number, itemId: number, recoverSec: number): Promise<ApiResponse<{
        remaining_sec: number;
        recover_sec: number;
    }>> {
        return HttpClient.post('/fatigue/item/use', {
            player_id: playerId,
            item_id: itemId,
            recover_sec: recoverSec,
        });
    }
}
