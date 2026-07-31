/**
 * 寻仙 - V6 新手引导 API 客户端
 *
 * 说明:
 *   - 对接 character-service (端口 8005) 的 /character/tutorial 系列接口，
 *     后端实现见 backend/internal/character/handler_ui.go
 *   - 引导为 Zone1 营地极简教程共4步（PRD 4.2）：
 *     1和营地长老对话 → 2前往铁匠铺 → 3装备武器 → 4出营地探索
 *   - 完成条件由前端按 complete_condition 判定后调 advance 上报，
 *     服务端只做顺序权威校验（必须等于当前进度的 next_step，否则 6402）
 *   - 第4步完成时后端在同一事务发奖：灵石×1 + 凡品武器(4101)×1 + 凡品药(4001)×3
 *   - 跳过（skip）不可逆且不发奖励
 *   - 每个接口成功后自动广播对应 TutorialEvent，TutorialSystem 只需监听驱动状态机
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { TutorialEvent } from '../common/Constants';

// ═══════════════════════════════════════════
//  响应数据结构（对齐 handler_ui.go）
// ═══════════════════════════════════════════

/** 单个引导步骤配置（tutorial_step_config 表行，字段对应技术文档 2.2） */
export interface TutorialStepInfo {
    step_id: number;              // 步骤ID（1-4）
    step_type: number;            // 0=对话 1=操作 2=采集 3=战斗
    step_name: string;            // 步骤名称（如"和营地长老对话"）
    highlight_target: string;     // 高亮目标元素ID（npc_elder/joystick/btn_inventory/camp_exit）
    arrow_target: string;         // 箭头指向目标元素ID
    tip_text: string;             // 文字提示
    complete_condition: string;   // 完成条件JSON（如 {"type":"talk","target":"npc_elder"}）
    next_step: number;            // 下一步ID（0=引导结束）
}

/** GET /character/tutorial/status 响应 */
export interface TutorialStatusData {
    is_started: boolean;          // 是否已开始过引导
    current_step: number;         // 当前已完成到第几步（0=未开始）
    next_step: number;            // 下一待做步骤（0=无：已完成/已跳过）
    is_skipped: boolean;          // 是否已跳过（不可逆）
    is_completed: boolean;        // 是否已完成
    dungeon_completed: boolean;   // 副本引导是否完成（扩展字段，本期只透传）
    reward_claimed: boolean;      // 奖励是否已发放
    steps: TutorialStepInfo[];    // 4步配置清单（前端状态机数据源）
}

/** 引导完成奖励（PRD 4.4：灵石1 + 凡品武器4101×1 + 凡品药4001×3） */
export interface TutorialRewards {
    spirit_stone?: number;
    items?: Array<{ item_id: number; name: string; count: number }>;
}

/** POST /character/tutorial/advance 响应（中间步 rewards 为空对象） */
export interface TutorialAdvanceData {
    current_step: number;
    next_step: number;            // 0=引导已全部完成
    is_completed: boolean;
    rewards: TutorialRewards;
}

/** POST /character/tutorial/skip 响应（不可逆、不发奖励） */
export interface TutorialSkipData {
    is_skipped: boolean;
    is_completed: boolean;
    rewards: null;
}

// ═══════════════════════════════════════════
//  业务错误码与提示文案（HTTP 200 但 code!==0）
// ═══════════════════════════════════════════

/** 6402 = 非法跳步（上报的 step_id 不等于当前进度的 next_step） */
export const ERR_TUTORIAL_ILLEGAL_STEP = 6402;
/** 6403 = 引导已完成/已跳过，不能重复推进 */
export const ERR_TUTORIAL_ALREADY_DONE = 6403;

/** 引导业务错误码 → 中文提示 */
export const TutorialErrorText: Record<number, string> = {
    [ERR_TUTORIAL_ILLEGAL_STEP]: '引导步骤顺序不对，请按提示完成当前步骤',
    [ERR_TUTORIAL_ALREADY_DONE]: '引导已结束，无需重复操作',
};

// ═══════════════════════════════════════════
//  TutorialApi
// ═══════════════════════════════════════════

export class TutorialApi {

    /**
     * 拉取引导状态与4步配置清单：登录进大厅后调用一次
     * 成功后自动广播 TUTORIAL_STATUS_UPDATED（携带 TutorialStatusData），
     * TutorialSystem 据此决定是否启动状态机
     */
    static async status(characterId: number): Promise<ApiResponse<TutorialStatusData>> {
        const res = await HttpClient.get<TutorialStatusData>('/character/tutorial/status', {
            character_id: String(characterId),
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(TutorialEvent.TUTORIAL_STATUS_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 上报某一步已完成（前端按 complete_condition 判定后调用）
     * 6402=非法跳步 / 6403=已完成或已跳过；第4步成功时 rewards 携带奖励明细
     * 成功后自动广播 TUTORIAL_ADVANCED（携带 TutorialAdvanceData）
     */
    static async advance(characterId: number, stepId: number): Promise<ApiResponse<TutorialAdvanceData>> {
        const res = await HttpClient.post<TutorialAdvanceData>('/character/tutorial/advance', {
            character_id: characterId,
            step_id: stepId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(TutorialEvent.TUTORIAL_ADVANCED, res.data);
        }
        return res;
    }

    /**
     * 跳过引导（不可逆、不发奖励；后端同时把设置里 tutorial_skipped 置1）
     * 成功后自动广播 TUTORIAL_SKIPPED（携带 TutorialSkipData）
     */
    static async skip(characterId: number): Promise<ApiResponse<TutorialSkipData>> {
        const res = await HttpClient.post<TutorialSkipData>('/character/tutorial/skip', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(TutorialEvent.TUTORIAL_SKIPPED, res.data);
        }
        return res;
    }
}
