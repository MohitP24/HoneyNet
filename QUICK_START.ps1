# ============================================
# QUICK START - NO ERRORS
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STOPPING ALL SERVICES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Kill everything
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie stop 2>/dev/null" 2>$null
wsl -d Ubuntu-22.04 -- screen -S http_honeypot -X quit 2>$null
wsl -d Ubuntu-22.04 -- screen -S ftp_honeypot -X quit 2>$null

Start-Sleep -Seconds 3
Write-Host "✅ All stopped`n" -ForegroundColor Green

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STARTING ALL SERVICES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Start ML
Write-Host "1. ML Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\boda\AI-Honeynet\HoneyNet\ml-service'; .\venv\Scripts\Activate.ps1; python app.py"
Start-Sleep -Seconds 10

# Start Backend
Write-Host "2. Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\boda\AI-Honeynet\HoneyNet\src'; node index.js"
Start-Sleep -Seconds 8

# Start Honeypots
Write-Host "3. Honeypots..." -ForegroundColor Yellow
wsl -d Ubuntu-22.04 -- bash /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/start-all-honeypots.sh | Out-Null
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "4. Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\boda\AI-Honeynet\HoneyNet\frontend'; npm run dev"
Start-Sleep -Seconds 6

# Start Cowrie
Write-Host "5. Cowrie..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "wsl -d Ubuntu-22.04 -u cowrie -- bash -c 'cd ~/cowrie && source cowrie-env/bin/activate && cowrie start && sleep 2 && cowrie status'; Read-Host 'Press Enter'"
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   ✅ DONE! OPEN: http://localhost:5173" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check
$ports = netstat -ano | findstr "3000 5173 8001 2222 8080 2121" | findstr "LISTENING"
if ($ports) {
    Write-Host "Running services:" -ForegroundColor Green
    netstat -ano | findstr "3000 5173 8001 2222 8080 2121" | findstr "LISTENING" | ForEach-Object {
        $p = ($_ -split '\s+')[2] -split ':' | Select-Object -Last 1
        $name = switch($p) { 
            '3000'{'Backend'}; '5173'{'Frontend'}; '8001'{'ML'}; 
            '2222'{'Cowrie'}; '8080'{'HTTP'}; '2121'{'FTP'} 
        }
        Write-Host "  ✅ $name (Port $p)" -ForegroundColor Green
    }
}

Write-Host "`nPress any key..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
