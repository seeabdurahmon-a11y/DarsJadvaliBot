@echo off
cd /d "D:\madad-talim"
npx pm2 stop ecosystem.config.cjs
npx pm2 status
pause
