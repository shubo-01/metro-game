-- ═══════════════════════════════════════════════════════════════
-- 修复 xunxian 库中 12 张表的中文表注释乱码
-- ═══════════════════════════════════════════════════════════════
-- 【乱码原因】早期建表时客户端连接字符集未指定 utf8mb4，
--   中文 COMMENT 被写成问号（?????）。
-- 【正确注释来源】sql/character_system.sql 与 sql/schema.sql 中
--   各表 CREATE TABLE 末尾的 COMMENT= 原文，逐字复制，未做改写。
-- 【执行方式】必须用 mysql source 方式（不能用 PowerShell 管道传中文）：
--   & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
--     --default-character-set=utf8mb4 -u root -p xunxian
--     -e "source e:/ziji-xiaochengxu/sql/fix_table_comments.sql"
-- 【幂等性】ALTER TABLE ... COMMENT 可重复执行，不影响表数据。
-- ═══════════════════════════════════════════════════════════════

-- 显式声明连接字符集，防止再次写入乱码
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- ── 来源：sql/character_system.sql ──
ALTER TABLE character_base       COMMENT = '角色基础信息表：名称、性别、种族、形态等身份标识';
ALTER TABLE character_attributes COMMENT = '角色五维属性表（V2）：精气神+气运+悟性+自由点记账 + 气血/灵力/魂力/护盾/亲和/反应/异常抵抗衍生值';
ALTER TABLE character_qi_elements COMMENT = '气的五行多修记录表：每个角色每种五行属性一行，兼修数量实时计算';
ALTER TABLE character_realm      COMMENT = '境界与经验表（V2）：大境界/小阶/经验/心魔/因果/道行/待分配点/神魔子阶等成长数据';
ALTER TABLE dao_accumulation     COMMENT = '神魔之道积攒表：5种道值，子阶突破消耗100对应道值';
ALTER TABLE wash_log             COMMENT = '洗点流水表：记录每次洗点的返还点数与费用';

-- ── 来源：sql/schema.sql（与 character_system.sql 同文，死亡/鬼修系列）──
ALTER TABLE character_death_state COMMENT = '死亡与鬼修状态表：死亡/鬼修/夺舍/兽身/公敌等状态管理';
ALTER TABLE reincarnation_log    COMMENT = '六道轮回记录表：每次轮回的道、属性快照、原因';
ALTER TABLE heritage_ruins       COMMENT = '遗迹洞府表：死亡后财产存放，支持禁制保护和掠夺机制';
ALTER TABLE possess_log          COMMENT = '夺舍记录表：每次夺舍的目标、成功率、结果、掠夺属性';
ALTER TABLE character_beast_state COMMENT = '兽身状态表：种类/进化阶段/精属性倍率/化形状态';
ALTER TABLE public_enemy_state   COMMENT = '公敌与天雷表：夺舍成功者公敌状态/悬赏/天雷记录';
