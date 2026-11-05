@echo off
title MAKTAB_BOT_SERVER
cd /d "%~dp0"
cls
color 0A

echo ====================================================
echo     MAKTAB DARS JADVALI — BOT VA VEB SERVER
echo ====================================================
echo.

REM 1. Port 3000 ni tozalash
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [1/2] Telegram Bot va Server ishga tushirilmoqda...
echo.
echo  🤖 Telegram Bot:   @GojaZakaz_bot
echo  🌐 Sotuv/Taqdimot: http://localhost:3000
echo  📅 Dars Jadvali:   http://localhost:3000/app
echo.
echo ====================================================
echo  Diqqat: Ushbu oynani yopmang, bot shu yerda ishlaydi!
echo  To'xtatish uchun Ish stolida 'Stop Bot' ni bosing.
echo ====================================================
echo.

node src/index.js

echo.
echo [OGOHLANTIRISH] Bot to'xtadi yoki xatolik yuz berdi.
pause
