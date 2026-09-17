@echo off
title @JadvaliBot Qayta Ishga Tushirish
cd /d "%~dp0"
echo ===================================================
echo     @JadvaliBot Qayta Ishga Tushirilmoqda...
echo ===================================================

if exist "node_modules\.bin\pm2.cmd" (
    call "node_modules\.bin\pm2.cmd" restart ecosystem.config.cjs
    call "node_modules\.bin\pm2.cmd" save
    call "node_modules\.bin\pm2.cmd" status
) else (
    call npx pm2 restart ecosystem.config.cjs
    call npx pm2 save
    call npx pm2 status
)

echo.
echo ===================================================
echo  Bot va Server muvaffaqiyatli qayta ishga tushirildi!
echo ===================================================
pause
