-- ═══════════════════════════════════════════════════════════════
--  功法·技能·经验系统 数据库迁移脚本 V4
--  依据：《功法技能经验系统PRD》《功法技能经验系统技术方案》
--        《怪物血量玩家攻击力对比表.xlsx》（三份文档原文为唯一数值权威）
--
--  【重要隔离说明】
--  1. 双打坐体系隔离：dungeon-service(8007) 已有 /fatigue/meditate/* 打坐，
--     恢复的是【牢结值】（花果山副本疲劳系统），与本文件的 char_meditation
--     （功法修炼打坐，产出角色升级XP）是两套完全独立的体系：
--     表结构、服务代码互不引用、互不影响，请勿混用、请勿改动旧表。
--  2. 三套属性加成列隔离：character_attributes 上：
--     - jing/qi/shen             = 裸值（固定点+自由点，洗点/加点只动这里）
--     - shenwei_jing/qi/shen     = 神位加成（v3，快照式覆盖写，继承/切换时写入）
--     - gongfa_jing/qi/shen      = 功法加成（本文件新增，叠加式累计写，
--                                  学习+=加成 / 遗忘-=加成，可同时学多本功法）
--     有效精气神 = 裸值 + COALESCE(shenwei_*,0) + COALESCE(gongfa_*,0)，
--     走火入魔期间（zouhuo_until > NOW()）有效精再 ×0.5（PRD 2.5"精暴降50%"）。
--  3. char_currency（灵石）/ 商城价99灵石 与神位系统共用，本文件不重复建表。
--
--  【执行顺序说明】
--  本文件依赖 schema.sql + character_system.sql + v3_shenwei_system.sql
--  已初始化完成（需要 character_base/character_attributes/character_realm/
--  char_currency 表存在）。本文件可重复执行（幂等）：
--    - 建表全部使用 CREATE TABLE IF NOT EXISTS
--    - 种子数据全部使用 INSERT IGNORE
--    - ALTER 增列通过存储过程先查 information_schema 再执行
--
--  【严禁测试充值】本迁移不包含任何测试充值/测试发放数据（教训：灵石充值
--  必须放独立 dev 文件手工执行，禁止纳入生产迁移序列，见 v3 第9节说明）。
--
--  执行方式（含中文，必须用 source 方式执行，不能用管道以免乱码）：
--    mysql.exe --default-character-set=utf8mb4 -u root -p game_main
--      -e "source e:/ziji-xiaochengxu/sql/migrations/v4_gongfa_skill_exp.sql"
--
--  内容概览：
--    1. gongfa_def          功法定义表（5功法种子，PRD 表2-1/2-3）
--    2. char_gongfa         角色功法背包表（碎片/完整，9碎片合1）
--    3. char_gongfa_learned 角色已学功法表（行式，一功法一行）
--    4. skill_def           技能定义表（16五行技+6学习技+1普攻+10被动=33条种子）
--    5. char_skill          角色技能背包表（碎片/完整，9碎片合1）
--    6. char_skill_slots    角色技能栏表（主动10栏+被动4栏，行式）
--    7. exp_stage_config    8阶经验配置表（神兽base/最大等级/怪物XP阶段累积倍率）
--    8. monster_ehp_config  怪物EHP倍数配置表（8阶×5类型=40行，xlsx 原表）
--    9. char_meditation     功法打坐状态表（结算制，每日封顶4小时）
--    10. char_mengyi_soup   孟遗汤持有表（遗忘功法/技能的消耗道具）
--    11. ALTER character_attributes 增加 gongfa_jing/qi/shen + zouhuo_until
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
--  1. gongfa_def: 功法定义表
--  功法是被动效果（打坐修炼速度/护盾恢复/精气神加成），不占技能栏。
--  等级枚举：1=凡法 2=灵法 3=仙法 4=道法（PRD 表2-1）
--  属性枚举：1=妖属(主加精) 2=魔属(主加气) 3=道属(主加神)，与神位 attr_type 同义
--  学习要求（PRD 表2-1）：凡法无 / 灵法 人阶50级+精气神120 /
--    仙法 真人20级+精气神300 / 道法 金仙50级+精气神2000（精气神=裸值总和）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS gongfa_def (
  id                    INT UNSIGNED  PRIMARY KEY        COMMENT '功法ID',
  name                  VARCHAR(64)   NOT NULL           COMMENT '功法名称',
  attr_type             TINYINT       NOT NULL           COMMENT '属性：1=妖属(主加精) 2=魔属(主加气) 3=道属(主加神)',
  tier                  TINYINT       NOT NULL           COMMENT '等级：1=凡法 2=灵法 3=仙法 4=道法',
  meditate_xp_per_10min INT           NOT NULL           COMMENT '打坐XP/10分钟（PRD 表2-1：凡1/灵2/仙3/道5）',
  shield_recover_mult   DECIMAL(3,1)  NOT NULL           COMMENT '护盾恢复倍率（PRD 表2-2：凡2.5/灵3/仙4/道6，无功法基础2）',
  bonus_jing            INT           NOT NULL DEFAULT 0 COMMENT '学习后精加成（叠加式写入 character_attributes.gongfa_jing）',
  bonus_qi              INT           NOT NULL DEFAULT 0 COMMENT '学习后气加成',
  bonus_shen            INT           NOT NULL DEFAULT 0 COMMENT '学习后神加成',
  is_fragment           TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否碎片产出：1=掉碎片需9合1 0=直接掉完整功法',
  fuse_count            INT           NOT NULL DEFAULT 9 COMMENT '合成所需碎片数（PRD 2章：9碎片合成完整功法）',
  req_major_stage       TINYINT       NOT NULL DEFAULT 0 COMMENT '学习要求-大境界下限：0=无要求 1=人阶 2=真人 5=金仙（PRD 表2-1）',
  req_level             INT           NOT NULL DEFAULT 0 COMMENT '学习要求-该大境界内等级下限（Lv=(minor-1)×10+seg+1，1-90）',
  req_attr_total        INT           NOT NULL DEFAULT 0 COMMENT '学习要求-裸值精气神总和下限（120/300/2000，防加成套娃用裸值）',
  source_desc           VARCHAR(128)  NOT NULL DEFAULT '' COMMENT '来源说明（花果山产出表2-3）',
  INDEX idx_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='功法定义表：5个花果山功法静态配置（PRD 表2-1/2-3）';

-- 5功法种子（PRD 表2-3 花果山功法产出表 + 表2-1 精气神加成）
-- 加成拆分规则（表2-1）：凡法 主+2 总+2 → 主属性+2；灵法 主+5 副+1 总+7 → 主+5 两副各+1；
-- 仙法 主+10 副+3 总+16 → 主+10 两副各+3；道法 主+20 副+5 总+30 → 主+20 两副各+5（暂无道法种子）
INSERT IGNORE INTO gongfa_def
  (id, name, attr_type, tier, meditate_xp_per_10min, shield_recover_mult,
   bonus_jing, bonus_qi, bonus_shen, is_fragment, fuse_count,
   req_major_stage, req_level, req_attr_total, source_desc) VALUES
(1, '妖兵决',     1, 1, 1, 2.5,  2, 0, 0,  0, 9, 0, 0,  0,    '花果山老猴/普通猴直接掉落32%(不受运气)'),
(2, '魔兵决',     2, 1, 1, 2.5,  0, 2, 0,  0, 9, 0, 0,  0,    '花果山魔王手下直接掉落33%(不受运气)'),
(3, '天兵决',     3, 1, 1, 2.5,  0, 0, 2,  0, 9, 0, 0,  0,    '花果山草木石头直接掉落20%(不受运气)'),
(4, '混世魔王功', 2, 2, 2, 3.0,  1, 5, 1,  1, 9, 1, 50, 120,  '花果山混世魔王碎片10%(受运气加成),9碎片合成'),
(5, '大品天仙诀', 3, 3, 3, 4.0,  3, 3, 10, 1, 9, 2, 20, 300,  '花果山孙悟空碎片5%(受运气加成),9碎片合成');

-- ─────────────────────────────────────
--  2. char_gongfa: 角色功法背包表
--  item_type：1=碎片 2=完整功法；9碎片可合成1完整（在 Learn 时自动合成）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_gongfa (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT         COMMENT '记录ID',
  character_id BIGINT UNSIGNED NOT NULL                           COMMENT '角色ID，关联character_base.character_id',
  gongfa_id    INT UNSIGNED    NOT NULL                           COMMENT '功法ID，关联gongfa_def.id',
  item_type    TINYINT         NOT NULL                           COMMENT '类型：1=碎片 2=完整功法',
  quantity     INT             NOT NULL DEFAULT 0                 COMMENT '持有数量（>=0）',
  obtained_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次获得时间',
  UNIQUE KEY uk_char_gongfa_type (character_id, gongfa_id, item_type),
  INDEX idx_char (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色功法背包表：碎片与完整功法持有数量';

-- ─────────────────────────────────────
--  3. char_gongfa_learned: 角色已学功法表
--  行式设计（一功法一行），可同时学多本功法（加成叠加）；遗忘删行且不返还。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_gongfa_learned (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT         COMMENT '记录ID',
  character_id BIGINT UNSIGNED NOT NULL                           COMMENT '角色ID',
  gongfa_id    INT UNSIGNED    NOT NULL                           COMMENT '已学功法ID，关联gongfa_def.id',
  learned_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '学习时间',
  UNIQUE KEY uk_char_learned (character_id, gongfa_id),
  INDEX idx_char (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色已学功法表：打坐XP速率取已学中最高tier';

-- ─────────────────────────────────────
--  4. skill_def: 技能定义表
--  技能是主动杀伐招式（被动技除外），种子共33条（按文档全量）：
--    - 16条五行技（skill_type=1）：凡术5遁法+5攻击法（表3-3）+灵术2（表3-4）
--      +仙术2（表3-5）+道术2（表3-6）——即任务书"16主动"的出处
--    - 6条学习技（skill_type=2）：表3-8/3-9 花果山产出
--    - 1条普攻（skill_type=5）：不占栏永远可用（表3.1）
--    - 10条被动技（skill_type=4）：表3-10，占4被动栏
--  伤害路径（PRD 3.2）：1=A法修(基数×气总比×倍率×多修) 2=B体修(体魄+武器)
--    3=C魂修(基数×神总比) 0=非伤害（遁法/位移/变身/被动）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_def (
  id               INT UNSIGNED  PRIMARY KEY        COMMENT '技能ID',
  name             VARCHAR(64)   NOT NULL           COMMENT '技能名称',
  skill_type       TINYINT       NOT NULL           COMMENT '类型：1=五行技 2=学习技 3=神位技 4=被动技 5=普攻',
  tier             TINYINT       NOT NULL           COMMENT '等级：1=凡术 2=灵术 3=仙术 4=道术',
  damage_path      TINYINT       NOT NULL DEFAULT 0 COMMENT '伤害路径：1=A法修 2=B体修 3=C魂修 0=非伤害',
  base_damage      INT           NOT NULL DEFAULT 0 COMMENT '技能基数（表3-1：凡200/灵300/仙500/道800，非伤害0）',
  multiplier       DECIMAL(4,2)  NOT NULL DEFAULT 0 COMMENT '技能倍率（如金刃破1.0/烈焰弹1.2/五行灭世3.5）',
  cooldown_s       INT           NOT NULL DEFAULT 0 COMMENT '冷却时间（秒，普攻无CD为0）',
  mp_cost          INT           NOT NULL DEFAULT 0 COMMENT '灵力消耗（普攻无消耗为0）',
  element          TINYINT       NOT NULL DEFAULT 0 COMMENT '五行：1=金 2=木 3=水 4=火 5=土 0=通用/非五行',
  is_fragment      TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否碎片产出：1=掉碎片需9合1 0=直接获得/自动解锁',
  fuse_count       INT           NOT NULL DEFAULT 9 COMMENT '合成所需碎片数（9碎片合成）',
  effect_desc      VARCHAR(255)  NOT NULL DEFAULT '' COMMENT '效果描述（附加效果，PRD 原文）',
  unlock_condition VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '解锁条件：五行技按修数自动解锁/学习技9碎片或掉落/被动技功法或突破',
  INDEX idx_type (skill_type),
  INDEX idx_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='技能定义表：33条种子（16五行+6学习+1普攻+10被动）';

-- 普攻（表3.1：不占栏，伤害=体魄×0.5+武器基础×1.0，B路径，无CD无灵力）
INSERT IGNORE INTO skill_def
  (id, name, skill_type, tier, damage_path, base_damage, multiplier, cooldown_s, mp_cost, element, is_fragment, effect_desc, unlock_condition) VALUES
(1, '普攻', 5, 1, 2, 0, 0.50, 0, 0, 0, 0, '伤害=体魄x0.5+武器基础x1.0，无CD无灵力消耗，不占技能栏', '默认解锁');

-- 五行凡术遁法（表3-3，1修解锁，非伤害）
INSERT IGNORE INTO skill_def
  (id, name, skill_type, tier, damage_path, base_damage, multiplier, cooldown_s, mp_cost, element, is_fragment, effect_desc, unlock_condition) VALUES
(2, '金光遁', 1, 1, 0, 0, 0,    10, 30, 1, 0, '瞬移3m，留金光残影减速追兵2s', '1修自动解锁'),
(3, '藤遁',   1, 1, 0, 0, 0,    12, 30, 2, 0, '化藤蔓潜行3s(不可攻击，移速+50%)', '1修自动解锁'),
(4, '水遁',   1, 1, 0, 0, 0,    10, 30, 3, 0, '化水流滑行8m(无敌1s)', '1修自动解锁'),
(5, '火遁',   1, 1, 0, 0, 0,    10, 35, 4, 0, '爆火后跳5m(留火区3s，灼烧5%/s)', '1修自动解锁'),
(6, '土遁',   1, 1, 0, 0, 0,    12, 30, 5, 0, '钻地3s(不可选中，脱仇恨)', '1修自动解锁');

-- 五行凡术攻击法（表3-3，A路径，基数200）
INSERT IGNORE INTO skill_def
  (id, name, skill_type, tier, damage_path, base_damage, multiplier, cooldown_s, mp_cost, element, is_fragment, effect_desc, unlock_condition) VALUES
(7,  '金刃破',   1, 1, 1, 200, 1.00, 10, 30, 1, 0, '远程单体，附加破甲(降护盾恢复30%，3s)', '1修自动解锁'),
(8,  '枯木逢春', 1, 1, 1, 200, 1.00, 12, 30, 2, 0, '近程5m，附加定身1s+吸血(伤害10%回HP)', '1修自动解锁'),
(9,  '寒冰刺',   1, 1, 1, 200, 1.00, 10, 30, 3, 0, '远程单体，附加减速30%(3s)', '1修自动解锁'),
(10, '烈焰弹',   1, 1, 1, 200, 1.20, 10, 35, 4, 0, '远程单体，附加灼烧3s(5%/s)', '1修自动解锁'),
(11, '落石术',   1, 1, 1, 200, 1.00, 12, 30, 5, 0, '近程6m，附加击退3m+击倒1s', '1修自动解锁');

-- 五行灵术/仙术/道术（表3-4/3-5/3-6，通用双/三/五属性）
INSERT IGNORE INTO skill_def
  (id, name, skill_type, tier, damage_path, base_damage, multiplier, cooldown_s, mp_cost, element, is_fragment, effect_desc, unlock_condition) VALUES
(12, '灵遁·两仪', 1, 2, 0, 0,   0,    15, 60,  0, 0, '瞬移8m+双元素抗性+20%(5s)', '2修自动解锁'),
(13, '两仪灵破', 1, 2, 1, 300, 1.80, 18, 70,  0, 0, '范围8m，主+副双元素效果(各50%强度)', '2修自动解锁'),
(14, '仙遁·三才', 1, 3, 0, 0,   0,    30, 100, 0, 0, '瞬移15m+三元素抗性+30%+护盾恢复x3(5s)', '3修自动解锁'),
(15, '三才仙破', 1, 3, 1, 500, 2.50, 35, 120, 0, 0, '范围15m，三种元素效果叠加', '3修自动解锁'),
(16, '五行遁术', 1, 4, 0, 0,   0,    60, 150, 0, 0, '瞬移20m+全元素抗性+50%+无敌2s', '5修自动解锁'),
(17, '五行灭世', 1, 4, 1, 800, 3.50, 90, 200, 0, 0, '范围30m，五种元素效果全叠加', '5修自动解锁');

-- 学习技（表3-8 花果山产出 + 表3-9 具体效果）
INSERT IGNORE INTO skill_def
  (id, name, skill_type, tier, damage_path, base_damage, multiplier, cooldown_s, mp_cost, element, is_fragment, effect_desc, unlock_condition) VALUES
(18, '猴子摘桃', 2, 1, 2, 0,   1.50, 15, 50,  0, 0, '突进单体，体魄x1.5，偷取1个正面状态转移给自身', '老猴/普通猴直接掉落33%'),
(19, '魔王遁',   2, 1, 0, 0,   0,    12, 40,  0, 0, '化黑雾瞬移10m+脱战隐身2s', '魔王手下直接掉落30%'),
(20, '道剑',     2, 1, 3, 0,   1.20, 10, 35,  0, 0, '远程单体，神识x1.2，道法印记(治疗-30%，5s)', '草木石头直接掉落30%'),
(21, '吐焰术',   2, 2, 1, 300, 2.00, 20, 80,  0, 1, '前方锥形8m，灼烧8%/s(5s)+降异常抵抗20%', '混世魔王碎片5%(受运气),9碎片合成'),
(22, '七十二变', 2, 3, 0, 0,   0,    60, 150, 0, 1, '变身目标NPC/怪物形态5s，获得其1个技能(随机)', '孙悟空碎片1%(受运气),9碎片合成'),
(23, '筋斗云',   2, 3, 0, 0,   0,    30, 100, 0, 1, '瞬移20m，路径留火区3s(灼烧5%/s)', '孙悟空碎片1%(受运气),9碎片合成');

-- 被动技（表3-10，占4被动栏，持续生效不主动释放）
INSERT IGNORE INTO skill_def
  (id, name, skill_type, tier, damage_path, base_damage, multiplier, cooldown_s, mp_cost, element, is_fragment, effect_desc, unlock_condition) VALUES
(24, '金刚不坏体', 4, 1, 0, 0, 0, 0, 0, 0, 0, 'HP+10%，护盾恢复+20%', '功法'),
(25, '火眼金睛',   4, 1, 0, 0, 0, 0, 0, 0, 0, '暴击+10%，暴击伤害+50%', '功法'),
(26, '长生诀',     4, 1, 0, 0, 0, 0, 0, 0, 0, 'HP恢复+5%/s，灵力恢复+10%/s', '功法'),
(27, '天罡气',     4, 1, 0, 0, 0, 0, 0, 0, 0, '攻击+15%，防御+10%', '突破真人'),
(28, '地煞功',     4, 1, 0, 0, 0, 0, 0, 0, 0, '异常抵抗+20%，异常持续-30%', '突破真人'),
(29, '筋斗心法',   4, 1, 0, 0, 0, 0, 0, 0, 0, '移速+15%，闪避+10%', '功法'),
(30, '聚灵诀',     4, 1, 0, 0, 0, 0, 0, 0, 0, '灵力上限+20%，灵力恢复+15%', '功法'),
(31, '五行归一',   4, 1, 0, 0, 0, 0, 0, 0, 0, '多修伤害+10%，经验+10%', '3修解锁'),
(32, '万劫不灭',   4, 1, 0, 0, 0, 0, 0, 0, 0, '死亡复活(50%HP)，CD300s', '突破金仙'),
(33, '造化诀',     4, 1, 0, 0, 0, 0, 0, 0, 0, '全属性+5%', '5修解锁');

-- ─────────────────────────────────────
--  5. char_skill: 角色技能背包表（结构同 char_gongfa）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_skill (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT         COMMENT '记录ID',
  character_id BIGINT UNSIGNED NOT NULL                           COMMENT '角色ID',
  skill_id     INT UNSIGNED    NOT NULL                           COMMENT '技能ID，关联skill_def.id',
  item_type    TINYINT         NOT NULL                           COMMENT '类型：1=碎片 2=完整技能',
  quantity     INT             NOT NULL DEFAULT 0                 COMMENT '持有数量（>=0）',
  obtained_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次获得时间',
  UNIQUE KEY uk_char_skill_type (character_id, skill_id, item_type),
  INDEX idx_char (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色技能背包表：碎片与完整技能持有数量';

-- ─────────────────────────────────────
--  6. char_skill_slots: 角色技能栏表
--  行式设计：一栏一行。主动栏 slot_index 1-10，被动栏 slot_index 1-4。
--  可装配规则（PRD 3.1）：五行技/学习技进主动栏，被动技进被动栏；
--  普攻与神位技不占栏（禁止装配）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_skill_slots (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  character_id BIGINT UNSIGNED NOT NULL                   COMMENT '角色ID',
  slot_type    TINYINT         NOT NULL                   COMMENT '栏位类型：1=主动栏(1-10) 2=被动栏(1-4)',
  slot_index   TINYINT         NOT NULL                   COMMENT '栏位序号（主动1-10/被动1-4）',
  skill_id     INT UNSIGNED    NOT NULL                   COMMENT '装配的技能ID，关联skill_def.id',
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变动时间',
  UNIQUE KEY uk_char_slot (character_id, slot_type, slot_index),
  INDEX idx_char (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色技能栏表：主动10栏+被动4栏装配记录';

-- ─────────────────────────────────────
--  7. exp_stage_config: 8阶经验配置表
--  升级XP = 同级神兽XP × 100 = shenshou_base × (等级+1)/2 × 100（PRD 4.1）
--  锚点：人阶 Lv.50 升级XP = 20 × 51/2 × 100 = 51,000（单测锁定值）
--  monster_xp_mult 为怪物XP阶段【累积】倍率，由 PRD 表4-3"普通怪Lv.1"绝对值列
--  (2/10/30/60/120/240/480/960) ÷ 基准2 推得：1/5/15/30/60/120/240/480。
--  （表4-3 的倍率列是"相对上一阶段"，实现必须用累积值，勿混淆）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS exp_stage_config (
  stage           TINYINT     PRIMARY KEY COMMENT '阶段：1=人 2=真人 3=地仙 4=天仙 5=金仙 6=太乙金仙 7=大罗金仙 8=神魔',
  stage_name      VARCHAR(16) NOT NULL    COMMENT '阶段名',
  shenshou_base   INT         NOT NULL    COMMENT '神兽base XP（表4-1：20/100/300/600/1200/2400/4800/9600）',
  max_level       INT         NOT NULL    COMMENT '该阶段最大等级（表4-1：前7阶100，神魔500）',
  monster_xp_mult INT         NOT NULL    COMMENT '怪物XP阶段累积倍率（表4-3 绝对值列÷2：1/5/15/30/60/120/240/480）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='8阶经验配置表（PRD 表4-1/表4-3）';

INSERT IGNORE INTO exp_stage_config (stage, stage_name, shenshou_base, max_level, monster_xp_mult) VALUES
(1, '人',       20,   100, 1),
(2, '真人',     100,  100, 5),
(3, '地仙',     300,  100, 15),
(4, '天仙',     600,  100, 30),
(5, '金仙',     1200, 100, 60),
(6, '太乙金仙', 2400, 100, 120),
(7, '大罗金仙', 4800, 100, 240),
(8, '神魔',     9600, 500, 480);

-- ─────────────────────────────────────
--  8. monster_ehp_config: 怪物EHP倍数配置表（8阶×5类型=40行）
--  EHP = 对应修数玩家道术攻击力 × ehp_multiplier（PRD 5.1，xlsx 原表）
--  基础倍数：普通5/精英8/Boss10/妖15/神兽20，每升一个大阶段 +10（xlsx 已验证）
--  对应修数：普通怪→1修 / 精英→2修 / Boss→3修 / 妖→4修 / 神兽→5修
--  【不动现有怪物模板】monster_entity 的 BaseHP 递推模板零改动，
--  本表仅供 GET /monster/ehp 查表接口使用。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS monster_ehp_config (
  stage          TINYINT NOT NULL COMMENT '怪物阶段：1=怪(人) 2=妖怪(真人) 3=妖仙(地仙) 4=天妖仙(天仙) 5=金妖仙(金仙) 6=太乙妖仙 7=大罗妖仙 8=神魔',
  monster_type   TINYINT NOT NULL COMMENT '怪物类型：1=普通 2=精英 3=Boss 4=妖 5=神兽',
  xiu_required   TINYINT NOT NULL COMMENT '对应修数：1-5（EHP按该修数玩家道术攻击力计算）',
  ehp_multiplier INT     NOT NULL COMMENT 'EHP倍数（xlsx 表5-1：基础5/8/10/15/20，每阶+10）',
  PRIMARY KEY (stage, monster_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='怪物EHP倍数配置表（xlsx 怪物EHP完整表，40行）';

-- 40行种子（xlsx 表5-1 原表数值，已逐行核对）
INSERT IGNORE INTO monster_ehp_config (stage, monster_type, xiu_required, ehp_multiplier) VALUES
(1,1,1,5),  (1,2,2,8),  (1,3,3,10), (1,4,4,15), (1,5,5,20),
(2,1,1,15), (2,2,2,18), (2,3,3,20), (2,4,4,25), (2,5,5,30),
(3,1,1,25), (3,2,2,28), (3,3,3,30), (3,4,4,35), (3,5,5,40),
(4,1,1,35), (4,2,2,38), (4,3,3,40), (4,4,4,45), (4,5,5,50),
(5,1,1,45), (5,2,2,48), (5,3,3,50), (5,4,4,55), (5,5,5,60),
(6,1,1,55), (6,2,2,58), (6,3,3,60), (6,4,4,65), (6,5,5,70),
(7,1,1,65), (7,2,2,68), (7,3,3,70), (7,4,4,75), (7,5,5,80),
(8,1,1,75), (8,2,2,78), (8,3,3,80), (8,4,4,85), (8,5,5,90);

-- ─────────────────────────────────────
--  9. char_meditation: 功法打坐状态表（结算制）
--  【与 /fatigue/ 牢结值打坐无关】本表是功法修炼打坐（产出角色升级XP），
--  采用结算制：settle 时按 last_tick_at 到当前的完整10分钟单位数发放XP，
--  无后台 Cron。规则（PRD 2.1）：10分钟为单位不满无经验，每日上限4小时。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_meditation (
  character_id  BIGINT UNSIGNED PRIMARY KEY       COMMENT '角色ID，一人一行',
  status        TINYINT  NOT NULL DEFAULT 0       COMMENT '状态：0=未打坐 1=打坐中',
  started_at    DATETIME NULL                     COMMENT '本次打坐开始时间',
  last_tick_at  DATETIME NULL                     COMMENT '上次结算推进到的时间点（结算按完整10分钟单位推进，余数留给下次）',
  today_seconds INT      NOT NULL DEFAULT 0       COMMENT '今日已计入的打坐秒数（只累计完整单位，上限14400=4小时）',
  today_date    DATE     NULL                     COMMENT '今日额度对应日期（换日时重置 today_seconds）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='功法打坐状态表（结算制，与牢结值打坐/fatigue完全独立）';

-- ─────────────────────────────────────
--  10. char_mengyi_soup: 孟遗汤持有表
--  孟遗汤是遗忘功法/技能的消耗道具（PRD 2.4）：商城99灵石/个，副本掉落3%。
--  与神位系统的归元符（shenwei_talisman）同一简化策略：通用计数不分品级，
--  遗忘按功法品级扣对应数量（灵法2/仙法3/道法5，凡法免费）。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS char_mengyi_soup (
  character_id BIGINT UNSIGNED PRIMARY KEY  COMMENT '角色ID，一人一行',
  count        INT             NOT NULL DEFAULT 0 COMMENT '孟遗汤持有数量（>=0）',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变动时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色孟遗汤持有表：遗忘功法/技能消耗道具';

-- ─────────────────────────────────────
--  11. ALTER character_attributes 增加功法加成三列 + 走火入魔截止时间
--  MySQL 8.4 不支持 ADD COLUMN IF NOT EXISTS，用存储过程先查 information_schema
--  实现幂等：列已存在则跳过，本文件可安全重复执行。
--  列语义：
--    gongfa_* = 已学功法的精/气/神加成累计（叠加式：学习+=遗忘-=，
--               与 shenwei_* 的快照覆盖式不同，两者互不干扰）
--    zouhuo_until = 走火入魔截止时间（学超品级功法触发，NOW()+72小时；
--               生效期内有效精×0.5，见 PRD 2.5"精暴降50%持续72h"，
--               72h按真实时间实现——"游戏时间"语义模糊，取保守假设）
-- ─────────────────────────────────────
DROP PROCEDURE IF EXISTS add_gongfa_attr_columns;

DELIMITER $$
CREATE PROCEDURE add_gongfa_attr_columns()
BEGIN
  -- 逐列检查是否已存在，不存在才增列（幂等保护）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'gongfa_jing'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN gongfa_jing INT NOT NULL DEFAULT 0 COMMENT '已学功法的精加成累计（学习+=/遗忘-=，有效精=jing+shenwei_jing+gongfa_jing）' AFTER shenwei_shen;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'gongfa_qi'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN gongfa_qi INT NOT NULL DEFAULT 0 COMMENT '已学功法的气加成累计' AFTER gongfa_jing;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'gongfa_shen'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN gongfa_shen INT NOT NULL DEFAULT 0 COMMENT '已学功法的神加成累计' AFTER gongfa_qi;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'character_attributes' AND COLUMN_NAME = 'zouhuo_until'
  ) THEN
    ALTER TABLE character_attributes
      ADD COLUMN zouhuo_until DATETIME NULL COMMENT '走火入魔截止时间（NULL或已过期=正常；生效期内有效精×0.5，PRD 2.5）' AFTER gongfa_shen;
  END IF;
END$$
DELIMITER ;

CALL add_gongfa_attr_columns();
DROP PROCEDURE IF EXISTS add_gongfa_attr_columns;
