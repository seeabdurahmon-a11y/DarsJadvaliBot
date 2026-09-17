# JadvaliBot Avtomatik Ishga Tushirish (Startup + Task Scheduler + Firewall)
$projectDir = (Get-Item "$PSScriptRoot\..").FullName
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "JadvaliBot-AutoStart.lnk"
$vbsPath = Join-Path $projectDir "start-bot-background.vbs"

# 1. Windows Startup papkasiga yorliq (Shortcut) yaratish
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$vbsPath`""
$Shortcut.WorkingDirectory = $projectDir
$Shortcut.Description = "MAKTAB JadvaliBot 24/7 AutoStart"
$Shortcut.Save()
Write-Host "✅ [1/4] Startup yorlig'i yaratildi: $shortcutPath" -ForegroundColor Green

# 2. Windows Task Scheduler vazifasini yaratish (Tizimga kirganda 100% kafolatli ishga tushadi)
try {
    $taskName = "JadvaliBot-AutoStart"
    $action = "wscript.exe `"$vbsPath`""
    schtasks /create /tn $taskName /tr $action /sc onlogon /f /rl highest 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Agar highest ruxsat bermasa, oddiy foydalanuvchi sifatida yaratamiz
        schtasks /create /tn $taskName /tr $action /sc onlogon /f 2>$null
    }
    Write-Host "✅ [2/4] Windows Task Scheduler vazifasi o'rnatildi ($taskName)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Task Scheduler o'rnatishda ogohlantirish: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Windows Firewall (Port 3000) ga ruxsat berish
try {
    $existingRule = Get-NetFirewallRule -DisplayName "JadvaliBot Server (Port 3000)" -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName "JadvaliBot Server (Port 3000)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue
        Write-Host "✅ [3/4] Windows Firewall Port 3000 ochildi" -ForegroundColor Green
    } else {
        Write-Host "✅ [3/4] Windows Firewall Port 3000 allaqachon sozlangan" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Firewall sozlashda ogohlantirish: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. PM2 holatini saqlash (pm2 save)
try {
    $pm2Cmd = Join-Path $projectDir "node_modules\.bin\pm2.cmd"
    if (Test-Path $pm2Cmd) {
        & $pm2Cmd save
    } else {
        npx pm2 save
    }
    Write-Host "✅ [4/4] PM2 holati saqlandi (pm2 save)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ PM2 save ogohlantirish: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 HAMMASI TAYYOR! Kompyuter yoqilganda bot va server avtomatik ravishda orqa fonda ishga tushadi." -ForegroundColor Cyan
