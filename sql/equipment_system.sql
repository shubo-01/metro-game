-- ═══════════════════════════════════════════════════════════════
--  寻仙 - 装备系统 数据库脚本
--  严格按照《寻仙·装备系统 PRD+技术方案》实现
--
--  包含：
--    1.  equip_quality_config   品质配置表（9品质倍率/附加属性数量/境界要求/修理材料/腰带扩展/掉落概率）
--    2.  equipment_template     装备槽位模板表（8甲+4首饰+主副武器基数配置）
--    3.  equipment_instance     装备实例表
--    4.  equipment_extra_attr   装备附加属性表
--    5.  equip_attr_config      附加属性数值区间配置表（16属性×7品质）
--    6.  craft_level            打造品级表（学徒→宗师）
--    7.  craft_recipe           打造图纸表
--    8.  equip_drop_table       掉落概率配置表（5怪物类型×品质）
--    9.  set_bonus              套装效果表
--    10. player_warehouse       仓库表
--    11. myth_shard             神话碎片表
--    12. inherit_record         神位继承记录表
--    13. trade_order            交易订单表
--    14. repair_log             修理日志表
--
--  执行方式（Windows 注意中文编码，必须用 source 方式执行）:
--    mysql -uroot -p -e "source e:/ziji-xiaochengxu/sql/equipment_system.sql"
-- ═══════════════════════════════════════════════════════════════

USE game_main;

-- ─────────────────────────────────────
--  1. equip_quality_config: 品质配置表（PRD 第三/五/七/九/十一/十三/十七章汇总）
--  品质枚举：1=凡品 2=珍品 3=神话碎片 4=灵宝 5=仙宝 6=神话 7=道宝 8=先天灵宝 9=功德灵宝
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS equip_quality_config (
  quality              TINYINT       PRIMARY KEY           COMMENT '品质枚举：1=凡品 2=珍品 3=神话碎片 4=灵宝 5=仙宝 6=神话 7=道宝 8=先天灵宝 9=功德灵宝',
  name                 VARCHAR(16)   NOT NULL              COMMENT '品质名称',
  multiplier           DECIMAL(4,1)  NOT NULL              COMMENT '品质加成倍率（凡品×1为基准，PRD 第三章）',
  extra_attr_min       TINYINT       NOT NULL              COMMENT '附加属性数量下限（PRD 7.1）',
  extra_attr_max       TINYINT       NOT NULL              COMMENT '附加属性数量上限（PRD 7.1）',
  required_major_stage TINYINT       NOT NULL              COMMENT '穿戴要求大境界：1=人阶 2=真人 3=仙 4=金仙（PRD 第十七章）',
  repair_material      VARCHAR(16)   NOT NULL              COMMENT '修理材料名称（PRD 9.2）：铁/精铁/灵矿/仙玉/神石/道晶/先天精粹',
  belt_extra_slots     TINYINT       NOT NULL DEFAULT 0    COMMENT '腰带额外背包格数（PRD 第十三章）',
  belt_quick_slots     TINYINT       NOT NULL DEFAULT 0    COMMENT '腰带快捷栏数（PRD 第十三章）',
  drop_base_rate       DECIMAL(8,6)  NOT NULL DEFAULT 0    COMMENT '掉落基础概率（PRD 11.1，神话碎片不单独占概率行填0）',
  drop_enabled         TINYINT       NOT NULL DEFAULT 1    COMMENT '是否参与掉落：0=否（功德灵宝前期不出）1=是'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='装备品质配置表：9品质全维度参数';

-- 品质配置种子数据（严格按照 PRD 各章数值）
-- 神话碎片(quality=3)：不可穿戴，无附加属性，掉落走神话概率50%转碎片，故 drop_base_rate=0
-- 功德灵宝(quality=9)：特殊机制留白，前期不出（drop_enabled=0），腰带行 PRD 未给出填0
INSERT IGNORE INTO equip_quality_config
(quality, name, multiplier, extra_attr_min, extra_attr_max, required_major_stage, repair_material, belt_extra_slots, belt_quick_slots, drop_base_rate, drop_enabled) VALUES
(1, '凡品',     1.0,  0, 1, 1, '铁',       2,  1, 0.930000, 1),
(2, '珍品',     2.0,  1, 2, 1, '精铁',     4,  2, 0.050000, 1),
(3, '神话碎片', 2.5,  0, 0, 3, '神石',     0,  0, 0.000000, 0),
(4, '灵宝',     3.0,  1, 3, 2, '灵矿',     6,  3, 0.010000, 1),
(5, '仙宝',     5.0,  2, 3, 2, '仙玉',     8,  4, 0.005000, 1),
(6, '神话',     7.0,  2, 4, 3, '神石',     10, 5, 0.003500, 1),
(7, '道宝',     9.0,  3, 4, 3, '道晶',     12, 6, 0.001000, 1),
(8, '先天灵宝', 12.0, 3, 5, 4, '先天精粹', 16, 8, 0.000500, 1),
(9, '功德灵宝', 12.0, 3, 5, 4, '先天精粹', 0,  0, 0.000500, 0);

-- ─────────────────────────────────────
--  2. equipment_template: 装备槽位模板表（PRD 第二/四章）
--  槽位枚举：1-8=穿戴甲（头/面/躯/裆/腿/足/臂/腰带） 11-14=首饰（手镯/戒指/耳环/项链） 21=主武器 22=副武器
--  大类：1=穿戴甲（加精） 2=首饰（加神） 3=武器（加气）
--  base_divisor：单件基数分母。甲=8（每件1/8精），首饰=4（每件1/4神）；
--                武器=0 表示动态计算（按副武器数量线性插值后均分，见服务端 SubWeaponTotalBase）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_template (
  template_id   INT           PRIMARY KEY                 COMMENT '模板ID（与槽位枚举一致）',
  slot_type     TINYINT       NOT NULL                    COMMENT '槽位类型：1头甲 2面甲 3躯甲 4裆甲 5腿甲 6足甲 7臂甲 8腰带 11手镯 12戒指 13耳环 14项链 21主武器 22副武器',
  slot_name     VARCHAR(16)   NOT NULL                    COMMENT '槽位名称',
  category      TINYINT       NOT NULL                    COMMENT '装备大类：1=穿戴甲 2=首饰 3=武器',
  attr_type     TINYINT       NOT NULL                    COMMENT '加成属性：1=精 2=神 3=气（PRD 第四章）',
  base_divisor  TINYINT       NOT NULL                    COMMENT '基数分母：甲=8 首饰=4 武器=0（动态插值计算）',
  UNIQUE KEY uk_slot (slot_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='装备槽位模板表：14种槽位的大类/加成属性/基数配置';

-- 槽位模板种子数据（PRD 第二章槽位结构）
INSERT IGNORE INTO equipment_template (template_id, slot_type, slot_name, category, attr_type, base_divisor) VALUES
(1,  1,  '头甲',   1, 1, 8),
(2,  2,  '面甲',   1, 1, 8),
(3,  3,  '躯甲',   1, 1, 8),
(4,  4,  '裆甲',   1, 1, 8),
(5,  5,  '腿甲',   1, 1, 8),
(6,  6,  '足甲',   1, 1, 8),
(7,  7,  '臂甲',   1, 1, 8),
(8,  8,  '腰带',   1, 1, 8),
(11, 11, '手镯',   2, 2, 4),
(12, 12, '戒指',   2, 2, 4),
(13, 13, '耳环',   2, 2, 4),
(14, 14, '项链',   2, 2, 4),
(21, 21, '主武器', 3, 3, 0),
(22, 22, '副武器', 3, 3, 0);

-- ─────────────────────────────────────
--  3. equipment_instance: 装备实例表（技术方案 3.1）
--  每件装备一行。碎裂/粉碎不物理删除，status=1 软删除便于审计
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_instance (
  equipment_id    BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '装备实例ID',
  owner_id        BIGINT UNSIGNED NOT NULL                   COMMENT '所有者玩家ID（装备完全自由交易不绑定，可转移）',
  quality         TINYINT         NOT NULL                   COMMENT '品质：1-9（见 equip_quality_config）',
  slot_type       TINYINT         NOT NULL                   COMMENT '槽位类型（见 equipment_template）',
  weapon_type     TINYINT         NOT NULL DEFAULT 0         COMMENT '武器类型：0=非武器 1=刀剑 2=枪戟 3=锤斧 4=弓弩 5=扇笛 6=法杖（决定攻击形状，PRD 第八章）',
  level           TINYINT         NOT NULL DEFAULT 1         COMMENT '装备等级1-10，10级加成翻倍（PRD 5.1）',
  durability      SMALLINT        NOT NULL DEFAULT 300       COMMENT '当前耐久，上限300，归零碎裂消失（PRD 9.1）',
  base_attr_type  TINYINT         NOT NULL                   COMMENT '基础加成属性：1=精 2=神 3=气',
  base_attr_share DECIMAL(8,6)    NOT NULL                   COMMENT '本件占全类基数的份额。甲/首饰=均分份额×随机浮动0.7~1.3（PRD 4.1随机分配，期望总和=品质倍率×1）；武器=0动态计算',
  is_equipped     TINYINT         NOT NULL DEFAULT 0         COMMENT '是否已穿戴：0=背包中 1=已穿戴',
  status          TINYINT         NOT NULL DEFAULT 0         COMMENT '状态：0=正常 1=已碎裂/粉碎（软删除，不可用不可交易）',
  source          VARCHAR(32)     DEFAULT NULL               COMMENT '来源标记：drop=掉落 craft=打造 daobao_combine=道宝合成 shard_combine=碎片合成 trade=交易获得',
  created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '生成时间',
  updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_owner (owner_id, status),
  INDEX idx_owner_equipped (owner_id, is_equipped)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='装备实例表：服务端权威生成，所有加成/升级/耐久判定在服务端';

-- ─────────────────────────────────────
--  4. equipment_extra_attr: 装备附加属性表（技术方案 3.1）
--  附加属性在装备生成时随机产出，数量由品质决定（PRD 7.1）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_extra_attr (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  equipment_id  BIGINT UNSIGNED NOT NULL                   COMMENT '所属装备实例ID',
  attr_type     TINYINT         NOT NULL                   COMMENT '属性类型：1暴击率 2闪避率 3命中率 4穿透 5吸血 6反伤 7元素抗性 8元素伤害 9冰冻概率 10灼烧概率 11击退 12眩晕 13移速 14攻速 15跳跃 16冷却缩减',
  attr_value    DECIMAL(8,3)    NOT NULL                   COMMENT '1级基准数值（百分比类存百分数如1.5表示1.5%，元素类存固定值）。实际值=基准×等级系数',
  attr_category TINYINT         NOT NULL                   COMMENT '属性大类：1=百分比类 2=元素类 3=特殊效果类 4=功能类（PRD 7.2-7.5）',
  INDEX idx_equipment (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='装备附加属性表：生成时随机产出，随装备等级同步提升';

-- ─────────────────────────────────────
--  5. equip_attr_config: 附加属性数值区间配置表（PRD 7.2-7.5）
--  16种属性 × 7个品质档（凡/珍/灵/仙/神话/道/先天，碎片无附加属性）
--  min_value/max_value 为装备1级时的随机区间，10级时数值翻倍
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS equip_attr_config (
  id          INT           PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  attr_type   TINYINT       NOT NULL                   COMMENT '属性类型：1-16（同 equipment_extra_attr.attr_type）',
  attr_name   VARCHAR(16)   NOT NULL                   COMMENT '属性名称',
  category    TINYINT       NOT NULL                   COMMENT '属性大类：1=百分比类 2=元素类 3=特殊效果类 4=功能类',
  quality     TINYINT       NOT NULL                   COMMENT '品质：1凡 2珍 4灵 5仙 6神话 7道 8先天',
  min_value   DECIMAL(8,3)  NOT NULL                   COMMENT '随机区间下限',
  max_value   DECIMAL(8,3)  NOT NULL                   COMMENT '随机区间上限',
  UNIQUE KEY uk_attr_quality (attr_type, quality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附加属性数值区间配置表：PRD 7.2-7.5 数值表落地';

-- 7.2 百分比类属性（attr_type 1-6, category=1）
INSERT IGNORE INTO equip_attr_config (attr_type, attr_name, category, quality, min_value, max_value) VALUES
(1, '暴击率', 1, 1, 0, 1),   (1, '暴击率', 1, 2, 1, 2),   (1, '暴击率', 1, 4, 2, 4),   (1, '暴击率', 1, 5, 4, 7),
(1, '暴击率', 1, 6, 7, 10),  (1, '暴击率', 1, 7, 10, 14), (1, '暴击率', 1, 8, 14, 20),
(2, '闪避率', 1, 1, 0, 1),   (2, '闪避率', 1, 2, 1, 2),   (2, '闪避率', 1, 4, 2, 3),   (2, '闪避率', 1, 5, 3, 5),
(2, '闪避率', 1, 6, 5, 8),   (2, '闪避率', 1, 7, 8, 12),  (2, '闪避率', 1, 8, 12, 18),
(3, '命中率', 1, 1, 0, 2),   (3, '命中率', 1, 2, 2, 4),   (3, '命中率', 1, 4, 4, 6),   (3, '命中率', 1, 5, 6, 10),
(3, '命中率', 1, 6, 10, 14), (3, '命中率', 1, 7, 14, 18), (3, '命中率', 1, 8, 18, 25),
(4, '穿透',   1, 1, 0, 1),   (4, '穿透',   1, 2, 1, 2),   (4, '穿透',   1, 4, 2, 3),   (4, '穿透',   1, 5, 3, 5),
(4, '穿透',   1, 6, 5, 8),   (4, '穿透',   1, 7, 8, 12),  (4, '穿透',   1, 8, 12, 18),
(5, '吸血',   1, 1, 0, 0.5), (5, '吸血',   1, 2, 0.5, 1), (5, '吸血',   1, 4, 1, 1.5), (5, '吸血',   1, 5, 1.5, 3),
(5, '吸血',   1, 6, 3, 5),   (5, '吸血',   1, 7, 5, 7),   (5, '吸血',   1, 8, 7, 10),
(6, '反伤',   1, 1, 0, 1),   (6, '反伤',   1, 2, 1, 2),   (6, '反伤',   1, 4, 2, 3),   (6, '反伤',   1, 5, 3, 5),
(6, '反伤',   1, 6, 5, 7),   (6, '反伤',   1, 7, 7, 10),  (6, '反伤',   1, 8, 10, 15);

-- 7.3 元素类属性（attr_type 7-8, category=2，固定值）
INSERT IGNORE INTO equip_attr_config (attr_type, attr_name, category, quality, min_value, max_value) VALUES
(7, '元素抗性', 2, 1, 0, 2),   (7, '元素抗性', 2, 2, 2, 5),   (7, '元素抗性', 2, 4, 5, 10),  (7, '元素抗性', 2, 5, 10, 15),
(7, '元素抗性', 2, 6, 15, 25), (7, '元素抗性', 2, 7, 25, 35), (7, '元素抗性', 2, 8, 35, 50),
(8, '元素伤害', 2, 1, 0, 2),   (8, '元素伤害', 2, 2, 2, 5),   (8, '元素伤害', 2, 4, 5, 10),  (8, '元素伤害', 2, 5, 10, 15),
(8, '元素伤害', 2, 6, 15, 25), (8, '元素伤害', 2, 7, 25, 35), (8, '元素伤害', 2, 8, 35, 50);

-- 7.4 特殊效果类属性（attr_type 9-12, category=3）
INSERT IGNORE INTO equip_attr_config (attr_type, attr_name, category, quality, min_value, max_value) VALUES
(9,  '冰冻概率', 3, 1, 0, 0.3),   (9,  '冰冻概率', 3, 2, 0.3, 0.8), (9,  '冰冻概率', 3, 4, 0.8, 1.5), (9,  '冰冻概率', 3, 5, 1.5, 3),
(9,  '冰冻概率', 3, 6, 3, 5),     (9,  '冰冻概率', 3, 7, 5, 7),     (9,  '冰冻概率', 3, 8, 7, 10),
(10, '灼烧概率', 3, 1, 0, 0.3),   (10, '灼烧概率', 3, 2, 0.3, 0.8), (10, '灼烧概率', 3, 4, 0.8, 1.5), (10, '灼烧概率', 3, 5, 1.5, 3),
(10, '灼烧概率', 3, 6, 3, 5),     (10, '灼烧概率', 3, 7, 5, 7),     (10, '灼烧概率', 3, 8, 7, 10),
(11, '击退',     3, 1, 0, 0.5),   (11, '击退',     3, 2, 0.5, 1),   (11, '击退',     3, 4, 1, 2),     (11, '击退',     3, 5, 2, 3),
(11, '击退',     3, 6, 3, 5),     (11, '击退',     3, 7, 5, 7),     (11, '击退',     3, 8, 7, 10),
(12, '眩晕',     3, 1, 0, 0.3),   (12, '眩晕',     3, 2, 0.3, 0.5), (12, '眩晕',     3, 4, 0.5, 1),   (12, '眩晕',     3, 5, 1, 2),
(12, '眩晕',     3, 6, 2, 3),     (12, '眩晕',     3, 7, 3, 5),     (12, '眩晕',     3, 8, 5, 8);

-- 7.5 功能类属性（attr_type 13-16, category=4）
INSERT IGNORE INTO equip_attr_config (attr_type, attr_name, category, quality, min_value, max_value) VALUES
(13, '移速',     4, 1, 0, 1),   (13, '移速',     4, 2, 1, 2),   (13, '移速',     4, 4, 2, 3), (13, '移速',     4, 5, 3, 5),
(13, '移速',     4, 6, 5, 7),   (13, '移速',     4, 7, 7, 10),  (13, '移速',     4, 8, 10, 15),
(14, '攻速',     4, 1, 0, 1),   (14, '攻速',     4, 2, 1, 2),   (14, '攻速',     4, 4, 2, 3), (14, '攻速',     4, 5, 3, 5),
(14, '攻速',     4, 6, 5, 7),   (14, '攻速',     4, 7, 7, 10),  (14, '攻速',     4, 8, 10, 15),
(15, '跳跃',     4, 1, 0, 1),   (15, '跳跃',     4, 2, 1, 2),   (15, '跳跃',     4, 4, 2, 3), (15, '跳跃',     4, 5, 3, 5),
(15, '跳跃',     4, 6, 5, 7),   (15, '跳跃',     4, 7, 7, 10),  (15, '跳跃',     4, 8, 10, 15),
(16, '冷却缩减', 4, 1, 0, 0.5), (16, '冷却缩减', 4, 2, 0.5, 1), (16, '冷却缩减', 4, 4, 1, 2), (16, '冷却缩减', 4, 5, 2, 3),
(16, '冷却缩减', 4, 6, 3, 5),   (16, '冷却缩减', 4, 7, 5, 7),   (16, '冷却缩减', 4, 8, 7, 10);

-- ─────────────────────────────────────
--  6. craft_level: 打造品级表（PRD 10.1）
--  品级枚举：1=学徒 2=匠人 3=巧匠 4=大师 5=宗师
--  升级需同时满足：打造次数积累 + NPC拜师认证（npc_certified）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS craft_level (
  player_id          BIGINT UNSIGNED PRIMARY KEY          COMMENT '玩家ID',
  level              TINYINT       NOT NULL DEFAULT 1     COMMENT '打造品级：1=学徒 2=匠人 3=巧匠 4=大师 5=宗师',
  success_count_fan  INT           NOT NULL DEFAULT 0     COMMENT '成功打造凡品累计数（学徒→匠人需300）',
  success_count_zhen INT           NOT NULL DEFAULT 0     COMMENT '成功打造珍品累计数（匠人→巧匠需500）',
  success_count_ling INT           NOT NULL DEFAULT 0     COMMENT '成功打造灵宝累计数（巧匠→大师需500，大师→宗师需900）',
  success_count_xian INT           NOT NULL DEFAULT 0     COMMENT '成功打造仙宝累计数（宗师满级需1000，满级后解锁道宝合成）',
  npc_certified      TINYINT       NOT NULL DEFAULT 0     COMMENT 'NPC拜师认证：0=未认证 1=已认证（升级双条件之一，认证接口预留）',
  updated_at         DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打造品级表：打造次数积累+NPC拜师双条件升级';

-- ─────────────────────────────────────
--  7. craft_recipe: 打造图纸表（PRD 10.2）
--  神话以上品质不可打造，仅靠掉落，故图纸只到仙宝
--  实际成功率由服务端"品级×品质成功率矩阵"计算（PRD 10.1），此表存材料与消耗
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS craft_recipe (
  recipe_id            INT           PRIMARY KEY AUTO_INCREMENT COMMENT '图纸ID',
  name                 VARCHAR(32)   NOT NULL                   COMMENT '图纸名称',
  quality              TINYINT       NOT NULL                   COMMENT '产出品质：1凡 2珍 4灵 5仙（神话以上不可打造）',
  slot_type            TINYINT       NOT NULL DEFAULT 0         COMMENT '产出槽位：0=随机槽位，其他=固定槽位',
  required_craft_level TINYINT       NOT NULL                   COMMENT '所需打造品级：1学徒 2匠人 3巧匠 5宗师（对应品级首次解锁该品质）',
  materials            VARCHAR(255)  NOT NULL                   COMMENT '所需材料JSON，如 [{"item_id":1001,"count":5}]',
  gold_cost            INT           NOT NULL DEFAULT 0         COMMENT '打造消耗金币',
  source_desc          VARCHAR(64)   DEFAULT NULL               COMMENT '图纸来源：副本/野怪掉落、NPC购买、任务奖励'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打造图纸表：材料+图纸+钱三消耗，成功率由品级矩阵决定';

-- 基础图纸种子数据（各品质通用随机槽位图纸，材料 item_id 与背包物品表约定）
INSERT IGNORE INTO craft_recipe (recipe_id, name, quality, slot_type, required_craft_level, materials, gold_cost, source_desc) VALUES
(1, '凡品装备图纸', 1, 0, 1, '[{"item_id":2001,"count":3}]',  100,   'NPC购买/野怪掉落'),
(2, '珍品装备图纸', 2, 0, 2, '[{"item_id":2002,"count":5}]',  500,   'NPC购买/野怪掉落'),
(3, '灵宝装备图纸', 4, 0, 3, '[{"item_id":2003,"count":8}]',  2000,  '副本掉落/任务奖励'),
(4, '仙宝装备图纸', 5, 0, 5, '[{"item_id":2004,"count":12}]', 10000, '副本掉落/任务奖励');

-- ─────────────────────────────────────
--  8. equip_drop_table: 掉落概率配置表（PRD 11.1/11.2 + 技术方案 7.1）
--  monster_type：1=普通怪 2=精英怪 3=Boss怪 4=妖 5=神兽
--  普通怪严格按 PRD 11.1 基础概率；其他类型按 PRD 11.2 定性描述细化数值
--  最终概率 = base_rate × (1 + luck)，luck 为玩家气运归一化值（与副本系统一致）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS equip_drop_table (
  id             INT           PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  monster_type   TINYINT       NOT NULL                   COMMENT '怪物类型：1=普通怪 2=精英怪 3=Boss怪 4=妖 5=神兽',
  quality        TINYINT       NOT NULL                   COMMENT '掉落品质：1凡 2珍 4灵 5仙 6神话 7道 8先天 9功德',
  base_rate      DECIMAL(8,6)  NOT NULL                   COMMENT '基础掉落概率（0-1）',
  drop_times_min TINYINT       NOT NULL DEFAULT 1         COMMENT '掉落判定次数下限（PRD 7.1：普通1 精英1-2 Boss2-3 妖2-3 神兽3-5）',
  drop_times_max TINYINT       NOT NULL DEFAULT 1         COMMENT '掉落判定次数上限',
  enabled        TINYINT       NOT NULL DEFAULT 1         COMMENT '是否启用：0=禁用（功德灵宝前期不出）',
  UNIQUE KEY uk_type_quality (monster_type, quality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='掉落概率配置表：怪物类型×品质，气运加成在服务端计算';

-- 普通怪（严格按 PRD 11.1 基础概率，判定1次）
INSERT IGNORE INTO equip_drop_table (monster_type, quality, base_rate, drop_times_min, drop_times_max, enabled) VALUES
(1, 1, 0.930000, 1, 1, 1), (1, 2, 0.050000, 1, 1, 1), (1, 4, 0.010000, 1, 1, 1), (1, 5, 0.005000, 1, 1, 1),
(1, 6, 0.003500, 1, 1, 1), (1, 7, 0.001000, 1, 1, 1), (1, 8, 0.000500, 1, 1, 1), (1, 9, 0.000500, 1, 1, 0);
-- 精英怪（珍品以上概率提升，判定1-2次）
INSERT IGNORE INTO equip_drop_table (monster_type, quality, base_rate, drop_times_min, drop_times_max, enabled) VALUES
(2, 1, 0.880000, 1, 2, 1), (2, 2, 0.080000, 1, 2, 1), (2, 4, 0.020000, 1, 2, 1), (2, 5, 0.010000, 1, 2, 1),
(2, 6, 0.007000, 1, 2, 1), (2, 7, 0.002000, 1, 2, 1), (2, 8, 0.001000, 1, 2, 1), (2, 9, 0.001000, 1, 2, 0);
-- Boss怪（灵宝中等概率，判定2-3次）
INSERT IGNORE INTO equip_drop_table (monster_type, quality, base_rate, drop_times_min, drop_times_max, enabled) VALUES
(3, 1, 0.800000, 2, 3, 1), (3, 2, 0.120000, 2, 3, 1), (3, 4, 0.050000, 2, 3, 1), (3, 5, 0.020000, 2, 3, 1),
(3, 6, 0.010000, 2, 3, 1), (3, 7, 0.003000, 2, 3, 1), (3, 8, 0.001500, 2, 3, 1), (3, 9, 0.001500, 2, 3, 0);
-- 妖（珍品+灵宝为主，仙宝极低，判定2-3次）
INSERT IGNORE INTO equip_drop_table (monster_type, quality, base_rate, drop_times_min, drop_times_max, enabled) VALUES
(4, 1, 0.400000, 2, 3, 1), (4, 2, 0.350000, 2, 3, 1), (4, 4, 0.200000, 2, 3, 1), (4, 5, 0.040000, 2, 3, 1),
(4, 6, 0.015000, 2, 3, 1), (4, 7, 0.004000, 2, 3, 1), (4, 8, 0.002000, 2, 3, 1), (4, 9, 0.002000, 2, 3, 0);
-- 神兽（灵宝~仙宝为主，极低概率神话，判定3-5次）
INSERT IGNORE INTO equip_drop_table (monster_type, quality, base_rate, drop_times_min, drop_times_max, enabled) VALUES
(5, 2, 0.200000, 3, 5, 1), (5, 4, 0.450000, 3, 5, 1), (5, 5, 0.300000, 3, 5, 1),
(5, 6, 0.040000, 3, 5, 1), (5, 7, 0.008000, 3, 5, 1), (5, 8, 0.004000, 3, 5, 1), (5, 9, 0.004000, 3, 5, 0);

-- ─────────────────────────────────────
--  9. set_bonus: 套装效果表（PRD 第六章）
--  8甲+4首饰全同品质触发，穿齐时随机0~80%浮动值锁定，换件即解除
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS set_bonus (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  player_id   BIGINT UNSIGNED NOT NULL                   COMMENT '玩家ID',
  quality     TINYINT         NOT NULL                   COMMENT '套装品质（12件全同品质）',
  float_value DECIMAL(5,4)    NOT NULL                   COMMENT '浮动值0~0.8，穿齐那一刻随机生成并锁定',
  float_attr  TINYINT         NOT NULL                   COMMENT '浮动加成随机分配到的属性：1=精 2=神 3=气',
  is_active   TINYINT         NOT NULL DEFAULT 1         COMMENT '是否生效：1=生效 0=已解除（更换任意一件即解除）',
  created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '触发时间',
  INDEX idx_player_active (player_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='套装效果表：浮动值锁定记录，重新穿齐重新随机';

-- ─────────────────────────────────────
--  10. player_warehouse: 仓库表（PRD 第十四章）
--  购买房产或租用获得仓库，容量与租赁费用待定（预留）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_warehouse (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  player_id    BIGINT UNSIGNED NOT NULL                   COMMENT '玩家ID',
  slot_index   INT             NOT NULL                   COMMENT '仓库格子序号（从0开始）',
  equipment_id BIGINT UNSIGNED NOT NULL                   COMMENT '存放的装备实例ID',
  is_rented    TINYINT         NOT NULL DEFAULT 0         COMMENT '仓库获得方式：0=购买房产 1=租用',
  created_at   DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '存入时间',
  UNIQUE KEY uk_player_slot (player_id, slot_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库表：装备存取，房产系统关联预留';

-- ─────────────────────────────────────
--  11. myth_shard: 神话碎片表（PRD 12.1/12.2）
--  每玩家一行记录碎片数量。拥有碎片即获得神位继承资格
--  碎片3合1完整神话；仅通过大道争锋PVP掉落转移
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS myth_shard (
  shard_id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '碎片记录ID',
  owner_id         BIGINT UNSIGNED NOT NULL                   COMMENT '所有者玩家ID（绑定人物，不可交易转移）',
  count            INT             NOT NULL DEFAULT 0         COMMENT '当前持有碎片数量（3个可合成1件完整神话）',
  is_inherited     TINYINT         NOT NULL DEFAULT 0         COMMENT '是否已激活神位继承：0=未激活 1=已激活',
  inherited_skills VARCHAR(255)    NOT NULL DEFAULT '[]'      COMMENT '已继承的神话技能ID列表JSON，如 [101,102]',
  updated_at       DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  UNIQUE KEY uk_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神话碎片表：神位继承资格入口，唯一性由Redis锁+本表双保险';

-- ─────────────────────────────────────
--  12. inherit_record: 神位继承记录表（PRD 12.2）
--  记录继承激活与大道争锋失败后的技能灰化
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS inherit_record (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  player_id  BIGINT UNSIGNED NOT NULL                   COMMENT '玩家ID',
  shard_id   BIGINT UNSIGNED NOT NULL                   COMMENT '关联碎片记录ID',
  skill_id   INT             NOT NULL                   COMMENT '继承的神话技能ID',
  is_active  TINYINT         NOT NULL DEFAULT 1         COMMENT '技能状态：1=可用 0=已灰化（大道争锋失败后无法使用）',
  lost_at    DATETIME        DEFAULT NULL               COMMENT '碎片被夺走时间（大道争锋失败）',
  created_at DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '继承激活时间',
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神位继承记录表：技能激活/灰化历史';

-- ─────────────────────────────────────
--  13. trade_order: 交易订单表（PRD 第十六章）
--  装备完全自由交易，不绑定，所有品质均可交易
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_order (
  order_id     BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
  seller_id    BIGINT UNSIGNED NOT NULL                   COMMENT '卖家玩家ID',
  buyer_id     BIGINT UNSIGNED DEFAULT NULL               COMMENT '买家玩家ID（成交后填写）',
  equipment_id BIGINT UNSIGNED NOT NULL                   COMMENT '交易的装备实例ID',
  price        BIGINT          NOT NULL                   COMMENT '售价（金币）',
  status       VARCHAR(16)     NOT NULL DEFAULT 'PENDING' COMMENT '订单状态：PENDING=挂单中 COMPLETED=已成交 CANCELLED=已取消',
  created_at   DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '挂单时间',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '状态更新时间',
  INDEX idx_status (status),
  INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易订单表：自由交易，服务端校验所有权';

-- ─────────────────────────────────────
--  14. repair_log: 修理日志表（技术方案 3.1）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS repair_log (
  id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  equipment_id     BIGINT UNSIGNED NOT NULL                   COMMENT '修理的装备实例ID',
  player_id        BIGINT UNSIGNED NOT NULL                   COMMENT '发起修理的玩家ID',
  material_name    VARCHAR(16)     NOT NULL                   COMMENT '消耗的修理材料名称（按品质对应，PRD 9.2）',
  gold_cost        INT             NOT NULL                   COMMENT '消耗金币',
  durability_before SMALLINT       NOT NULL                   COMMENT '修理前耐久',
  created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '修理时间',
  INDEX idx_equipment (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='修理日志表：耐久修理留痕，服务端记录防篡改';
