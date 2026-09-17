@echo off
chcp 65001 >nul
echo ====================================================
echo     MAKTAB DARS JADVALI — CLOUDFLARE ONLINE TUNNEL
echo ====================================================
echo.
echo Internetga ulanmoqda (HTTPS)...
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
