-- ═══════════════════════════════════════════
--  寻仙 - 花果山副本数据库建表脚本
--  MySQL 8.0+ / utf8mb4
--  严格按照《花果山副本技术方案》第2章 + 《花果山副本设计文档 V3》实现
--
--  9张核心表：
--    1. dungeon_scene_session    场景会话表
--    2. player_fatigue           玩家牢结值当前状态表
--    3. fatigue_log              牢结值每日日志表
--    4. player_inventory         玩家背包表
--    5. dungeon_death_desc       死亡方式配置表
--    6. dungeon_reward_pool      奖励池配置表
--    7. dungeon_reward_item      奖励池物品明细表
--    8. dungeon_reward_grant     奖励发放记录表
--    9. unique_reward_claim      唯一性奖励领取记录表
-- ═══════════════════════════════════════════

USE game_main;

-- ─────────────────────────────────────
--  1. dungeon_scene_session: 场景会话表（技术方案 P37-P51）
--  记录一次进入副本的完整会话：进出时间、抽中身份、结局、奖励等
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dungeon_scene_session (
  session_id     BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '会话唯一ID，自增主键',
  player_id      BIGINT UNSIGNED NOT NULL                    COMMENT '玩家ID（=account_id或character_id，此处采用account_id以对应技术方案）',
  scene_id       INT             NOT NULL DEFAULT 1          COMMENT '场景ID：1=花果山副本',
  role_type      TINYINT         NOT NULL                    COMMENT '抽中身份：1=孙悟空 2=混世魔王 3=魔王手下 4=普通猴子 5=老猴子 6=草木石头',
  luck_snapshot  DECIMAL(4,2)    DEFAULT 0.00                COMMENT '入场时运气值快照，用于反查计算过程',
  enter_x        DECIMAL(8,4)    DEFAULT 0                   COMMENT '进入时的世界地图X坐标（用于结算后返回）',
  enter_y        DECIMAL(8,4)    DEFAULT 0                   COMMENT '进入时的世界地图Y坐标',
  start_at       DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '进入副本时间',
  end_at         DATETIME        DEFAULT NULL                COMMENT '结算时间（结束时填写）',
  duration_sec   INT             DEFAULT 0                   COMMENT '实际存活时长（秒），结算时填写',
  outcome        TINYINT         DEFAULT 0                   COMMENT '结局：0=进行中 1=完胜 2=受伤 3=死亡 4=生存成功 5=观测完成 6=剧情死亡(魔王撑满)',
  grade          CHAR(1)         DEFAULT NULL                COMMENT '评级：S/A/B/C/D（PRD 11.4 评级标准）',
  death_id       INT             DEFAULT NULL                COMMENT '死亡方式ID，关联 dungeon_death_desc.death_id（死亡时填写）',
  death_text     VARCHAR(256)    DEFAULT NULL                COMMENT '实际死亡文本（快照，防死亡描述表变更导致历史记录变化）',
  comment_text   VARCHAR(256)    DEFAULT NULL                COMMENT '结算评语（大圣的三种评语从PRD表4随机抽取）',
  observe_score  INT             DEFAULT 0                   COMMENT '观测度（草木石头专用，0-100）',
  boss_hp_left   INT             DEFAULT 0                   COMMENT '结算时Boss剩余HP百分比（大圣战判定完胜/受伤用）',
  self_hp_left   INT             DEFAULT 0                   COMMENT '结算时自身剩余HP百分比（用于评级）',
  reward_json    TEXT            DEFAULT NULL                COMMENT '实际发放的奖励列表JSON：[{"item_id":x,"qty":n},...]',
  created_at     DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '记录创建时间',
  INDEX idx_player_time (player_id, start_at),
  INDEX idx_role_outcome (role_type, outcome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='花果山副本场景会话表：单次副本从进入到结算的完整记录';

-- ─────────────────────────────────────
--  2. player_fatigue: 玩家牢结值当前状态表（PRD 第9章 + 技术方案第5章）
--  每玩家一行，记录当日剩余牢结值。凌晨3:00定时任务重置为18000秒。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_fatigue (
  player_id       BIGINT UNSIGNED PRIMARY KEY               COMMENT '玩家ID（=account_id）',
  remaining_sec   INT             NOT NULL DEFAULT 18000    COMMENT '当日剩余牢结值(秒)，5小时=18000秒',
  daily_max_sec   INT             NOT NULL DEFAULT 18000    COMMENT '当日上限(秒)，普通玩家18000，VIP可扩展',
  last_reset_date DATE            NOT NULL                  COMMENT '最后一次重置日期（每日凌晨3:00按此比对触发重置）',
  is_penalty      TINYINT         NOT NULL DEFAULT 0        COMMENT '是否处于牢结耗尽负状态：0=正常 1=负状态（属性降80%/移动减半/不可进副本）',
  meditate_start  DATETIME        DEFAULT NULL              COMMENT '打坐开始时间，NULL=未打坐',
  updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='玩家牢结值当前状态表：每日在线时间牢结值管理，耗尽触发负状态';

-- ─────────────────────────────────────
--  3. fatigue_log: 牢结值每日日志表（技术方案 P52-P59）
--  按玩家×日期存一行，记录当日消耗/恢复。用于统计和审计。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS fatigue_log (
  log_id       BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  player_id    BIGINT UNSIGNED NOT NULL                    COMMENT '玩家ID',
  log_date     DATE            NOT NULL                    COMMENT '日期（yyyy-mm-dd）',
  online_sec   INT             DEFAULT 0                   COMMENT '当日在线时长（秒）',
  consume_sec  INT             DEFAULT 0                   COMMENT '当日消耗牢结值（秒）',
  recover_sec  INT             DEFAULT 0                   COMMENT '当日打坐恢复牢结值（秒）',
  item_recover INT             DEFAULT 0                   COMMENT '当日通过恢复道具获得的牢结值（秒）',
  enter_count  INT             DEFAULT 0                   COMMENT '当日进入副本次数',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  UNIQUE KEY uk_player_date (player_id, log_date),
  INDEX idx_date (log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='牢结值每日日志表：按玩家×日期记录消耗/恢复，用于统计与审计';

-- ─────────────────────────────────────
--  4. player_inventory: 玩家背包表（技术方案 P60-P68）
--  存储副本奖励发放到的物品。同一物品同一来源可合并，避免行数爆炸。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_inventory (
  inv_id       BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '背包记录ID',
  player_id    BIGINT UNSIGNED NOT NULL                    COMMENT '玩家ID',
  item_id      INT             NOT NULL                    COMMENT '物品ID（游戏配置表定义）',
  item_type    TINYINT         NOT NULL                    COMMENT '物品类型：1=普通材料 2=稀有材料 3=功法残卷 4=兵器残块 5=铠甲残块 6=唯一性(悟性+0.1)',
  quantity     INT             NOT NULL DEFAULT 1          COMMENT '数量',
  source       VARCHAR(32)     DEFAULT NULL                COMMENT '来源标记，如 huaguoshan_wukong / huaguoshan_grass',
  obtained_at  DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '首次获得时间',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后堆叠时间',
  UNIQUE KEY uk_player_item_source (player_id, item_id, source),
  INDEX idx_player_type (player_id, item_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='玩家背包表：副本奖励发放到此，同物品同来源自动堆叠';

-- ─────────────────────────────────────
--  5. dungeon_death_desc: 死亡方式配置表（技术方案 P69-P74 + PRD 第5-8章）
--  存储角色特定的死亡描述文本，结算时按 role_type 随机抽取一条。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dungeon_death_desc (
  death_id      INT             PRIMARY KEY AUTO_INCREMENT COMMENT '死亡方式ID',
  role_type     TINYINT         NOT NULL                   COMMENT '所属角色：1=孙悟空 2=混世魔王 3=手下 4=猴子 5=老猴 6=草木石头',
  category      VARCHAR(16)     DEFAULT NULL               COMMENT '死亡分类：被大圣攻击/被魔王攻击/被波及/环境等',
  description   VARCHAR(256)    NOT NULL                   COMMENT '死亡描述文本（PRD 5.2/6.2/7.2/8.3 摘录）',
  weight        INT             DEFAULT 1                  COMMENT '抽取权重，越大越常见（默认1即均等）',
  enabled       TINYINT         DEFAULT 1                  COMMENT '是否启用：0=禁用 1=启用',
  INDEX idx_role_enabled (role_type, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='花果山副本死亡方式配置表：各角色专属死亡描述池';

-- ─────────────────────────────────────
--  6. dungeon_reward_pool: 奖励池配置表（技术方案 P179-P193）
--  一个奖励池对应一个 (role_type, outcome, grade) 组合。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dungeon_reward_pool (
  pool_id      INT             PRIMARY KEY AUTO_INCREMENT COMMENT '奖励池ID',
  role_type    TINYINT         NOT NULL                   COMMENT '角色类型：1-6，同 dungeon_scene_session.role_type',
  outcome      TINYINT         NOT NULL                   COMMENT '结局：1=完胜 2=受伤 3=死亡 4=生存成功 5=观测完成 6=剧情死亡',
  grade        CHAR(1)         DEFAULT NULL               COMMENT '评级（可空，为空表示不区分评级）',
  pool_name    VARCHAR(64)     DEFAULT NULL               COMMENT '奖励池名称，如 "大圣完胜奖励池"',
  enabled      TINYINT         DEFAULT 1                  COMMENT '是否启用',
  UNIQUE KEY uk_role_outcome_grade (role_type, outcome, grade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='花果山副本奖励池配置表：按角色+结局+评级组合定义奖励规则';

-- ─────────────────────────────────────
--  7. dungeon_reward_item: 奖励池物品明细表
--  一个奖励池包含若干个物品条目，每个条目定义抽取权重、数量范围、独立概率。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dungeon_reward_item (
  item_row_id  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '明细行ID',
  pool_id      INT             NOT NULL                   COMMENT '所属奖励池ID',
  item_id      INT             NOT NULL                   COMMENT '物品ID',
  item_type    TINYINT         NOT NULL                   COMMENT '物品类型（同player_inventory.item_type）',
  qty_min      INT             NOT NULL DEFAULT 1         COMMENT '数量下限（含）',
  qty_max      INT             NOT NULL DEFAULT 1         COMMENT '数量上限（含）',
  drop_rate    DECIMAL(5,4)    NOT NULL DEFAULT 1.0000    COMMENT '独立掉率(0-1.0)，1.0=必掉',
  is_unique    TINYINT         DEFAULT 0                  COMMENT '是否唯一性物品：1=需查 unique_reward_claim',
  INDEX idx_pool (pool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='花果山副本奖励池物品明细表：定义每个池内的物品与掉率';

-- ─────────────────────────────────────
--  8. dungeon_reward_grant: 奖励发放记录表
--  每次结算发出的奖励逐条落库，用于审计与售后。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dungeon_reward_grant (
  grant_id     BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '发放记录ID',
  session_id   BIGINT UNSIGNED NOT NULL                    COMMENT '关联的会话ID',
  player_id    BIGINT UNSIGNED NOT NULL                    COMMENT '玩家ID',
  item_id      INT             NOT NULL                    COMMENT '物品ID',
  quantity     INT             NOT NULL                    COMMENT '实际发放数量',
  is_unique    TINYINT         DEFAULT 0                   COMMENT '是否唯一性物品',
  granted_at   DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '发放时间',
  INDEX idx_session (session_id),
  INDEX idx_player_time (player_id, granted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='花果山副本奖励发放记录表：每条奖励逐行落库便于审计';

-- ─────────────────────────────────────
--  9. unique_reward_claim: 唯一性奖励领取记录表（技术方案 P194-P197）
--  悟性+0.1 全服限量。Redis 分布式锁保证原子性，MySQL 表用于持久化。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS unique_reward_claim (
  claim_id     BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '领取记录ID',
  reward_key   VARCHAR(64)     NOT NULL                    COMMENT '唯一性奖励Key，如 comprehension_boost_v1',
  player_id    BIGINT UNSIGNED NOT NULL                    COMMENT '获得玩家ID',
  session_id   BIGINT UNSIGNED NOT NULL                    COMMENT '触发会话ID',
  claimed_at   DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '领取时间',
  UNIQUE KEY uk_reward_key (reward_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='唯一性奖励领取记录表：全服限量物品的分布式锁持久化记录';

-- ═══════════════════════════════════════════
--  初始配置数据插入
--  只插入代表性条目，实际100/54/16/20种死亡方式请通过运营配置工具批量导入
-- ═══════════════════════════════════════════

-- ── 5.1 死亡方式配置：孙悟空（3条评语用于评级评语，非死亡） ──
--   大圣的评语走 comment_text 字段，不放入本表

-- ── 5.2 死亡方式配置：混世魔王（1条剧情死亡） ──
INSERT IGNORE INTO dungeon_death_desc (death_id, role_type, category, description, weight) VALUES
  (2001, 2, '剧情死亡', '大圣三阶段爆发，一棍扫来天地失色，混世魔王重伤跪地，不甘地嘶吼一声化作飞灰', 1);

-- ── 5.3 死亡方式配置：魔王手下（PRD表7节选前12条） ──
INSERT IGNORE INTO dungeon_death_desc (death_id, role_type, category, description, weight) VALUES
  (3001, 3, '被大圣攻击', '被大圣一棍扫飞，撞在山壁上成饼',                 1),
  (3002, 3, '被大圣攻击', '被金箍棒压成肉饼，眼珠子凸出',                   1),
  (3003, 3, '被大圣攻击', '被火眼金睛一照，燃成焦炭',                       1),
  (3004, 3, '被大圣攻击', '大圣筋斗云冲撞过，身体被撕成两半',               1),
  (3005, 3, '被大圣攻击', '被七十二变的分身围殴致死',                       1),
  (3006, 3, '被大圣攻击', '大圣一个定身术，就在那站着不动了',               1),
  (3007, 3, '被大圣攻击', '被毫毛变出的小猴子活活咬死',                     1),
  (3008, 3, '被大圣攻击', '被金箍棒扫中脚腕，血流如注',                     1),
  (3009, 3, '被大圣攻击', '被大圣扔出去的石头砸成脑浆',                     1),
  (3010, 3, '被大圣攻击', '大圣一踏，胸骨全碎',                             1),
  (3011, 3, '被大圣攻击', '被金箍棒的棒尾扫中后脑，直接飞出去',             1),
  (3012, 3, '被大圣攻击', '被大圣的怒吼震慑，耳膜破裂流血',                 1);

-- ── 5.4 死亡方式配置：普通猴子（PRD表8节选前12条） ──
INSERT IGNORE INTO dungeon_death_desc (death_id, role_type, category, description, weight) VALUES
  (4001, 4, '被魔王攻击', '被魔王一掌打成肉饼',                             1),
  (4002, 4, '被魔王攻击', '被魔王的护体金光照瞎了眼，焉撞撞在山壁上',       1),
  (4003, 4, '被魔王攻击', '被魔王的兵器风压切成两半',                       1),
  (4004, 4, '被魔王攻击', '被魔王踢飞，撞在尖峰上成了串',                   1),
  (4005, 4, '被魔王攻击', '被魔王的法力震碎五脏六腑',                       1),
  (4006, 4, '被手下攻击', '被魔王手下一刀砍成两截',                         1),
  (4007, 4, '被魔王攻击', '被魔王的黑雾吻住，窒息而亡',                     1),
  (4008, 4, '被魔王攻击', '被魔王的魔气打入体内，细胞碎裂',                 1),
  (4009, 4, '被魔王攻击', '被魔王的魔影分身围殴致死',                       1),
  (4010, 4, '被魔王攻击', '被魔王的魔焰燃烧成灰烬',                         1),
  (4011, 4, '被魔王攻击', '被魔王的魔霹雳劈成焦炭',                         1),
  (4012, 4, '被魔王攻击', '被魔王的魔法币打穿了头颅',                       1);

-- ── 5.5 死亡方式配置：老猴子（PRD表9节选） ──
INSERT IGNORE INTO dungeon_death_desc (death_id, role_type, category, description, weight) VALUES
  (5001, 5, '被魔王攻击', '被魔王的魔气震碎了老骨头',                       1),
  (5002, 5, '被魔王攻击', '被魔王一掌打飞，撞在树上成了串',                 1),
  (5003, 5, '被魔王攻击', '被魔王的魔气打入体内，细胞碎裂',                 1),
  (5004, 5, '被魔王攻击', '被魔王的魔焰燃烧成灰烬',                         1),
  (5005, 5, '被魔王攻击', '被魔王的魔霹雳劈成焦炭',                         1),
  (5006, 5, '被魔王攻击', '被魔王的魔气压成肉饼',                           1),
  (5007, 5, '被魔王攻击', '被魔王的魔影切成碎块',                           1),
  (5008, 5, '被魔王攻击', '被魔王的魔炎燃烧成灰烬',                         1),
  (5009, 5, '被魔王攻击', '被魔王的魔雷劈成焦炭',                           1),
  (5010, 5, '被魔王攻击', '被魔王的魔风吻寂比成了冰雕',                     1);

-- ── 5.6 死亡方式配置：草木石头（PRD表11节选） ──
INSERT IGNORE INTO dungeon_death_desc (death_id, role_type, category, description, weight) VALUES
  (6001, 6, '战斗波及', '被大圣与魔王交手的余波及打碎',                     1),
  (6002, 6, '战斗波及', '被金箍棒扫飞的碎石击中',                           1),
  (6003, 6, '战斗波及', '被魔王的魔气波及压碎',                             1),
  (6004, 6, '战斗波及', '被火眼金睛的火焰烧成灰烬',                         1),
  (6005, 6, '战斗波及', '被魔王的魔焰燃烧成灰烬',                           1),
  (6006, 6, '战斗波及', '被大圣的法力震碎',                                 1),
  (6007, 6, '战斗波及', '被魔王的魔霹雳劈成焦炭',                           1),
  (6008, 6, '战斗波及', '被大圣召唤的风暴吸走',                             1),
  (6009, 6, '战斗波及', '被魔王的魔气波及打碎',                             1),
  (6010, 6, '战斗波及', '被金箍棒重量压在地上，压成了粉末',                 1);

-- ═══════════════════════════════════════════
--  6-7. 奖励池与物品配置（按技术方案表6配置）
--
--  物品ID设计约定：
--    10001 普通材料  10002 稀有材料
--    20001 功法残卷  30001 魔王兵器残块  30002 魔王铠甲残块
--    90001 悟性+0.1（唯一性）
-- ═══════════════════════════════════════════

-- ── 6.1 大圣完胜奖励池 ──
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (101, 1, 1, 'S', '大圣·完胜奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (10101, 101, 20001, 3, 5, 5, 1.0000),
  (10102, 101, 10002, 2, 3, 3, 1.0000),
  (10103, 101, 10001, 1, 5, 5, 1.0000);

-- ── 6.2 大圣受伤奖励池 ──
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (102, 1, 2, 'A', '大圣·受伤奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (10201, 102, 20001, 3, 2, 2, 1.0000),
  (10202, 102, 10001, 1, 3, 3, 1.0000);

-- ── 6.3 大圣死亡奖励池 ──
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (103, 1, 3, 'D', '大圣·死亡奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (10301, 103, 10001, 1, 1, 1, 1.0000);

-- ── 6.4 魔王剧情死亡奖励池（撑满5分钟） ──
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (201, 2, 6, 'S', '魔王·坚持到底奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (20101, 201, 30001, 4, 2, 2, 1.0000),
  (20102, 201, 30002, 5, 2, 2, 1.0000),
  (20103, 201, 10001, 1, 3, 3, 1.0000);

-- ── 6.5 魔王被大圣打死奖励池 ──
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (202, 2, 3, 'D', '魔王·被打死奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (20201, 202, 30001, 4, 1, 1, 1.0000),
  (20202, 202, 10001, 1, 1, 1, 1.0000);

-- ── 6.6 手下/猴子/老猴 生存成功奖励池（角色差异化） ──
-- 魔王手下 生存
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (301, 3, 4, NULL, '手下·生存奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (30101, 301, 10001, 1, 3, 5, 1.0000),
  (30102, 301, 10002, 2, 1, 1, 0.3000);
-- 手下 死亡
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (302, 3, 3, NULL, '手下·死亡奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (30201, 302, 10001, 1, 1, 2, 1.0000);

-- 普通猴子 生存
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (401, 4, 4, NULL, '普通猴子·生存奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (40101, 401, 10001, 1, 3, 5, 1.0000),
  (40102, 401, 10002, 2, 1, 1, 0.3000);
-- 普通猴子 死亡
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (402, 4, 3, NULL, '普通猴子·死亡奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (40201, 402, 10001, 1, 1, 2, 1.0000);

-- 老猴子 生存
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (501, 5, 4, NULL, '老猴子·生存奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (50101, 501, 10001, 1, 3, 5, 1.0000),
  (50102, 501, 10002, 2, 1, 2, 0.6000),
  (50103, 501, 20001, 3, 1, 1, 0.2000);
-- 老猴子 死亡
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (502, 5, 3, NULL, '老猴子·死亡奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (50201, 502, 10001, 1, 2, 3, 1.0000),
  (50202, 502, 10002, 2, 1, 1, 0.3000);

-- ── 6.7 草木石头 观测完成奖励池（按观测度分层） ──
-- 观测度100% -> 有唯一性物品抽奖
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (601, 6, 5, 'S', '草木石头·观测100%奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate, is_unique) VALUES
  (60101, 601, 10001, 1, 3, 5, 0.9000, 0),
  (60102, 601, 20001, 3, 1, 1, 0.0400, 0),
  (60103, 601, 30001, 4, 1, 1, 0.0500, 0),
  (60104, 601, 90001, 6, 1, 1, 0.0100, 1);
-- 观测度75% A级
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (602, 6, 5, 'A', '草木石头·观测75%奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (60201, 602, 10001, 1, 2, 4, 0.9000),
  (60202, 602, 20001, 3, 1, 1, 0.0300),
  (60203, 602, 30001, 4, 1, 1, 0.0400);
-- 观测度50% B级
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (603, 6, 5, 'B', '草木石头·观测50%奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (60301, 603, 10001, 1, 2, 3, 0.9500),
  (60302, 603, 20001, 3, 1, 1, 0.0200);
-- 观测度25% C级
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (604, 6, 5, 'C', '草木石头·观测25%奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (60401, 604, 10001, 1, 1, 2, 1.0000);
-- 观测度<25% D级（未完成即被波及打死）
INSERT IGNORE INTO dungeon_reward_pool (pool_id, role_type, outcome, grade, pool_name, enabled) VALUES
  (605, 6, 3, 'D', '草木石头·被击碎奖励池', 1);
INSERT IGNORE INTO dungeon_reward_item (item_row_id, pool_id, item_id, item_type, qty_min, qty_max, drop_rate) VALUES
  (60501, 605, 10001, 1, 1, 1, 1.0000);

-- ═══════════════════════════════════════════
--  完成
-- ═══════════════════════════════════════════
