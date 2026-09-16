@echo off
cd /d "%~dp0"
npx pm2 stop ecosystem.config.cjs
npx pm2 status
pause
