#!/usr/bin/env node

/**
 * whitebox-analyze.js
 * 跨语言白盒静态分析工具
 * 支持: JS/TS/Python/Java/Go/C#/C/C++
 * 无第三方依赖，纯 Node.js 运行
 *
 * 用法:
 *   node scripts/whitebox-analyze.js <file>            # 分析单个文件
 *   node scripts/whitebox-analyze.js <dir> --scan      # 批量扫描目录
 *   node scripts/whitebox-analyze.js <file> --json     # 纯 JSON 输出
 *   node scripts/whitebox-analyze.js <dir> --scan --threshold 15  # 复杂度超阈值报错
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 语言检测
// ============================================================
const LANG_MAP = {
  '.js': 'javascript', '.mjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.pyw': 'python',
  '.java': 'java',
  '.go': 'go',
  '.cs': 'csharp',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.rs': 'rust',
};

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return LANG_MAP[ext] || 'unknown';
}

// ============================================================
// 通用决策节点提取器
// 基于正则 + 结构感知，跨语言通用
// ============================================================

// 各语言的决策关键词模式
const DECISION_PATTERNS = {
  // C-style languages: JS, TS, Java, Go, C#, C, C++, Kotlin, Swift, Rust, PHP
  cstyle: [
    { type: 'if',        regex: /\bif\s*\(/g },
    { type: 'else_if',   regex: /\belse\s+if\s*\(/g },
    { type: 'else',      regex: /\belse\s*\{/g },
    { type: 'switch',    regex: /\bswitch\s*\(/g },
    { type: 'case',      regex: /\bcase\s+[^:]+:/g },
    { type: 'for',       regex: /\bfor\s*\(/g },
    { type: 'while',     regex: /\bwhile\s*\(/g },
    { type: 'do_while',  regex: /\bdo\s*\{/g },
    { type: 'ternary',   regex: /\?[^:?]*:/g },
    { type: 'and',       regex: /&&/g },
    { type: 'or',        regex: /\|\|/g },
    { type: 'catch',     regex: /\bcatch\s*\(/g },
  ],
  // Python
  python: [
    { type: 'if',        regex: /^\s*if\s+.+:/gm },
    { type: 'elif',      regex: /^\s*elif\s+.+:/gm },
    { type: 'else',      regex: /^\s*else\s*:/gm },
    { type: 'for',       regex: /^\s*for\s+.+\s+in\s+/gm },
    { type: 'while',     regex: /^\s*while\s+.+:/gm },
    { type: 'except',    regex: /^\s*except\s/gm },
    { type: 'and',       regex: /\band\b/g },
    { type: 'or',        regex: /\bor\b/g },
    { type: 'ternary',   regex: /\bif\s+.+\s+else\s+.+/g }, // inline ternary
    { type: 'with',      regex: /^\s*with\s+/gm },
  ],
  // Ruby
  ruby: [
    { type: 'if',        regex: /\bif\b/g },
    { type: 'elsif',     regex: /\belsif\b/g },
    { type: 'else',      regex: /\belse\b/g },
    { type: 'unless',    regex: /\bunless\b/g },
    { type: 'while',     regex: /\bwhile\b/g },
    { type: 'until',     regex: /\buntil\b/g },
    { type: 'case',      regex: /\bcase\b/g },
    { type: 'when',      regex: /\bwhen\b/g },
    { type: 'rescue',    regex: /\brescue\b/g },
    { type: 'and',       regex: /\b&&\b|\band\b/g },
    { type: 'or',        regex: /\b\|\|\b|\bor\b/g },
  ],
};

function getPatterns(lang) {
  if (['javascript', 'typescript', 'java', 'go', 'csharp', 'c', 'cpp', 'kotlin', 'swift', 'rust', 'php'].includes(lang)) {
    return DECISION_PATTERNS.cstyle;
  }
  if (lang === 'python') return DECISION_PATTERNS.python;
  if (lang === 'ruby') return DECISION_PATTERNS.ruby;
  return DECISION_PATTERNS.cstyle; // fallback
}

// ============================================================
// 注释和字符串清洗（避免误判注释/字符串中的关键词）
// ============================================================
function stripCommentsAndStrings(code, lang) {
  let cleaned = code;

  if (['python', 'ruby'].includes(lang)) {
    // 去除 Python docstrings 和 # 注释
    cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '""""""');
    cleaned = cleaned.replace(/'''[\s\S]*?'''/g, "''''''");
    cleaned = cleaned.replace(/#[^\n]*/g, '');
  } else {
    // C-style: 去除单行注释、多行注释
    cleaned = cleaned.replace(/\/\/[^\n]*/g, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  // 去除字符串字面量（避免字符串中的 if/else 被误识别）
  cleaned = cleaned.replace(/`[\s\S]*?`/g, '``');       // 模板字符串
  cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""'); // 双引号
  cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''"); // 单引号

  return cleaned;
}

// ============================================================
// 函数提取器（按语言）
// ============================================================

function extractFunctionsCStyle(code) {
  const functions = [];

  // 匹配常见的函数声明模式
  const patterns = [
    // function foo() / async function foo()
    /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g,
    // const foo = () => / const foo = function()
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/g,
    // class method: methodName() { / async methodName() {
    /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g,
    // export function / export default function
    /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g,
    // TypeScript: function with types
    /(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*\S+)?\s*\{/g,
  ];

  const seen = new Set();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];
      if (name && !seen.has(name) && !['if', 'else', 'for', 'while', 'switch', 'catch', 'do', 'return', 'new', 'throw', 'typeof', 'delete'].includes(name)) {
        seen.add(name);
        const startIdx = match.index;
        // 找到函数体的结束位置（简化：找对应的大括号）
        const bodyEnd = findMatchingBrace(code, startIdx + match[0].length - 1);
        const body = code.substring(startIdx, bodyEnd + 1);
        const lineNo = code.substring(0, startIdx).split('\n').length;

        functions.push({
          name,
          line: lineNo,
          startOffset: startIdx,
          endOffset: bodyEnd,
          body,
          lineCount: body.split('\n').length,
        });
      }
    }
  }

  return functions;
}

function extractFunctionsPython(code) {
  const functions = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/);
    if (match) {
      const indent = match[1].length;
      const name = match[2];
      const startLine = i;
      let endLine = i;

      // Python: 找到函数体结束（缩进回到同级或更低）
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j];
        if (line.trim() === '') continue; // 跳过空行
        const lineIndent = line.match(/^(\s*)/)[1].length;
        if (lineIndent <= indent && line.trim() !== '') {
          break;
        }
        endLine = j;
      }

      const body = lines.slice(startLine, endLine + 1).join('\n');
      functions.push({
        name,
        line: startLine + 1,
        body,
        lineCount: endLine - startLine + 1,
      });
    }
  }

  return functions;
}

function extractFunctions(code, lang) {
  if (lang === 'python') return extractFunctionsPython(code);
  return extractFunctionsCStyle(code);
}

// ============================================================
// 大括号匹配（用于 C-style 语言）
// ============================================================
function findMatchingBrace(code, openBraceIdx) {
  // 从 openBraceIdx 位置开始找到 { 然后匹配对应的 }
  let braceIdx = openBraceIdx;
  while (braceIdx < code.length && code[braceIdx] !== '{') {
    braceIdx++;
  }
  if (braceIdx >= code.length) return code.length - 1;

  let depth = 1;
  let i = braceIdx + 1;
  while (i < code.length && depth > 0) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
    i++;
  }
  return i - 1;
}

// ============================================================
// 决策节点提取 & 圈复杂度计算
// ============================================================
function analyzeDecisionPoints(code, lang) {
  const cleaned = stripCommentsAndStrings(code, lang);
  const patterns = getPatterns(lang);
  const points = [];

  for (const { type, regex } of patterns) {
    // 重置 regex state
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
      const lineNo = cleaned.substring(0, match.index).split('\n').length;
      const lineContent = cleaned.split('\n')[lineNo - 1]?.trim() || '';
      points.push({
        type,
        line: lineNo,
        content: lineContent.substring(0, 120),
      });
    }
  }

  return points.sort((a, b) => a.line - b.line);
}

function calculateCyclomaticComplexity(decisionPoints, lang) {
  // McCabe 圈复杂度 = 判定节点数 + 1
  // 判定节点: if, else_if, elif, for, while, case, catch, except, &&, ||, ternary
  // else 本身不增加复杂度（它只是 if 的另一个出口）
  const complexityTypes = new Set([
    'if', 'else_if', 'elif', 'for', 'while', 'do_while',
    'case', 'when', 'catch', 'except',
    'and', 'or', 'ternary',
    'unless', 'until',
  ]);

  let complexity = 1; // 基础复杂度
  for (const point of decisionPoints) {
    if (complexityTypes.has(point.type)) {
      complexity++;
    }
  }

  return complexity;
}

// ============================================================
// 风险等级评估
// ============================================================
function getRiskLevel(vg) {
  if (vg <= 5) return { level: '低', color: '🟢', action: '正常测试' };
  if (vg <= 10) return { level: '中', color: '🟡', action: '必须做白盒测试' };
  if (vg <= 20) return { level: '高', color: '🟠', action: '建议先重构再测试' };
  if (vg <= 50) return { level: '极高', color: '🔴', action: '必须重构' };
  return { level: '不可测试', color: '⛔', action: '严重设计问题' };
}

// ============================================================
// 覆盖标准建议
// ============================================================
function suggestCoverageStandard(vg) {
  if (vg <= 5) return '判定覆盖（分支覆盖）';
  if (vg <= 10) return '判定覆盖 + 边界值分析';
  if (vg <= 20) return '条件覆盖 或 MC/DC';
  return '建议重构后使用路径覆盖';
}

// ============================================================
// 单文件分析
// ============================================================
function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const lang = detectLanguage(filePath);

  if (lang === 'unknown') {
    return { error: `不支持的文件类型: ${path.extname(filePath)}` };
  }

  const functions = extractFunctions(code, lang);

  // 如果没有提取到函数（可能是脚本文件），对整体分析
  if (functions.length === 0) {
    const points = analyzeDecisionPoints(code, lang);
    const vg = calculateCyclomaticComplexity(points, lang);
    return {
      file: filePath,
      language: lang,
      totalLines: code.split('\n').length,
      functions: [],
      fileLevelAnalysis: {
        decisionPoints: points,
        cyclomaticComplexity: vg,
        independentPaths: vg,
        risk: getRiskLevel(vg),
        coverageStandard: suggestCoverageStandard(vg),
      },
    };
  }

  const functionResults = functions.map(fn => {
    const points = analyzeDecisionPoints(fn.body, lang);
    // 修正行号（函数体内的相对行号 → 文件中的绝对行号）
    points.forEach(p => p.line += fn.line - 1);
    const vg = calculateCyclomaticComplexity(points, lang);

    return {
      name: fn.name,
      line: fn.line,
      lineCount: fn.lineCount,
      decisionPoints: points,
      decisionCount: points.length,
      cyclomaticComplexity: vg,
      independentPaths: vg,
      risk: getRiskLevel(vg),
      coverageStandard: suggestCoverageStandard(vg),
      // 分支摘要
      branchSummary: summarizeBranches(points),
    };
  });

  return {
    file: filePath,
    language: lang,
    totalLines: code.split('\n').length,
    functionCount: functions.length,
    functions: functionResults.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity),
    summary: {
      totalFunctions: functionResults.length,
      avgComplexity: +(functionResults.reduce((s, f) => s + f.cyclomaticComplexity, 0) / functionResults.length).toFixed(1),
      maxComplexity: Math.max(...functionResults.map(f => f.cyclomaticComplexity)),
      highRiskFunctions: functionResults.filter(f => f.cyclomaticComplexity > 10).length,
      totalDecisionPoints: functionResults.reduce((s, f) => s + f.decisionCount, 0),
    },
  };
}

function summarizeBranches(points) {
  const counts = {};
  for (const p of points) {
    counts[p.type] = (counts[p.type] || 0) + 1;
  }
  return counts;
}

// ============================================================
// 目录扫描
// ============================================================
function scanDirectory(dirPath, options = {}) {
  const results = [];
  const extensions = Object.keys(LANG_MAP);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // 跳过常见的非源码目录
        if (['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', 'vendor', '.next'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  walk(dirPath);

  const analyses = results.map(f => analyzeFile(f)).filter(r => !r.error);

  // 汇总所有函数
  const allFunctions = [];
  for (const a of analyses) {
    if (a.functions) {
      for (const fn of a.functions) {
        allFunctions.push({ ...fn, file: a.file });
      }
    }
    if (a.fileLevelAnalysis) {
      allFunctions.push({
        name: '(file-level)',
        file: a.file,
        line: 1,
        cyclomaticComplexity: a.fileLevelAnalysis.cyclomaticComplexity,
        risk: a.fileLevelAnalysis.risk,
        decisionPoints: a.fileLevelAnalysis.decisionPoints,
        decisionCount: a.fileLevelAnalysis.decisionPoints.length,
      });
    }
  }

  allFunctions.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity);

  return {
    directory: dirPath,
    filesScanned: analyses.length,
    totalFunctions: allFunctions.length,
    functions: allFunctions,
    stats: {
      avgComplexity: allFunctions.length ? +(allFunctions.reduce((s, f) => s + f.cyclomaticComplexity, 0) / allFunctions.length).toFixed(1) : 0,
      maxComplexity: allFunctions.length ? Math.max(...allFunctions.map(f => f.cyclomaticComplexity)) : 0,
      highRiskCount: allFunctions.filter(f => f.cyclomaticComplexity > 10).length,
      mediumRiskCount: allFunctions.filter(f => f.cyclomaticComplexity > 5 && f.cyclomaticComplexity <= 10).length,
    },
  };
}

// ============================================================
// 格式化输出
// ============================================================
function formatReport(result) {
  const lines = [];

  if (result.directory) {
    // 目录扫描模式
    lines.push(`═══════════════════════════════════════════════════`);
    lines.push(`  白盒测试 - 静态分析报告`);
    lines.push(`  目录: ${result.directory}`);
    lines.push(`═══════════════════════════════════════════════════`);
    lines.push('');
    lines.push(`扫描文件数: ${result.filesScanned}`);
    lines.push(`函数/方法数: ${result.totalFunctions}`);
    lines.push(`平均复杂度: ${result.stats.avgComplexity}`);
    lines.push(`最高复杂度: ${result.stats.maxComplexity}`);
    lines.push(`高风险函数: ${result.stats.highRiskCount} (V(G) > 10)`);
    lines.push(`中风险函数: ${result.stats.mediumRiskCount} (V(G) 6-10)`);
    lines.push('');

    // 按复杂度排序输出
    lines.push(`─────── 函数复杂度排名 ───────`);
    lines.push('');
    lines.push(`${'风险'.padEnd(4)} ${'V(G)'.padStart(4)}  ${'判定'.padStart(4)}  函数名`);
    lines.push(`${'─'.repeat(4)} ${'─'.repeat(4)}  ${'─'.repeat(4)}  ${'─'.repeat(30)}`);

    for (const fn of result.functions.slice(0, 50)) {
      const risk = fn.risk?.color || '❓';
      const vg = String(fn.cyclomaticComplexity).padStart(4);
      const dp = String(fn.decisionCount || 0).padStart(4);
      const name = `${fn.name} (${path.basename(fn.file)}:${fn.line})`;
      lines.push(`${risk} ${vg}  ${dp}  ${name}`);
    }

    if (result.functions.length > 50) {
      lines.push(`... 共 ${result.functions.length} 个函数，仅显示前 50 个`);
    }
  } else {
    // 单文件模式
    lines.push(`═══════════════════════════════════════════════════`);
    lines.push(`  白盒测试 - 静态分析报告`);
    lines.push(`  文件: ${result.file}`);
    lines.push(`  语言: ${result.language}`);
    lines.push(`  行数: ${result.totalLines}`);
    lines.push(`═══════════════════════════════════════════════════`);

    if (result.summary) {
      lines.push('');
      lines.push(`函数总数: ${result.summary.totalFunctions}`);
      lines.push(`平均复杂度: ${result.summary.avgComplexity}`);
      lines.push(`最高复杂度: ${result.summary.maxComplexity}`);
      lines.push(`高风险函数: ${result.summary.highRiskFunctions}`);
      lines.push(`判定节点总数: ${result.summary.totalDecisionPoints}`);
    }

    lines.push('');

    for (const fn of result.functions) {
      lines.push(`┌─── ${fn.name}() ─── Line ${fn.line} ───`);
      lines.push(`│ 行数: ${fn.lineCount}`);
      lines.push(`│ 判定节点: ${fn.decisionCount}`);
      lines.push(`│ 圈复杂度 V(G): ${fn.cyclomaticComplexity}`);
      lines.push(`│ 独立路径数: ${fn.independentPaths}`);
      lines.push(`│ 风险等级: ${fn.risk.color} ${fn.risk.level} — ${fn.risk.action}`);
      lines.push(`│ 覆盖标准: ${fn.coverageStandard}`);
      lines.push(`│`);

      if (fn.decisionPoints.length > 0) {
        lines.push(`│ 判定节点明细:`);
        for (const dp of fn.decisionPoints) {
          lines.push(`│   L${String(dp.line).padStart(4)} [${dp.type.padEnd(9)}] ${dp.content.substring(0, 80)}`);
        }
      }

      // 分支摘要
      if (fn.branchSummary && Object.keys(fn.branchSummary).length > 0) {
        lines.push(`│`);
        lines.push(`│ 分支类型统计:`);
        for (const [type, count] of Object.entries(fn.branchSummary)) {
          lines.push(`│   ${type}: ${count}`);
        }
      }

      lines.push(`└${'─'.repeat(50)}`);
      lines.push('');
    }

    // 文件级分析（如果没有函数）
    if (result.fileLevelAnalysis) {
      const fa = result.fileLevelAnalysis;
      lines.push(`┌─── 文件级分析（未检测到函数结构）───`);
      lines.push(`│ 判定节点: ${fa.decisionPoints.length}`);
      lines.push(`│ 圈复杂度 V(G): ${fa.cyclomaticComplexity}`);
      lines.push(`│ 独立路径数: ${fa.independentPaths}`);
      lines.push(`│ 风险等级: ${fa.risk.color} ${fa.risk.level}`);
      lines.push(`│ 覆盖标准: ${fa.coverageStandard}`);
      lines.push(`└${'─'.repeat(50)}`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// 主入口
// ============================================================
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('用法:');
    console.log('  node whitebox-analyze.js <file>              分析单个文件');
    console.log('  node whitebox-analyze.js <dir> --scan         批量扫描目录');
    console.log('  node whitebox-analyze.js <file> --json        纯 JSON 输出');
    console.log('  node whitebox-analyze.js <dir> --scan --threshold 15  超阈值报错');
    process.exit(1);
  }

  const target = args[0];
  const isScan = args.includes('--scan');
  const isJson = args.includes('--json');
  const thresholdIdx = args.indexOf('--threshold');
  const threshold = thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1]) : null;

  let result;

  if (isScan && fs.statSync(target).isDirectory()) {
    result = scanDirectory(target);
  } else if (fs.statSync(target).isFile()) {
    result = analyzeFile(target);
  } else {
    console.error(`错误: ${target} 不是有效的文件或目录`);
    process.exit(1);
  }

  if (result.error) {
    console.error(`错误: ${result.error}`);
    process.exit(1);
  }

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result));
  }

  // 阈值检查
  if (threshold !== null) {
    const violations = [];
    if (result.functions) {
      for (const fn of result.functions) {
        if (fn.cyclomaticComplexity > threshold) {
          violations.push(`${fn.name} (V(G)=${fn.cyclomaticComplexity})`);
        }
      }
    }
    if (violations.length > 0) {
      console.error(`\n⚠️  ${violations.length} 个函数超过复杂度阈值 ${threshold}:`);
      violations.forEach(v => console.error(`   - ${v}`));
      process.exit(1);
    }
  }
}

main();
