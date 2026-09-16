@echo off
title GitHub ga yuklash (git push)
cd /d "D:\madad-talim"
echo ====================================================
echo    GitHub ga loyihani yuklash boshlanmoqda...
echo ====================================================
git remote remove origin 2>nul
git remote add origin https://github.com/seeabdurahmon-a11y/DarsJadvaliBot.git
git branch -M main
git push -u origin main --force
echo.
echo ====================================================
echo Agar muvaffaqiyatli yuklangan bo'lsa, istalgan tugmani bosing.
echo ====================================================
pause
