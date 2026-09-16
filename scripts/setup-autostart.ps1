$projectDir = (Get-Item "$PSScriptRoot\..").FullName
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "JadvaliBot-AutoStart.lnk"
$targetPath = Join-Path $projectDir "start-bot-background.vbs"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$targetPath`""
$Shortcut.WorkingDirectory = $projectDir
$Shortcut.Description = "MAKTAB JadvaliBot 24/7 AutoStart"
$Shortcut.Save()

Write-Host "✅ JadvaliBot avto-yuklanish muvaffaqiyatli o'rnatildi: $shortcutPath"
