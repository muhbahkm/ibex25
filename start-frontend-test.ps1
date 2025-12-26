# سكربت لتشغيل الفرونت إند وفتح صفحة الاختبار
# IBEX Frontend Test Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IBEX - تشغيل الفرونت إند للاختبار" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# التحقق من وجود مجلد الفرونت إند
$frontendPath = "apps\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ خطأ: مجلد الفرونت إند غير موجود!" -ForegroundColor Red
    Write-Host "   المسار المتوقع: $frontendPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ تم العثور على مجلد الفرونت إند" -ForegroundColor Green
Write-Host ""

# الانتقال إلى مجلد الفرونت إند
Set-Location $frontendPath

# التحقق من وجود node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules غير موجود. جاري تثبيت الحزم..." -ForegroundColor Yellow
    Write-Host ""
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ فشل تثبيت الحزم!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# فتح صفحة الاختبار في المتصفح بعد 3 ثوان
Write-Host "📋 سيتم فتح صفحة الاختبار في المتصفح بعد 3 ثوان..." -ForegroundColor Yellow
Write-Host ""

Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    $testPagePath = Join-Path $using:PWD "test-index.html"
    if (Test-Path $testPagePath) {
        Start-Process $testPagePath
    }
} | Out-Null

# تشغيل خادم التطوير
Write-Host "🚀 جاري تشغيل خادم التطوير..." -ForegroundColor Green
Write-Host "   سيتم فتح المتصفح تلقائياً على http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 نصيحة: يمكنك فتح صفحة الاختبار من:" -ForegroundColor Yellow
Write-Host "   file:///$($PWD.Path.Replace('\', '/'))/test-index.html" -ForegroundColor White
Write-Host ""
Write-Host "⏹️  اضغط Ctrl+C لإيقاف الخادم" -ForegroundColor Gray
Write-Host ""

# تشغيل npm run dev
npm run dev

