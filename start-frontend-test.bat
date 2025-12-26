@echo off
REM سكربت لتشغيل الفرونت إند وفتح صفحة الاختبار
REM IBEX Frontend Test Script

echo ========================================
echo   IBEX - تشغيل الفرونت إند للاختبار
echo ========================================
echo.

REM التحقق من وجود مجلد الفرونت إند
if not exist "apps\frontend" (
    echo [ERROR] مجلد الفرونت إند غير موجود!
    echo    المسار المتوقع: apps\frontend
    pause
    exit /b 1
)

echo [OK] تم العثور على مجلد الفرونت إند
echo.

REM الانتقال إلى مجلد الفرونت إند
cd apps\frontend

REM التحقق من وجود node_modules
if not exist "node_modules" (
    echo [WARN] node_modules غير موجود. جاري تثبيت الحزم...
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERROR] فشل تثبيت الحزم!
        pause
        exit /b 1
    )
    echo.
)

REM فتح صفحة الاختبار في المتصفح بعد 3 ثوان
echo [INFO] سيتم فتح صفحة الاختبار في المتصفح بعد 3 ثوان...
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start test-index.html"

REM تشغيل خادم التطوير
echo [OK] جاري تشغيل خادم التطوير...
echo    سيتم فتح المتصفح تلقائياً على http://localhost:3000
echo.
echo [TIP] يمكنك فتح صفحة الاختبار من:
echo    file:///%CD:\=/%/test-index.html
echo.
echo [INFO] اضغط Ctrl+C لإيقاف الخادم
echo.

REM تشغيل npm run dev
call npm run dev

