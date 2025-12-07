# AI HONEYNET - SIMPLE STARTUP SCRIPT
# Starts all services automatically

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   AI HONEYNET - STARTING ALL SERVICES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".\.env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "Created .env file." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Step 1: Starting ML Service (Port 8001)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray

$mlCommand = "Write-Host '=== ML SERVICE ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\ml-service'; if (Test-Path '.\venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; python app.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCommand

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Step 2: Starting Backend API (Port 3000)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray

$backendCommand = "Write-Host '=== BACKEND API ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\src'; node index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Step 3: Starting Frontend (Port 5173)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray

$frontendCommand = "Write-Host '=== FRONTEND ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Start-Sleep -Seconds 6

Write-Host ""
Write-Host "Step 4: Starting Cowrie SSH Honeypot (Port 2222)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray

$cowrieCommand = "Write-Host '=== COWRIE SSH HONEYPOT ===' -ForegroundColor Green; wsl -d Ubuntu-22.04 -u cowrie -- bash -c 'cd ~/cowrie && source cowrie-env/bin/activate && cowrie start && sleep 3 && cowrie status'; Write-Host ''; Write-Host 'Cowrie started! Check status above.' -ForegroundColor Green; Write-Host 'To stop: wsl -d Ubuntu-22.04 -u cowrie -- bash -c \"cd ~/cowrie && source cowrie-env/bin/activate && cowrie stop\"' -ForegroundColor Yellow; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cowrieCommand

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services should now be running on:" -ForegroundColor White
Write-Host "  ML Service:      http://localhost:8001" -ForegroundColor Cyan
Write-Host "  Backend API:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Frontend:        http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Cowrie SSH:      Port 2222" -ForegroundColor Cyan
Write-Host "  HTTP Honeypot:   Port 8080 (auto-started)" -ForegroundColor Cyan
Write-Host "  FTP Honeypot:    Port 2121 (auto-started)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open your browser: http://localhost:5173" -ForegroundColor White
Write-Host "2. Check if all 3 service cards show Active" -ForegroundColor White
Write-Host "3. Monitor real-time attacks in the dashboard" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
