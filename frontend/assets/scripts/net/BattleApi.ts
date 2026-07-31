/**
 * 寻仙 - V5 战斗操作层 API 客户端
 *
 * 说明:
 *   - 严格对齐 character-service (端口 8005) 的 /combat/ 前缀 V5 新接口
 *   - 涵盖：技能施放校验（CD/灵力扣减）、护盾懒结算
 *   - HttpClient 会自动根据 /combat/ 前缀路由到角色服务 8005，
 *     并自动附带 X-Account-ID 请求头（两接口都做归属校验：401未认证/403非本人）
 *   - 后端实现见 backend/internal/character/combat_v5.go
 *   - 接口成功（code===0 且有 data）后由本封装层自动广播对应 BattleEvent
 *     事件并携带响应 data，UI（CombatHUDUI）只需监听、无需自行 emit
 *
 * 【重要】/combat/cast 的业务错误（6301 CD中 / 6302 灵力不足）是 HTTP 200 返回的，
 * Promise 会正常 resolve，调用方必须检查 res.code 走错误分支，不能只捕获异常
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { BattleEvent } from '../common/Constants';

// ═══════════════════════════════════════════
//  业务错误码（与后端 combat_v5.go 保持一致）
// ═══════════════════════════════════════════

/** 技能CD中（data 附 cd_remain_s 剩余秒数） */
export const ERR_SKILL_IN_CD = 6301;
/** 灵力不足（data 附 mp_current 当前灵力 / mp_cost 需要灵力） */
export const ERR_MP_NOT_ENOUGH = 6302;

/** 战斗业务错误码 → 中文兜底文案（msg 为空时展示） */
export const BattleErrorText: Record<number, string> = {
    [ERR_SKILL_IN_CD]: '技能冷却中，请稍候',
    [ERR_MP_NOT_ENOUGH]: '灵力不足，无法施放技能',
};

// ═══════════════════════════════════════════
//  接口响应数据类型（字段与后端 json tag 一一对应）
// ═══════════════════════════════════════════

/**
 * 技能施放响应（POST /combat/cast）：
 *   - 成功（code===0）：返回技能信息 + 扣减后灵力 + CD秒数
 *   - 6301（CD中）：data 只有 cd_remain_s
 *   - 6302（灵力不足）：data 只有 mp_current / mp_cost
 * 因此除成功公共字段外一律声明为可选，读取时需做存在性判断
 */
export interface CombatCastData {
    skill_id?: number;          // 【成功】施放的技能ID
    skill_name?: string;        // 【成功】技能名称
    mp_cost?: number;           // 【成功/6302】本次灵力消耗（6302时为需要值）
    mp_current?: number;        // 【成功/6302】扣减后（或当前）灵力
    cooldown_s?: number;        // 【成功】技能CD秒数（前端据此启动遮罩倒计时）
    cd_record_failed?: boolean; // 【成功偶发】CD落库失败标记（技能仍施放成功，仅提示用）
    cd_remain_s?: number;       // 【仅6301】CD剩余秒数（前端据此刷新遮罩）
}

/** 护盾懒结算响应（POST /combat/shield/settle） */
export interface ShieldSettleData {
    shield_current: number;   // 结算后当前护盾值
    shield_max: number;       // 护盾上限
    recovered: number;        // 本次结算恢复量（0=没到恢复条件）
    shield_regen: number;     // 每秒护盾恢复速度（展示用）
    in_combat: boolean;       // 是否仍在战斗中（战斗中不回盾）
    recover_delay: number;    // 脱战后多少秒才开始回盾
}

// ═══════════════════════════════════════════
//  BattleApi
// ═══════════════════════════════════════════

export class BattleApi {

    /**
     * 施放技能（服务端权威校验 CD + 扣灵力）：
     *   - 成功后自动广播 BATTLE_SKILL_CAST 事件（携带 CombatCastData，含 cooldown_s），
     *     CombatHUDUI 监听后启动该技能格子的CD遮罩倒计时
     *   - 6301 CD中（data.cd_remain_s）/ 6302 灵力不足（data.mp_current/mp_cost）
     *     都通过 HTTP 200 正常 resolve，调用方必须自行判断 res.code 走红框/倒计时提示
     * 需 X-Account-ID 请求头（HttpClient 自动附带）：401未认证 / 403非本人
     */
    static async cast(characterId: number, skillId: number): Promise<ApiResponse<CombatCastData>> {
        const res = await HttpClient.post<CombatCastData>('/combat/cast', {
            character_id: characterId,
            skill_id: skillId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(BattleEvent.BATTLE_SKILL_CAST, res.data);
        }
        return res;
    }

    /**
     * 护盾懒结算：后端无定时器，由前端定时（CombatHUDUI schedule）调用本接口，
     * 服务端按"脱战时长 × 每秒恢复速度"补齐护盾并返回最新值
     * 成功后自动广播 BATTLE_SHIELD_SETTLED 事件（携带 ShieldSettleData），
     * CombatHUDUI 监听后刷新护盾条
     * 需 X-Account-ID 请求头（HttpClient 自动附带）：401未认证 / 403非本人
     */
    static async shieldSettle(characterId: number): Promise<ApiResponse<ShieldSettleData>> {
        const res = await HttpClient.post<ShieldSettleData>('/combat/shield/settle', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(BattleEvent.BATTLE_SHIELD_SETTLED, res.data);
        }
        return res;
    }
}
