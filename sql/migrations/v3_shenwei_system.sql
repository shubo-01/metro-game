-- ═══════════════════════════════════════════════════════════════
--  神位系统 数据库迁移脚本 V3
--  依据：《神位系统_PRD V2.0》《神位系统-技术方案 V2.0》《神位系统计算公式.xlsx》
--
--  【重要隔离说明】
--  装备系统 equipment_system.sql 中已存在旧表 myth_shard（神话碎片表）与
--  inherit_record（神位继承记录表），它们属于"装备系统-大道争锋PVP神位继承"
--  玩法，与本文件实现的"花果山神位继承系统"是完全独立的两套体系：
--    - 旧体系：3碎片合1神话装备，碎片仅通过大道争锋PVP掉落转移
--    - 本体系：7碎片合1神位 / 9同级融合升阶，碎片来自花果山副本
--  两套表结构、服务代码互不引用、互不影响，请勿混用、请勿改动旧表。
--
--  【执行顺序说明】
--  本文件依赖 schema.sql + character_system.sql 已初始化完成
--  （需要 character_base / character_attributes / character_realm 表存在）。
--  本文件可重复执行（幂等）：
--    - 建表全部使用 CREATE TABLE IF NOT EXISTS
--    - 种子数据全部使用 INSERT IGNORE
--    - ALTER 增列通过存储过程先查 information_schema 再执行
--
--  执行方式（含中文，必须用 source 方式执行，不能用管道以免乱码）：
--    mysql.exe --default-character-set=utf8mb4 -u root -p xunxian
--      -e "source e:/ziji-xiaochengxu/sql/migrations/v3_shenwei_system.sql"
--
--  内容概览：
--    1. shenwei_def          神位定义表（12神位种子）
--    2. char_shenwei         角色当前激活神位表
--    3. char_shenwei_bag     角色神位背包表（含 inherited 已继承标记）
--    4. char_shenwei_fragment 角色神位碎片计数表
--    5. shenwei_skill        神位技能表（12技能种子，凡术/灵术/仙术/道术四档）
--    6. shenwei_switch_cost  切换费用配置表（按品级6档种子）
--    7. shenwei_inherit_req  继承精气神要求配置表（base+per_level 存公式参数）
--    8. shenwei_talisman     角色归元符持有表
--    9. char_currency        角色货币表（新建，灵石余额；测试充值见独立 dev 文件）
--    10. ALTER character_attributes 增加 shenwei_jing/shenwei_qi/shenwei_shen 三列
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
--  1. shenwei_def: 神位定义表
--  存储12个神位的静态定义：品级/属性系/阶位/精气神加成/技能/上位链/融合链
--  品级枚举：1=凡品 2=珍品 3=灵品 4=仙品 5=神话 6=先天
--  属性系枚举：1=妖属(主加精) 2=魔属(主加气) 3=道属(主加神)
--  阶位枚举：0=非融合线(碎片/副本神位) 1=兵 2=将 3=帅
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shenwei_def (
  id             INT UNSIGNED    PRIMARY KEY               COMMENT '神位ID',
  name           VARCHAR(32)     NOT NULL                  COMMENT '神位名称',
  attr_type      TINYINT         NOT NULL                  COMMENT '属性系：1=妖属(加精) 2=魔属(加气) 3=道属(加神)',
  grade          TINYINT         NOT NULL                  COMMENT '品级：1=凡品 2=珍品 3=灵品 4=仙品 5=神话 6=先天',
  rank_type      TINYINT         NOT NULL DEFAULT 0        COMMENT '阶位：0=非融合线 1=兵 2=将 3=帅（融合链 兵→将→帅）',
  bonus_jing     INT             NOT NULL DEFAULT 0        COMMENT '继承后精加成（PRD 表6-1：兵5/1/1 将7/2/2 帅11/3/3 美猴王20/5/5 齐天大圣50/15/15）',
  bonus_qi       INT             NOT NULL DEFAULT 0        COMMENT '继承后气加成',
  bonus_shen     INT             NOT NULL DEFAULT 0        COMMENT '继承后神加成',
  skill_id       INT UNSIGNED    DEFAULT NULL              COMMENT '专属技能ID，关联 shenwei_skill.id',
  skill_tier     TINYINT         NOT NULL DEFAULT 1        COMMENT '技能档位：1=凡术 2=灵术 3=仙术 4=道术（由品级决定，不可升级）',
  superior_id    INT UNSIGNED    DEFAULT NULL              COMMENT '上位神位ID：如美猴王的上位是齐天大圣；切换到上位免费(晋升)；NULL=无上位',
  fuse_from_id   INT UNSIGNED    DEFAULT NULL              COMMENT '融合材料神位ID：9个该神位可融合出本神位；NULL=非融合产物',
  acquire_method VARCHAR(16)     NOT NULL DEFAULT 'drop'   COMMENT '获取方式：drop=副本直接掉落 fuse=融合产物 fragment=7碎片合成 future=后续副本产出',
  INDEX idx_grade (grade),
  INDEX idx_fuse_from (fuse_from_id),
  INDEX idx_superior (superior_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神位定义表：12神位静态配置（花果山神位体系，与装备系统myth_shard无关）';

-- 12神位种子数据（严格对照 PRD 表6-1 精气神加成全表 与 计算公式.xlsx 花果山神位产出表）
-- 融合线（兵→将→帅）：兵/将为凡品，帅为珍品（融合产物）；总加成 兵+7 / 将+11 / 帅+17
-- 碎片线：美猴王(珍品+30, 7碎片, 上位=齐天大圣) / 混世魔王(珍品+30, 7碎片, 无上位)
-- 上位：齐天大圣(仙品+80, 后续副本产出, 下属=美猴王)
INSERT IGNORE INTO shenwei_def
  (id, name, attr_type, grade, rank_type, bonus_jing, bonus_qi, bonus_shen, skill_id, skill_tier, superior_id, fuse_from_id, acquire_method) VALUES
(1,  '妖兵',     1, 1, 1,  5,  1,  1, 1,  1, NULL, NULL, 'drop'),     -- 副本掉率32%(老猴/普通猴身份, 不受运气影响)
(2,  '魔兵',     2, 1, 1,  1,  5,  1, 2,  1, NULL, NULL, 'drop'),     -- 副本掉率33%(魔王手下身份)
(3,  '天兵',     3, 1, 1,  1,  1,  5, 3,  1, NULL, NULL, 'drop'),     -- 副本掉率20%(草木石头身份)
(4,  '妖将',     1, 1, 2,  7,  2,  2, 4,  1, NULL, 1,    'fuse'),     -- 9妖兵融合
(5,  '魔将',     2, 1, 2,  2,  7,  2, 5,  1, NULL, 2,    'fuse'),     -- 9魔兵融合
(6,  '神将',     3, 1, 2,  2,  2,  7, 6,  1, NULL, 3,    'fuse'),     -- 9天兵融合
(7,  '妖帅',     1, 2, 3, 11,  3,  3, 7,  2, NULL, 4,    'fuse'),     -- 9妖将融合(珍品)
(8,  '魔帅',     2, 2, 3,  3, 11,  3, 8,  2, NULL, 5,    'fuse'),     -- 9魔将融合(珍品)
(9,  '神帅',     3, 2, 3,  3,  3, 11, 9,  2, NULL, 6,    'fuse'),     -- 9神将融合(珍品)
(10, '美猴王',   1, 2, 0, 20,  5,  5, 10, 2, 12,   NULL, 'fragment'), -- 7碎片合成, 上位=齐天大圣(12)
(11, '混世魔王', 2, 2, 0,  5, 20,  5, 11, 2, NULL, NULL, 'fragment'), -- 7碎片合成, 无上位(独立路线)
(12, '齐天大圣', 1, 4, 0, 50, 15, 15, 12, 3, NULL, NULL, 'future');   -- 仙品, 后续副本产出, 下属=美猴王

-- ─────────────────────────────────────
--  2. char_shenwei: 角色当前激活神位表
--  一个角色同一时刻只能激活一个神位（PRD 8.1），一人一行
--  加成落地：激活时把 bonus_* 写入 character_attributes.shenwei_* 三列并重算衍生值
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_shenwei (
  character_id BIGINT UNSIGNED PRIMARY KEY                          COMMENT '角色ID，关联character_base.character_id，一人一行',
  shenwei_id   INT UNSIGNED    NOT NULL                             COMMENT '当前激活的神位ID，关联shenwei_def.id',
  inherited_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP   COMMENT '本次激活(继承/切换)时间',
  active       TINYINT(1)      NOT NULL DEFAULT 1                   COMMENT '是否激活：1=激活中(正常态恒为1，预留0支持临时封印等扩展)',
  INDEX idx_shenwei (shenwei_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色当前激活神位表：记录角色正在生效的神位';

-- ─────────────────────────────────────
--  3. char_shenwei_bag: 角色神位背包表
--  记录角色获得过的完整神位。本系统采用"继承不消耗"设计（任务书裁定）：
--    - count：当前持有的完整神位数量（融合消耗9个时从这里扣）
--    - inherited：是否已继承过（=1后永久解锁，可通过 /shenwei/switch 付费切换回来，
--      即使 count 后来被融合消耗为0，已继承标记依然有效）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_shenwei_bag (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT           COMMENT '记录ID',
  character_id BIGINT UNSIGNED NOT NULL                             COMMENT '角色ID',
  shenwei_id   INT UNSIGNED    NOT NULL                             COMMENT '神位ID，关联shenwei_def.id',
  count        INT             NOT NULL DEFAULT 0                   COMMENT '持有的完整神位数量（融合材料从这里扣，>=0）',
  inherited    TINYINT(1)      NOT NULL DEFAULT 0                   COMMENT '是否已继承过：0=未继承 1=已继承（永久解锁，可付费切换回来）',
  obtained_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP   COMMENT '首次获得时间',
  UNIQUE KEY uk_char_shenwei (character_id, shenwei_id),
  INDEX idx_char (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色神位背包表：完整神位持有数量与已继承标记';

-- ─────────────────────────────────────
--  4. char_shenwei_fragment: 角色神位碎片计数表
--  只有珍品神位掉碎片（美猴王/混世魔王），7碎片合成1个完整神位（PRD 2.1）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_shenwei_fragment (
  character_id BIGINT UNSIGNED NOT NULL                             COMMENT '角色ID',
  shenwei_id   INT UNSIGNED    NOT NULL                             COMMENT '碎片对应的目标神位ID（10=美猴王碎片 11=混世魔王碎片）',
  count        INT             NOT NULL DEFAULT 0                   COMMENT '当前碎片数量（>=0，合成时一次扣7）',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变动时间',
  PRIMARY KEY (character_id, shenwei_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色神位碎片计数表：7碎片→1完整神位';

-- ─────────────────────────────────────
--  5. shenwei_skill: 神位技能表
--  技能四档（PRD 7.1）：1=凡术(基数200×倍率1.0) 2=灵术(300×1.5) 3=仙术(500×2.5) 4=道术(800×4.0)
--  技能等级由神位品级决定，不可升级；伤害引擎复用 character/calc.go 的神位技路径
--  （BaseDamageDivine=300 引擎数值不动，此表 base_damage 为策划表配置值，供后续接入）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shenwei_skill (
  id              INT UNSIGNED  PRIMARY KEY              COMMENT '技能ID（与所属神位ID一一对应，取相同编号便于对照）',
  shenwei_id      INT UNSIGNED  NOT NULL                 COMMENT '所属神位ID，关联shenwei_def.id',
  name            VARCHAR(32)   NOT NULL                 COMMENT '技能名称',
  tier            TINYINT       NOT NULL                 COMMENT '技能档位：1=凡术 2=灵术 3=仙术 4=道术',
  base_damage     INT           NOT NULL                 COMMENT '伤害基数：凡术200/灵术300/仙术500/道术800（PRD 表7-1）',
  tier_multiplier DECIMAL(4,2)  NOT NULL                 COMMENT '档位统一倍率：凡术1.0/灵术1.5/仙术2.5/道术4.0',
  skill_type      VARCHAR(32)   NOT NULL                 COMMENT '技能类型：近战单体/远程单体/AoE/自身防御/瞬移连击等',
  effect_desc     VARCHAR(255)  NOT NULL                 COMMENT '倍率来源与附加效果描述（含体魄/功法威力/神识倍率说明）',
  cooldown_sec    INT           NOT NULL                 COMMENT '冷却时间（秒），品级越高CD越长（大招感）',
  mana_cost       INT           NOT NULL                 COMMENT '灵力消耗',
  INDEX idx_shenwei (shenwei_id),
  INDEX idx_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神位技能表：每个神位一个专属技能，四档体系';

-- 12技能种子数据（严格对照 PRD 表7-2 ~ 表7-6）
INSERT IGNORE INTO shenwei_skill
  (id, shenwei_id, name, tier, base_damage, tier_multiplier, skill_type, effect_desc, cooldown_sec, mana_cost) VALUES
-- 凡术（凡品，基数200，倍率1.0）—— 兵级（PRD 表7-2）
(1,  1,  '猿击',       1, 200, 1.00, '近战单体',      '体魄×1.2，无附加效果',                                  8,  30),
(2,  2,  '魔焰掌',     1, 200, 1.00, '远程单体',      '功法威力×1.0，灼烧3秒(5%/秒)',                          10, 35),
(3,  3,  '灵石化身',   1, 200, 1.00, '自身防御',      '无伤害倍率，石化3秒护盾恢复×3且不可移动',                30, 40),
-- 凡术 —— 将级（9兵融合强化，PRD 表7-3）
(4,  4,  '狂猿乱舞',   1, 200, 1.00, '近战连击3击',   '体魄×0.8/击，第3击击退5米',                             12, 50),
(5,  5,  '暗魔爆破',   1, 200, 1.00, 'AoE 5米',       '功法威力×1.5，灼烧5%/秒×5秒',                           15, 60),
(6,  6,  '石破天惊',   1, 200, 1.00, 'AoE 8米',       '神识×1.2，击倒1秒',                                     18, 60),
-- 灵术（珍品，基数300，倍率1.5）—— 帅级（融合产物，PRD 表7-4）
(7,  7,  '天妖降世',   2, 300, 1.50, '近战AoE',       '体魄×1.8，击退+减速3秒',                                18, 70),
(8,  8,  '万魔朝宗',   2, 300, 1.50, '范围8米/3秒',   '功法威力×2.0，灼烧6%/秒+减速',                          20, 80),
(9,  9,  '天罡正法',   2, 300, 1.50, '范围10米',      '神识×1.8，定身2秒+降低异常抵抗',                        22, 80),
-- 灵术 —— 碎片合成神位（PRD 表7-5）
(10, 10, '如意金箍棒', 2, 300, 1.50, '近战扇形',      '体魄×2.0+武器基础×1.5，击退+1秒眩晕',                   20, 80),
(11, 11, '混世魔威',   2, 300, 1.50, '范围光环10米/5秒', '功法威力×2.5，灼烧8%/秒+禁疗',                        25, 90),
-- 仙术（仙品，基数500，倍率2.5）—— 上位神位（PRD 表7-6，当前设计最强神位技）
(12, 12, '大闹天宫',   3, 500, 2.50, '瞬移连击7击',   '体魄×1.5/击，期间自身无敌2秒，末击范围爆发附带击倒+3秒眩晕', 60, 150);

-- ─────────────────────────────────────
--  6. shenwei_switch_cost: 切换费用配置表
--  切换已继承的神位需消耗 灵石+归元符（PRD 8.3 表8-1）
--  归元符商城单价99灵石，总成本=灵石+归元符数×99
--  收费口径：按"当前激活(旧)神位"的品级收费（PRD 技术方案伪代码 Switch 步骤4）
--  从下属晋升到上位神位时免费（不查此表）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shenwei_switch_cost (
  grade          TINYINT PRIMARY KEY  COMMENT '品级：1=凡品 2=珍品 3=灵品 4=仙品 5=神话 6=先天',
  spirit_stone   INT     NOT NULL     COMMENT '灵石费用',
  talisman_count INT     NOT NULL     COMMENT '归元符数量（归元符单价99灵石，总成本=灵石+数量×99）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神位切换费用配置表：按品级6档';

-- 6档费用种子（PRD 表8-1：总成本 凡109/珍228/灵278/仙447/神话696/先天995）
INSERT IGNORE INTO shenwei_switch_cost (grade, spirit_stone, talisman_count) VALUES
(1, 10,  1),  -- 凡品：10灵石+1符=总成本109
(2, 30,  2),  -- 珍品：30灵石+2符=总成本228
(3, 80,  2),  -- 灵品：80灵石+2符=总成本278
(4, 150, 3),  -- 仙品：150灵石+3符=总成本447
(5, 300, 4),  -- 神话：300灵石+4符=总成本696
(6, 500, 5);  -- 先天：500灵石+5符=总成本995

-- ─────────────────────────────────────
--  7. shenwei_inherit_req: 继承精气神要求配置表
--  存公式参数：门槛 = base_req + per_level × (角色等级 - 1)
--  （计算公式.xlsx "神位精气神要求表/公式与边界" 页锚点：
--   珍品Lv1=200/Lv50=347/Lv100=497；灵品Lv100=1193；仙品Lv100=2685；
--   神话Lv100=5970；先天Lv100=11950）
--  校验口径：角色"裸体精气神总和"（jing+qi+shen，不含装备、不含神位加成 shenwei_*，
--  防止神位加成反过来满足更高神位门槛的套娃循环）
--  凡品无要求，继承时直接跳过校验（PRD 表5-1）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shenwei_inherit_req (
  grade     TINYINT PRIMARY KEY  COMMENT '品级：1=凡品 2=珍品 3=灵品 4=仙品 5=神话 6=先天',
  base_req  INT     NOT NULL     COMMENT '基础门槛（Lv1时的精气神总和要求）',
  per_level INT     NOT NULL     COMMENT '每级增量：门槛=base_req+per_level×(Lv-1)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神位继承精气神要求配置表：存公式参数';

-- 6档门槛公式参数种子（计算公式.xlsx）
INSERT IGNORE INTO shenwei_inherit_req (grade, base_req, per_level) VALUES
(1, 0,    0),   -- 凡品：无要求
(2, 200,  3),   -- 珍品：200+3(Lv-1)
(3, 500,  7),   -- 灵品：500+7(Lv-1)
(4, 1200, 15),  -- 仙品：1200+15(Lv-1)
(5, 3000, 30),  -- 神话：3000+30(Lv-1)
(6, 7000, 50);  -- 先天：7000+50(Lv-1)

-- ─────────────────────────────────────
--  8. shenwei_talisman: 角色归元符持有表
--  归元符是神位切换的专用道具：副本掉落(3%)或商城购买(99灵石/个)
--  本版本简化为通用归元符（不分品级），切换按品级扣对应数量
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shenwei_talisman (
  character_id BIGINT UNSIGNED PRIMARY KEY  COMMENT '角色ID，一人一行',
  count        INT             NOT NULL DEFAULT 0 COMMENT '归元符持有数量（>=0）',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变动时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色归元符持有表：神位切换消耗道具';

-- ─────────────────────────────────────
--  9. char_currency: 角色货币表（新建）
--  项目此前无经济/钱包表（wash_log.cost_paid 恒为0），本次为神位切换扣费新建。
--  灵石与人民币1:1对应（PRD 8.3），先只有 spirit_stone 一列，后续货币在此扩展。
--  无记录角色的余额语义为0（服务端 lockSpiritStone/getSpiritStone 均按 ErrNoRows→0 处理）。
--  【注意】本迁移不包含任何充值种子：开发/测试环境需要给测试角色充灵石时，
--  请手工执行独立文件 sql/dev_seed_spirit_stone.sql（禁止纳入生产迁移序列，
--  否则会给全部存量角色错误发放灵石）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_currency (
  character_id BIGINT UNSIGNED PRIMARY KEY  COMMENT '角色ID，关联character_base.character_id，一人一行',
  spirit_stone BIGINT          NOT NULL DEFAULT 0 COMMENT '灵石余额（>=0，切换神位/商城购买从这里扣）',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变动时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色货币表：灵石余额';

-- ─────────────────────────────────────
--  10. ALTER character_attributes 增加神位加成三列
--  MySQL 8.4 不支持 ADD COLUMN IF NOT EXISTS，用存储过程先查 information_schema
--  实现幂等：列已存在则跳过，本文件可安全重复执行
--  列语义：当前激活神位的精/气/神加成快照（继承/切换时由服务端写入）
--  有效精气神 = jing/qi/shen(裸值) + shenwei_*(神位加成)，
--  衍生值重算（character.RecalcAndSaveDerived）按有效精气神计算
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS add_shenwei_attr_columns;

DELIMITER $$
CREATE PROCEDURE add_shenwei_attr_columns()
BEGIN
  -- 逐列检查是否已存在，不存在才增列（幂等保护）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'shenwei_jing'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN shenwei_jing INT DEFAULT 0 COMMENT '当前激活神位的精加成（继承/切换时写入，衍生值按 jing+shenwei_jing 计算）' AFTER free_shen;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'shenwei_qi'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN shenwei_qi INT DEFAULT 0 COMMENT '当前激活神位的气加成' AFTER shenwei_jing;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'shenwei_shen'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN shenwei_shen INT DEFAULT 0 COMMENT '当前激活神位的神加成' AFTER shenwei_qi;
  END IF;
END$$
DELIMITER ;

CALL add_shenwei_attr_columns();
DROP PROCEDURE IF EXISTS add_shenwei_attr_columns;
