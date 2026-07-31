-- ═══════════════════════════════════════════════════════════════
-- 修复所有业务库列注释乱码（由 scripts/gen_fix_all_comments.py 自动生成）
-- ═══════════════════════════════════════════════════════════════
-- 【乱码原因】早期建表时客户端连接字符集非 utf8mb4，中文注释写坏。
-- 【权威来源】sql/ 目录源文件中各列 COMMENT 原文，逐字复制。
-- 【安全性】MODIFY COLUMN 按 information_schema 当前定义生成，
--   类型/NULL约束/默认值/自增/ON UPDATE 全部保持现状，只改 COMMENT。
-- 【幂等性】可重复执行，不影响表数据。
-- 【执行方式】必须 mysql source（禁止 PowerShell 管道传中文）：
--   & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
--     --default-character-set=utf8mb4 -u root -p
--     -e "source e:/ziji-xiaochengxu/sql/fix_all_comments.sql"
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- ────── 库：game_main（13 列） ──────
USE game_main;
-- 表 platform_bindings
ALTER TABLE platform_bindings MODIFY COLUMN openid varchar(128) NOT NULL COMMENT '平台方分配的用户唯一标识（微信openid/抖音openid）';
-- 表 player_attrs
ALTER TABLE player_attrs MODIFY COLUMN jing int DEFAULT '1' COMMENT '精（肉身属性）：影响物理攻击/防御/血量，初始值=1';
ALTER TABLE player_attrs MODIFY COLUMN qi_metal int DEFAULT '0' COMMENT '金之气（五行-金）：金属性灵力值，影响金系功法威力';
ALTER TABLE player_attrs MODIFY COLUMN qi_wood int DEFAULT '0' COMMENT '木之气（五行-木）：木属性灵力值，影响治疗/生长类功法';
ALTER TABLE player_attrs MODIFY COLUMN qi_water int DEFAULT '0' COMMENT '水之气（五行-水）：水属性灵力值，影响水系控制功法';
ALTER TABLE player_attrs MODIFY COLUMN qi_earth int DEFAULT '0' COMMENT '土之气（五行-土）：土属性灵力值，影响防御/土系功法';
ALTER TABLE player_attrs MODIFY COLUMN shen int DEFAULT '1' COMMENT '神（灵魂属性）：影响法术攻击/精神防御/暴击率，初始值=1';
ALTER TABLE player_attrs MODIFY COLUMN luck decimal(4,2) DEFAULT '0.00' COMMENT '气运值：影响掉落率/奇遇触发概率/暴击加成，范围0-99.99';
ALTER TABLE player_attrs MODIFY COLUMN causality int DEFAULT '0' COMMENT '【隐藏属性】因果值：影响天劫难度/NPC态度/剧情分支，对玩家不可见';
ALTER TABLE player_attrs MODIFY COLUMN inner_demon int DEFAULT '0' COMMENT '【隐藏属性】心魔值：积累过高会触发心魔劫/走火入魔事件，对玩家不可见';
ALTER TABLE player_attrs MODIFY COLUMN tribulation_count int DEFAULT '0' COMMENT '【隐藏属性】已渡天劫次数：每次大境界突破触发天劫';
-- 表 players
ALTER TABLE players MODIFY COLUMN name varchar(32) NOT NULL COMMENT '角色名，2-8个汉字，全局唯一';
ALTER TABLE players MODIFY COLUMN race tinyint DEFAULT '1' COMMENT '种族：1=人族（初版仅开放人族，后续可扩展妖族/魔族等）';

-- ────── 库：game_config（1 列） ──────
USE game_config;
-- 表 sensitive_words
ALTER TABLE sensitive_words MODIFY COLUMN category tinyint DEFAULT '1' COMMENT '分类：1=政治敏感 2=色情低俗 3=暴力恐怖 4=其他违规';

-- ────── 库：game_log（1 列） ──────
USE game_log;
-- 表 login_logs
ALTER TABLE login_logs MODIFY COLUMN result tinyint DEFAULT NULL COMMENT '登录结果：0=失败 1=成功';

