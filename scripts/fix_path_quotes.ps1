# 修复系统级 Path 环境变量中的引号(")字符
# 问题：Appium 相关路径当年添加时带上了引号，导致 Python 扩展无法加载
# 操作：仅删除 Path 值中的 " 字符，路径内容本身不做任何增删
# 安全：修改前先把原值备份到本脚本同目录的 path_backup.txt
# 注意：修改 HKLM 系统级环境变量需要管理员权限，脚本会自动请求提权（弹出UAC确认框）

# ── 步骤0：检测是否管理员，不是则自我提权重新运行 ──
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host '当前无管理员权限，正在请求提权（请在弹出的UAC窗口点击"是"）...'
    Start-Process powershell -Verb RunAs -Wait -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
    exit 0
}

$regPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment'
$old = (Get-ItemProperty $regPath -Name Path).Path

# 1. 备份原值（出问题可从备份恢复）
$backupFile = Join-Path $PSScriptRoot 'path_backup.txt'
Set-Content -Path $backupFile -Value $old -Encoding UTF8
Write-Host ('原始 Path 已备份到: ' + $backupFile)

# 2. 仅删除引号字符（-replace 用正则，引号需转义为 \" 写法这里直接用单引号包裹）
$new = $old -replace '"', ''

if ($old -eq $new) {
    Write-Host '系统 Path 中没有引号字符，无需修改'
    exit 0
}

# 3. 写回注册表（保留 REG_EXPAND_SZ 类型，避免 %SystemRoot% 等变量失效）
Set-ItemProperty -Path $regPath -Name Path -Value $new -Type ExpandString

# 4. 广播环境变量变更消息，让新进程感知（已打开的程序需重启才生效）
$sig = @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
$type = Add-Type -MemberDefinition $sig -Name 'Win32SendMessage' -Namespace Win32 -PassThru
$result = [UIntPtr]::Zero
# 0xFFFF=HWND_BROADCAST 0x001A=WM_SETTINGCHANGE
[void]$type::SendMessageTimeout([IntPtr]0xFFFF, 0x001A, [UIntPtr]::Zero, 'Environment', 2, 5000, [ref]$result)

Write-Host '修复完成！系统 Path 中的引号字符已全部移除。'
Write-Host '请完全退出并重新打开 IDE（Qoder/VSCode），Python 扩展即可正常加载。'
