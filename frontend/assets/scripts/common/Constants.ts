/**
 * 寻仙 - 全局常量与配置
 * Cocos Creator 3.8 / TypeScript
 */

/** 服务器地址配置 */
export const ServerConfig = {
    // ── 生产环境 ──
    /** HTTP API 基础地址（认证/玩家服务网关） */
    HTTP_BASE_URL: 'https://api.xunxian.game',
    /** 场景服务地址（生产环境通过网关路由，此处备用） */
    SCENE_BASE_URL: 'https://api.xunxian.game',
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
    /** 场景服务（scene-service）端口 8003 —— 场景进入/交互 + V5地图分区/采集/移动限速 */
    DEV_SCENE_URL: 'http://127.0.0.1:8003',
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
    /** 账号ID本地存储键（V5 新增）：HttpClient 自动附带 X-Account-ID 请求头用 */
    ACCOUNT_ID_KEY: 'xunxian_account_id',
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

/**
 * 神位系统事件（花果山神位继承系统，character-service 8005 /shenwei/ 接口）
 * 生产者/消费者配对（勿新增只监听无生产者的事件）：
 *   - 生产者统一为 ShenweiApi 封装层：接口成功（code===0 且有 data）后自动 emit 并携带响应 data
 *   - 消费者为 ShenweiPanel：SHENWEI_UPDATED 用响应数据渲染面板，
 *     四个写操作事件负责结果 toast 并触发重新拉取 info
 */
export enum ShenweiEvent {
    /** 神位总览数据已刷新（getInfo 成功后广播，携带 ShenweiInfo 全量数据） */
    SHENWEI_UPDATED = 'shenwei:updated',
    /** 碎片合成成功（synthesize 成功后广播，携带 SynthesizeData） */
    SHENWEI_SYNTHESIZED = 'shenwei:synthesized',
    /** 神位融合成功（fuse 成功后广播，携带 FuseData） */
    SHENWEI_FUSED = 'shenwei:fused',
    /** 神位继承成功（inherit 成功后广播，携带 InheritData） */
    SHENWEI_INHERITED = 'shenwei:inherited',
    /** 神位切换成功（switchTo 成功后广播，携带 SwitchData，含是否晋升免费） */
    SHENWEI_SWITCHED = 'shenwei:switched',
}

/**
 * 功法系统事件（生产者：GongfaApi 封装层；消费者：GongfaPanel）
 * 命名前缀 gongfa: 与 charv2: / shenwei: / skill: 均不冲突。
 * 【配对约定】每个事件都必须既有生产者又有消费者，禁止只监听不广播（或反之）。
 * 说明：杀怪经验入账（/gongfa/exp/kill）由战斗流程调用、面板不订阅，
 * 故不设事件，调用方成功后自行调用 GongfaApi.list() 刷新。
 */
export enum GongfaEvent {
    /** 功法总览数据已刷新（list 成功后广播，携带 GongfaListData 全量数据） */
    GONGFA_UPDATED = 'gongfa:updated',
    /** 学习功法成功（learn 成功后广播，携带 LearnData，含是否触发走火入魔） */
    GONGFA_LEARNED = 'gongfa:learned',
    /** 遗忘功法成功（forget 成功后广播，携带 ForgetData，含实际扣费明细） */
    GONGFA_FORGOTTEN = 'gongfa:forgotten',
    /** 打坐状态变化（meditateStart/Settle/End 成功后广播，携带 MeditateData） */
    GONGFA_MEDITATION = 'gongfa:meditation',
}

/**
 * 技能系统事件（生产者：SkillApi 封装层；消费者：SkillPanel）
 * 说明：遗忘技能（/skill/forget）的结果与总览是同一份数据视图，
 * 不单独设事件，面板在成功后调用 SkillApi.list() 刷新（会广播 SKILL_UPDATED）。
 */
export enum SkillEvent {
    /** 技能总览数据已刷新（list 成功后广播，携带 SkillListData 全量数据） */
    SKILL_UPDATED = 'skill:updated',
    /** 学习技能成功（learn 成功后广播，携带 SkillLearnData） */
    SKILL_LEARNED = 'skill:learned',
    /** 技能栏装配/卸下成功（slotSet 成功后广播，携带 SlotSetData，skill_id=0 表示卸下） */
    SKILL_SLOT_CHANGED = 'skill:slot_changed',
}

/**
 * V5 地图坐标换算配置。
 * 后端 Zone/采集点坐标单位是"米"（世界 1800×1200 米），
 * 前端 Hall 场景渲染单位是"像素"（世界 3000×2000 像素），
 * 两者比例恰好一致：3000/1800 = 2000/1200 = 5/3 ≈ 1.667 像素/米。
 * 所有"米↔像素"换算必须统一走这里，禁止各文件自己写魔法数字。
 */
export const MapConfig = {
    /** 1米等于多少像素（3000像素 ÷ 1800米） */
    PIXELS_PER_METER: 3000 / 1800,
    /** 像素坐标 → 米坐标（调用后端接口前换算） */
    pxToMeter(px: number): number { return px / (3000 / 1800); },
    /** 米坐标 → 像素坐标（后端回正坐标落回场景时换算） */
    meterToPx(m: number): number { return m * (3000 / 1800); },
    /** 采集交互半径（米）：离采集点 ≤5米 才允许采集（与后端 GatherMaxDistance 一致） */
    GATHER_MAX_DISTANCE_M: 5,
    /** 移动上报节流间隔（秒）：每隔1秒调一次 /scene/move/validate 做限速/出界校验 */
    MOVE_VALIDATE_INTERVAL_S: 1,
};

/**
 * V5 战斗操作层事件（生产者/消费者配对，禁止只监听无生产者）：
 *   - BATTLE_SKILL_CAST / BATTLE_SHIELD_SETTLED：生产者为 BattleApi 封装层
 *     （接口成功 code===0 且有 data 后自动 emit 并携带响应 data），消费者为 CombatHUDUI
 *   - BATTLE_ROLL：生产者为 CombatHUDUI 翻滚按钮，消费者为 HallScene（执行翻滚位移）
 *   - BATTLE_STAGGER：生产者为 CombatHUDUI.applyHit（战斗结算方把 /combat/skill 响应
 *     的 stagger_s 喂进来时广播），消费者为 HallScene（硬直期间锁移动）与 CombatHUDUI 自身表现
 */
export enum BattleEvent {
    /** 技能施放校验通过（/combat/cast 成功后广播，携带 CombatCastData，含 cooldown_s） */
    BATTLE_SKILL_CAST = 'battle:skill_cast',
    /** 护盾懒结算完成（/combat/shield/settle 成功后广播，携带 ShieldSettleData） */
    BATTLE_SHIELD_SETTLED = 'battle:shield_settled',
    /** 翻滚按钮按下（CombatHUDUI 广播，携带无参数；HallScene 收到后按当前朝向位移） */
    BATTLE_ROLL = 'battle:roll',
    /** 受击硬直（CombatHUDUI.applyHit 广播，携带硬直秒数 stagger_s；硬直期间锁玩家输入） */
    BATTLE_STAGGER = 'battle:stagger',
}

/**
 * V5 地图系统事件（生产者/消费者配对）：
 *   - JOYSTICK_*：生产者为 JoystickUI（纯前端摇杆组件），消费者为 HallScene（移动输入源）
 *   - ZONE_INFO_UPDATED / ZONE_ENTERED / MAP_GATHERED：生产者为 MapApi 封装层，
 *     消费者为 MinimapUI（画分区边界/采集点）与 HallScene（分区横幅/采集结果提示）
 *   - PLAYER_POS_CHANGED：生产者为 HallScene（节流广播玩家米坐标），消费者为 MinimapUI
 */
export enum MapEvent {
    /** 摇杆拖动中（JoystickUI 广播，携带 {dirX,dirY,octant}：归一化方向+8方向档位0-7） */
    JOYSTICK_MOVE = 'map:joystick_move',
    /** 摇杆松开（JoystickUI 广播，无参数；HallScene 收到后停止摇杆移动） */
    JOYSTICK_END = 'map:joystick_end',
    /** 分区配置已拉取（/scene/zone/info 成功后广播，携带 ZoneInfoData 全量数据） */
    ZONE_INFO_UPDATED = 'map:zone_info_updated',
    /** 进入分区成功（/scene/zone/enter 成功后广播，携带 ZoneEnterData；HallScene 收到后弹分区横幅） */
    ZONE_ENTERED = 'map:zone_entered',
    /** 采集完成（/scene/gather 成功后广播，携带 GatherData；HallScene 收到后弹采集结果 toast） */
    MAP_GATHERED = 'map:gathered',
    /** 玩家位置变化（HallScene 节流广播，携带 {x,y} 米坐标；MinimapUI 据此重画中心） */
    PLAYER_POS_CHANGED = 'map:player_pos_changed',
}

/**
 * V5 轮回夺舍系统事件（生产者统一为 SamsaraApi 封装层，接口成功后自动 emit）：
 *   - DEATH_OPTIONS_UPDATED 消费者为 CorpseCultivationUI（渲染死亡三选一）
 *   - CORPSE_ENTERED / CORPSE_EXITED 消费者为 CorpseCultivationUI（尸修转换结果展示）
 *   - THUNDER_CHECKED 消费者为 HallScene（天雷警告 toast/致死跳死亡流程）
 *   - RUIN_CREATED / RUIN_INHERITED 消费者为 SecretRealmPanel（秘境操作结果展示）
 */
export enum SamsaraEvent {
    /** 死亡三选一选项已拉取（/death/trigger 成功后广播，携带含 options/possess_hint 的 data） */
    DEATH_OPTIONS_UPDATED = 'samsara:death_options_updated',
    /** 进入尸修成功（/death/corpse/enter 成功后广播，携带属性转换前后对照） */
    CORPSE_ENTERED = 'samsara:corpse_entered',
    /** 退出尸修成功（/death/corpse/exit 成功后广播，无 data） */
    CORPSE_EXITED = 'samsara:corpse_exited',
    /** 天雷懒结算完成（/death/thunder/check 成功后广播，携带 ThunderCheckData） */
    THUNDER_CHECKED = 'samsara:thunder_checked',
    /** 秘境设立/更新成功（/death/ruins/create 成功后广播，携带含 updated 标记的 data） */
    RUIN_CREATED = 'samsara:ruin_created',
    /** 秘境继承/打破成功（/death/ruins/inherit 成功后广播，携带含 method 的 data） */
    RUIN_INHERITED = 'samsara:ruin_inherited',
}
