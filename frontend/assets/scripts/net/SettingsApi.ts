/**
 * 寻仙 - V6 UI设置 API 客户端
 *
 * 说明:
 *   - 对接 character-service (端口 8005) 的 /character/settings 系列接口，
 *     后端实现见 backend/internal/character/handler_ui.go
 *   - HttpClient 根据 /character/ 前缀自动路由到 8005，并自动附带 X-Account-ID
 *   - 设置共 17 项（画质/帧率/特效/震动/三路音量/语音/摇杆灵敏度/施放方式/
 *     自动普攻/锁定/翻滚/自动拾取/伤害数字/他人特效/tutorial_skipped），
 *     键名与 Constants.SettingsDefaults 完全一致（snake_case）
 *   - 每个接口成功（code===0 且有 data）后自动广播 UIEvent.SETTINGS_UPDATED
 *     并携带最新设置对象，SettingsPanel 只需监听刷新、无需自行 emit
 *   - 注意：tutorial_skipped 由后端"只升不降"（跳过标记不可逆），save 时可原样带上
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { UIEvent, UISettings } from '../common/Constants';

// ═══════════════════════════════════════════
//  响应数据结构（对齐 handler_ui.go）
// ═══════════════════════════════════════════

/** GET /character/settings 响应：无设置行时返回 DDL 默认值且 is_default=true */
export interface SettingsGetData {
    settings: UISettings;
    is_default: boolean;
}

/** POST /character/settings/save|reset 响应：保存/重置后的最新设置 */
export interface SettingsSaveData {
    settings: UISettings;
}

// ═══════════════════════════════════════════
//  业务错误码与提示文案（HTTP 200 但 code!==0）
// ═══════════════════════════════════════════

/** 6401 = 设置项取值非法（超出后端 validate 范围，如帧率非30/60/120） */
export const ERR_SETTINGS_INVALID = 6401;

/** 设置业务错误码 → 中文提示 */
export const SettingsErrorText: Record<number, string> = {
    [ERR_SETTINGS_INVALID]: '设置项取值非法，请检查后重试',
};

// ═══════════════════════════════════════════
//  SettingsApi
// ═══════════════════════════════════════════

export class SettingsApi {

    /**
     * 拉取服务端设置：登录后调用一次，与本地缓存合并（SettingsStorage.syncFromServer）
     * 无设置行时后端返回默认值 + is_default=true（前端可据此知道是"新号默认"）
     * 成功后自动广播 UIEvent.SETTINGS_UPDATED（携带 17 项设置对象）
     */
    static async get(characterId: number): Promise<ApiResponse<SettingsGetData>> {
        const res = await HttpClient.get<SettingsGetData>('/character/settings', {
            character_id: String(characterId),
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(UIEvent.SETTINGS_UPDATED, res.data.settings);
        }
        return res;
    }

    /**
     * 保存全量设置（17项整体提交）：SettingsPanel 保存按钮 / SettingsStorage 异步落库调用
     * 取值非法返回业务码 6401（HTTP 200，res.code !== 0）
     * 成功后自动广播 UIEvent.SETTINGS_UPDATED（携带保存后的最新设置）
     */
    static async save(characterId: number, settings: UISettings): Promise<ApiResponse<SettingsSaveData>> {
        const res = await HttpClient.post<SettingsSaveData>('/character/settings/save', {
            character_id: characterId,
            settings: settings,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(UIEvent.SETTINGS_UPDATED, res.data.settings);
        }
        return res;
    }

    /**
     * 重置为默认值（后端删行后返回 DDL 默认；tutorial_skipped 只升不降会被保留）
     * 成功后自动广播 UIEvent.SETTINGS_UPDATED（携带重置后的设置）
     */
    static async reset(characterId: number): Promise<ApiResponse<SettingsSaveData>> {
        const res = await HttpClient.post<SettingsSaveData>('/character/settings/reset', {
            character_id: characterId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(UIEvent.SETTINGS_UPDATED, res.data.settings);
        }
        return res;
    }
}
