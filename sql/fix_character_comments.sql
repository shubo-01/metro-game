-- ═══════════════════════════════════════════════════════════════
-- 修复人物系统表注释乱码
-- 执行前务必确认 MySQL 客户端字符集为 utf8mb4
-- Navicat: 菜单 → 查询 → 新建查询 → 粘贴此脚本 → 运行全部
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

USE game_main;

-- ─────────────────────────────────────
-- 1. character_base: 角色基础信息表
-- ─────────────────────────────────────
ALTER TABLE character_base COMMENT='角色基础信息表：名称、性别、种族、形态等身份标识';

ALTER TABLE character_base
  MODIFY character_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色唯一ID，全局主键',
  MODIFY account_id    BIGINT UNSIGNED NOT NULL                COMMENT '关联账号ID，对应accounts.id',
  MODIFY name          VARCHAR(32)     NOT NULL                COMMENT '角色名，2-8汉字，全局唯一',
  MODIFY gender        TINYINT         NOT NULL                COMMENT '性别：1=男 2=女，创建后不可更改',
  MODIFY race          TINYINT         DEFAULT 1               COMMENT '种族：1=人族 2=鬼修 3=兽身，随死亡/夺舍变化',
  MODIFY form_state    TINYINT         DEFAULT 1               COMMENT '形态：1=人形 2=兽形（兽身专用切换）',
  MODIFY created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '角色创建时间',
  MODIFY updated_at    DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ─────────────────────────────────────
-- 2. character_attributes: 五维属性表
-- ─────────────────────────────────────
ALTER TABLE character_attributes COMMENT='角色五维属性表：精气神+气运+悟性 + 气血/灵力/魂力衍生值';

ALTER TABLE character_attributes
  MODIFY character_id  BIGINT UNSIGNED NOT NULL                COMMENT '角色ID，关联character_base.character_id',
  MODIFY jing          INT           DEFAULT 1                 COMMENT '精（肉身强度）：影响气血上限/体魄/身法/根骨',
  MODIFY qi            INT           DEFAULT 1                 COMMENT '气（修炼能量总和）：影响灵力上限/功法威力',
  MODIFY shen          INT           DEFAULT 1                 COMMENT '神（灵魂之力）：影响魂力上限/神识范围/精神壁垒',
  MODIFY qi_yun        INT           DEFAULT 0                 COMMENT '气运（命运属性）：影响奇遇/掉落/天劫减免/厄运抵抗',
  MODIFY wu_xing       INT           DEFAULT 0                 COMMENT '悟性（成长天赋）：影响修炼速度/功法领悟上限/突破成功率',
  MODIFY hp_max        INT           DEFAULT 100               COMMENT '气血上限（精衍生）：=精×100，血条总量',
  MODIFY hp_current    INT           DEFAULT 100               COMMENT '当前气血：战斗中消耗，自然恢复',
  MODIFY mp_max        INT           DEFAULT 50                COMMENT '灵力上限（气衍生）：=气×50，蓝条总量',
  MODIFY mp_current    INT           DEFAULT 50                COMMENT '当前灵力：释放技能消耗',
  MODIFY soul_max      INT           DEFAULT 0                 COMMENT '魂力上限（神衍生）：=神×30，鬼修专用',
  MODIFY soul_current  INT           DEFAULT 0                 COMMENT '当前魂力：鬼修状态使用',
  MODIFY updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '属性最后更新时间';

-- ─────────────────────────────────────
-- 3. character_qi_elements: 气的五行多修表
-- ─────────────────────────────────────
ALTER TABLE character_qi_elements COMMENT='气的五行多修记录表：每个角色每种五行属性一行，兼修数量实时计算';

ALTER TABLE character_qi_elements
  MODIFY id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  MODIFY character_id   BIGINT UNSIGNED NOT NULL                COMMENT '角色ID',
  MODIFY element_type   TINYINT         NOT NULL                COMMENT '五行类型：1=金 2=木 3=水 4=火 5=土',
  MODIFY proficiency    INT             DEFAULT 0               COMMENT '该属性修炼熟练度，决定功法威力',
  MODIFY is_cultivating TINYINT         DEFAULT 0               COMMENT '是否正在修炼此属性：0=否 1=是',
  MODIFY created_at     DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '开始修炼时间';

-- ─────────────────────────────────────
-- 4. character_realm: 境界与经验表
-- ─────────────────────────────────────
ALTER TABLE character_realm COMMENT='境界与经验表：大境界/小阶/经验/心魔/因果/道行等成长数据';

ALTER TABLE character_realm
  MODIFY character_id        BIGINT UNSIGNED NOT NULL            COMMENT '角色ID',
  MODIFY major_stage         TINYINT         DEFAULT 1           COMMENT '大境界：1=人阶 2=真人 3=仙 4=金仙',
  MODIFY minor_stage         TINYINT         DEFAULT 1           COMMENT '小阶：1-9阶',
  MODIFY stage_segment       TINYINT         DEFAULT 0           COMMENT '段格：0-9，可见进度条',
  MODIFY exp_jing            BIGINT          DEFAULT 0           COMMENT '精属性当前经验值',
  MODIFY exp_qi              BIGINT          DEFAULT 0           COMMENT '气属性当前经验值',
  MODIFY exp_shen            BIGINT          DEFAULT 0           COMMENT '神属性当前经验值',
  MODIFY tribulation_count   INT             DEFAULT 0           COMMENT '已渡天劫次数，每渡一次后续天劫难度递增',
  MODIFY xinmo_value         INT             DEFAULT 0           COMMENT '心魔值：每次突破+1，超过悟性值触发心魔劫',
  MODIFY dao_xing            INT             DEFAULT 0           COMMENT '道行：修行资历积累，影响NPC对话和功法门槛',
  MODIFY karma_value         INT             DEFAULT 0           COMMENT '因果值：正=善行，负=恶行，影响轮回道分配',
  MODIFY breakthrough_status TINYINT         DEFAULT 0           COMMENT '突破状态：0=正常 1=突破中 2=心魔劫中 3=天劫中',
  MODIFY updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ─────────────────────────────────────
-- 5. character_death_state: 死亡与鬼修状态表
-- ─────────────────────────────────────
ALTER TABLE character_death_state COMMENT='死亡与鬼修状态表：死亡/鬼修/夺舍/兽身/公敌等状态管理';

ALTER TABLE character_death_state
  MODIFY character_id          BIGINT UNSIGNED NOT NULL          COMMENT '角色ID',
  MODIFY is_dead               TINYINT         DEFAULT 0         COMMENT '是否死亡中：0=正常 1=死亡中',
  MODIFY death_type            TINYINT         DEFAULT 0         COMMENT '死亡类型：1=自由探索死 2=魂飞魄散 3=夺舍失败',
  MODIFY ghost_mode            TINYINT         DEFAULT 0         COMMENT '灵魂模式：0=正常 1=鬼修 2=残魂',
  MODIFY soul_hp_max           INT             DEFAULT 0         COMMENT '魂力上限（鬼修/残魂专用）',
  MODIFY soul_hp_current       INT             DEFAULT 0         COMMENT '当前魂力',
  MODIFY possess_count         TINYINT         DEFAULT 0         COMMENT '夺舍次数（上限3，3次后强制变兽）',
  MODIFY beast_form            TINYINT         DEFAULT 0         COMMENT '兽身状态：0=非兽身 1=兽身状态',
  MODIFY beast_can_transform   TINYINT         DEFAULT 0         COMMENT '是否可化形：0=不可 1=可（真人以上解锁）',
  MODIFY is_public_enemy       TINYINT         DEFAULT 0         COMMENT '是否为公敌：0=否 1=是（夺舍成功后标记）',
  MODIFY public_enemy_until    DATETIME        DEFAULT NULL      COMMENT '公敌状态结束时间，NULL=永久',
  MODIFY thunder_penalty_next  DATETIME        DEFAULT NULL      COMMENT '下次天雷处罚时间（随机生成）',
  MODIFY updated_at            DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ─────────────────────────────────────
-- 6. reincarnation_log: 六道轮回记录表
-- ─────────────────────────────────────
ALTER TABLE reincarnation_log COMMENT='六道轮回记录表：每次轮回的道、属性快照、原因';

ALTER TABLE reincarnation_log
  MODIFY id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  MODIFY character_id          BIGINT UNSIGNED NOT NULL                COMMENT '角色ID',
  MODIFY reincarnation_type    TINYINT         NOT NULL                COMMENT '轮回道：1=天道 2=阿修罗道 3=人道 4=畜生道 5=饿鬼道 6=地狱道',
  MODIFY previous_jing         INT             DEFAULT 0               COMMENT '轮回前精属性值',
  MODIFY previous_qi           INT             DEFAULT 0               COMMENT '轮回前气属性值',
  MODIFY previous_shen         INT             DEFAULT 0               COMMENT '轮回前神属性值',
  MODIFY reason                TINYINT         NOT NULL                COMMENT '轮回原因：1=自由探索死亡 2=魂飞魄散 3=夺舍失败 4=三次夺舍强制',
  MODIFY is_beast              TINYINT         DEFAULT 0               COMMENT '是否变兽：0=否 1=是（原因=4时强制）',
  MODIFY created_at            DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '轮回时间';

-- ─────────────────────────────────────
-- 7. heritage_ruins: 遗迹洞府表
-- ─────────────────────────────────────
ALTER TABLE heritage_ruins COMMENT='遗迹洞府表：死亡后财产存放，支持禁制保护和掠夺机制';

ALTER TABLE heritage_ruins
  MODIFY ruin_id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '遗迹ID',
  MODIFY owner_character_id    BIGINT UNSIGNED NOT NULL                COMMENT '原主人角色ID',
  MODIFY location_x            INT             NOT NULL                COMMENT '地图X坐标（死亡地点）',
  MODIFY location_y            INT             NOT NULL                COMMENT '地图Y坐标（死亡地点）',
  MODIFY total_wealth          BIGINT          DEFAULT 0              COMMENT '财产总值（金币/物品估值）',
  MODIFY restriction_level     TINYINT         DEFAULT 0              COMMENT '禁制等级：0-9，越高越难突破',
  MODIFY is_discovered         TINYINT         DEFAULT 0              COMMENT '是否被其他玩家发现：0=否 1=是',
  MODIFY discovered_by         BIGINT UNSIGNED DEFAULT NULL            COMMENT '发现者角色ID',
  MODIFY is_plundered          TINYINT         DEFAULT 0              COMMENT '是否被掠夺：0=否 1=是',
  MODIFY created_at            DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '遗迹创建时间（角色死亡时）',
  MODIFY expires_at            DATETIME        NOT NULL               COMMENT '过期时间，超期后原主可免禁制继承';

-- ─────────────────────────────────────
-- 8. possess_log: 夺舍记录表
-- ─────────────────────────────────────
ALTER TABLE possess_log COMMENT='夺舍记录表：每次夺舍的目标、成功率、结果、掠夺属性';

ALTER TABLE possess_log
  MODIFY id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  MODIFY possessor_id    BIGINT UNSIGNED NOT NULL                COMMENT '夺舍者角色ID',
  MODIFY target_type     TINYINT         NOT NULL                COMMENT '目标类型：1=NPC 2=玩家',
  MODIFY target_id       BIGINT UNSIGNED NOT NULL                COMMENT '目标ID（NPC配置ID或角色ID）',
  MODIFY target_name     VARCHAR(64)     NOT NULL                COMMENT '目标名称（用于日志展示）',
  MODIFY success         TINYINT         NOT NULL                COMMENT '是否成功：0=失败 1=成功',
  MODIFY possessor_shen  INT             NOT NULL                COMMENT '夺舍者当时神属性值',
  MODIFY target_shen     INT             NOT NULL                COMMENT '目标当时神属性值',
  MODIFY plundered_shen  INT             DEFAULT 0               COMMENT '被夺舍者掠夺的神属性（失败时补偿）',
  MODIFY created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '夺舍时间';

-- ─────────────────────────────────────
-- 9. character_beast_state: 兽身状态表
-- ─────────────────────────────────────
ALTER TABLE character_beast_state COMMENT='兽身状态表：种类/进化阶段/精属性倍率/化形状态';

ALTER TABLE character_beast_state
  MODIFY character_id          BIGINT UNSIGNED NOT NULL          COMMENT '角色ID',
  MODIFY beast_type            TINYINT         DEFAULT 1         COMMENT '兽身种类：1=狮 2=虎 3=蛇 4=鹰 5=狼（随机分配）',
  MODIFY beast_evolution_stage TINYINT         DEFAULT 1         COMMENT '进化阶段：1=妖修 2=妖仙 3=妖神',
  MODIFY jing_multiplier       DECIMAL(3,1)    DEFAULT 1.5       COMMENT '精属性倍率：兽身时1.5 人形时1.0',
  MODIFY can_transform         TINYINT         DEFAULT 0         COMMENT '是否可化形：0=不可 1=可（真人以上解锁）',
  MODIFY current_form          TINYINT         DEFAULT 1         COMMENT '当前形态：1=兽形 2=人形',
  MODIFY last_transform_at     DATETIME        DEFAULT NULL      COMMENT '上次化形时间（限制每个大进阶才能化形）',
  MODIFY updated_at            DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ─────────────────────────────────────
-- 10. public_enemy_state: 公敌与天雷表
-- ─────────────────────────────────────
ALTER TABLE public_enemy_state COMMENT='公敌与天雷表：夺舍成功者公敌状态/悬赏/天雷记录';

ALTER TABLE public_enemy_state
  MODIFY character_id        BIGINT UNSIGNED NOT NULL            COMMENT '角色ID（公敌）',
  MODIFY become_enemy_reason TINYINT         DEFAULT 1           COMMENT '成为公敌原因：1=夺舍成功',
  MODIFY bounty_total        BIGINT          DEFAULT 0           COMMENT '悬赏总额（其他玩家累积）',
  MODIFY thunder_count       INT             DEFAULT 0           COMMENT '已遭天雷次数',
  MODIFY next_thunder_at     DATETIME        DEFAULT NULL        COMMENT '下次天雷时间（随机生成，分散压力）',
  MODIFY killed_by           BIGINT UNSIGNED DEFAULT NULL         COMMENT '被谁击杀（NULL=未被击杀）',
  MODIFY created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '成为公敌时间',
  MODIFY updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ═══════════════════════════════════════════════════════════════
-- 执行完毕后，在 Navicat 中右键表 → 刷新 即可看到正确的中文注释
-- ═══════════════════════════════════════════════════════════════
