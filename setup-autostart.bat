@echo off
title JadvaliBot Avtomatik Ishga Tushirish Sozlamasi
cd /d "%~dp0"
echo ===================================================
echo   JadvaliBot Avtomatik Ishga Tushirishni O'rnatish
echo ===================================================
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup-autostart.ps1"
echo.
pause
