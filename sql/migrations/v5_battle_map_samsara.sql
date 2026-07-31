-- ═══════════════════════════════════════════════════════════════
--  战斗操作层 · 地图系统 · 轮回夺舍系统 数据库迁移脚本 V5
--  依据：《战斗操作层与地图系统和轮回夺舍系统PRD》
--        《战斗与地图系统轮回和夺舍系统技术设计文档》
--  （两份文档原文为唯一数值权威，本文件所有数值均摘自文档表格）
--
--  【重要隔离说明】
--  1. 本迁移只服务四个既有服务的增量扩展：
--     death-service(8006) / scene-service / monster-service(8008) / character-service(8005)。
--     gongfa/shenwei/equipment/dungeon 各包及其表【零改动】。
--  2. 与既有系统的关系：
--     - character_death_state / heritage_ruins / public_enemy_state 是
--       schema.sql 里的老表，本文件只做"幂等增列/增索引"，不重建、不改老列。
--     - faction_instance / monster_entity 是 monster_system.sql 的老表，
--       本文件只给 faction_instance 增加 zone_id 列（默认2=Zone2外围原野），
--       既有协战/受击/神兽唯一性逻辑不受影响。
--     - character_attributes 增加 last_combat_time 列（护盾脱战懒结算锚点），
--       与 v3 的 shenwei_*、v4 的 gongfa_* 加成列互不干扰。
--     - 采集产出写入 player_inventory（huaguoshan_dungeon.sql 的既有背包表，
--       item_type: 1=普通材料 2=稀有材料），不新建背包体系。
--  3. 结算制优先：护盾脱战恢复、天雷触发、神兽回眠均为"查询/受击时懒结算"，
--     无任何后台定时器（对齐 v4 功法打坐结算制风格）。
--
--  【幂等性】本文件可连续执行两遍无错：
--    - 建表全部 CREATE TABLE IF NOT EXISTS
--    - 种子数据全部 INSERT IGNORE
--    - ALTER 增列/增索引通过存储过程先查 information_schema 再执行
--
--  执行方式（含中文，必须用 source 方式执行，不能用管道以免乱码）：
--    mysql.exe --default-character-set=utf8mb4 -u root -p game_main
--      -e "source e:/ziji-xiaochengxu/sql/migrations/v5_battle_map_samsara.sql"
--
--  内容概览：
--    1. map_zone_config      地图分区配置表（Zone1营地/Zone2外围/Zone3深处）
--    2. map_forbidden_area   禁区/空气墙配置表
--    3. gather_point_config  采集点配置表（Zone2草药15+铁矿9 / Zone3草药9+铁矿6+灵矿3）
--    4. char_gather_log      角色采集流水表（采集CD判定依据）
--    5. divine_npc_state     神兽NPC沉眠状态机表（白泽/朱厌）
--    6. thunder_log          天雷处罚日志表
--    7. ALTER character_death_state  增加尸修/夺舍倒计时字段
--    8. ALTER heritage_ruins         增加秘境密码/资产构成/打破门槛字段
--    9. ALTER character_attributes   增加 last_combat_time（护盾懒结算锚点）
--    10. ALTER faction_instance      增加 zone_id（怪物 zone 过滤）
--    11. 幂等补索引：character_death_state(is_public_enemy) /
--        public_enemy_state(next_thunder_at)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
--  1. map_zone_config: 地图分区配置表
--  PRD 第二章地图系统：
--    Zone1 新手营地 200×200m，安全区（怪物不入侵），灵气浓度10%
--    Zone2 外围原野 1000×1000m，推荐1-20级，12族群×1260只=15120怪
--    Zone3 深处峡谷 800×1200m 长条形，推荐15-30级，8族群=10080怪
--  坐标布局（技术方案未给绝对坐标，按连续拼接布置并在此固定为权威值）：
--    Zone2 (0,0)-(1000,1000)；Zone1 嵌于 Zone2 中央 (400,400)-(600,600)；
--    Zone3 在 Zone2 东侧 (1000,0)-(1800,1200)。
--  单位：米（与 PRD 一致；前端渲染换算像素由前端负责）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS map_zone_config (
  zone_id       TINYINT       PRIMARY KEY        COMMENT '分区ID：1=新手营地 2=外围原野 3=深处峡谷',
  name          VARCHAR(32)   NOT NULL           COMMENT '分区名称',
  x_min         INT           NOT NULL           COMMENT '西边界（米）',
  y_min         INT           NOT NULL           COMMENT '北边界（米）',
  x_max         INT           NOT NULL           COMMENT '东边界（米）',
  y_max         INT           NOT NULL           COMMENT '南边界（米）',
  is_safe_zone  TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否安全区：1=怪物不入侵不可PVP（Zone1营地）',
  aura_percent  INT           NOT NULL DEFAULT 0 COMMENT '灵气浓度百分比（PRD：营地10%）',
  rec_level_min INT           NOT NULL DEFAULT 1 COMMENT '推荐等级下限',
  rec_level_max INT           NOT NULL DEFAULT 1 COMMENT '推荐等级上限',
  desc_text     VARCHAR(255)  NOT NULL DEFAULT '' COMMENT '分区描述（PRD原文摘要）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图分区配置表：Zone边界/安全区/推荐等级（PRD第二章）';

INSERT IGNORE INTO map_zone_config
  (zone_id, name, x_min, y_min, x_max, y_max, is_safe_zone, aura_percent, rec_level_min, rec_level_max, desc_text) VALUES
(1, '新手营地',   400, 400,  600,  600, 1, 10, 1,  10, '200×200m安全区，怪物不入侵，灵气浓度10%，营地内打坐修炼'),
(2, '外围原野',   0,   0,    1000, 1000, 0, 0,  1,  20, '1000×1000m，1-20级，12族群共15120只怪（每族群1000普+200精英+40Boss+20妖）'),
(3, '深处峡谷',   1000, 0,   1800, 1200, 0, 0,  15, 30, '800×1200m长条峡谷，15-30级，8族群共10080只怪，尽头为副本入口');

-- ─────────────────────────────────────
--  2. map_forbidden_area: 禁区/空气墙配置表
--  PRD：地图边缘为空气墙（出界即非法坐标，由 ValidatePosition 判定）；
--  另配置显式禁区矩形（如峡谷两侧崖壁），进入判定为非法位置。
--  空气墙本身 = 所有 Zone 边界之外的区域，无需建行；本表只存 Zone 内部的禁区。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS map_forbidden_area (
  area_id   INT           PRIMARY KEY AUTO_INCREMENT COMMENT '禁区ID',
  zone_id   TINYINT       NOT NULL                   COMMENT '所属分区ID',
  name      VARCHAR(32)   NOT NULL                   COMMENT '禁区名称',
  x_min     INT           NOT NULL                   COMMENT '禁区西边界（米）',
  y_min     INT           NOT NULL                   COMMENT '禁区北边界（米）',
  x_max     INT           NOT NULL                   COMMENT '禁区东边界（米）',
  y_max     INT           NOT NULL                   COMMENT '禁区南边界（米）',
  INDEX idx_zone (zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='禁区配置表：Zone内不可进入的矩形区域（崖壁/深潭等）';

-- 禁区种子：峡谷两侧崖壁（长条峡谷地形，PRD Zone3 为峡谷走廊，两侧不可攀爬）
INSERT IGNORE INTO map_forbidden_area (area_id, zone_id, name, x_min, y_min, x_max, y_max) VALUES
(1, 3, '峡谷北崖', 1000, 0,    1800, 100),
(2, 3, '峡谷南崖', 1000, 1100, 1800, 1200);

-- ─────────────────────────────────────
--  3. gather_point_config: 采集点配置表
--  PRD 采集系统（3秒读条，无需工具）：
--    Zone2：草药点15个（灰绿草/枯根，凡品）+ 铁矿点9个（碎铁，凡品）
--    Zone3：草药点9个（灵草，珍品）+ 铁矿点6个（精铁，珍品）
--           + 灵矿点3个（碎灵矿，灵品，低概率产出）
--  物品ID约定（player_inventory.item_id，与花果山材料段2xxx错开用3xxx段）：
--    3001灰绿草 3002枯根 3003碎铁 3004灵草 3005精铁 3006碎灵矿
--  采集CD：文档未给出明确单点CD数值，按普通怪刷新档5分钟=300秒执行（假设项，见交付报告）。
--  灵矿低概率：success_rate=0.30（其余点位1.00必得）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS gather_point_config (
  point_id      INT           PRIMARY KEY        COMMENT '采集点ID',
  zone_id       TINYINT       NOT NULL           COMMENT '所属分区：2=外围原野 3=深处峡谷',
  resource_type TINYINT       NOT NULL           COMMENT '资源类型：1=草药 2=铁矿 3=灵矿',
  item_id       INT           NOT NULL           COMMENT '产出物品ID（player_inventory.item_id）',
  item_name     VARCHAR(32)   NOT NULL           COMMENT '产出物品名称',
  quality       TINYINT       NOT NULL           COMMENT '品质：1=凡品 2=珍品 3=灵品',
  pos_x         INT           NOT NULL           COMMENT '采集点X坐标（米）',
  pos_y         INT           NOT NULL           COMMENT '采集点Y坐标（米）',
  gather_cd_s   INT           NOT NULL DEFAULT 300 COMMENT '单角色单点采集CD（秒）',
  channel_s     INT           NOT NULL DEFAULT 3 COMMENT '读条时长（秒，PRD：3秒无需工具）',
  success_rate  DECIMAL(4,2)  NOT NULL DEFAULT 1.00 COMMENT '产出概率（灵矿低概率0.30，其余1.00）',
  INDEX idx_zone (zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采集点配置表：Zone2草药15+铁矿9 / Zone3草药9+铁矿6+灵矿3（PRD采集系统）';

-- Zone2 草药点15个（灰绿草/枯根交替，凡品），坐标避开中央营地(400,400)-(600,600)
INSERT IGNORE INTO gather_point_config
  (point_id, zone_id, resource_type, item_id, item_name, quality, pos_x, pos_y, gather_cd_s, channel_s, success_rate) VALUES
(101, 2, 1, 3001, '灰绿草', 1, 100, 100, 300, 3, 1.00),
(102, 2, 1, 3002, '枯根',   1, 250, 150, 300, 3, 1.00),
(103, 2, 1, 3001, '灰绿草', 1, 700, 120, 300, 3, 1.00),
(104, 2, 1, 3002, '枯根',   1, 880, 200, 300, 3, 1.00),
(105, 2, 1, 3001, '灰绿草', 1, 150, 350, 300, 3, 1.00),
(106, 2, 1, 3002, '枯根',   1, 320, 300, 300, 3, 1.00),
(107, 2, 1, 3001, '灰绿草', 1, 750, 380, 300, 3, 1.00),
(108, 2, 1, 3002, '枯根',   1, 900, 450, 300, 3, 1.00),
(109, 2, 1, 3001, '灰绿草', 1, 120, 600, 300, 3, 1.00),
(110, 2, 1, 3002, '枯根',   1, 300, 720, 300, 3, 1.00),
(111, 2, 1, 3001, '灰绿草', 1, 680, 650, 300, 3, 1.00),
(112, 2, 1, 3002, '枯根',   1, 850, 700, 300, 3, 1.00),
(113, 2, 1, 3001, '灰绿草', 1, 200, 880, 300, 3, 1.00),
(114, 2, 1, 3002, '枯根',   1, 500, 900, 300, 3, 1.00),
(115, 2, 1, 3001, '灰绿草', 1, 800, 920, 300, 3, 1.00);

-- Zone2 铁矿点9个（碎铁，凡品）
INSERT IGNORE INTO gather_point_config
  (point_id, zone_id, resource_type, item_id, item_name, quality, pos_x, pos_y, gather_cd_s, channel_s, success_rate) VALUES
(121, 2, 2, 3003, '碎铁', 1, 80,  250, 300, 3, 1.00),
(122, 2, 2, 3003, '碎铁', 1, 450, 100, 300, 3, 1.00),
(123, 2, 2, 3003, '碎铁', 1, 920, 300, 300, 3, 1.00),
(124, 2, 2, 3003, '碎铁', 1, 100, 500, 300, 3, 1.00),
(125, 2, 2, 3003, '碎铁', 1, 950, 550, 300, 3, 1.00),
(126, 2, 2, 3003, '碎铁', 1, 250, 850, 300, 3, 1.00),
(127, 2, 2, 3003, '碎铁', 1, 620, 800, 300, 3, 1.00),
(128, 2, 2, 3003, '碎铁', 1, 900, 850, 300, 3, 1.00),
(129, 2, 2, 3003, '碎铁', 1, 480, 950, 300, 3, 1.00);

-- Zone3 草药点9个（灵草，珍品，峡谷走廊 y∈[100,1100]）
INSERT IGNORE INTO gather_point_config
  (point_id, zone_id, resource_type, item_id, item_name, quality, pos_x, pos_y, gather_cd_s, channel_s, success_rate) VALUES
(201, 3, 1, 3004, '灵草', 2, 1050, 200,  300, 3, 1.00),
(202, 3, 1, 3004, '灵草', 2, 1200, 350,  300, 3, 1.00),
(203, 3, 1, 3004, '灵草', 2, 1350, 250,  300, 3, 1.00),
(204, 3, 1, 3004, '灵草', 2, 1500, 500,  300, 3, 1.00),
(205, 3, 1, 3004, '灵草', 2, 1150, 600,  300, 3, 1.00),
(206, 3, 1, 3004, '灵草', 2, 1400, 700,  300, 3, 1.00),
(207, 3, 1, 3004, '灵草', 2, 1600, 800,  300, 3, 1.00),
(208, 3, 1, 3004, '灵草', 2, 1250, 900,  300, 3, 1.00),
(209, 3, 1, 3004, '灵草', 2, 1550, 1000, 300, 3, 1.00);

-- Zone3 铁矿点6个（精铁，珍品）
INSERT IGNORE INTO gather_point_config
  (point_id, zone_id, resource_type, item_id, item_name, quality, pos_x, pos_y, gather_cd_s, channel_s, success_rate) VALUES
(221, 3, 2, 3005, '精铁', 2, 1100, 450, 300, 3, 1.00),
(222, 3, 2, 3005, '精铁', 2, 1300, 550, 300, 3, 1.00),
(223, 3, 2, 3005, '精铁', 2, 1450, 350, 300, 3, 1.00),
(224, 3, 2, 3005, '精铁', 2, 1650, 600, 300, 3, 1.00),
(225, 3, 2, 3005, '精铁', 2, 1350, 850, 300, 3, 1.00),
(226, 3, 2, 3005, '精铁', 2, 1700, 950, 300, 3, 1.00);

-- Zone3 灵矿点3个（碎灵矿，灵品，低概率产出0.30）
INSERT IGNORE INTO gather_point_config
  (point_id, zone_id, resource_type, item_id, item_name, quality, pos_x, pos_y, gather_cd_s, channel_s, success_rate) VALUES
(241, 3, 3, 3006, '碎灵矿', 3, 1600, 300,  300, 3, 0.30),
(242, 3, 3, 3006, '碎灵矿', 3, 1500, 900,  300, 3, 0.30),
(243, 3, 3, 3006, '碎灵矿', 3, 1750, 1050, 300, 3, 0.30);

-- ─────────────────────────────────────
--  4. char_gather_log: 角色采集流水表
--  采集CD判定依据：同角色同采集点，距上次采集时间 < gather_cd_s 则拒绝（错误码6012）。
--  产出成功后同时写 player_inventory（同物品同来源自动堆叠）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_gather_log (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT         COMMENT '流水ID',
  character_id BIGINT UNSIGNED NOT NULL                           COMMENT '角色ID',
  point_id     INT             NOT NULL                           COMMENT '采集点ID，关联gather_point_config.point_id',
  item_id      INT             NOT NULL                           COMMENT '产出物品ID（判定失败时也记录，quantity=0）',
  quantity     INT             NOT NULL DEFAULT 1                 COMMENT '产出数量（灵矿低概率未中=0）',
  gathered_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '采集时间（CD锚点）',
  INDEX idx_char_point_time (character_id, point_id, gathered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色采集流水表：单角色单点CD判定依据';

-- ─────────────────────────────────────
--  5. divine_npc_state: 神兽NPC沉眠状态机表
--  PRD 神兽NPC（与 monster 系统的20只可捕神兽是两套体系，互不影响）：
--    白泽：Zone2 原野中央古祭坛旁；朱厌：Zone3 峡谷最深处副本入口附近。
--    均为大罗金妖仙99级，全服唯一。
--  状态机：沉眠(0) →[持续攻击唤醒]→ 苏醒(1) →[秒杀反击]→ 回沉眠(0)。
--  懒结算：无定时器；查询/受击时若 awake_until 已过则自动回眠、进度清零；
--  若距 last_hit_at 超过连击窗口（10秒）则唤醒进度清零（"持续攻击"才唤醒）。
--  唤醒阈值/苏醒时长：文档未给出精确数值，取连续10击唤醒、苏醒30秒（假设项，见交付报告）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS divine_npc_state (
  npc_id         INT           PRIMARY KEY        COMMENT '神兽NPC ID：1=白泽 2=朱厌',
  name           VARCHAR(32)   NOT NULL           COMMENT '神兽名称',
  zone_id        TINYINT       NOT NULL           COMMENT '所在分区：2=外围原野 3=深处峡谷',
  pos_x          INT           NOT NULL           COMMENT 'X坐标（米）',
  pos_y          INT           NOT NULL           COMMENT 'Y坐标（米）',
  realm_desc     VARCHAR(32)   NOT NULL           COMMENT '境界描述（PRD：大罗金妖仙）',
  level          INT           NOT NULL DEFAULT 99 COMMENT '等级（PRD：99级）',
  state          TINYINT       NOT NULL DEFAULT 0 COMMENT '状态：0=沉眠 1=苏醒（苏醒期间秒杀反击攻击者）',
  wake_progress  INT           NOT NULL DEFAULT 0 COMMENT '唤醒进度（连续攻击累计次数，中断清零）',
  wake_threshold INT           NOT NULL DEFAULT 10 COMMENT '唤醒阈值（连续攻击次数达到即苏醒）',
  combo_window_s INT           NOT NULL DEFAULT 10 COMMENT '连击窗口（秒）：两次攻击间隔超过该值进度清零',
  awake_s        INT           NOT NULL DEFAULT 30 COMMENT '苏醒持续时长（秒），到期懒结算自动回眠',
  last_hit_at    DATETIME      NULL               COMMENT '最近一次被攻击时间（连击窗口锚点）',
  awake_until    DATETIME      NULL               COMMENT '苏醒截止时间（NULL=沉眠中）',
  kill_count     INT           NOT NULL DEFAULT 0 COMMENT '累计秒杀反击玩家次数（统计用）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神兽NPC沉眠状态机表：白泽/朱厌，懒结算无定时器（PRD神兽NPC章节）';

INSERT IGNORE INTO divine_npc_state
  (npc_id, name, zone_id, pos_x, pos_y, realm_desc, level, state, wake_threshold, combo_window_s, awake_s) VALUES
(1, '白泽', 2, 500,  700,  '大罗金妖仙', 99, 0, 10, 10, 30),
(2, '朱厌', 3, 1750, 1100, '大罗金妖仙', 99, 0, 10, 10, 30);

-- ─────────────────────────────────────
--  6. thunder_log: 天雷处罚日志表
--  技术方案 5.2 天雷伤害：base = 800 × 4.0 × ratio_at_level(境界,100级) × 9.0
--  （800=人阶100级裸装基准攻击，4.0=全力一击倍率，9.0=同级5修倍率，
--    ratio=当前境界基准值÷人阶基准值67，见 character/calc.go realmTable）。
--  触发时机（懒结算）：每次登录1次 + 在线每2小时1次，由 /death/thunder/check
--  在查询时判定 next_thunder_at 到期后结算写入本表。
--  element：天雷附带属性随机 精/气/神（技术方案 5.2"属性随机"）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS thunder_log (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT         COMMENT '日志ID',
  character_id    BIGINT UNSIGNED NOT NULL                           COMMENT '被天雷处罚的公敌角色ID',
  damage          BIGINT          NOT NULL                           COMMENT '本次天雷总伤害（同级5修裸装全力一击）',
  element         TINYINT         NOT NULL                           COMMENT '天雷随机属性：1=精 2=气 3=神',
  shield_absorbed BIGINT          NOT NULL DEFAULT 0                 COMMENT '护盾吸收量',
  hp_damage       BIGINT          NOT NULL DEFAULT 0                 COMMENT '打到本体的伤害',
  is_fatal        TINYINT(1)      NOT NULL DEFAULT 0                 COMMENT '是否致死（HP归零，进入死亡流程）',
  triggered_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '触发时间',
  INDEX idx_char_time (character_id, triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='天雷处罚日志表：公敌天雷懒结算记录（技术方案5.2）';

-- ─────────────────────────────────────
--  7. ALTER character_death_state: 尸修 + 夺舍倒计时字段（幂等增列）
--  corpse_mode：尸修状态（PRD：神→0永久、精=原精+floor(神×2/3)、气=floor(气/3)、
--               尸修无法夺舍、异常抵抗=0；与鬼修 ghost_mode 互斥）。
--  possess_deadline：夺舍30分钟倒计时截止（PRD：超时=夺舍失败→强制轮回），
--               发起夺舍时写 NOW()+30分钟，结算时懒判定超时。
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS v5_alter_death_state;

DELIMITER $$
CREATE PROCEDURE v5_alter_death_state()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_death_state' AND COLUMN_NAME = 'corpse_mode'
  ) THEN
    ALTER TABLE character_death_state
      ADD COLUMN corpse_mode TINYINT NOT NULL DEFAULT 0 COMMENT '尸修状态：0=否 1=尸修中（神=0永久，与鬼修互斥，PRD轮回夺舍章节）' AFTER ghost_mode;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_death_state' AND COLUMN_NAME = 'possess_deadline'
  ) THEN
    ALTER TABLE character_death_state
      ADD COLUMN possess_deadline DATETIME NULL COMMENT '夺舍30分钟倒计时截止时间（NULL=无进行中的夺舍；超时结算为失败→强制轮回）' AFTER possess_count;
  END IF;

  -- 幂等补索引：公敌天雷懒结算高频查询 WHERE is_public_enemy=1
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_death_state' AND INDEX_NAME = 'idx_public_enemy'
  ) THEN
    ALTER TABLE character_death_state ADD INDEX idx_public_enemy (is_public_enemy);
  END IF;
END$$
DELIMITER ;

CALL v5_alter_death_state();
DROP PROCEDURE IF EXISTS v5_alter_death_state;

-- ─────────────────────────────────────
--  8. ALTER heritage_ruins: 秘境密码/资产构成/打破门槛字段（幂等增列）
--  PRD 轮回秘境：
--    - 秘境资产构成 = 灵石×1/3 + 材料×2/3（死亡时从角色资产划入）
--    - 可设中文密码（继承时验证；原主人免密码）
--    - 秘境在死亡地点，带过期时间（老列 expires_at 已有，7天）
--    - 他人打破门槛 = 死亡时境界对应的 3修（人阶/真人）或 5修（地仙及以上）
--      裸装100级攻击力（break_threshold 由服务端按境界计算后落库）
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS v5_alter_heritage_ruins;

DELIMITER $$
CREATE PROCEDURE v5_alter_heritage_ruins()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'heritage_ruins' AND COLUMN_NAME = 'password'
  ) THEN
    ALTER TABLE heritage_ruins
      ADD COLUMN password VARCHAR(64) NULL COMMENT '秘境密码（可中文，NULL=未设密码；原主人继承免密码）' AFTER restriction_level;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'heritage_ruins' AND COLUMN_NAME = 'stone_amount'
  ) THEN
    ALTER TABLE heritage_ruins
      ADD COLUMN stone_amount BIGINT NOT NULL DEFAULT 0 COMMENT '存入的灵石数量（死亡时角色灵石的1/3，PRD资产构成）' AFTER password;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'heritage_ruins' AND COLUMN_NAME = 'material_json'
  ) THEN
    ALTER TABLE heritage_ruins
      ADD COLUMN material_json TEXT NULL COMMENT '存入的材料清单JSON（死亡时角色各材料的2/3），格式[{"item_id":3001,"count":4}]' AFTER stone_amount;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'heritage_ruins' AND COLUMN_NAME = 'break_threshold'
  ) THEN
    ALTER TABLE heritage_ruins
      ADD COLUMN break_threshold BIGINT NOT NULL DEFAULT 0 COMMENT '他人打破门槛攻击力（死亡时境界对应3修/5修裸装100级攻击力，服务端计算）' AFTER material_json;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'heritage_ruins' AND COLUMN_NAME = 'zone_id'
  ) THEN
    ALTER TABLE heritage_ruins
      ADD COLUMN zone_id TINYINT NOT NULL DEFAULT 2 COMMENT '秘境所在分区（死亡地点归属Zone）' AFTER break_threshold;
  END IF;
END$$
DELIMITER ;

CALL v5_alter_heritage_ruins();
DROP PROCEDURE IF EXISTS v5_alter_heritage_ruins;

-- ─────────────────────────────────────
--  9. ALTER character_attributes: last_combat_time（护盾脱战懒结算锚点）
--  PRD：护盾脱战5秒后按 (精+气+神)×2/秒 恢复。
--  结算制实现：任何一次进入战斗（/combat/skill 攻防双方、受天雷）都刷新
--  last_combat_time=NOW()；/combat/shield/settle 懒结算时可回收秒数 =
--  NOW() - last_combat_time - 5秒延迟，结算后把锚点推进到 NOW()-5秒防重复计费。
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS v5_alter_char_attrs;

DELIMITER $$
CREATE PROCEDURE v5_alter_char_attrs()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'last_combat_time'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN last_combat_time DATETIME NULL COMMENT '最近一次进入战斗时间（护盾脱战懒结算锚点，NULL=从未战斗视为已脱战）';
  END IF;
END$$
DELIMITER ;

CALL v5_alter_char_attrs();
DROP PROCEDURE IF EXISTS v5_alter_char_attrs;

-- ─────────────────────────────────────
--  10. ALTER faction_instance: zone_id（怪物 zone 过滤，向后兼容）
--  既有100族群默认归入 Zone2 外围原野；后续世界扩展可把部分族群改到 Zone3。
--  /monster/list 新增可选参数 zone_id，通过本列联查过滤；不传则行为不变。
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS v5_alter_faction;

DELIMITER $$
CREATE PROCEDURE v5_alter_faction()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faction_instance' AND COLUMN_NAME = 'zone_id'
  ) THEN
    ALTER TABLE faction_instance
      ADD COLUMN zone_id TINYINT NOT NULL DEFAULT 2 COMMENT '所属地图分区：2=外围原野（默认） 3=深处峡谷（map_zone_config.zone_id）';
  END IF;
END$$
DELIMITER ;

CALL v5_alter_faction();
DROP PROCEDURE IF EXISTS v5_alter_faction;

-- ─────────────────────────────────────
--  11. ALTER public_enemy_state: next_thunder_at 索引（天雷懒结算查询加速）
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS v5_alter_public_enemy;

DELIMITER $$
CREATE PROCEDURE v5_alter_public_enemy()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'public_enemy_state' AND INDEX_NAME = 'idx_next_thunder'
  ) THEN
    ALTER TABLE public_enemy_state ADD INDEX idx_next_thunder (next_thunder_at);
  END IF;
END$$
DELIMITER ;

CALL v5_alter_public_enemy();
DROP PROCEDURE IF EXISTS v5_alter_public_enemy;
