@echo off
title MAKTAB_BOT_TOXTATISH
cd /d "%~dp0"
cls
color 0C

echo ====================================================
echo     MAKTAB DARS JADVALI — BOTNI TO'XTATISH
echo ====================================================
echo.
echo [1/3] Port 3000 to'xtatilmoqda...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Bot jarayoni o'chirilmoqda...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*src/index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [3/3] Boshqa barcha fon jarayonlari yopilmoqda...
call npx pm2 stop all >nul 2>&1
call npx pm2 delete all >nul 2>&1
call npx pm2 kill >nul 2>&1

REM Ishlayotgan MAKTAB_BOT_SERVER oynasini yopish
taskkill /F /FI "WINDOWTITLE eq MAKTAB_BOT_SERVER*" >nul 2>&1

echo.
echo ====================================================
echo  ⏹️ Bot va Web server muvaffaqiyatli to'xtatildi!
echo  Telegramda bot endi to'xtadi (javob bermaydi).
echo ====================================================
ping 127.0.0.1 -n 3 >nul
