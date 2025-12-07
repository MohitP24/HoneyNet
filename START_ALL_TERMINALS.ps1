# START_ALL_TERMINALS.ps1 - Start all 6 services in separate VS Code terminals
# This script opens each service in its own terminal so you can see all output

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Starting All Honeynet Services" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Terminal 1: ML Service
Write-Host "[1/6] Starting ML Service..." -ForegroundColor Yellow
$mlCmd = @'
cd D:\boda\AI-Honeynet\HoneyNet\ml-service
.\venv\Scripts\Activate.ps1
Write-Host "`n ML SERVICE - Port 8001" -ForegroundColor Green
Write-Host "Loading TensorFlow models...`n" -ForegroundColor Yellow
python app.py
'@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCmd

Start-Sleep -Seconds 3

# Terminal 2: Backend
Write-Host "[2/6] Starting Backend..." -ForegroundColor Yellow
$backendCmd = @'
cd D:\boda\AI-Honeynet\HoneyNet
Write-Host "`n BACKEND - Port 3000" -ForegroundColor Green
Write-Host "Starting Node.js server...`n" -ForegroundColor Yellow
npm start
'@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 5

# Terminal 3: Cowrie SSH
Write-Host "[3/6] Starting Cowrie SSH Honeypot..." -ForegroundColor Yellow
$cowrieCmd = @'
Write-Host "`n COWRIE SSH HONEYPOT - Port 2222" -ForegroundColor Green
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie start && echo 'Cowrie started!' && sleep infinity"
'@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cowrieCmd

Start-Sleep -Seconds 2

# Terminal 4: HTTP & FTP Honeypots
Write-Host "[4/6] Starting HTTP & FTP Honeypots..." -ForegroundColor Yellow
$honeypotsCmd = @'
Write-Host "`n HTTP (Port 8080) & FTP (Port 2121) HONEYPOTS" -ForegroundColor Green
Write-Host "Starting honeypots in screen sessions...`n" -ForegroundColor Yellow
wsl -d Ubuntu-22.04 -- bash /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/start-all-honeypots.sh
Write-Host "`nHoneypots started! Check status with: wsl screen -ls" -ForegroundColor Green
Read-Host "Press Enter to close this window"
'@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $honeypotsCmd

Start-Sleep -Seconds 2

# Terminal 5: Frontend
Write-Host "[5/6] Starting Frontend..." -ForegroundColor Yellow
$frontendCmd = @'
cd D:\boda\AI-Honeynet\HoneyNet\frontend
Write-Host "`n FRONTEND DASHBOARD - Port 5173" -ForegroundColor Green
Write-Host "Starting Vite dev server...`n" -ForegroundColor Yellow
npm run dev
'@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 5

# Final Status
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Check each terminal for startup messages and errors:" -ForegroundColor Yellow
Write-Host "  1. ML Service     - Should show 'Uvicorn running on http://0.0.0.0:8001'" -ForegroundColor White
Write-Host "  2. Backend        - Should show 'Server running on port 3000'" -ForegroundColor White
Write-Host "  3. Cowrie SSH     - Should show 'Cowrie started!'" -ForegroundColor White
Write-Host "  4. HTTP & FTP     - Should show 'Honeypots started!'" -ForegroundColor White
Write-Host "  5. Frontend       - Should show 'Local: http://localhost:5173'" -ForegroundColor White

Write-Host "`nTest from your phone:" -ForegroundColor Cyan
Write-Host "  ssh root@172.26.16.1 -p 2222" -ForegroundColor Green
Write-Host "`nDashboard: http://localhost:5173" -ForegroundColor Cyan

Write-Host "`n================================`n" -ForegroundColor Cyan
