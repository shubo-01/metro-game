-- ═══════════════════════════════════════════
--  寻仙 - 数据库建表脚本（完整版，含全部注释）
--  MySQL 8.0+ / utf8mb4
--
--  【执行顺序说明】
--  ① 全新环境初始化：只需执行 schema.sql + character_system.sql
--     （两者的表定义均已是 V2 版本，包含全部 V2 字段/新表，无需再跑迁移脚本）
--  ② 存量 V1 老库升级：不要重复执行本文件，只需执行一次
--     sql/migrations/v2_character_attributes.sql（增列+新表+一次性重算）
-- ═══════════════════════════════════════════

-- ── 创建数据库 ──
CREATE DATABASE IF NOT EXISTS game_main DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS game_session DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS game_log DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS game_config DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════
--  game_main: 核心业务数据
-- ═══════════════════════════════════════════

USE game_main;

-- ─────────────────────────────────────
--  账号表：存储用户账号基础信息
-- ─────────────────────────────────────
CREATE TABLE accounts (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '账号ID，全局唯一自增主键',
  phone         VARCHAR(20)  NOT NULL UNIQUE             COMMENT '手机号，跨平台唯一标识（微信/抖音/App通用）',
  password_hash VARCHAR(255) DEFAULT NULL                COMMENT '密码哈希值，App端可选密码登录时使用bcrypt加密',
  status        TINYINT      DEFAULT 1                   COMMENT '账号状态：0=封禁 1=正常 2=永久封号',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '账号创建时间',
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户账号表：存储手机号、密码、封禁状态等基础账号信息';

-- ─────────────────────────────────────
--  平台绑定表：记录账号与各平台的关联
-- ─────────────────────────────────────
CREATE TABLE platform_bindings (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '绑定记录ID',
  account_id   BIGINT       NOT NULL                    COMMENT '关联的账号ID，对应accounts.id',
  platform     VARCHAR(20)  NOT NULL                    COMMENT '平台标识：wechat=微信 douyin=抖音 app_ios=iOS app_android=安卓',
  openid       VARCHAR(128) NOT NULL                    COMMENT '平台方分配的用户唯一标识（微信openid/抖音openid）',
  union_id     VARCHAR(128) DEFAULT NULL                COMMENT '微信开放平台unionId，用于跨App识别同一用户',
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '绑定时间',
  UNIQUE KEY uk_platform_openid (platform, openid),
  UNIQUE KEY uk_account_platform (account_id, platform),
  INDEX idx_openid (platform, openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台绑定表：记录账号与微信/抖音/App平台的关联关系，支持跨平台登录';

-- ─────────────────────────────────────
--  角色表：存储游戏角色的基础信息
-- ─────────────────────────────────────
CREATE TABLE players (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '角色ID，全局唯一自增主键',
  account_id   BIGINT       NOT NULL                    COMMENT '所属账号ID，对应accounts.id，一个账号一个角色',
  name         VARCHAR(32)  NOT NULL UNIQUE             COMMENT '角色名，2-8个汉字，全局唯一',
  gender       TINYINT      NOT NULL                    COMMENT '性别：1=男 2=女，创建时选定不可更改',
  race         TINYINT      DEFAULT 1                   COMMENT '种族：1=人族（初版仅开放人族，后续可扩展妖族/魔族等）',
  level_stage  TINYINT      DEFAULT 1                   COMMENT '境界阶段：1=人境 2=真人境 3=仙境 4=金仙境',
  level_tier   TINYINT      DEFAULT 1                   COMMENT '境界等级：1-9级，每个阶段内9个等级',
  level_step   TINYINT      DEFAULT 1                   COMMENT '境界段位：1-10段，每个等级内10个小段位',
  scene_id     INT          DEFAULT 1001                COMMENT '当前所在场景ID：1001=初始之地（新手村）',
  pos_x        FLOAT        DEFAULT 0                   COMMENT '角色在场景中的X坐标（像素值）',
  pos_y        FLOAT        DEFAULT 0                   COMMENT '角色在场景中的Y坐标（像素值）',
  is_online    TINYINT      DEFAULT 0                   COMMENT '是否在线：0=离线 1=在线',
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '角色创建时间',
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间（移动/升级时刷新）',
  INDEX idx_account (account_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表：存储角色的名称、性别、境界、位置等基础信息';

-- ─────────────────────────────────────
--  角色属性表：五维属性 + 隐藏属性
-- ─────────────────────────────────────
CREATE TABLE player_attrs (
  player_id         BIGINT        PRIMARY KEY               COMMENT '角色ID，对应players.id，一对一关系',
  jing              INT           DEFAULT 1                 COMMENT '精（肉身属性）：影响物理攻击/防御/血量，初始值=1',
  qi_metal          INT           DEFAULT 0                 COMMENT '金之气（五行-金）：金属性灵力值，影响金系功法威力',
  qi_wood           INT           DEFAULT 0                 COMMENT '木之气（五行-木）：木属性灵力值，影响治疗/生长类功法',
  qi_water          INT           DEFAULT 0                 COMMENT '水之气（五行-水）：水属性灵力值，影响水系控制功法',
  qi_fire           INT           DEFAULT 0                 COMMENT '火之气（五行-火）：火属性灵力值，影响火系攻击功法',
  qi_earth          INT           DEFAULT 0                 COMMENT '土之气（五行-土）：土属性灵力值，影响防御/土系功法',
  shen              INT           DEFAULT 1                 COMMENT '神（灵魂属性）：影响法术攻击/精神防御/暴击率，初始值=1',
  luck              DECIMAL(4,2)  DEFAULT 0.00              COMMENT '气运值：影响掉落率/奇遇触发概率/暴击加成，范围0-99.99',
  savvy             DECIMAL(4,2)  DEFAULT 0.00              COMMENT '悟性值：影响修炼速度/功法领悟概率/技能升级效率，范围0-99.99',
  causality         INT           DEFAULT 0                 COMMENT '【隐藏属性】因果值：影响天劫难度/NPC态度/剧情分支，对玩家不可见',
  inner_demon       INT           DEFAULT 0                 COMMENT '【隐藏属性】心魔值：积累过高会触发心魔劫/走火入魔事件，对玩家不可见',
  dao_age           INT           DEFAULT 0                 COMMENT '【隐藏属性】道行（修炼年限）：影响部分功法解锁条件和NPC对话',
  tribulation_count INT           DEFAULT 0                 COMMENT '【隐藏属性】已渡天劫次数：每次大境界突破触发天劫',
  updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '属性最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色属性表：五维显性属性（精气神/气运/悟性）+ 五行灵力 + 隐藏属性';

-- ═══════════════════════════════════════════
--  人物系统扩展表（技术方案 Table 4-13）
-- ═══════════════════════════════════════════

-- ─────────────────────────────────────
--  character_base: 角色基础信息表（Table 4）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_base (
  character_id  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '角色唯一ID，全局主键',
  account_id    BIGINT UNSIGNED NOT NULL                    COMMENT '关联账号ID，对应accounts.id',
  name          VARCHAR(32)     NOT NULL UNIQUE             COMMENT '角色名，2-8汉字，全局唯一',
  gender        TINYINT         NOT NULL                    COMMENT '性别：1=男 2=女，创建后不可更改',
  race          TINYINT         DEFAULT 1                   COMMENT '种族：1=人族 2=鬼修 3=兽身，随死亡/夺舍变化',
  form_state    TINYINT         DEFAULT 1                   COMMENT '形态：1=人形 2=兽形（兽身专用切换）',
  created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '角色创建时间',
  updated_at    DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_account (account_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色基础信息表：名称、性别、种族、形态等身份标识';

-- ─────────────────────────────────────
--  character_attributes: 五维属性表（Table 5）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_attributes (
  character_id    BIGINT UNSIGNED PRIMARY KEY         COMMENT '角色ID，关联character_base.character_id',
  jing            INT           DEFAULT 1             COMMENT '精（肉身强度）：影响气血上限/体魄/身法/根骨',
  qi              INT           DEFAULT 1             COMMENT '气（修炼能量总和）：影响灵力上限/功法威力/五行亲和',
  shen            INT           DEFAULT 1             COMMENT '神（灵魂之力）：影响魂力上限/神识范围/反应/异常抵抗',
  qi_yun          INT           DEFAULT 0             COMMENT '气运（命运属性）：影响奇遇/掉落/天劫减免/厄运抵抗',
  wu_xing         INT           DEFAULT 0             COMMENT '悟性（成长天赋）：影响修炼速度/暴击率(悟性×0.5%)/突破成功率',
  free_jing       INT           DEFAULT 0             COMMENT 'V2 已分配到精的自由点数：玩家用待分配点主动加的部分，洗点时只退这部分（固定点不退）',
  free_qi         INT           DEFAULT 0             COMMENT 'V2 已分配到气的自由点数：同 free_jing，取值>=0',
  free_shen       INT           DEFAULT 0             COMMENT 'V2 已分配到神的自由点数：同 free_jing，取值>=0',
  hp_max          INT           DEFAULT 50            COMMENT '气血上限（精衍生）：V2公式=精×50，血条总量，归零=死亡',
  hp_current      INT           DEFAULT 50            COMMENT '当前气血：战斗中消耗，自然恢复',
  mp_max          INT           DEFAULT 20            COMMENT '灵力上限（气衍生）：V2公式=气×20，蓝条总量',
  mp_current      INT           DEFAULT 20            COMMENT '当前灵力：释放技能消耗',
  soul_max        INT           DEFAULT 50            COMMENT '魂力上限（神衍生）：V2公式=神×50，鬼修专用血条',
  soul_current    INT           DEFAULT 50            COMMENT '当前魂力：鬼修状态使用',
  shield_max      BIGINT        DEFAULT 600           COMMENT 'V2 护盾上限=(精+气+神)×200：唯一被动防御层，初始(1+1+1)×200=600',
  shield_current  BIGINT        DEFAULT 600           COMMENT 'V2 当前护盾值：受击先扣护盾后扣气血，脱战5秒后按(精+气+神)×2/秒恢复',
  affinity        DECIMAL(10,1) DEFAULT 0.5           COMMENT 'V2 五行亲和=气×0.5：法修元素加成，实际加成=1+亲和/(亲和+K亲和)，K随境界查表（人100级K=67）',
  reaction        INT           DEFAULT 1             COMMENT 'V2 反应=神×1：打断施法/抗打断的判定值，抗性率=反应/(反应+K反应)，K反应=2×K亲和',
  abnormal_resist DECIMAL(10,1) DEFAULT 0.5           COMMENT 'V2 异常抵抗值=神×0.5：抵抗率=值/(值+K异常)，实际异常触发概率=基础概率×(1-抵抗率)',
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '属性最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色五维属性表（V2）：精气神+气运+悟性+自由点记账 + 气血/灵力/魂力/护盾/亲和/反应/异常抵抗衍生值';

-- ─────────────────────────────────────
--  character_qi_elements: 气的五行多修表（Table 6）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_qi_elements (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  character_id    BIGINT UNSIGNED NOT NULL                   COMMENT '角色ID',
  element_type    TINYINT         NOT NULL                   COMMENT '五行类型：1=金 2=木 3=水 4=火 5=土',
  proficiency     INT             DEFAULT 0                  COMMENT '该属性修炼熟练度，决定功法威力',
  is_cultivating  TINYINT         DEFAULT 0                  COMMENT '是否正在修炼此属性：0=否 1=是',
  created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '开始修炼时间',
  UNIQUE KEY uk_char_element (character_id, element_type),
  INDEX idx_character (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='气的五行多修记录表：每个角色每种五行属性一行，兼修数量实时计算';

-- ─────────────────────────────────────
--  character_realm: 境界与经验表（Table 7）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_realm (
  character_id        BIGINT UNSIGNED PRIMARY KEY     COMMENT '角色ID',
  major_stage         TINYINT         DEFAULT 1       COMMENT 'V2 大境界：1=人 2=真人 3=地仙 4=天仙 5=金仙 6=太乙金仙 7=大罗金仙 8=神魔',
  minor_stage         TINYINT         DEFAULT 1       COMMENT '小阶：1-9阶',
  stage_segment       TINYINT         DEFAULT 0       COMMENT '段格：0-9，可见进度条',
  exp_jing            BIGINT          DEFAULT 0       COMMENT '精属性当前经验值',
  exp_qi              BIGINT          DEFAULT 0       COMMENT '气属性当前经验值',
  exp_shen            BIGINT          DEFAULT 0       COMMENT '神属性当前经验值',
  tribulation_count   INT             DEFAULT 0       COMMENT '已渡天劫次数，每渡一次后续天劫难度递增',
  xinmo_value         INT             DEFAULT 0       COMMENT '心魔值：每次突破+1，超过悟性值触发心魔劫',
  dao_xing            INT             DEFAULT 0       COMMENT '道行：修行资历积累，影响NPC对话和功法门槛',
  karma_value         INT             DEFAULT 0       COMMENT '因果值：正=善行，负=恶行，影响轮回道分配',
  breakthrough_status TINYINT         DEFAULT 0       COMMENT '突破状态：0=正常 1=突破中 2=心魔劫中 3=天劫中',
  unassigned_points   INT             DEFAULT 0       COMMENT 'V2 待分配自由属性点：每升1级发放（人+2/真人+3/地仙+5...递增），通过 /character/points/allocate 分配到精气神',
  sub_realm           TINYINT         DEFAULT 0       COMMENT 'V2 神魔子阶：0=非神魔境界 1=太极 2=太素 3=太始 4=太初 5=太易，仅 major_stage=8 时有效',
  updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='境界与经验表（V2）：大境界/小阶/经验/心魔/因果/道行/待分配点/神魔子阶等成长数据';

-- ─────────────────────────────────────
--  dao_accumulation: 神魔之道积攒表（V2 新表）
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
--  wash_log: 洗点流水表（V2 新表）
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
--  character_death_state: 死亡与鬼修状态表（Table 8）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_death_state (
  character_id          BIGINT UNSIGNED PRIMARY KEY   COMMENT '角色ID',
  is_dead               TINYINT         DEFAULT 0     COMMENT '是否死亡中：0=正常 1=死亡中',
  death_type            TINYINT         DEFAULT 0     COMMENT '死亡类型：1=自由探索死 2=魂飞魄散 3=夺舍失败',
  ghost_mode            TINYINT         DEFAULT 0     COMMENT '灵魂模式：0=正常 1=鬼修 2=残魂',
  soul_hp_max           INT             DEFAULT 0     COMMENT '魂力上限（鬼修/残魂专用）',
  soul_hp_current       INT             DEFAULT 0     COMMENT '当前魂力',
  possess_count         TINYINT         DEFAULT 0     COMMENT '夺舍次数（上限3，3次后强制变兽）',
  beast_form            TINYINT         DEFAULT 0     COMMENT '兽身状态：0=非兽身 1=兽身状态',
  beast_can_transform   TINYINT         DEFAULT 0     COMMENT '是否可化形：0=不可 1=可（真人以上解锁）',
  is_public_enemy       TINYINT         DEFAULT 0     COMMENT '是否为公敌：0=否 1=是（夺舍成功后标记）',
  public_enemy_until    DATETIME        DEFAULT NULL  COMMENT '公敌状态结束时间，NULL=永久',
  thunder_penalty_next  DATETIME        DEFAULT NULL  COMMENT '下次天雷处罚时间（随机生成）',
  updated_at            DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='死亡与鬼修状态表：死亡/鬼修/夺舍/兽身/公敌等状态管理';

-- ─────────────────────────────────────
--  reincarnation_log: 六道轮回记录表（Table 9）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reincarnation_log (
  id                    BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  character_id          BIGINT UNSIGNED NOT NULL                   COMMENT '角色ID',
  reincarnation_type    TINYINT         NOT NULL                   COMMENT '轮回道：1=天道 2=阿修罗道 3=人道 4=畜生道 5=饿鬼道 6=地狱道',
  previous_jing         INT             DEFAULT 0                  COMMENT '轮回前精属性值',
  previous_qi           INT             DEFAULT 0                  COMMENT '轮回前气属性值',
  previous_shen         INT             DEFAULT 0                  COMMENT '轮回前神属性值',
  reason                TINYINT         NOT NULL                   COMMENT '轮回原因：1=自由探索死亡 2=魂飞魄散 3=夺舍失败 4=三次夺舍强制',
  is_beast              TINYINT         DEFAULT 0                  COMMENT '是否变兽：0=否 1=是（原因=4时强制）',
  created_at            DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '轮回时间',
  INDEX idx_character (character_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='六道轮回记录表：每次轮回的道、属性快照、原因';

-- ─────────────────────────────────────
--  heritage_ruins: 遗迹洞府表（Table 10）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS heritage_ruins (
  ruin_id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '遗迹ID',
  owner_character_id    BIGINT UNSIGNED NOT NULL                   COMMENT '原主人角色ID',
  location_x            INT             NOT NULL                   COMMENT '地图X坐标（死亡地点）',
  location_y            INT             NOT NULL                   COMMENT '地图Y坐标（死亡地点）',
  total_wealth          BIGINT          DEFAULT 0                  COMMENT '财产总值（金币/物品估值）',
  restriction_level     TINYINT         DEFAULT 0                  COMMENT '禁制等级：0-9，越高越难突破',
  is_discovered         TINYINT         DEFAULT 0                  COMMENT '是否被其他玩家发现：0=否 1=是',
  discovered_by         BIGINT UNSIGNED DEFAULT NULL               COMMENT '发现者角色ID',
  is_plundered          TINYINT         DEFAULT 0                  COMMENT '是否被掠夺：0=否 1=是',
  created_at            DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '遗迹创建时间（角色死亡时）',
  expires_at            DATETIME        NOT NULL                   COMMENT '过期时间，超期后原主可免禁制继承',
  INDEX idx_owner (owner_character_id),
  INDEX idx_location (location_x, location_y)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='遗迹洞府表：死亡后财产存放，支持禁制保护和掠夺机制';

-- ─────────────────────────────────────
--  possess_log: 夺舍记录表（Table 11）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS possess_log (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  possessor_id    BIGINT UNSIGNED NOT NULL                   COMMENT '夺舍者角色ID',
  target_type     TINYINT         NOT NULL                   COMMENT '目标类型：1=NPC 2=玩家',
  target_id       BIGINT UNSIGNED NOT NULL                   COMMENT '目标ID（NPC配置ID或角色ID）',
  target_name     VARCHAR(64)     NOT NULL                   COMMENT '目标名称（用于日志展示）',
  success         TINYINT         NOT NULL                   COMMENT '是否成功：0=失败 1=成功',
  possessor_shen  INT             NOT NULL                   COMMENT '夺舍者当时神属性值',
  target_shen     INT             NOT NULL                   COMMENT '目标当时神属性值',
  plundered_shen  INT             DEFAULT 0                  COMMENT '被夺舍者掠夺的神属性（失败时补偿）',
  created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '夺舍时间',
  INDEX idx_possessor (possessor_id),
  INDEX idx_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='夺舍记录表：每次夺舍的目标、成功率、结果、掠夺属性';

-- ─────────────────────────────────────
--  character_beast_state: 兽身状态表（Table 12）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_beast_state (
  character_id          BIGINT UNSIGNED PRIMARY KEY     COMMENT '角色ID',
  beast_type            TINYINT         DEFAULT 1       COMMENT '兽身种类：1=狮 2=虎 3=蛇 4=鹰 5=狼（随机分配）',
  beast_evolution_stage TINYINT         DEFAULT 1       COMMENT '进化阶段：1=妖修 2=妖仙 3=妖神',
  jing_multiplier       DECIMAL(3,1)    DEFAULT 1.5     COMMENT '精属性倍率：兽身时1.5 人形时1.0',
  can_transform         TINYINT         DEFAULT 0       COMMENT '是否可化形：0=不可 1=可（真人以上解锁）',
  current_form          TINYINT         DEFAULT 1       COMMENT '当前形态：1=兽形 2=人形',
  last_transform_at     DATETIME        DEFAULT NULL    COMMENT '上次化形时间（限制每个大进阶才能化形）',
  updated_at            DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='兽身状态表：种类/进化阶段/精属性倍率/化形状态';

-- ─────────────────────────────────────
--  public_enemy_state: 公敌与天雷表（Table 13）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public_enemy_state (
  character_id        BIGINT UNSIGNED PRIMARY KEY     COMMENT '角色ID（公敌）',
  become_enemy_reason TINYINT         DEFAULT 1       COMMENT '成为公敌原因：1=夺舍成功',
  bounty_total        BIGINT          DEFAULT 0       COMMENT '悬赏总额（其他玩家累积）',
  thunder_count       INT             DEFAULT 0       COMMENT '已遭天雷次数',
  next_thunder_at     DATETIME        DEFAULT NULL    COMMENT '下次天雷时间（随机生成，分散压力）',
  killed_by           BIGINT UNSIGNED DEFAULT NULL    COMMENT '被谁击杀（NULL=未被击杀）',
  created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '成为公敌时间',
  updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公敌与天雷表：夺舍成功者公敌状态/悬赏/天雷记录';

-- ═══════════════════════════════════════════
--  game_session: 会话与验证码
-- ═══════════════════════════════════════════

USE game_session;

-- ─────────────────────────────────────
--  登录会话表：JWT Token 持久化存储
-- ─────────────────────────────────────
CREATE TABLE login_sessions (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '会话记录ID',
  account_id    BIGINT       NOT NULL                    COMMENT '登录账号ID，对应accounts.id',
  player_id     BIGINT       DEFAULT NULL                COMMENT '关联角色ID，登录后选择/创建角色后回填',
  platform      VARCHAR(20)  NOT NULL                    COMMENT '登录平台：wechat/douyin/app_ios/app_android',
  device_id     VARCHAR(128) DEFAULT NULL                COMMENT '设备唯一标识，用于设备管理和风控',
  token         VARCHAR(255) NOT NULL UNIQUE             COMMENT 'JWT AccessToken，2小时有效期，用于API鉴权',
  refresh_token VARCHAR(255) DEFAULT NULL                COMMENT 'JWT RefreshToken，7天有效期，AccessToken过期后用于刷新',
  login_ip      VARCHAR(45)  DEFAULT NULL                COMMENT '登录IP地址（支持IPv4和IPv6）',
  status        TINYINT      DEFAULT 1                   COMMENT '会话状态：0=已下线 1=在线 2=被踢下线（单点登录冲突）',
  expires_at    DATETIME     NOT NULL                    COMMENT 'Token过期时间',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '登录时间',
  INDEX idx_account (account_id),
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录会话表：存储JWT双Token（AccessToken+RefreshToken），支持单点登录踢下线';

-- ─────────────────────────────────────
--  短信验证码表：手机号验证用
-- ─────────────────────────────────────
CREATE TABLE sms_codes (
  id          BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '验证码记录ID',
  phone       VARCHAR(20)  NOT NULL                    COMMENT '接收验证码的手机号',
  code        VARCHAR(6)   NOT NULL                    COMMENT '6位数字验证码',
  purpose     VARCHAR(20)  DEFAULT 'login'             COMMENT '验证码用途：login=手机号登录 bind=绑定手机号 reset=重置密码',
  status      TINYINT      DEFAULT 0                   COMMENT '使用状态：0=未使用 1=已使用 2=已过期',
  expires_at  DATETIME     NOT NULL                    COMMENT '验证码过期时间（通常5分钟）',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '验证码发送时间',
  INDEX idx_phone_status (phone, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信验证码表：存储发送的验证码及使用状态，支持登录/绑定/重置三种场景';

-- ═══════════════════════════════════════════
--  game_config: 配置数据
-- ═══════════════════════════════════════════

USE game_config;

-- ─────────────────────────────────────
--  敏感词表：角色名/聊天内容过滤
-- ─────────────────────────────────────
CREATE TABLE sensitive_words (
  id        INT          PRIMARY KEY AUTO_INCREMENT  COMMENT '敏感词记录ID',
  word      VARCHAR(64)  NOT NULL UNIQUE             COMMENT '敏感词内容，用于角色命名和聊天内容过滤',
  category  TINYINT      DEFAULT 1                   COMMENT '分类：1=政治敏感 2=色情低俗 3=暴力恐怖 4=其他违规',
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词表：用于角色命名校验和聊天内容过滤，按分类管理';

-- ═══════════════════════════════════════════
--  game_log: 日志数据
-- ═══════════════════════════════════════════

USE game_log;

-- ─────────────────────────────────────
--  登录日志表：记录每次登录尝试
-- ─────────────────────────────────────
CREATE TABLE login_logs (
  id          BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '日志记录ID',
  account_id  BIGINT       NOT NULL                    COMMENT '登录账号ID，对应accounts.id',
  platform    VARCHAR(20)                              COMMENT '登录平台：wechat/douyin/app_ios/app_android',
  ip          VARCHAR(45)                              COMMENT '登录IP地址（支持IPv4和IPv6）',
  device_id   VARCHAR(128)                             COMMENT '设备唯一标识',
  result      TINYINT                                  COMMENT '登录结果：0=失败 1=成功',
  reason      VARCHAR(255)                             COMMENT '失败原因描述（成功时为空），如：验证码错误/账号封禁/IP异常',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '登录尝试时间',
  INDEX idx_account (account_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志表：记录每次登录尝试（成功/失败），用于安全审计和异常检测';

-- ─────────────────────────────────────
--  角色创建日志表：记录角色创建事件
-- ─────────────────────────────────────
CREATE TABLE create_logs (
  id          BIGINT       PRIMARY KEY AUTO_INCREMENT  COMMENT '日志记录ID',
  account_id  BIGINT       NOT NULL                    COMMENT '创建角色的账号ID，对应accounts.id',
  player_id   BIGINT       NOT NULL                    COMMENT '创建的角色ID，对应players.id',
  name        VARCHAR(32)                              COMMENT '角色创建时的名称',
  gender      TINYINT                                  COMMENT '角色性别：1=男 2=女',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP   COMMENT '角色创建时间',
  INDEX idx_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色创建日志表：记录角色创建的完整信息，用于运营数据统计和追溯';
