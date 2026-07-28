# 诊断 Path 环境变量中含引号(")的条目
# 引号字符会导致 VSCode/Qoder 的 Python 扩展无法加载
$q = [char]34  # 双引号字符

Write-Host '=== 用户级 Path 中含引号的条目 ==='
$u = (Get-ItemProperty 'HKCU:\Environment' -Name Path -ErrorAction SilentlyContinue).Path
if ($u) {
    $u -split ';' | Where-Object { $_.Contains($q) } | ForEach-Object { Write-Host ('[USER] ' + $_) }
}

Write-Host '=== 系统级 Path 中含引号的条目 ==='
$m = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name Path -ErrorAction SilentlyContinue).Path
if ($m) {
    $m -split ';' | Where-Object { $_.Contains($q) } | ForEach-Object { Write-Host ('[SYSTEM] ' + $_) }
}

Write-Host '=== 当前会话 Path 中含引号的条目 ==='
$env:Path -split ';' | Where-Object { $_.Contains($q) } | ForEach-Object { Write-Host ('[SESSION] ' + $_) }

Write-Host '=== 检查完毕 ==='
