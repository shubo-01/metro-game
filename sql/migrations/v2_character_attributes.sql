-- ═══════════════════════════════════════════════════════════════
--  人物系统属性 V2 数据库迁移脚本
--  依据：《人物系统属性_PRD_v2》《人物系统属性技术文档_V2》《人物系统属性基础表值_V2》
--
--  【执行顺序说明】
--  ① 全新环境初始化：不要执行本文件！直接执行 schema.sql + character_system.sql 即可
--     （建表脚本已是 V2 版本，重复执行本文件会因列已存在而报错）
--  ② 存量 V1 老库升级：只执行本文件一次（增列+新表+一次性重算既有角色衍生值）
--
--  执行方式（在已初始化 character_system.sql 的 V1 库上执行一次）：
--    mysql -u root -p xunxian < sql/migrations/v2_character_attributes.sql
--
--  内容概览：
--    1. character_attributes 增列：自由点记账(free_*) / 护盾(shield_*) / 亲和 / 反应 / 异常抵抗
--    2. character_realm      增列：待分配点数(unassigned_points) / 神魔子阶(sub_realm)
--    3. 新表 dao_accumulation：神魔5种道值积攒（子阶突破消耗）
--    4. 新表 wash_log：洗点流水（返还点数与费用记录）
--    5. 一次性 UPDATE：按 V2 公式重算既有角色的衍生属性
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
--  1. character_attributes 增列
--  V2 新增：自由点记账 + 护盾 + 三个新衍生值
-- ─────────────────────────────────────
ALTER TABLE character_attributes
  ADD COLUMN free_jing       INT      DEFAULT 0  COMMENT '已分配到精的自由点数：玩家用待分配点主动加的部分，洗点时只退这部分（固定点不退）' AFTER wu_xing,
  ADD COLUMN free_qi         INT      DEFAULT 0  COMMENT '已分配到气的自由点数：同 free_jing，取值>=0' AFTER free_jing,
  ADD COLUMN free_shen       INT      DEFAULT 0  COMMENT '已分配到神的自由点数：同 free_jing，取值>=0' AFTER free_qi,
  ADD COLUMN shield_max      BIGINT   DEFAULT 600 COMMENT '护盾上限=(精+气+神)×200：唯一被动防御层，初始(1+1+1)×200=600' AFTER soul_current,
  ADD COLUMN shield_current  BIGINT   DEFAULT 600 COMMENT '当前护盾值：受击先扣护盾后扣气血，脱战5秒后按(精+气+神)×2/秒恢复' AFTER shield_max,
  ADD COLUMN affinity        DECIMAL(10,1) DEFAULT 0.5 COMMENT '五行亲和=气×0.5：法修元素加成，实际加成=1+亲和/(亲和+K亲和)，K随境界查表（人100级K=67）' AFTER shield_current,
  ADD COLUMN reaction        INT      DEFAULT 1  COMMENT '反应=神×1：打断施法/抗打断的判定值，抗性率=反应/(反应+K反应)，K反应=2×K亲和' AFTER affinity,
  ADD COLUMN abnormal_resist DECIMAL(10,1) DEFAULT 0.5 COMMENT '异常抵抗值=神×0.5：抵抗率=值/(值+K异常)，实际异常触发概率=基础概率×(1-抵抗率)' AFTER reaction;

-- ─────────────────────────────────────
--  2. character_realm 增列
--  V2 新增：待分配自由点池 + 神魔子阶
-- ─────────────────────────────────────
ALTER TABLE character_realm
  ADD COLUMN unassigned_points INT     DEFAULT 0 COMMENT '待分配自由属性点：每升1级发放（人+2/真人+3/地仙+5...递增），玩家通过 /character/points/allocate 分配到精气神' AFTER breakthrough_status,
  ADD COLUMN sub_realm         TINYINT DEFAULT 0 COMMENT '神魔子阶：0=非神魔境界 1=太极 2=太素 3=太始 4=太初 5=太易，仅 major_stage=8 时有效' AFTER unassigned_points;

-- ─────────────────────────────────────
--  3. dao_accumulation: 神魔之道积攒表（V2 新表）
--  神魔境界内部子阶突破不走天劫，改为"以道证道"：
--  当前子阶对应道值攒够100 → 消耗100 → 子阶+1
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dao_accumulation (
  character_id      BIGINT UNSIGNED PRIMARY KEY COMMENT '角色ID，关联character_base.character_id，一人一行',
  dao_taiji         INT     DEFAULT 0           COMMENT '太极之道：太极(子阶1)→太素(子阶2)突破消耗，取值>=0，攒够100可突破',
  dao_taisu         INT     DEFAULT 0           COMMENT '太素之道：太素(子阶2)→太始(子阶3)突破消耗，取值>=0',
  dao_taishi        INT     DEFAULT 0           COMMENT '太始之道：太始(子阶3)→太初(子阶4)突破消耗，取值>=0',
  dao_taichu        INT     DEFAULT 0           COMMENT '太初之道：太初(子阶4)→太易(子阶5)突破消耗，取值>=0',
  dao_taiyi         INT     DEFAULT 0           COMMENT '太易之道：终局子阶预留（太易已是最高子阶，暂无消耗场景）',
  current_sub_realm TINYINT DEFAULT 1           COMMENT '当前神魔子阶快照：1太极 2太素 3太始 4太初 5太易（权威数据在character_realm.sub_realm，此处冗余便于查道值时一并读取）',
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神魔之道积攒表：5种道值，子阶突破消耗100对应道值';

-- ─────────────────────────────────────
--  4. wash_log: 洗点流水表（V2 新表）
--  每次洗点记一行，用于对账/追溯/防刷分析。
--  注意：项目当前无经济/钱包表，cost_paid 恒为0（实际未扣费），
--        cost_expected 记录按境界表应扣的灵石数，经济系统上线后接入扣费。
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wash_log (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '流水ID，自增',
  character_id   BIGINT UNSIGNED NOT NULL COMMENT '角色ID，关联character_base.character_id',
  jing_returned  INT    DEFAULT 0         COMMENT '本次从精上退回的自由点数（>=0）',
  qi_returned    INT    DEFAULT 0         COMMENT '本次从气上退回的自由点数（>=0）',
  shen_returned  INT    DEFAULT 0         COMMENT '本次从神上退回的自由点数（>=0）',
  total_returned INT    DEFAULT 0         COMMENT '本次返还到unassigned_points的总点数=三项之和',
  cost_expected  BIGINT DEFAULT 0         COMMENT '应扣灵石（按境界洗点表：人100/真人1000/地仙5000/天仙2万/金仙10万/太乙及以上50万）',
  cost_paid      BIGINT DEFAULT 0         COMMENT '实际扣除灵石：当前无经济系统恒为0，接入后与cost_expected一致',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '洗点时间',
  INDEX idx_character (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='洗点流水表：记录每次洗点的返还点数与费用';

-- ─────────────────────────────────────
--  5. 一次性数据修复：按 V2 公式重算既有角色的衍生属性
--  V1旧公式（气血=精×100、灵力=气×50、魂力=神×30）→ V2新公式：
--    气血=精×50  灵力=气×20  魂力=神×50  护盾=(精+气+神)×200
--    亲和=气×0.5 反应=神×1   异常抵抗=神×0.5
--  当前值策略：上限变了之后，当前值直接回满（等价于一次维护补偿）
-- ─────────────────────────────────────
UPDATE character_attributes SET
  hp_max          = jing * 50,
  hp_current      = jing * 50,
  mp_max          = qi * 20,
  mp_current      = qi * 20,
  soul_max        = shen * 50,
  soul_current    = shen * 50,
  shield_max      = (jing + qi + shen) * 200,
  shield_current  = (jing + qi + shen) * 200,
  affinity        = qi * 0.5,
  reaction        = shen * 1,
  abnormal_resist = shen * 0.5;

-- 为所有已有角色补一行 dao_accumulation（幂等：已存在则跳过）
INSERT IGNORE INTO dao_accumulation (character_id)
SELECT character_id FROM character_base;
