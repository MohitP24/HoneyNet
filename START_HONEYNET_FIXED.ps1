# ============================================
# AI HONEYNET - COMPLETE STARTUP SCRIPT
# ============================================
# This script starts all services in the correct order
# with proper error handling and verification

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
    Write-Host "✅ .env file created. Please verify database credentials." -ForegroundColor Green
    Write-Host ""
}

# Function to check if port is in use
function Test-Port {
    param($Port)
    $result = netstat -ano | findstr ":$Port "
    return $null -ne $result
}

# Function to wait for service
function Wait-ForService {
    param($Name, $Url, $MaxWait = 30)
    Write-Host "Waiting for $Name to start..." -ForegroundColor Yellow
    $count = 0
    while ($count -lt $MaxWait) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            Write-Host "✅ $Name is ready!" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 1
            $count++
            Write-Host "." -NoNewline
        }
    }
    Write-Host ""
    Write-Host "⚠️  $Name might not be ready yet (timeout)" -ForegroundColor Yellow
    return $false
}

Write-Host "Step 1: Checking Prerequisites" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray

# Check if ports are available
$ports = @{
    "8001" = "ML Service"
    "3000" = "Backend API"
    "5173" = "Frontend"
    "2222" = "Cowrie SSH"
    "8080" = "HTTP Honeypot"
    "2121" = "FTP Honeypot"
}

$portsInUse = @()
foreach ($port in $ports.Keys) {
    if (Test-Port $port) {
        $portsInUse += "$port ($($ports[$port]))"
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host "⚠️  WARNING: The following ports are already in use:" -ForegroundColor Yellow
    $portsInUse | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    Write-Host ""
    $response = Read-Host "Do you want to continue anyway? (y/n)"
    if ($response -ne "y") {
        Write-Host "Startup cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Starting ML Service (Port 8001)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray
Write-Host "Opening Terminal 1 for ML Service..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== ML SERVICE ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\ml-service'; if (Test-Path '.\venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 } else { Write-Host 'Warning: Virtual environment not found!' -ForegroundColor Yellow }; python app.py"

Start-Sleep -Seconds 8
Wait-ForService "ML Service" "http://localhost:8001/health" 15

Write-Host ""
Write-Host "Step 3: Starting Backend API (Port 3000)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray
Write-Host "Opening Terminal 2 for Backend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== BACKEND API ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\src'; node index.js"

Start-Sleep -Seconds 8
Wait-ForService "Backend API" "http://localhost:3000/api/health" 15

Write-Host ""
Write-Host "Step 4: Starting Frontend (Port 5173)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray
Write-Host "Opening Terminal 3 for Frontend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== FRONTEND ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\frontend'; npm run dev"

Start-Sleep -Seconds 6

Write-Host ""
Write-Host "Step 5: Starting Cowrie SSH Honeypot (Port 2222)" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray
Write-Host "Opening Terminal 4 for Cowrie..." -ForegroundColor Yellow

# Create temporary script for Cowrie
$cowrieScript = @"
#!/bin/bash
echo "=========================================="
echo "Starting Cowrie SSH Honeypot"
echo "=========================================="
cd /home/cowrie/cowrie
echo "Stopping any existing instances..."
/home/cowrie/cowrie/cowrie-env/bin/cowrie stop 2>/dev/null || true
sleep 2
echo "Starting Cowrie..."
/home/cowrie/cowrie/cowrie-env/bin/cowrie start
sleep 3
echo ""
echo "Checking status..."
/home/cowrie/cowrie/cowrie-env/bin/cowrie status
echo ""
echo "✅ Cowrie started!"
echo "Log: /home/cowrie/cowrie/var/log/cowrie/cowrie.json"
echo ""
echo "To check logs: tail -f /home/cowrie/cowrie/var/log/cowrie/cowrie.json"
echo "To stop: /home/cowrie/cowrie/cowrie-env/bin/cowrie stop"
echo "=========================================="
exec bash
"@

$cowrieScript | Out-File -FilePath ".\scripts\start-cowrie-temp.sh" -Encoding UTF8 -NoNewline

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== COWRIE SSH HONEYPOT ===' -ForegroundColor Green; wsl -d Ubuntu-22.04 -u cowrie -- bash /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/start-cowrie-temp.sh"

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services should now be running on:" -ForegroundColor White
Write-Host "  🔬 ML Service:      http://localhost:8001" -ForegroundColor Cyan
Write-Host "  🔌 Backend API:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🌐 Frontend:        http://localhost:5173" -ForegroundColor Cyan
Write-Host "  🐚 Cowrie SSH:      Port 2222" -ForegroundColor Cyan
Write-Host "  🌍 HTTP Honeypot:   Port 8080 (auto-started by backend)" -ForegroundColor Cyan
Write-Host "  📁 FTP Honeypot:    Port 2121 (auto-started by backend)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open your browser: http://localhost:5173" -ForegroundColor White
Write-Host "2. Check if all 3 service cards show 'Active'" -ForegroundColor White
Write-Host "3. Monitor real-time attacks in the dashboard" -ForegroundColor White
Write-Host ""
Write-Host "To verify services are running:" -ForegroundColor Yellow
Write-Host '  netstat -ano | findstr "8001 3000 5173 2222 8080 2121"' -ForegroundColor Gray
Write-Host ""
Write-Host "To test from another device:" -ForegroundColor Yellow
Write-Host '  ssh root@<YOUR_IP> -p 2222' -ForegroundColor Gray
Write-Host '  curl http://<YOUR_IP>:8080' -ForegroundColor Gray
Write-Host '  ftp <YOUR_IP> 2121' -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
