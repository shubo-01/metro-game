-- ═══════════════════════════════════════════════════════════════
--  基础UI交互逻辑 数据库迁移脚本 V6
--  依据：《基础UI交互逻辑PRD》《基础UI交互逻辑-技术文档》
--  （两份文档原文为唯一数值权威，本文件所有数值均摘自文档表格）
--
--  【重要隔离说明】
--  1. 本迁移只服务两个既有服务的增量扩展：
--     character-service(8005 设置/引导) / equipment-service(8009 背包/商店)。
--     gongfa/shenwei/dungeon/monster/death/scene 六包及其表【零改动】。
--  2. 与既有系统的关系：
--     - 物品存储复用 player_inventory（huaguoshan_dungeon.sql 老表）与
--       char_currency（v3_shenwei_system.sql 老表灵石余额），不新建物品表。
--     - 商店"铁"复用采集系统既有物品ID 3003（碎铁），避免同物双ID双账本。
--     - 背包容量沿用装备系统（基础20格+腰带扩展，/inventory/capacity）；
--       PRD 图7-1 的"背包（30格）"是 UI 展示网格规格，不改后端容量口径。
--  3. 【偏离文档说明·既定裁决】技术文档 6.1 UIPanelService（面板状态服务端
--     RPC）与 6.2 DamageNumberService（伤害数字 Redis 队列 damage_queue:*）
--     均【不做后端实现】：单机环境无跨端恢复需求，伤害数据已在
--     /combat/cast、/combat/skill 响应中返回，由前端 PanelManager 单例与
--     伤害数字对象池承担（与此前否决 Redis 缓存层的裁决一致）。
--     因此本文件不建面板状态表、不建伤害数字队列（技术文档第3章的
--     "伤害数字队列表(Redis)"注释本身也声明非 MySQL 表）。
--
--  【幂等性】本文件可连续执行两遍无错：
--    - 建表全部 CREATE TABLE IF NOT EXISTS
--    - 种子数据全部 INSERT IGNORE
--
--  执行方式（含中文，必须用 source 方式执行，不能用管道以免乱码）：
--    mysql.exe --default-character-set=utf8mb4 -u root -p game_main
--      -e "source e:/ziji-xiaochengxu/sql/migrations/v6_ui_system.sql"
--
--  内容概览：
--    1. player_settings      玩家设置表（画面/音效/操作/游戏四类，技术文档3章DDL）
--    2. tutorial_progress    新手引导进度表（技术文档3章DDL）
--    3. tutorial_step_config 引导步骤配置表（技术文档2.2结构体 + PRD 4.2步骤表）
--    4. shop_item_config     商店商品配置表（PRD 8.1面板布局商品清单 + 8.2买卖规则）
--    5. item_use_config      消耗品使用效果配置表（PRD 9.1：凡品药回复精×5、CD 10秒）
--    6. player_item_cd       玩家消耗品CD表（使用CD的延迟结算锚点，无定时器）
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
--  1. player_settings: 玩家设置表
--  列清单与默认值全部取自技术文档第3章 DDL 原文（18列+updated_at）；
--  取值范围取自 PRD 第5章四张设置表：
--    画面：画质 低/中/高/极高(0-3)、帧率 30/60/120、特效 最简/简化/全(0-2)、震动 开/关
--    音效：背景音乐/技能音效/环境音效 0-100、语音 开/关
--    操作：摇杆灵敏度 1-10、释放方式 拖拽/点击(0-1)、自动普攻 开/关、
--          锁定目标 最近/血量最低/手动(0-2)、翻滚方式 独立按钮/双击摇杆(0-1)
--    游戏：自动拾取 开/关、伤害数字 开/关、其他玩家特效 关/简化/全(0-2)、
--          新手引导跳过（不可恢复，只能 0→1）
--  player_id 即 character_base.character_id（设置按角色存，与引导进度同口径）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_settings (
  player_id            BIGINT UNSIGNED PRIMARY KEY        COMMENT '玩家角色ID，关联character_base.character_id，一人一行',
  graphics_quality     TINYINT    NOT NULL DEFAULT 2      COMMENT '画质：0=低 1=中 2=高 3=极高（PRD 5.1，默认高）',
  target_fps           INT        NOT NULL DEFAULT 60     COMMENT '帧率：仅允许30/60/120（PRD 5.1，默认60）',
  effect_level         TINYINT    NOT NULL DEFAULT 2      COMMENT '特效显示：0=最简 1=简化 2=全（PRD 5.1，默认全）',
  screen_shake         TINYINT(1) NOT NULL DEFAULT 1      COMMENT '屏幕震动：0=关 1=开（暴击/破盾震动，PRD 5.1，默认开）',
  bgm_volume           INT        NOT NULL DEFAULT 80     COMMENT '背景音乐音量：0-100（PRD 5.2，默认80）',
  skill_volume         INT        NOT NULL DEFAULT 80     COMMENT '技能音效音量：0-100（PRD 5.2，默认80）',
  env_volume           INT        NOT NULL DEFAULT 60     COMMENT '环境音效音量：0-100（PRD 5.2，默认60）',
  voice_enabled        TINYINT(1) NOT NULL DEFAULT 1      COMMENT '角色语音：0=关 1=开（PRD 5.2，默认开）',
  joystick_sensitivity INT        NOT NULL DEFAULT 5      COMMENT '摇杆灵敏度：1-10（PRD 5.3，默认5）',
  skill_cast_mode      TINYINT    NOT NULL DEFAULT 0      COMMENT '技能释放方式：0=拖拽 1=点击简单模式（自动选最近敌人方向，PRD 5.3）',
  auto_attack          TINYINT(1) NOT NULL DEFAULT 0      COMMENT '自动普攻：0=关 1=开（点击后自动持续普攻最近敌人，PRD 5.3，默认关）',
  target_lock_mode     TINYINT    NOT NULL DEFAULT 0      COMMENT '锁定目标：0=最近 1=血量最低 2=手动（PRD 5.3，默认最近）',
  dodge_mode           TINYINT    NOT NULL DEFAULT 0      COMMENT '翻滚方式：0=独立按钮 1=双击摇杆（PRD 5.3，默认独立按钮）',
  auto_pickup          TINYINT(1) NOT NULL DEFAULT 1      COMMENT '自动拾取：0=关 1=开（掉落物自动入背包，PRD 5.4，默认开）',
  show_damage_numbers  TINYINT(1) NOT NULL DEFAULT 1      COMMENT '伤害数字显示：0=关 1=开（关闭后纯看特效，PRD 5.4，默认开）',
  other_player_effects TINYINT    NOT NULL DEFAULT 2      COMMENT '其他玩家特效：0=关 1=简化 2=全（多人场景特效控制，PRD 5.4，默认全）',
  tutorial_skipped     TINYINT(1) NOT NULL DEFAULT 0      COMMENT '新手引导跳过：0=否 1=已跳过（PRD 4.5/5.4：跳过后不可恢复，只允许0→1）',
  updated_at           DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='玩家设置表：画面/音效/操作/游戏四类设置项（技术文档第3章DDL）';

-- ─────────────────────────────────────
--  2. tutorial_progress: 新手引导进度表
--  技术文档第3章 DDL 原文列清单（player_id/current_step/is_skipped/
--  is_completed/dungeon_completed/reward_claimed/updated_at）。
--  状态机（技术文档4.2）：未开始(无行或step=0) → 进行中 → 已完成(发奖励)
--                                                └→ 已跳过(不可恢复，不发奖励)
--  current_step 语义：已完成的最后一个步骤ID，0=未开始；
--  推进校验：只能完成 current_step+1 的步骤（非法跳步错误码6402）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutorial_progress (
  player_id         BIGINT UNSIGNED PRIMARY KEY        COMMENT '玩家角色ID，关联character_base.character_id，一人一行',
  current_step      INT        NOT NULL DEFAULT 0      COMMENT '已完成的最后步骤ID（0=未开始，只能逐步+1推进）',
  is_skipped        TINYINT(1) NOT NULL DEFAULT 0      COMMENT '是否已跳过：1=已跳过（PRD 4.5：不可恢复、不发奖励）',
  is_completed      TINYINT(1) NOT NULL DEFAULT 0      COMMENT '是否已完成：1=全部步骤完成或已跳过（技术文档5.3 SkipTutorial 也置完成）',
  dungeon_completed TINYINT(1) NOT NULL DEFAULT 0      COMMENT '斜月三星洞完整教程副本是否完成（技术文档3章DDL，副本可选，PRD 4.6）',
  reward_claimed    TINYINT(1) NOT NULL DEFAULT 0      COMMENT '引导奖励是否已发放：1=已发（防重复领取，错误码6403）',
  updated_at        DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变动时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新手引导进度表：Zone1营地极简教程推进状态（技术文档第3章DDL）';

-- ─────────────────────────────────────
--  3. tutorial_step_config: 引导步骤配置表
--  列结构取自技术文档 2.2 TutorialStep 结构体原文
--  （step_id/type/highlight_target/arrow_target/tip_text/complete_condition/next_step）；
--  步骤内容取自 PRD 4.2 "Zone 1营地极简教程（2分钟）"步骤表原文（共4步）。
--  引导方式（PRD 4.1）：不用弹窗，高亮+箭头+文字提示，每步完成自动进下一步。
--  highlight_target/arrow_target 的元素ID为前端节点命名约定（文档只给了
--  文字描述，具体ID为假设值，可配）；complete_condition 为 JSON 完成条件。
--  step_type：0=对话 1=操作 2=采集 3=战斗（技术文档2.2枚举）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutorial_step_config (
  step_id            INT          PRIMARY KEY        COMMENT '步骤ID（1-4，按PRD 4.2顺序）',
  step_type          TINYINT      NOT NULL DEFAULT 1 COMMENT '步骤类型：0=对话 1=操作 2=采集 3=战斗（技术文档2.2）',
  step_name          VARCHAR(32)  NOT NULL           COMMENT '步骤名称（PRD 4.2"引导内容"列原文）',
  highlight_target   VARCHAR(64)  NOT NULL           COMMENT '高亮目标（UI元素ID/NPC ID，前端节点命名，假设值可配）',
  arrow_target       VARCHAR(64)  NOT NULL           COMMENT '箭头指向目标（同上）',
  tip_text           VARCHAR(128) NOT NULL           COMMENT '文字提示（按PRD 4.2"UI操作"列描述编写）',
  complete_condition VARCHAR(255) NOT NULL           COMMENT '完成条件JSON（前端判定后调advance上报，格式假设值可配）',
  next_step          INT          NOT NULL DEFAULT 0 COMMENT '下一步骤ID（0=引导结束，触发奖励发放）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='引导步骤配置表：Zone1营地极简教程4步（PRD 4.2 + 技术文档2.2）';

-- 种子数据：PRD 4.2 步骤表原文（1长老对话 2前往铁匠铺 3装备武器 4出营地探索）
INSERT IGNORE INTO tutorial_step_config
  (step_id, step_type, step_name, highlight_target, arrow_target, tip_text, complete_condition, next_step) VALUES
(1, 0, '和营地长老对话', 'npc_elder',      'npc_elder',      '长老头顶金色箭头，自动寻路前往对话',       '{"type":"talk","target":"npc_elder"}',       2),
(2, 1, '前往铁匠铺',     'joystick',       'npc_blacksmith', '铁匠头顶箭头，摇杆高亮，走到铁匠铺',       '{"type":"reach","target":"npc_blacksmith"}', 3),
(3, 1, '装备武器',       'btn_inventory',  'btn_inventory',  '背包按钮闪烁，武器高亮，点击装备',         '{"type":"equip","target":"weapon"}',         4),
(4, 1, '出营地探索',     'camp_exit',      'camp_exit',      '营地出口箭头指引，走出营地开始探索',       '{"type":"reach","target":"camp_exit"}',      0);

-- ─────────────────────────────────────
--  4. shop_item_config: 商店商品配置表
--  商品清单与价格取自 PRD 8.1 商店面板布局图原文：
--    凡品药 3灵石 / 挪移符 49灵石 / 铁 1灵石
--  分类取自 PRD 8.1 左侧分类栏：药品/材料/武器/护符（"全部"=不过滤）。
--  买卖规则（PRD 8.2）：购买消耗灵石物品直接入背包；出售价=购买价的50%
--  （小数向下取整为假设值，可配）；部分物品不可出售（任务/绑定物品）。
--  物品ID约定（player_inventory.item_id，与花果山2xxx/采集3xxx错开用4xxx段）：
--    4001凡品药 4002挪移符（新增消耗品）；铁复用采集系统3003（碎铁，同物同ID）。
--    4101凡品木剑：引导奖励"凡品武器"（PRD 4.4/9.2示例名，不上架商店，
--    在此登记仅为出售定价与名称权威；buy 不可购，enabled=0）。
--  item_type 沿用 player_inventory 既有枚举（1=普通材料 2=稀有材料 ...6=唯一性），
--  新增 7=消耗品(药品/符箓) 8=武器物品（新增段为假设值，可配，不与既有1-6冲突）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_item_config (
  shop_item_id INT          PRIMARY KEY AUTO_INCREMENT COMMENT '商店商品ID',
  category     TINYINT      NOT NULL                   COMMENT '商品分类：1=药品 2=材料 3=武器 4=护符（PRD 8.1分类栏，"全部"=不过滤）',
  item_id      INT          NOT NULL                   COMMENT '物品ID（player_inventory.item_id，4xxx=UI系统新增段，3xxx=复用采集物品）',
  item_type    TINYINT      NOT NULL                   COMMENT '物品类型：1=普通材料 7=消耗品 8=武器物品（7/8为新增段，假设值可配）',
  item_name    VARCHAR(32)  NOT NULL                   COMMENT '物品名称（PRD 8.1原文）',
  price        INT          NOT NULL                   COMMENT '购买价（灵石，PRD 8.1原文）',
  sell_price   INT          NOT NULL                   COMMENT '出售价（灵石，=购买价×50%向下取整，PRD 8.2；取整方式为假设值可配）',
  sellable     TINYINT(1)   NOT NULL DEFAULT 1         COMMENT '是否可出售：0=不可（任务物品/绑定物品，PRD 8.2）',
  enabled      TINYINT(1)   NOT NULL DEFAULT 1         COMMENT '是否上架：0=下架（仅作出售定价登记的物品置0）',
  sort_order   INT          NOT NULL DEFAULT 0         COMMENT '列表排序权重（越小越靠前）',
  UNIQUE KEY uk_item (item_id),
  INDEX idx_category (category, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商店商品配置表：杂货商商品清单与买卖价格（PRD 8.1/8.2）';

-- 种子数据：PRD 8.1 商品清单原文三件 + 引导奖励武器登记行（不上架）
INSERT IGNORE INTO shop_item_config
  (shop_item_id, category, item_id, item_type, item_name, price, sell_price, sellable, enabled, sort_order) VALUES
(1, 1, 4001, 7, '凡品药', 3,  1,  1, 1, 10),
(2, 4, 4002, 7, '挪移符', 49, 24, 1, 1, 20),
(3, 2, 3003, 1, '铁',     1,  0,  1, 1, 30),
(4, 3, 4101, 8, '凡品木剑', 10, 5, 1, 0, 40);

-- ───────────────────────────────────
--  5. item_use_config: 消耗品使用效果配置表
--  数值出处 PRD 9.1 举例原文：“点击凡品药 → 使用 → HP恢复精×5=25点
--  （精=5）→ 药品CD开始倒计时10秒”。
--  effect_type：1=恢复HP（effect_param 为精属性倍率）
--               2=前端效果（如挪移符传送，服务端只负责扣数量）
--  挪移符的 CD 文档未给出，暂取0（假设值，可配）。
-- ───────────────────────────────────
CREATE TABLE IF NOT EXISTS item_use_config (
  item_id      INT          PRIMARY KEY        COMMENT '物品ID（player_inventory.item_id）',
  item_name    VARCHAR(32)  NOT NULL           COMMENT '物品名称',
  effect_type  TINYINT      NOT NULL           COMMENT '效果类型：1=恢复HP（精×倍率） 2=前端效果（服务端仅扣数量）',
  effect_param INT          NOT NULL DEFAULT 0 COMMENT '效果参数：effect_type=1 时为精属性倍率（PRD 9.1：精×5）',
  cd_seconds   INT          NOT NULL DEFAULT 0 COMMENT '使用CD（秒，PRD 9.1：药品10秒；未给出的取0为假设值可配）',
  desc_text    VARCHAR(128) NOT NULL DEFAULT '' COMMENT '效果描述（前端详情面板展示）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消耗品使用效果配置表：回复量与CD（PRD 9.1）';

INSERT IGNORE INTO item_use_config (item_id, item_name, effect_type, effect_param, cd_seconds, desc_text) VALUES
(4001, '凡品药', 1, 5, 10, '使用后恢复气血 精×5 点，CD 10秒（PRD 9.1原文）'),
(4002, '挪移符', 2, 0, 0,  '使用后由前端执行传送，服务端仅扣除数量（CD为假设值可配）');

-- ───────────────────────────────────
--  6. player_item_cd: 玩家消耗品CD表
--  结算制（无定时器，对齐 v4/v5 的延迟结算风格）：使用时写 last_used_at，
--  下一次使用时判定 NOW() - last_used_at 是否达到 cd_seconds，未到则拒。
--  不用 player_inventory.updated_at 做锚点：那列在购买/堆叠时也会刷新，
--  会误把“刚买到药”当成“刚用过药”而错封CD。
-- ───────────────────────────────────
CREATE TABLE IF NOT EXISTS player_item_cd (
  player_id    BIGINT UNSIGNED NOT NULL                           COMMENT '玩家角色ID',
  item_id      INT             NOT NULL                           COMMENT '物品ID',
  last_used_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近一次使用时间（CD锚点）',
  PRIMARY KEY (player_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='玩家消耗品CD表：使用CD的延迟结算锚点（PRD 9.1 药品CD10秒）';
