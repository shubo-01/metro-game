-- ═══════════════════════════════════════════════════════════════
--  寻仙 - 初始之地野怪系统 数据库脚本
--  严格按照《寻仙 - 初始之地野怪系统 PRD+技术方案》实现
--
--  包含：
--    1. monster_species    100族群配置表（山海经名录种子数据）
--    2. monster_template   怪物模板表（类型×阶 数值缓存）
--    3. territory          领地表（100个领地，由服务端 init_world 生成）
--    4. faction_instance   族群实例表
--    5. monster_entity     怪物实体表
--    6. divine_beast       神兽表（唯一性，含神兽幼崽状态）
--    7. yao_cub            妖幼崽表（可CD刷新）
--    8. capture_log        抓捕日志表
--
--  执行方式（Windows 注意中文编码，必须用 source 方式执行）:
--    mysql -uroot -p -e "source e:/ziji-xiaochengxu/sql/monster_system.sql"
-- ═══════════════════════════════════════════════════════════════

USE game_main;

-- ─────────────────────────────────────
--  1. monster_species: 100族群配置表（PRD 第七章名录）
--  每行对应山海经中的一种神兽妖兽族群
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS monster_species (
  species_id   INT             PRIMARY KEY                 COMMENT '族群编号（1-100，与PRD名录一致）',
  name         VARCHAR(32)     NOT NULL                    COMMENT '族群名称，如 空奇/九尾狐/蛮蛮',
  source_text  VARCHAR(32)     NOT NULL                    COMMENT '山海经出处，如 海内北经/西山经',
  form_desc    VARCHAR(128)    NOT NULL                    COMMENT '形态描述',
  trait_desc   VARCHAR(128)    NOT NULL                    COMMENT '族群特点描述',
  category     TINYINT         NOT NULL                    COMMENT '分类：1=四凶遗种与灾兽 2=瑞兽遗族 3=南山经 4=西山经 5=北山经 6=东山经 7=中山经与大荒经 8=蛇虫水族 9=异种与龙脉变体 10=幽冥奇种',
  is_paired    TINYINT         NOT NULL DEFAULT 0          COMMENT '是否成对出现：1=是（蛮蛮#99专用，协战倍率翻倍）',
  created_at   DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='100族群配置表：初始之地外围山海经族群名录';

-- ─────────────────────────────────────
--  2. monster_template: 怪物模板表（技术方案 3.1）
--  存储 类型×阶 的通用数值模板（由服务端 init_world 按属性递推公式生成缓存）
--  element=0 表示通用模板（实体生成时随机分配五行）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS monster_template (
  template_id  INT             PRIMARY KEY AUTO_INCREMENT  COMMENT '模板ID',
  species_id   INT             NOT NULL DEFAULT 0          COMMENT '族群ID，0=通用模板（不区分族群）',
  type         TINYINT         NOT NULL                    COMMENT '怪物类型：1=普通怪 2=精英怪 3=Boss怪 4=妖 5=妖幼崽 6=神兽 7=神兽幼崽',
  tier         TINYINT         NOT NULL                    COMMENT '等级阶位：1-9（人一阶~人九阶）',
  element      TINYINT         NOT NULL DEFAULT 0          COMMENT '五行属性：0=通用 1=金 2=木 3=水 4=火 5=土',
  hp           INT             NOT NULL                    COMMENT '气血（按属性递推公式计算）',
  atk          INT             NOT NULL                    COMMENT '攻击力',
  def          INT             NOT NULL                    COMMENT '防御力',
  spd          INT             NOT NULL                    COMMENT '速度',
  multi_mod    DECIMAL(10,4)   NOT NULL DEFAULT 1.0        COMMENT '累计属性倍率（相对人一阶玩家单属性模板）',
  UNIQUE KEY uk_type_tier_elem (species_id, type, tier, element)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='怪物模板表：类型×阶数值缓存，属性由服务端按PRD递推公式计算写入';

-- ─────────────────────────────────────
--  3. territory: 领地表（技术方案 5.1）
--  外围地图划分为100个领地（10×10网格），领地之间不重叠，怪物不跨领地
--  种子数据由服务端 POST /monster/admin/init_world 幂等生成
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS territory (
  territory_id INT             PRIMARY KEY                 COMMENT '领地ID（1-100）',
  name         VARCHAR(64)     NOT NULL                    COMMENT '领地名称，如 空奇领地',
  center_x     DECIMAL(10,2)   NOT NULL                    COMMENT '领地中心X坐标',
  center_y     DECIMAL(10,2)   NOT NULL                    COMMENT '领地中心Y坐标',
  radius       DECIMAL(10,2)   NOT NULL DEFAULT 400        COMMENT '领地半径（怪物活动边界，不串场）',
  danger_level TINYINT         NOT NULL DEFAULT 2          COMMENT '危险等级：2=外围★★ 3=中心★★★ 4=核心★★★★ 5=妖殿★★★★★',
  created_at   DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='领地表：初始之地外围100领地，10×10网格布局';

-- ─────────────────────────────────────
--  4. faction_instance: 族群实例表（技术方案 3.1）
--  每个领地对应一个族群实例，记录该族群的神兽归属组
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS faction_instance (
  faction_id      INT             PRIMARY KEY AUTO_INCREMENT COMMENT '族群实例ID',
  species_id      INT             NOT NULL                   COMMENT '族群编号，关联 monster_species.species_id',
  territory_id    INT             NOT NULL                   COMMENT '所属领地ID，关联 territory.territory_id',
  faction_group   INT             NOT NULL                   COMMENT '神兽分组编号（1-20），每5个族群共享1只神兽',
  center_x        DECIMAL(10,2)   NOT NULL                   COMMENT '族群刷新中心X（同领地中心）',
  center_y        DECIMAL(10,2)   NOT NULL                   COMMENT '族群刷新中心Y（同领地中心）',
  radius          DECIMAL(10,2)   NOT NULL DEFAULT 400       COMMENT '族群活动半径',
  divine_beast_id BIGINT UNSIGNED DEFAULT NULL               COMMENT '若神兽落在本族群领地，则记录神兽ID，否则NULL',
  created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
  UNIQUE KEY uk_territory (territory_id),
  INDEX idx_group (faction_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='族群实例表：每领地一族群，记录神兽归属分组';

-- ─────────────────────────────────────
--  5. monster_entity: 怪物实体表（技术方案 3.1，战斗库）
--  族群内所有活体怪物实体（普通50/精英10/Boss2/妖1/妖幼崽3/神兽/神兽幼崽）
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS monster_entity (
  entity_id    BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT  COMMENT '实体ID',
  faction_id   INT             NOT NULL                    COMMENT '所属族群实例ID',
  species_id   INT             NOT NULL                    COMMENT '族群编号（冗余，便于查询协战特殊机制）',
  type         TINYINT         NOT NULL                    COMMENT '怪物类型：1=普通怪 2=精英怪 3=Boss怪 4=妖 5=妖幼崽 6=神兽 7=神兽幼崽',
  tier         TINYINT         NOT NULL                    COMMENT '等级阶位：1-9（人一阶~人九阶）',
  element      TINYINT         NOT NULL                    COMMENT '五行属性：1=金 2=木 3=水 4=火 5=土（随机分配）',
  hp           INT             NOT NULL                    COMMENT '当前气血',
  max_hp       INT             NOT NULL                    COMMENT '气血上限',
  atk          INT             NOT NULL                    COMMENT '攻击力',
  def          INT             NOT NULL                    COMMENT '防御力',
  spd          INT             NOT NULL                    COMMENT '速度',
  state        TINYINT         NOT NULL DEFAULT 0          COMMENT '状态：0=待机IDLE 1=巡逻PATROL 2=战斗COMBAT 3=死亡DEAD 4=已被抓捕CAPTURED',
  pos_x        DECIMAL(10,2)   NOT NULL                    COMMENT '当前X坐标',
  pos_y        DECIMAL(10,2)   NOT NULL                    COMMENT '当前Y坐标',
  respawn_at   DATETIME        DEFAULT NULL                COMMENT '死亡后的复活时间（神兽/神兽幼崽被抓后永不复活，此列为NULL）',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_faction_type (faction_id, type),
  INDEX idx_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='怪物实体表：族群内所有活体怪物，服务端权威血量/位置';

-- ─────────────────────────────────────
--  6. divine_beast: 神兽表（技术方案 5.2，唯一性保障）
--  全100族群分20组，每组1只神兽（共20只），随机落在组内5个领地之一
--  神兽与神兽幼崽均为全服唯一实体，被抓捕后不刷新
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS divine_beast (
  beast_id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '神兽ID',
  species_id       INT             NOT NULL                   COMMENT '神兽所用族群原型编号',
  faction_group    INT             NOT NULL                   COMMENT '所属分组（1-20），每组5个族群',
  territory_id     INT             NOT NULL                   COMMENT '实际落点领地ID（组内5个领地随机其一）',
  tier             TINYINT         NOT NULL DEFAULT 9         COMMENT '等级阶位：固定人九阶',
  entity_id        BIGINT UNSIGNED DEFAULT NULL               COMMENT '神兽本体对应的 monster_entity 实体ID',
  cub_entity_id    BIGINT UNSIGNED DEFAULT NULL               COMMENT '神兽幼崽对应的 monster_entity 实体ID',
  is_captured      TINYINT         NOT NULL DEFAULT 0         COMMENT '神兽本体是否已被击杀/消灭：0=存活 1=已消灭（不刷新）',
  cub_is_captured  TINYINT         NOT NULL DEFAULT 0         COMMENT '神兽幼崽是否已被抓捕：0=未抓 1=已抓（全服唯一，不刷新）',
  cub_capturer_id  BIGINT UNSIGNED DEFAULT NULL               COMMENT '抓捕神兽幼崽的玩家ID',
  capture_time     DATETIME        DEFAULT NULL               COMMENT '幼崽被抓捕时间',
  created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
  UNIQUE KEY uk_group (faction_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='神兽表：20只神兽唯一性登记，幼崽被抓后全服不再刷新';

-- ─────────────────────────────────────
--  7. yao_cub: 妖幼崽表（技术方案 5.3，可CD刷新）
--  妖幼崽被抓后进入CD，CD结束后重新刷新（刷新时随机分配五行）
--  刷新CD同时写 Redis key: yao_cub:respawn:{faction_id}，TTL=refresh_cd
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS yao_cub (
  cub_id       BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT  COMMENT '妖幼崽记录ID',
  faction_id   INT             NOT NULL                    COMMENT '所属族群实例ID',
  entity_id    BIGINT UNSIGNED NOT NULL                    COMMENT '当前对应的 monster_entity 实体ID',
  tier         TINYINT         NOT NULL DEFAULT 5          COMMENT '等级阶位：固定人五阶',
  element      TINYINT         NOT NULL                    COMMENT '五行属性：1-5（每次刷新随机重新分配）',
  is_captured  TINYINT         NOT NULL DEFAULT 0          COMMENT '当前是否处于被抓状态：0=在场 1=已被抓（等待CD刷新）',
  respawn_at   DATETIME        DEFAULT NULL                COMMENT 'CD结束刷新时间（被抓后写入）',
  updated_at   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_faction (faction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='妖幼崽表：可重复抓捕，被抓后CD刷新并随机五行';

-- ─────────────────────────────────────
--  8. capture_log: 抓捕日志表（技术方案 3.1）
--  记录每一次抓捕尝试（无论成功失败），用于审计与反作弊
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS capture_log (
  log_id       BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT  COMMENT '日志ID',
  player_id    BIGINT UNSIGNED NOT NULL                    COMMENT '发起抓捕的玩家ID',
  target_type  TINYINT         NOT NULL                    COMMENT '目标类型：5=妖幼崽 7=神兽幼崽',
  target_id    BIGINT UNSIGNED NOT NULL                    COMMENT '目标实体ID（monster_entity.entity_id）',
  success      TINYINT         NOT NULL                    COMMENT '是否成功：0=失败 1=成功',
  item_used    INT             NOT NULL                    COMMENT '使用的抓捕道具品质：1=普通 2=稀有 3=传说',
  capture_rate DECIMAL(6,4)    NOT NULL                    COMMENT '本次结算的抓捕成功率（服务端计算值，审计用）',
  created_at   DATETIME        DEFAULT CURRENT_TIMESTAMP   COMMENT '抓捕时间',
  INDEX idx_player (player_id),
  INDEX idx_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='抓捕日志表：全部抓捕尝试留痕，审计与反作弊';

-- ═══════════════════════════════════════════════════════════════
--  种子数据：100族群名录（PRD 第七章 7.1-7.10）
--  字段顺序：species_id, name, source_text, form_desc, trait_desc, category, is_paired
-- ═══════════════════════════════════════════════════════════════

-- 7.1 四凶遗种与灾兽（1-10）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(1,  '空奇',   '海内北经', '有翼之虎，食人，闻人斗则食直者', '嗜食正道修士，族群主动寻衅', 1, 0),
(2,  '饙馎',   '北山经',   '羊身人面，目在腋下，贪食万物', '吞噬型，掉落吞噬相关功法残卷', 1, 0),
(3,  '梜朴',   '西山经',   '虎身犬毛，人面猪牙，性凶頗', '死战不退，族群无逃跑机制', 1, 0),
(4,  '混沌',   '西山经',   '无面目，有翼六足，识歌舞', '混沌属性，无视五行相生', 1, 0),
(5,  '九尾狐', '南山经',   '狐形九尾，声如婴啼，食人', '幻术型，族群自带魅惑领域', 1, 0),
(6,  '猐贾',   '海内北经', '龙首人身，牛形四足，食人', '龙血脉，掉落龙骨材料', 1, 0),
(7,  '凿齿',   '海内南经', '兽形齿长三尺如凿', '破甲型，无视防御', 1, 0),
(8,  '九婴',   '海内北经', '九首蛇身，能喷水火', '双属性（水火），极高难族群', 1, 0),
(9,  '大风',   '海内经',   '恶鸟，展翼起大风，坏人屋舍', '范围风属性攻击', 1, 0),
(10, '封象',   '海内经',   '巨猪，獐牙如戟，后羲所射', '冲撞型，高血高防', 1, 0);

-- 7.2 瑞兽遗族（11-20）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(11, '麒麟', '海内经', '鹿身牛尾马蹄，五色', '仁兽，不主动攻击，被惹怒极强', 2, 0),
(12, '白泽', '海内经', '狮身人面，通万物之情', '洞察型，能破隐身/幻术', 2, 0),
(13, '鸾鸟', '西山经', '神鸟，赤色五彩，见则安宁', '鸣叫增益友方，削弱敌方', 2, 0),
(14, '凤皇', '南山经', '五色具，首文德翼文义', '浴火重生，火属性顶级', 2, 0),
(15, '当康', '东山经', '猪形，见则天下大丰', '吉兽，击杀后掉落丰收材料', 2, 0),
(16, '英招', '西山经', '马身人面虎纹鸟翼', '巡天型，领域内全属性压制', 2, 0),
(17, '陆吾', '西山经', '虎身九尾人面，掌昆仑', '守护型，领域内禁飞禁遁', 2, 0),
(18, '毕方', '西山经', '鹤形单足青身赤文', '火属性，见则有火灾', 2, 0),
(19, '精卫', '北山经', '鸟形文首白喙赤足', '填海型，土属性，死战不休', 2, 0),
(20, '应龙', '大荒经', '龙身有翼，能兴云雨', '龙族战力天花板，人九阶', 2, 0);

-- 7.3 南山经异兽（21-30）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(21, '鹿蜀', '南山经', '马身白首虎纹赤尾，音如谣', '速度型，族群擅长游击', 3, 0),
(22, '旋龟', '南山经', '鸟首鳽尾，音如判木', '防御型，龟壳反弹伤害', 3, 0),
(23, '鲵',   '南山经', '鱼身牛尾，音如犬吰', '水陆两栖，水属性', 3, 0),
(24, '类',   '南山经', '狸形长发，自为雌雄', '雌雄同体，双属性切换', 3, 0),
(25, '猪詩', '南山经', '狼身人面，目在背', '背后偷袭型，360度视野', 3, 0),
(26, '犀渠', '中山经', '牛形苍身，音如婴儿', '冲锋型，角击破防', 3, 0),
(27, '魈鱼', '南山经', '鱼身鸟翼，出入有光', '光属性，致盲效果', 3, 0),
(28, '蔑',   '南山经', '鸟形，赤喙白尾', '飞行型，空中压制', 3, 0),
(29, '葱聋', '西山经', '羊形赤鬃', '群居型，团队协战高', 3, 0),
(30, '羌羊', '西山经', '羊形马尾，脂可防寒', '火属性，油脂燃烧', 3, 0);

-- 7.4 西山经异兽（31-40）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(31, '土蝾', '西山经', '羊形四角，食人', '土属性，四角冲撞', 4, 0),
(32, '鹲',   '西山经', '鸟形四翼，赤如丹', '火属性，四翼高速飞行', 4, 0),
(33, '当扈', '西山经', '鸟形，颅须可飞', '飞行型，颅须鞭击', 4, 0),
(34, '鬔鱼', '西山经', '鱼身猪尾', '水属性，猪尾横扫', 4, 0),
(35, '爥裰', '南山经', '猴形，见则大兴役', '土属性，召唤杂兵', 4, 0),
(36, '长右', '南山经', '猴形四耳，音如吟', '音波攻击，四耳灵敏', 4, 0),
(37, '猛豹', '西山经', '豹形白身，食蛇', '金属性，蛇类克星', 4, 0),
(38, '狼',   '西山经', '豹身五尾一角，音如击石', '五尾同时攻击，多段伤害', 4, 0),
(39, '天狗', '西山经', '兽形白首，可御凶', '吉凶双态，可驯化', 4, 0),
(40, '鸰鷔', '西山经', '鸟形三首六尾', '三首三属性同时攻击', 4, 0);

-- 7.5 北山经异兽（41-50）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(41, '诸怀', '北山经', '猪形角四足，音如鸣雁', '冲撞型，角顶固定伤害', 5, 0),
(42, '因疏', '北山经', '马身一角，音如鼓', '独角穿刺，音波震慑', 5, 0),
(43, '人鱼', '北山经', '鱼身四足，音如婴儿', '水属性，声波魅惑', 5, 0),
(44, '天马', '北山经', '犬身白首黑身，见则兵起', '速度型，冲锋践踏', 5, 0),
(45, '樞鱼', '北山经', '鱼身鸟翼，音如鸭鸯', '水空双栖，双属性', 5, 0),
(46, '飞鼠', '北山经', '鼠身兔首，能飞', '飞行型，偷窃道具', 5, 0),
(47, '颜',   '北山经', '鸟形，面赤目黄，音如鸮', '火属性，盯视灼烧', 5, 0),
(48, '酯',   '北山经', '羊形无口，目在耳下', '无口不进食，无饥饿值', 5, 0),
(49, '狍鸮', '北山经', '鸮形人面，音如号', '夜行型，暗属性', 5, 0),
(50, '那父', '北山经', '牛形白尾，音如犬吰', '冲撞型，白尾抽击', 5, 0);

-- 7.6 东山经异兽（51-60）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(51, '鰠鰠鱼', '东山经', '鱼身十翼，音如鹨', '十翼同时攻击，水属性', 6, 0),
(52, '鱽鱼',   '东山经', '鱼身犬首，音如婴儿', '水属性，犬首撕咬', 6, 0),
(53, '鳈鱼',   '东山经', '鱼身苍文，食之不睡', '水属性，苍文反光致盲', 6, 0),
(54, '朱獲',   '东山经', '鱼身狐尾，音如叱', '水属性，狐尾横扫', 6, 0),
(55, '鱟父',   '东山经', '鱼身鸟首', '水空双栖，鸟首啄击', 6, 0),
(56, '鱞鱼',   '东山经', '鱼身牛尾', '水属性，牛尾鞭击', 6, 0),
(57, '鲈鱼',   '东山经', '鱼身鼠足，音如羊', '水属性，鼠足爬行', 6, 0),
(58, '鬯鬯',   '东山经', '鱼身鸟翼，音如羊', '水空双栖，群飞围攻', 6, 0),
(59, '诸蹇',   '北山经', '豹身人首一目，音如呼', '独眼精准，豹身突袭', 6, 0),
(60, '举父',   '西山经', '猴形文臂，善投石', '投掷型，远程物理', 6, 0);

-- 7.7 中山经与大荒经异兽（61-70）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(61, '鸣蛇', '中山经',   '蛇身四翼，音如磬，见则大旱', '火属性，四翼风暴', 7, 0),
(62, '化蛇', '中山经',   '人面貈身鸟翼，音如叱，见则大水', '水属性，化形幻术', 7, 0),
(63, '马腹', '中山经',   '人面虎身，音如婴儿', '魅惑型，人面催眠', 7, 0),
(64, '飞鱼', '中山经',   '鱼身豚尾，音如羊', '水属性，跳跃突袭', 7, 0),
(65, '蛊雕', '南山经',   '雕形角如鹿，音如婴儿', '蛊毒型，角击附带蛊毒', 7, 0),
(66, '天愚', '中山经',   '兽形，居天愚之山', '混乱型，领域内随机效果', 7, 0),
(67, '计蒙', '中山经',   '龙身人首，出入有飘风暴雨', '风水双属性，天气控制', 7, 0),
(68, '帝江', '西山经',   '无面目六足四翼，识歌舞', '混沌型，无五官免疫声光', 7, 0),
(69, '烛龙', '大荒经',   '人面蛇身赤色，睁眼为昼闭眼为夜', '光暗双属性，时空级神兽', 7, 0),
(70, '陵鱼', '海内北经', '人面鱼身有手足', '水陆两栖，人面魅惑', 7, 0);

-- 7.8 蛇虫水族（71-80）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(71, '肥遗', '西山经',   '蛇身六足四翼，见则大旱', '火属性，多足多段攻击', 8, 0),
(72, '巴蛇', '海内南经', '身长百丈，食象三年骨出', '吞噬型，顶级蛇族', 8, 0),
(73, '蝙虫', '南山经',   '蛇身色如绶文', '毒属性，咬伤中毒', 8, 0),
(74, '长蛇', '北山经',   '身长数十丈，毛如猪豪', '水属性，绞杀型', 8, 0),
(75, '修蛇', '海内经',   '巨蛇，吞象之蛇', '吞噬型，与巴蛇同源', 8, 0),
(76, '封狐', '海内经',   '大狐，食人', '狐族巨变，幻术+物理', 8, 0),
(77, '蒲夷', '北山经',   '兽形', '领地型，入侵即群攻', 8, 0),
(78, '寓鸟', '北山经',   '鸟形鼠足', '飞行型，鼠足爬行偷袭', 8, 0),
(79, '氐鸟', '北山经',   '鸟形三首六尾', '三首三属性，高协战', 8, 0),
(80, '鸱',   '西山经',   '鸟形一目一足', '夜行型，暗属性独眼', 8, 0);

-- 7.9 异种与龙脉变体（81-90）
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(81, '赤鱅', '南山经',   '鱼身人面，音如鸭鸯', '水属性，人面魅惑', 9, 0),
(82, '招摇', '南山经',   '兽形，居招摇之山', '领地型，群居协战', 9, 0),
(83, '驿',   '北山经',   '兽形', '冰属性，寒气领域', 9, 0),
(84, '神魝', '西山经',   '鱼形神圣', '水属性，神圣光环', 9, 0),
(85, '夷牛', '大荒东经', '牛身一足，出入必有风雨', '雷属性，一足震地', 9, 0),
(86, '相柳', '大荒北经', '九首蛇身，共工之臣', '毒属性，九首同时攻击', 9, 0),
(87, '乘黄', '海内经',   '狐形有角，乘之寿二千岁', '木属性，角击吸寿', 9, 0),
(88, '驏虞', '海内北经', '虎身白首黑纹，不践生草', '仁兽型，不主动攻击', 9, 0),
(89, '并封', '大荒经',   '猪身前后有首', '双首双向攻击，无死角', 9, 0),
(90, '蜻',   '东山经',   '牛身蛇尾，见则大疫', '毒属性，瘟疫领域', 9, 0);

-- 7.10 幽冥奇种（91-100）
-- 注意：#99 蛮蛮（比翼鸟）is_paired=1，永远成对出现，协战倍率翻倍
INSERT IGNORE INTO monster_species (species_id, name, source_text, form_desc, trait_desc, category, is_paired) VALUES
(91,  '屏蓬', '大荒经',   '兽形两首，前后各一', '双首协战，前后夹击', 10, 0),
(92,  '踵',   '北山经',   '鸮形，独足猪尾', '夜行型，暗属性', 10, 0),
(93,  '鱼妇', '大荒经',   '鱼身能化人形', '变形型，人鱼切换', 10, 0),
(94,  '雷神', '海内东经', '龙身人首，鼓其腹则雷', '雷属性，鼓腹雷击', 10, 0),
(95,  '山膏', '中山经',   '猪形能骂人', '嘲讽型，降低玩家属性', 10, 0),
(96,  '闻膘', '中山经',   '猪形黄身白首', '土属性，冲撞型', 10, 0),
(97,  '钦原', '西山经',   '鸟形如蜂，大如鸭鸯', '蜂群型，毒刺蜇击', 10, 0),
(98,  '酸与', '北山经',   '鸟形蛇尾，见则其邑恐慌', '恐惧领域，降低士气', 10, 0),
(99,  '蛮蛮', '西山经',   '鸟形一目一翼，两两相飞（比翼鸟）', '永远成对出现，协战倍率翻倍', 10, 1),
(100, '鳞鱼', '北山经',   '鱼形，音如犬吰', '水属性，犬吰震慑', 10, 0);
