@echo off
title @JadvaliBot 24/7 Supervisor
cd /d "%~dp0"
echo ===================================================
echo     @JadvaliBot 24/7 Avtomatik Ishga Tushirish
echo ===================================================
npx pm2 start ecosystem.config.cjs
npx pm2 status
echo.
echo Bot orqa fonda 24/7 rejimda muvaffaqiyatli ishga tushirildi!
echo Loglarni korish uchun: npx pm2 logs jadvalibot
pause
