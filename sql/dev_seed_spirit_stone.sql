-- ═══════════════════════════════════════════════════════════════════════════
-- 开发/测试环境灵石充值脚本
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️⚠️⚠️ 警告：仅限【开发/测试环境】手工执行，【禁止纳入生产迁移序列】！ ⚠️⚠️⚠️
-- ⚠️⚠️⚠️ WARNING: DEV/TEST ONLY. DO NOT RUN IN PRODUCTION.            ⚠️⚠️⚠️
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 背景：该充值语句原本位于 sql/migrations/v3_shenwei_system.sql 第9节，
--       评审指出一旦在生产执行会给所有老角色无差别发放1万灵石（数据污染），
--       故拆分为本独立文件，仅供本地联调神位切换扣费（/shenwei/switch）时手工执行。
--
-- 语义：给 character_base 中所有【尚无 char_currency 记录】的角色初始化 10000 灵石。
-- 幂等性：INSERT IGNORE 依赖 char_currency 主键(character_id)，已有记录的角色不会被
--         重复充值、也不会被覆盖余额，重复执行本文件是安全的。
--
-- 执行方式（本地开发库示例）：
--   mysql --default-character-set=utf8mb4 -u root -p game_main \
--     -e "source sql/dev_seed_spirit_stone.sql"
-- ═══════════════════════════════════════════════════════════════════════════

INSERT IGNORE INTO char_currency (character_id, spirit_stone)
SELECT character_id, 10000 FROM character_base;
