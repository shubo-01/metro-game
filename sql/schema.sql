-- ═══════════════════════════════════════════
--  寻仙 - 数据库建表脚本
--  MySQL 8.0 / utf8mb4
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

-- 账号表
CREATE TABLE accounts (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone        VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号，跨平台唯一标识',
  password_hash VARCHAR(255) DEFAULT NULL COMMENT 'App端可选密码登录',
  status       TINYINT DEFAULT 1 COMMENT '1正常 0封禁 2封号',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 平台绑定表
CREATE TABLE platform_bindings (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id   BIGINT NOT NULL,
  platform     VARCHAR(20) NOT NULL COMMENT 'wechat/douyin/app_ios/app_android',
  openid       VARCHAR(128) NOT NULL COMMENT '平台openid',
  union_id     VARCHAR(128) DEFAULT NULL COMMENT '微信unionId',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_platform_openid (platform, openid),
  UNIQUE KEY uk_account_platform (account_id, platform),
  INDEX idx_openid (platform, openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 角色表
CREATE TABLE players (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id   BIGINT NOT NULL,
  name         VARCHAR(32) NOT NULL UNIQUE COMMENT '2-8汉字',
  gender       TINYINT NOT NULL COMMENT '1男 2女',
  race         TINYINT DEFAULT 1 COMMENT '种族，初版只有人族',
  level_stage  TINYINT DEFAULT 1 COMMENT '境界阶段：1人 2真人 3仙 4金仙',
  level_tier   TINYINT DEFAULT 1 COMMENT '境界等级：1-9',
  level_step   TINYINT DEFAULT 1 COMMENT '境界段位：1-10',
  scene_id     INT DEFAULT 1001 COMMENT '当前所在场景ID，1001=初始之地',
  pos_x        FLOAT DEFAULT 0,
  pos_y        FLOAT DEFAULT 0,
  is_online    TINYINT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account (account_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 角色属性表
CREATE TABLE player_attrs (
  player_id    BIGINT PRIMARY KEY,
  jing         INT DEFAULT 1 COMMENT '精（肉身）',
  qi_metal     INT DEFAULT 0 COMMENT '金之气',
  qi_wood      INT DEFAULT 0 COMMENT '木之气',
  qi_water     INT DEFAULT 0 COMMENT '水之气',
  qi_fire      INT DEFAULT 0 COMMENT '火之气',
  qi_earth     INT DEFAULT 0 COMMENT '土之气',
  shen         INT DEFAULT 1 COMMENT '神（灵魂）',
  luck         DECIMAL(4,2) DEFAULT 0.00 COMMENT '气运',
  savvy        DECIMAL(4,2) DEFAULT 0.00 COMMENT '悟性',
  causality    INT DEFAULT 0 COMMENT '因果（隐藏）',
  inner_demon  INT DEFAULT 0 COMMENT '心魔（隐藏）',
  dao_age      INT DEFAULT 0 COMMENT '道行（隐藏）',
  tribulation_count INT DEFAULT 0 COMMENT '天劫次数（隐藏）',
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════
--  game_session: 会话与验证码
-- ═══════════════════════════════════════════

USE game_session;

-- 登录会话表
CREATE TABLE login_sessions (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id   BIGINT NOT NULL,
  player_id    BIGINT DEFAULT NULL,
  platform     VARCHAR(20) NOT NULL,
  device_id    VARCHAR(128) DEFAULT NULL,
  token        VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) DEFAULT NULL,
  login_ip     VARCHAR(45) DEFAULT NULL,
  status       TINYINT DEFAULT 1 COMMENT '1在线 0已下线 2被踢下线',
  expires_at   DATETIME NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account (account_id),
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 验证码表
CREATE TABLE sms_codes (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone        VARCHAR(20) NOT NULL,
  code         VARCHAR(6) NOT NULL,
  purpose      VARCHAR(20) DEFAULT 'login' COMMENT 'login/bind/reset',
  status       TINYINT DEFAULT 0 COMMENT '0未使用 1已使用 2已过期',
  expires_at   DATETIME NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone_status (phone, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════
--  game_config: 配置数据
-- ═══════════════════════════════════════════

USE game_config;

-- 敏感词表
CREATE TABLE sensitive_words (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  word         VARCHAR(64) NOT NULL UNIQUE,
  category     TINYINT DEFAULT 1 COMMENT '1政治 2色情 3暴力 4其他',
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════
--  game_log: 日志数据
-- ═══════════════════════════════════════════

USE game_log;

-- 登录日志
CREATE TABLE login_logs (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id   BIGINT NOT NULL,
  platform     VARCHAR(20),
  ip           VARCHAR(45),
  device_id    VARCHAR(128),
  result       TINYINT COMMENT '1成功 0失败',
  reason       VARCHAR(255),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account (account_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 角色创建日志
CREATE TABLE create_logs (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id   BIGINT NOT NULL,
  player_id    BIGINT NOT NULL,
  name         VARCHAR(32),
  gender       TINYINT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
