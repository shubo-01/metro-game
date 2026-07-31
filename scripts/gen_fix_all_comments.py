# -*- coding: utf-8 -*-
"""
生成 sql/fix_all_comments.sql：修复所有业务库中列注释乱码。

原理：
1. 用 mysql.exe 子进程（utf8mb4）从 information_schema 读出所有
   注释含 ASCII '?' 的列（乱码特征）及其完整列定义（类型/NULL/默认值/EXTRA）。
   ——子进程直接捕获字节流，不经 PowerShell 管道，编码不会损坏。
2. 解析项目内源 SQL 文件（CREATE TABLE / ALTER TABLE ADD|MODIFY COLUMN），
   提取每张表每列的正确中文注释（源文件为唯一权威）。
3. 按"当前列定义 + 源文件注释"拼出 MODIFY COLUMN 语句——只改 COMMENT，
   类型/约束/默认值全部保留现状，不会改变表结构。
4. 源文件中找不到注释的列跳过，并在报告中列出。
"""
import re
import subprocess
import sys
from pathlib import Path

MYSQL = r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
SCHEMAS = ["xunxian", "game_main", "game_config", "game_log", "game_session"]
SQL_DIR = Path(r"e:\ziji-xiaochengxu\sql")
OUT_FILE = SQL_DIR / "fix_all_comments.sql"

# 解析顺序：基础建表文件在前，迁移/显式修复文件在后（后解析的覆盖先解析的，
# 即迁移与既往修复脚本的注释优先级更高）
SOURCE_FILES = [
    SQL_DIR / "schema.sql",
    SQL_DIR / "character_system.sql",
    SQL_DIR / "monster_system.sql",
    SQL_DIR / "equipment_system.sql",
    SQL_DIR / "huaguoshan_dungeon.sql",
    SQL_DIR / "migrations" / "v2_character_attributes.sql",
    SQL_DIR / "migrations" / "v3_shenwei_system.sql",
    SQL_DIR / "migrations" / "v4_gongfa_skill_exp.sql",
    SQL_DIR / "add_comments.sql",
    SQL_DIR / "fix_comments.sql",
    SQL_DIR / "fix_character_comments.sql",
]

# 行首这些关键字的行不是列定义行
NON_COLUMN_KEYWORDS = ("PRIMARY", "UNIQUE", "INDEX", "KEY", "CONSTRAINT",
                       "FOREIGN", "CHECK", ")")


def run_mysql(sql: str) -> str:
    """执行查询，批处理 TSV 输出，字节流按 utf-8 解码。"""
    p = subprocess.run(
        [MYSQL, "--default-character-set=utf8mb4", "-h", "127.0.0.1",
         "-P", "3306", "-u", "root", "-ppassword", "-B", "-N", "-e", sql],
        capture_output=True)
    if p.returncode != 0:
        sys.stderr.write(p.stderr.decode("utf-8", "replace"))
        sys.exit(1)
    return p.stdout.decode("utf-8")


def unescape_tsv(v: str) -> str:
    """mysql 批处理模式转义还原（\\n \\t \\\\）。"""
    return (v.replace("\\n", "\n").replace("\\t", "\t")
             .replace("\\0", "\0").replace("\\\\", "\\"))


def unescape_sql_str(v: str) -> str:
    """SQL 字符串字面量中的 '' 还原为 '。"""
    return v.replace("''", "'")


def escape_sql_str(v: str) -> str:
    return v.replace("'", "''")


COMMENT_RE = re.compile(r"COMMENT\s*=?\s*'((?:[^']|'')*)'", re.IGNORECASE)

CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def is_garbled(s: str) -> bool:
    """乱码判定：
    ① 含 ASCII 问号（utf8→latin1 型丢字，正常中文注释只用全角？）；
    ② GBK 回转探测：乱码成因是 UTF-8 字节被当 GBK 读，故反向
       encode('gbk')→decode('utf-8') 若能还原出≥2个汉字即为乱码；
       正常中文文本回转后几乎全部解码失败，不会误判。"""
    if "?" in s:
        return True
    try:
        t = s.encode("gbk", "ignore").decode("utf-8", "ignore")
    except Exception:
        return False
    return t != s and len(CJK_RE.findall(t)) >= 2


def parse_sources():
    """返回 (列注释字典 {(table, column): comment}, 表注释字典 {table: comment})。"""
    col_comments = {}
    table_comments = {}
    for f in SOURCE_FILES:
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8")
        # ① CREATE TABLE 块内的列注释
        for m in re.finditer(
                r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(",
                text, re.IGNORECASE):
            table = m.group(1).lower()
            # 从括号后逐行读到表定义结束行（以 ) 开头）
            body = text[m.end():]
            for line in body.splitlines():
                stripped = line.strip()
                if stripped.startswith(")"):
                    # 表定义结束行：提取表级 COMMENT
                    tm = COMMENT_RE.search(stripped)
                    if tm:
                        table_comments[table] = unescape_sql_str(tm.group(1))
                    break
                first = stripped.split(" ", 1)[0].strip("`,").upper()
                if not first or first.startswith("--") or first in NON_COLUMN_KEYWORDS:
                    continue
                cm = COMMENT_RE.search(stripped)
                if cm:
                    col = stripped.split(" ", 1)[0].strip("`,").lower()
                    col_comments[(table, col)] = unescape_sql_str(cm.group(1))
        # ② ALTER TABLE ... ADD/MODIFY/CHANGE COLUMN 的列注释
        for m in re.finditer(
                r"ALTER\s+TABLE\s+`?(\w+)`?\s+(?:ADD|MODIFY|CHANGE)\s+(?:COLUMN\s+)?`?(\w+)`?[^;]*?COMMENT\s+'((?:[^']|'')*)'",
                text, re.IGNORECASE | re.DOTALL):
            col_comments[(m.group(1).lower(), m.group(2).lower())] = \
                unescape_sql_str(m.group(3))
        # ③ ALTER TABLE ... COMMENT = '...' 的表注释
        for m in re.finditer(
                r"ALTER\s+TABLE\s+`?(\w+)`?\s+COMMENT\s*=\s*'((?:[^']|'')*)'",
                text, re.IGNORECASE):
            table_comments[m.group(1).lower()] = unescape_sql_str(m.group(2))
    return col_comments, table_comments


def build_modify(schema, table, col, col_type, nullable, default, extra, comment):
    """按当前列定义构造 MODIFY COLUMN 语句，仅替换 COMMENT。"""
    parts = [f"ALTER TABLE {table} MODIFY COLUMN {col} {col_type}"]
    extra_l = extra.lower()
    if nullable == "NO":
        parts.append("NOT NULL")
    if "auto_increment" in extra_l:
        parts.append("AUTO_INCREMENT")
    elif default != "NULL":  # TSV 中 SQL NULL 输出为字面 NULL
        if "default_generated" in extra_l:
            parts.append(f"DEFAULT {default}")  # 表达式默认值（如 CURRENT_TIMESTAMP）
        else:
            parts.append(f"DEFAULT '{escape_sql_str(default)}'")
    elif nullable == "YES":
        parts.append("DEFAULT NULL")
    if "on update current_timestamp" in extra_l:
        parts.append("ON UPDATE CURRENT_TIMESTAMP")
    parts.append(f"COMMENT '{escape_sql_str(comment)}'")
    return " ".join(parts) + ";"


def main():
    src, src_tables = parse_sources()
    schemas_in = ",".join(f"'{s}'" for s in SCHEMAS)
    # 拉取全部非空注释列，只修复【判定为乱码】的列（修复值取源文件权威注释）；
    # 中文正常但与源文件措辞不同的列不改动，只列入报告（可能是有意手工修改）
    tsv = run_mysql(
        "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,"
        " COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT"
        " FROM information_schema.COLUMNS"
        f" WHERE TABLE_SCHEMA IN ({schemas_in}) AND COLUMN_COMMENT != ''"
        " ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION")

    fixes = {}    # schema -> [语句]
    pairs = []    # (schema, table, col, 旧注释, 新注释)
    skipped = []  # 乱码但源文件无注释的列
    drift = []    # 中文正常但与源文件措辞不一致的列（不修）
    for line in tsv.splitlines():
        if not line.strip():
            continue
        f = [unescape_tsv(x) for x in line.split("\t")]
        schema, table, col, col_type, nullable, default, extra, old_c = f
        key = (table.lower(), col.lower())
        if key in src and old_c == src[key]:
            continue  # 与源文件权威注释完全一致，肯定不是乱码
        if not is_garbled(old_c):
            if key in src and src[key] != old_c:
                drift.append((schema, table, col, old_c, src[key]))
            continue
        if key not in src:
            skipped.append((schema, table, col, old_c))
            continue
        new_c = src[key]
        stmt = build_modify(schema, table, col, col_type, nullable,
                            default, extra, new_c)
        fixes.setdefault(schema, []).append(stmt)
        pairs.append((schema, table, col, old_c, new_c))

    # 表注释：同样只修乱码项
    tsv_t = run_mysql(
        "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES"
        f" WHERE TABLE_SCHEMA IN ({schemas_in}) AND TABLE_COMMENT != ''"
        " ORDER BY TABLE_SCHEMA, TABLE_NAME")
    for line in tsv_t.splitlines():
        if not line.strip():
            continue
        schema, table, old_c = [unescape_tsv(x) for x in line.split("\t")]
        if old_c == src_tables.get(table.lower()):
            continue  # 与源文件一致，不是乱码
        if not is_garbled(old_c):
            continue
        new_c = src_tables.get(table.lower())
        if new_c is None:
            skipped.append((schema, table, "<表注释>", old_c))
            continue
        fixes.setdefault(schema, []).append(
            f"ALTER TABLE {table} COMMENT = '{escape_sql_str(new_c)}';")
        pairs.append((schema, table, "<表注释>", old_c, new_c))

    # 生成修复脚本
    lines = [
        "-- ═══════════════════════════════════════════════════════════════",
        "-- 修复所有业务库列注释乱码（由 scripts/gen_fix_all_comments.py 自动生成）",
        "-- ═══════════════════════════════════════════════════════════════",
        "-- 【乱码原因】早期建表时客户端连接字符集非 utf8mb4，中文注释写坏。",
        "-- 【权威来源】sql/ 目录源文件中各列 COMMENT 原文，逐字复制。",
        "-- 【安全性】MODIFY COLUMN 按 information_schema 当前定义生成，",
        "--   类型/NULL约束/默认值/自增/ON UPDATE 全部保持现状，只改 COMMENT。",
        "-- 【幂等性】可重复执行，不影响表数据。",
        "-- 【执行方式】必须 mysql source（禁止 PowerShell 管道传中文）：",
        "--   & \"C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe\"",
        "--     --default-character-set=utf8mb4 -u root -p",
        "--     -e \"source e:/ziji-xiaochengxu/sql/fix_all_comments.sql\"",
        "-- ═══════════════════════════════════════════════════════════════",
        "",
        "SET NAMES utf8mb4;",
        "SET character_set_client = utf8mb4;",
        "SET character_set_connection = utf8mb4;",
        "SET character_set_results = utf8mb4;",
        "",
    ]
    for schema in SCHEMAS:
        if schema not in fixes:
            continue
        lines.append(f"-- ────── 库：{schema}（{len(fixes[schema])} 列） ──────")
        lines.append(f"USE {schema};")
        cur_table = None
        for stmt in fixes[schema]:
            t = stmt.split()[2]
            if t != cur_table:
                lines.append(f"-- 表 {t}")
                cur_table = t
            lines.append(stmt)
        lines.append("")
    OUT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # 输出报告数据（供对话报告引用）
    print(f"FIX_TOTAL={sum(len(v) for v in fixes.values())}")
    for s in SCHEMAS:
        if s in fixes:
            print(f"  {s}: {len(fixes[s])} 列")
    print(f"SKIPPED={len(skipped)}")
    for s in skipped:
        print("  跳过（乱码但源文件无注释）:", s)
    print(f"DRIFT={len(drift)}")
    for schema, table, col, old_c, new_c in drift:
        print(f"  措辞不一致（非乱码，未改）[{schema}.{table}.{col}] 库内: {old_c} | 源文件: {new_c}")
    print("--- 修复前后对照示例（每表首列） ---")
    seen = set()
    for schema, table, col, old_c, new_c in pairs:
        if (schema, table) in seen:
            continue
        seen.add((schema, table))
        print(f"[{schema}.{table}.{col}]")
        print(f"  旧: {old_c}")
        print(f"  新: {new_c}")


if __name__ == "__main__":
    main()
