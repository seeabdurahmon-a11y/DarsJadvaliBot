$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")

# 1. Start Bot shortcut
$Shortcut1 = $WshShell.CreateShortcut("$DesktopPath\Start Bot.lnk")
$Shortcut1.TargetPath = "D:\dars_jadvali\start-bot.bat"
$Shortcut1.WorkingDirectory = "D:\dars_jadvali"
$Shortcut1.Description = "Dars Jadvali Bot va Veb Serverni ishga tushirish"
$Shortcut1.IconLocation = "shell32.dll,137"
$Shortcut1.Save()

# 2. Stop Bot shortcut
$Shortcut2 = $WshShell.CreateShortcut("$DesktopPath\Stop Bot.lnk")
$Shortcut2.TargetPath = "D:\dars_jadvali\stop-bot.bat"
$Shortcut2.WorkingDirectory = "D:\dars_jadvali"
$Shortcut2.Description = "Dars Jadvali Bot va Veb Serverni to'xtatish"
$Shortcut2.IconLocation = "shell32.dll,131"
$Shortcut2.Save()

Write-Host "Yorliqlar muvaffaqiyatli yaratildi:"
Get-ChildItem -Path $DesktopPath -Filter "*Bot*.lnk" | Select-Object Name, FullName, LastWriteTime
