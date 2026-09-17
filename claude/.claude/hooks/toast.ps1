# Args arrive base64-encoded: WSLENV isn't honored here, and raw text gets mangled by Windows arg quoting.
param([string]$Title, [string]$Body)
$dec = { param($s) [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)) }
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$x = $t.GetElementsByTagName('text')
$x.Item(0).AppendChild($t.CreateTextNode((& $dec $Title))) > $null
$x.Item(1).AppendChild($t.CreateTextNode((& $dec $Body))) > $null
# A registered AppUserModelId makes Windows label the toast "Claude Code" instead of PowerShell.
$app = 'ClaudeCode.Hooks'
$key = "HKCU:\Software\Classes\AppUserModelId\$app"
# Icon is copied off the WSL share because Windows won't reliably load it from a \\wsl$ path.
$icon = Join-Path $env:LOCALAPPDATA 'ClaudeCodeHooks\claude-icon.png'
if (-not (Test-Path $icon)) {
    New-Item -ItemType Directory -Path (Split-Path $icon) -Force > $null
    Copy-Item (Join-Path $PSScriptRoot 'claude-icon.png') $icon
}
if (-not (Test-Path $key)) { New-Item -Path $key -Force > $null }
if ((Get-ItemProperty $key).IconUri -ne $icon) {
    New-ItemProperty -Path $key -Name DisplayName -Value 'Claude Code' -PropertyType String -Force > $null
    New-ItemProperty -Path $key -Name IconUri -Value $icon -PropertyType String -Force > $null
}
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($t))
