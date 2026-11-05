@echo off
title DARS_JADVALI_24_7_STOP
cd /d "%~dp0"
cls
color 0C

echo [1/2] Port 3000 to'xtatilmoqda...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/2] DARS_JADVALI_24_7 oynasi yopilmoqda...
taskkill /F /FI "WINDOWTITLE eq DARS_JADVALI_24_7_SERVER*" >nul 2>&1

echo.
echo  ⏹️ 24/7 Bot va Web server to'xtatildi!
ping 127.0.0.1 -n 3 >nul
