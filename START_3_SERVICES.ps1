# Quick Start Script for 3-Service Honeynet
# Run this script to start all services

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     STARTING 3-SERVICE HONEYNET SYSTEM" -ForegroundColor Cyan
Write-Host "     SSH (Cowrie) + HTTP + FTP" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Not running as Administrator. Some features may not work." -ForegroundColor Yellow
}

# Step 1: Start Python honeypots in WSL (FTP and HTTP)
Write-Host "[1/6] Starting FTP honeypot (port 2121)..." -ForegroundColor Green
wsl -d Ubuntu-22.04 -- bash -c "screen -dmS ftp_honey python3 /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots/ftp_honeypot.py"
Start-Sleep -Seconds 2

Write-Host "[2/6] Starting HTTP honeypot (port 8080)..." -ForegroundColor Green
wsl -d Ubuntu-22.04 -- bash -c "screen -dmS http_honey python3 /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots/http_honeypot.py"
Start-Sleep -Seconds 2

# Step 2: Start Cowrie SSH honeypot
Write-Host "[3/6] Starting Cowrie SSH honeypot (port 2222)..." -ForegroundColor Green
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && twistd --umask=0022 --pidfile var/run/cowrie.pid --logger cowrie.python.logfile.logger cowrie"
Start-Sleep -Seconds 3

# Step 3: Start ML Service
Write-Host "[4/6] Starting ML Service (port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\boda\AI-Honeynet\HoneyNet\ml-service; & venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001"
Start-Sleep -Seconds 5

# Step 4: Start Backend
Write-Host "[5/6] Starting Backend API (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\boda\AI-Honeynet\HoneyNet; npm start"
Start-Sleep -Seconds 5

# Step 5: Start Frontend
Write-Host "[6/6] Starting Frontend (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\boda\AI-Honeynet\HoneyNet\frontend; npm run dev"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor White
Write-Host "  🔐 Cowrie SSH    : port 2222" -ForegroundColor Yellow
Write-Host "  🌐 HTTP Honeypot : port 8080" -ForegroundColor Yellow
Write-Host "  📁 FTP Honeypot  : port 2121" -ForegroundColor Yellow
Write-Host "  🤖 ML Service    : port 8001" -ForegroundColor Yellow
Write-Host "  ⚙️  Backend API   : port 3000" -ForegroundColor Yellow
Write-Host "  🖥️  Frontend      : port 5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open your browser to: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test from your phone (same WiFi):" -ForegroundColor White
Write-Host "  SSH: ssh -p 2222 root@192.168.1.3" -ForegroundColor Gray
Write-Host "  HTTP: http://192.168.1.3:8080/admin" -ForegroundColor Gray
Write-Host "  FTP: ftp 192.168.1.3 2121" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to check service status..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Check if services are running
Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Cyan
netstat -ano | findstr "2222 8080 2121 8001 3000 5173"
