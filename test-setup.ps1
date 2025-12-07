Write-Host "🧪 Testing Honeynet Setup..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if honeypot scripts exist
Write-Host "Test 1: Checking honeypot files..." -ForegroundColor Yellow
$files = @(
    "D:\boda\AI-Honeynet\HoneyNet\honeypots\http_honeypot.py",
    "D:\boda\AI-Honeynet\HoneyNet\honeypots\ftp_honeypot.py",
    "D:\boda\AI-Honeynet\HoneyNet\honeypots\telnet_honeypot.py"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $(Split-Path $file -Leaf)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: Check database tables
Write-Host "Test 2: Checking database tables..." -ForegroundColor Yellow
$env:PGPASSWORD='honeynet123'
$tables = psql -h localhost -U honeynet -d honeynet -c "\dt" -t | Select-String "honeypot_services"
if ($tables) {
    Write-Host "✅ honeypot_services table exists" -ForegroundColor Green
} else {
    Write-Host "❌ honeypot_services table missing" -ForegroundColor Red
}
Write-Host ""

# Test 3: Check service counts
Write-Host "Test 3: Checking honeypot services in database..." -ForegroundColor Yellow
psql -h localhost -U honeynet -d honeynet -c "SELECT service_name, port, is_active FROM honeypot_services ORDER BY port"
Write-Host ""

# Test 4: Check if backend route exists
Write-Host "Test 4: Checking backend files..." -ForegroundColor Yellow
if (Test-Path "D:\boda\AI-Honeynet\HoneyNet\src\routes\services.js") {
    Write-Host "✅ Services API route exists" -ForegroundColor Green
} else {
    Write-Host "❌ Services API route missing" -ForegroundColor Red
}

if (Test-Path "D:\boda\AI-Honeynet\HoneyNet\src\services\dionaeaWatcher.js") {
    Write-Host "✅ Multi-honeypot watcher exists" -ForegroundColor Green
} else {
    Write-Host "❌ Multi-honeypot watcher missing" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check frontend component
Write-Host "Test 5: Checking frontend files..." -ForegroundColor Yellow
if (Test-Path "D:\boda\AI-Honeynet\HoneyNet\frontend\src\components\ServiceStatusGrid.jsx") {
    Write-Host "✅ ServiceStatusGrid component exists" -ForegroundColor Green
} else {
    Write-Host "❌ ServiceStatusGrid component missing" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ SETUP VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: .\START_HONEYNET.ps1  (to see startup commands)" -ForegroundColor White
Write-Host "2. Open 7 terminals and start all services" -ForegroundColor White
Write-Host "3. Open: http://localhost:5173" -ForegroundColor White
Write-Host "4. Review: .\DEMO_GUIDE.ps1  (for tomorrow's demo)" -ForegroundColor White
