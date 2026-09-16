@echo off
chcp 65001 > nul
echo ====================================================
echo    MAKTAB DARS JADVALI — TELEFONGA O'RNATISH (ADB)
echo ====================================================
echo.

set ADB=C:\Users\Pro\AppData\Local\Android\Sdk\platform-tools\adb.exe
set APK=%~dp0maktab-dars-jadvali.apk

echo Qurilmalar tekshirilmoqda...
"%ADB%" devices
echo.

echo APK telefoningizga o'rnatilmoqda...
"%ADB%" install -r -d "%APK%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ MUVAFFAQITYATLI: Ilova telefoningizga muvaffaqiyatli o'rnatildi!
    echo.
    echo Ilovani ishga tushirish...
    "%ADB%" shell am start -n com.example.maktab/.MainActivity
) else (
    echo.
    echo ❌ XATOLIK: Telefon topilmadi yoki ruxsat berilmadi.
    echo Iltimos, telefonda:
    echo 1. "Отладка по USB" (USB debugging) yoqilganligini tekshiring.
    echo 2. Telefon ekranida chiqqan "Ruxsat berish (Разрешить отладку)" oynasida "OK" ni bosing.
)

echo.
pause
