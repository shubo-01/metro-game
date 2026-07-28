/**
 * 寻仙 - 全局常量与配置
 * Cocos Creator 3.8 / TypeScript
 */

/** 服务器地址配置 */
export const ServerConfig = {
    // ── 生产环境 ──
    /** HTTP API 基础地址（认证/玩家服务网关） */
    HTTP_BASE_URL: 'https://api.xunxian.game',
    /** 角色服务地址（生产环境通过网关路由，此处备用） */
    CHARACTER_BASE_URL: 'https://api.xunxian.game',
    /** 死亡服务地址（生产环境通过网关路由，此处备用） */
    DEATH_BASE_URL: 'https://api.xunxian.game',
    /** 副本服务地址（生产环境通过网关路由，此处备用） */
    DUNGEON_BASE_URL: 'https://api.xunxian.game',
    /** 野怪服务地址（生产环境通过网关路由，此处备用） */
    MONSTER_BASE_URL: 'https://api.xunxian.game',
    /** 装备服务地址（生产环境通过网关路由，此处备用） */
    EQUIPMENT_BASE_URL: 'https://api.xunxian.game',
    /** WebSocket 地址 */
    WS_URL: 'wss://ws.xunxian.game',

    // ── 开发环境（各服务独立端口） ──
    /** 认证服务（auth-service）端口 8001 */
    DEV_HTTP_URL: 'http://127.0.0.1:8001',
    /** 角色服务（character-service）端口 8005 */
    DEV_CHARACTER_URL: 'http://127.0.0.1:8005',
    /** 死亡服务（death-service）端口 8006 */
    DEV_DEATH_URL: 'http://127.0.0.1:8006',
    /** 副本服务（dungeon-service）端口 8007 —— 花果山副本 + 牢结值系统 */
    DEV_DUNGEON_URL: 'http://127.0.0.1:8007',
    /** 野怪服务（monster-service）端口 8008 —— 初始之地野怪系统（领地/族群/协战/抓捕） */
    DEV_MONSTER_URL: 'http://127.0.0.1:8008',
    /** 装备服务（equipment-service）端口 8009 —— 装备系统（穿戴/升级/打造/掉落/交易） */
    DEV_EQUIPMENT_URL: 'http://127.0.0.1:8009',
    /** 开发环境 WebSocket 地址 */
    DEV_WS_URL: 'ws://127.0.0.1:8004/ws',
};

/** Token 配置 */
export const TokenConfig = {
    ACCESS_TOKEN_KEY: 'xunxian_token',
    REFRESH_TOKEN_KEY: 'xunxian_refresh_token',
    ACCESS_EXPIRES: 2 * 60 * 60 * 1000,   // 2小时
    REFRESH_EXPIRES: 7 * 24 * 60 * 60 * 1000, // 7天
};

/** WebSocket 重连配置 */
export const ReconnectConfig = {
    INTERVALS: [3000, 6000, 10000, 30000], // ms 递增间隔
    MAX_TIMEOUT: 5 * 60 * 1000,            // 5分钟超时
    HEARTBEAT_INTERVAL: 15000,             // 15s 心跳
};

/** AOI 参数 */
export const AOIConfig = {
    GRID_SIZE: 256,
    VIEW_RADIUS: 768,
    SYNC_INTERVAL: 100,  // ms (10Hz)
    MAX_PER_GRID: 100,
};

/** 场景 ID */
export const SceneID = {
    INITIAL_HALL: 1001,  // 初始之地
};

/** 境界体系 */
export const LevelStageNames: Record<number, string> = {
    1: '人',
    2: '真人',
    3: '仙',
    4: '金仙',
};

export const LevelTierNames: Record<number, string> = {
    1: '一阶', 2: '二阶', 3: '三阶',
    4: '四阶', 5: '五阶', 6: '六阶',
    7: '七阶', 8: '八阶', 9: '九阶',
};

export const LevelStepNames: Record<number, string> = {
    1: '一段', 2: '二段', 3: '三段',
    4: '四段', 5: '五段', 6: '六段',
    7: '七段', 8: '八段', 9: '九段',
    10: '大圆满',
};

/** 暗色仙侠风主题色 */
export const ThemeColor = {
    BG_DARK: '#1a1a2e',
    BG_PANEL: '#16213e',
    GOLD: '#D4A843',
    GOLD_LIGHT: '#E8C868',
    GOLD_DARK: '#A07830',
    JADE: '#2ECC71',
    TEXT_WHITE: '#F5F5F5',
    TEXT_GRAY: '#8A8A9A',
    DANGER: '#E74C3C',
    BORDER: '#2A2A4A',
};

/** 实体类型 */
export enum EntityType {
    Player = 1,
    NPC = 2,
}

/** 实体动作 */
export enum EntityAction {
    Idle = 0,
    Walk = 1,
    Run = 2,
    Attack = 3,
    Sit = 4,
}

/** 聊天频道 */
export enum ChatChannel {
    World = 1,
    Guild = 2,
    Private = 3,
}
