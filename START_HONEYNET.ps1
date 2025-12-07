# AI-HONEYNET Complete Startup Script
# Run this in MULTIPLE terminals as indicated

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "🍯 AI-HONEYNET STARTUP GUIDE" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Open 6 PowerShell terminals and run these commands:" -ForegroundColor Yellow
Write-Host ""

Write-Host "📌 TERMINAL 1: Cowrie SSH Honeypot (Port 2222)" -ForegroundColor Green
Write-Host 'wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && twistd --umask=0022 --pidfile var/run/cowrie.pid --logger cowrie.python.logfile.logger cowrie"' -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 2: HTTP Honeypot (Port 8080)" -ForegroundColor Green
Write-Host "wsl -d Ubuntu-22.04 -- python3 /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots/http_honeypot.py" -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 3: FTP Honeypot (Port 2121)" -ForegroundColor Green
Write-Host "wsl -d Ubuntu-22.04 -- python3 /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots/ftp_honeypot.py" -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 4: Telnet Honeypot (Port 2323)" -ForegroundColor Green
Write-Host "wsl -d Ubuntu-22.04 -- python3 /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots/telnet_honeypot.py" -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 5: ML Service (Port 8001)" -ForegroundColor Green
Write-Host "cd D:\boda\AI-Honeynet\HoneyNet\ml-service; & .\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001" -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 6: Backend (Port 3000)" -ForegroundColor Green
Write-Host "cd D:\boda\AI-Honeynet\HoneyNet; npm start" -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 7: Frontend (Port 5173)" -ForegroundColor Green
Write-Host "cd D:\boda\AI-Honeynet\HoneyNet\frontend; npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "📌 TERMINAL 8 (ADMIN): Port Forwarding" -ForegroundColor Red
Write-Host ".\setup-wsl-port-forward.ps1" -ForegroundColor White
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "After all services start, open:" -ForegroundColor Yellow
Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
