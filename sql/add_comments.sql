-- 补全所有表和字段的注释（在已有表上执行 ALTER）

-- ═══════════ game_main ═══════════

USE game_main;

-- accounts 表注释
ALTER TABLE accounts COMMENT='用户账号表：存储手机号、密码、封禁状态等基础账号信息';
ALTER TABLE accounts
  MODIFY id BIGINT COMMENT '账号ID，全局唯一自增主键',
  MODIFY created_at DATETIME COMMENT '账号创建时间',
  MODIFY updated_at DATETIME COMMENT '最后更新时间';

-- platform_bindings 表注释
ALTER TABLE platform_bindings COMMENT='平台绑定表：记录账号与微信/抖音/App平台的关联关系，支持跨平台登录';
ALTER TABLE platform_bindings
  MODIFY id BIGINT COMMENT '绑定记录ID',
  MODIFY account_id BIGINT COMMENT '关联的账号ID，对应accounts.id',
  MODIFY created_at DATETIME COMMENT '绑定时间';

-- players 表注释
ALTER TABLE players COMMENT='角色表：存储角色的名称、性别、境界、位置等基础信息';
ALTER TABLE players
  MODIFY id BIGINT COMMENT '角色ID，全局唯一自增主键',
  MODIFY account_id BIGINT COMMENT '所属账号ID，对应accounts.id，一个账号一个角色',
  MODIFY pos_x FLOAT COMMENT '角色在场景中的X坐标（像素值）',
  MODIFY pos_y FLOAT COMMENT '角色在场景中的Y坐标（像素值）',
  MODIFY is_online TINYINT COMMENT '是否在线：0=离线 1=在线',
  MODIFY created_at DATETIME COMMENT '角色创建时间',
  MODIFY updated_at DATETIME COMMENT '最后更新时间（移动/升级时刷新）';

-- player_attrs 表注释
ALTER TABLE player_attrs COMMENT='角色属性表：五维显性属性（精气神/气运/悟性）+ 五行灵力 + 隐藏属性';
ALTER TABLE player_attrs
  MODIFY player_id BIGINT COMMENT '角色ID，对应players.id，一对一关系',
  MODIFY updated_at DATETIME COMMENT '属性最后更新时间';

-- ═══════════ game_session ═══════════

USE game_session;

-- login_sessions 表注释
ALTER TABLE login_sessions COMMENT='登录会话表：存储JWT双Token（AccessToken+RefreshToken），支持单点登录踢下线';
ALTER TABLE login_sessions
  MODIFY id BIGINT COMMENT '会话记录ID',
  MODIFY account_id BIGINT COMMENT '登录账号ID，对应accounts.id',
  MODIFY player_id BIGINT COMMENT '关联角色ID，登录后选择/创建角色后回填',
  MODIFY platform VARCHAR(20) COMMENT '登录平台：wechat/douyin/app_ios/app_android',
  MODIFY device_id VARCHAR(128) COMMENT '设备唯一标识，用于设备管理和风控',
  MODIFY token VARCHAR(255) COMMENT 'JWT AccessToken，2小时有效期，用于API鉴权',
  MODIFY refresh_token VARCHAR(255) COMMENT 'JWT RefreshToken，7天有效期，AccessToken过期后用于刷新',
  MODIFY login_ip VARCHAR(45) COMMENT '登录IP地址（支持IPv4和IPv6）',
  MODIFY expires_at DATETIME COMMENT 'Token过期时间',
  MODIFY created_at DATETIME COMMENT '登录时间';

-- sms_codes 表注释
ALTER TABLE sms_codes COMMENT='短信验证码表：存储发送的验证码及使用状态，支持登录/绑定/重置三种场景';
ALTER TABLE sms_codes
  MODIFY id BIGINT COMMENT '验证码记录ID',
  MODIFY phone VARCHAR(20) COMMENT '接收验证码的手机号',
  MODIFY code VARCHAR(6) COMMENT '6位数字验证码',
  MODIFY expires_at DATETIME COMMENT '验证码过期时间（通常5分钟）',
  MODIFY created_at DATETIME COMMENT '验证码发送时间';

-- ═══════════ game_config ═══════════

USE game_config;

-- sensitive_words 表注释
ALTER TABLE sensitive_words COMMENT='敏感词表：用于角色命名校验和聊天内容过滤，按分类管理';
ALTER TABLE sensitive_words
  MODIFY id INT COMMENT '敏感词记录ID',
  MODIFY word VARCHAR(64) COMMENT '敏感词内容，用于角色命名和聊天内容过滤';

-- ═══════════ game_log ═══════════

USE game_log;

-- login_logs 表注释
ALTER TABLE login_logs COMMENT='登录日志表：记录每次登录尝试（成功/失败），用于安全审计和异常检测';
ALTER TABLE login_logs
  MODIFY id BIGINT COMMENT '日志记录ID',
  MODIFY account_id BIGINT COMMENT '登录账号ID，对应accounts.id',
  MODIFY platform VARCHAR(20) COMMENT '登录平台：wechat/douyin/app_ios/app_android',
  MODIFY ip VARCHAR(45) COMMENT '登录IP地址（支持IPv4和IPv6）',
  MODIFY device_id VARCHAR(128) COMMENT '设备唯一标识',
  MODIFY reason VARCHAR(255) COMMENT '失败原因描述（成功时为空），如：验证码错误/账号封禁/IP异常',
  MODIFY created_at DATETIME COMMENT '登录尝试时间';

-- create_logs 表注释
ALTER TABLE create_logs COMMENT='角色创建日志表：记录角色创建的完整信息，用于运营数据统计和追溯';
ALTER TABLE create_logs
  MODIFY id BIGINT COMMENT '日志记录ID',
  MODIFY account_id BIGINT COMMENT '创建角色的账号ID，对应accounts.id',
  MODIFY player_id BIGINT COMMENT '创建的角色ID，对应players.id',
  MODIFY name VARCHAR(32) COMMENT '角色创建时的名称',
  MODIFY gender TINYINT COMMENT '角色性别：1=男 2=女',
  MODIFY created_at DATETIME COMMENT '角色创建时间';
