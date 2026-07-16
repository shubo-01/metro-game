-- ═══════════════════════════════════════════
--  寻仙 - 数据库建表脚本（完整版，含全部注释）
--  MySQL 8.0+ / utf8mb4
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
