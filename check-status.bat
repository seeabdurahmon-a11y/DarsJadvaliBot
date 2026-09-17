@echo off
title @JadvaliBot Holatini Tekshirish
cd /d "%~dp0"
echo ===================================================
echo     @JadvaliBot va Web Server Holati
echo ===================================================

if exist "node_modules\.bin\pm2.cmd" (
    call "node_modules\.bin\pm2.cmd" status
) else (
    call npx pm2 status
)

echo.
echo Server tekshiruvi:
powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 3; Write-Host 'Web Server: ' $res.status ' (Bot: ' $res.bot.username ')' -ForegroundColor Green } catch { Write-Host 'Web Server: Oflayn yoki javob bermayapti' -ForegroundColor Red }"

echo.
pause
