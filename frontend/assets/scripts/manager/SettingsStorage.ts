/**
 * 寻仙 - V6 设置本地存储管理器（纯静态类，非组件）
 *
 * 职责（技术文档 3.2 设置存储策略）：
 *   - 本地优先：所有设置读取先走本地缓存（微信小游戏 wx.getStorageSync，
 *     浏览器 localStorage），保证未登录/断网也能用
 *   - 登录后合并：调 SettingsApi.get 拉服务端设置覆盖本地（服务端为多端同步权威）
 *   - 修改即存：set() 立即写本地 + 异步 POST 落服务端（失败静默，本地已生效）
 *   - 重置：reset() 本地恢复默认 + 调服务端 reset 接口
 *
 * 读取点（供其他系统直接调用，避免各处自己读 storage）：
 *   - isScreenShakeOn()      FloatingDamageText 暴击震动开关
 *   - isDamageNumbersOn()    FloatingDamageText 是否弹伤害数字
 *   - getJoystickSensitivity() 摇杆灵敏度（JoystickUI 可接，本期只提供读取点）
 *   - getBgmVolume()/getSkillVolume()/getEnvVolume() 三路音量
 *     （工程暂无 MusicManager，音量项只存值不实时生效，接入点已预留）
 */

import { SettingsDefaults, UISettings } from '../common/Constants';
import { SettingsApi } from '../net/SettingsApi';

// 微信小游戏环境的 wx 全局对象声明：与全仓其他文件（HttpClient/WsClient/
// TokenManager/LoginPanel）统一用 any，避免风格不一致的隐患；
// 本文件是模块（含 import/export），declare 为模块作用域不污染全局，
// 调用处仍用 typeof wx !== 'undefined' 做运行时环境判断
declare const wx: any;

/** 本地存储键 */
const STORAGE_KEY = 'xunxian_ui_settings';

export class SettingsStorage {

    /** 内存缓存（进程内单份；null=尚未从本地加载过） */
    private static _cache: UISettings | null = null;
    /** 登录后绑定的角色ID（0=未登录，set 时不发服务端请求） */
    private static _characterId: number = 0;

    // ═══════════════════════════════════════
    //  底层存取（微信/浏览器双端兼容，仿 HttpClient.setAccountId 范式）
    // ═══════════════════════════════════════

    /** 从本地存储读设置 JSON（异常/无数据返回 null） */
    private static _loadLocal(): Partial<UISettings> | null {
        try {
            const raw = (typeof wx !== 'undefined' && wx && wx.getStorageSync)
                ? wx.getStorageSync(STORAGE_KEY)
                : localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            return null;   // 存储损坏时按无数据处理，走默认值
        }
    }

    /** 把设置 JSON 写入本地存储（异常静默：内存缓存仍生效） */
    private static _saveLocal(settings: UISettings) {
        try {
            const raw = JSON.stringify(settings);
            if (typeof wx !== 'undefined' && wx && wx.setStorageSync) {
                wx.setStorageSync(STORAGE_KEY, raw);
            } else {
                localStorage.setItem(STORAGE_KEY, raw);
            }
        } catch {
            // 写失败静默（如隐私模式），内存里的 _cache 仍是最新值
        }
    }

    /** 用默认值兜底合并（本地/服务端缺字段时补齐，防旧版本缓存缺新增项） */
    private static _mergeWithDefaults(partial: Partial<UISettings> | null): UISettings {
        const merged = { ...SettingsDefaults } as UISettings;
        if (partial) {
            for (const key of Object.keys(SettingsDefaults) as Array<keyof UISettings>) {
                const v = partial[key];
                if (typeof v === 'number' && isFinite(v)) {
                    merged[key] = v;
                }
            }
        }
        return merged;
    }

    // ═══════════════════════════════════════
    //  对外接口
    // ═══════════════════════════════════════

    /** 取全量设置（首次调用时从本地加载并用默认值兜底） */
    static getAll(): UISettings {
        if (!SettingsStorage._cache) {
            SettingsStorage._cache = SettingsStorage._mergeWithDefaults(SettingsStorage._loadLocal());
        }
        return SettingsStorage._cache;
    }

    /** 读单项设置值 */
    static get(key: keyof UISettings): number {
        return SettingsStorage.getAll()[key];
    }

    /**
     * 改单项设置：立即写内存+本地，再异步 POST 服务端（登录后才发；失败静默）
     * SettingsPanel 控件改动即调本方法（"修改即存"，保存按钮是二次显式落库）
     */
    static set(key: keyof UISettings, value: number) {
        const all = SettingsStorage.getAll();
        all[key] = value;
        SettingsStorage._saveLocal(all);
        // 异步落服务端：未登录（characterId=0）跳过，登录后由 syncFromServer 合并
        if (SettingsStorage._characterId > 0) {
            SettingsApi.save(SettingsStorage._characterId, all)
                .catch(() => { /* 网络异常静默：本地已生效，下次保存会重传全量 */ });
        }
    }

    /**
     * 登录后同步：绑定角色ID并拉服务端设置合并覆盖本地
     * （服务端是多端同步权威；新号 is_default=true 时把本地设置推上去）
     */
    static async syncFromServer(characterId: number): Promise<void> {
        SettingsStorage._characterId = characterId;
        try {
            const res = await SettingsApi.get(characterId);
            if (res.code === 0 && res.data) {
                if (res.data.is_default) {
                    // 服务端还没存过设置：把本地当前值（可能是玩家未登录时调过的）推上去
                    const local = SettingsStorage.getAll();
                    SettingsApi.save(characterId, local).catch(() => { /* 静默，稍后修改时会再存 */ });
                } else {
                    // 服务端有设置：覆盖本地（多端同步以服务端为准）
                    SettingsStorage._cache = SettingsStorage._mergeWithDefaults(res.data.settings);
                    SettingsStorage._saveLocal(SettingsStorage._cache);
                }
            }
        } catch {
            // 拉取失败静默：继续用本地缓存，不阻塞登录流程
        }
    }

    /**
     * 重置为默认值：本地立即恢复默认 + 调服务端 reset
     * 注意 tutorial_skipped 后端只升不降，服务端返回值里会保留跳过标记
     */
    static async reset(): Promise<void> {
        SettingsStorage._cache = { ...SettingsDefaults } as UISettings;
        SettingsStorage._saveLocal(SettingsStorage._cache);
        if (SettingsStorage._characterId > 0) {
            try {
                const res = await SettingsApi.reset(SettingsStorage._characterId);
                if (res.code === 0 && res.data) {
                    // 用服务端重置结果回填（tutorial_skipped 可能仍为1）
                    SettingsStorage._cache = SettingsStorage._mergeWithDefaults(res.data.settings);
                    SettingsStorage._saveLocal(SettingsStorage._cache);
                }
            } catch {
                // 网络异常静默：本地已恢复默认
            }
        }
    }

    // ═══════════════════════════════════════
    //  常用读取点（语义化封装，避免调用方硬编码键名）
    // ═══════════════════════════════════════

    /** 屏幕震动是否开启（FloatingDamageText 暴击震动用） */
    static isScreenShakeOn(): boolean {
        return SettingsStorage.get('screen_shake') === 1;
    }

    /** 是否显示伤害数字（FloatingDamageText 总开关） */
    static isDamageNumbersOn(): boolean {
        return SettingsStorage.get('show_damage_numbers') === 1;
    }

    /** 摇杆灵敏度 1-10（JoystickUI 预留读取点） */
    static getJoystickSensitivity(): number {
        return SettingsStorage.get('joystick_sensitivity');
    }

    /** 背景音乐音量 0-100（预留：工程暂无 MusicManager，存值待接） */
    static getBgmVolume(): number {
        return SettingsStorage.get('bgm_volume');
    }

    /** 技能音效音量 0-100（预留读取点） */
    static getSkillVolume(): number {
        return SettingsStorage.get('skill_volume');
    }

    /** 环境音音量 0-100（预留读取点） */
    static getEnvVolume(): number {
        return SettingsStorage.get('env_volume');
    }
}
