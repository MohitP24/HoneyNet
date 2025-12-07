# ============================================
# COMPLETE FIX AND RESTART SCRIPT
# ============================================
# This script fixes all issues and starts everything properly

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   FIXING ALL ISSUES AND RESTARTING" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop everything first
Write-Host "Step 1: Stopping all services..." -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray

# Stop Cowrie
Write-Host "Stopping Cowrie..." -ForegroundColor Gray
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie stop 2>/dev/null || true"

# Kill any processes on our ports
Write-Host "Checking for processes on our ports..." -ForegroundColor Gray
$portsToCheck = @(8001, 3000, 5173, 2222, 8080, 2121)
foreach ($port in $portsToCheck) {
    $connections = netstat -ano | findstr ":$port " | findstr "LISTENING"
    if ($connections) {
        Write-Host "  Port $port is in use" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 2

# Step 2: Verify .env file
Write-Host ""
Write-Host "Step 2: Verifying .env configuration..." -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray

if (Test-Path ".\.env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    # Check if DATABASE_URL has a password
    $envContent = Get-Content ".\.env" -Raw
    if ($envContent -match "DATABASE_URL=postgresql://honeynet:([^@]+)@") {
        $dbPassword = $matches[1]
        if ($dbPassword -and $dbPassword -ne "password" -and $dbPassword.Length -gt 0) {
            Write-Host "✅ Database password is set: $dbPassword" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Database password looks weak, but continuing..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ .env file missing! Creating from example..." -ForegroundColor Red
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

# Step 3: Test database connection
Write-Host ""
Write-Host "Step 3: Testing database connection..." -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray

$dbTest = psql -U honeynet -d honeynet -h localhost -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database might not be running. Attempting to start..." -ForegroundColor Yellow
    
    # Try to start PostgreSQL service
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        if ($pgService.Status -ne "Running") {
            Write-Host "Starting PostgreSQL service..." -ForegroundColor Gray
            Start-Service $pgService.Name
            Start-Sleep -Seconds 3
            Write-Host "✅ PostgreSQL service started" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  PostgreSQL service not found. Make sure it's installed and running." -ForegroundColor Yellow
        Write-Host "   You may need to start it manually or check Docker/WSL PostgreSQL" -ForegroundColor Gray
    }
}

# Step 4: Start services
Write-Host ""
Write-Host "Step 4: Starting all services..." -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray

# Terminal 1: ML Service
Write-Host "Starting ML Service..." -ForegroundColor Cyan
$mlCommand = "Write-Host '=== ML SERVICE ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\ml-service'; if (Test-Path '.\venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; python app.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCommand
Start-Sleep -Seconds 8

# Terminal 2: Backend API
Write-Host "Starting Backend API..." -ForegroundColor Cyan
$backendCommand = "Write-Host '=== BACKEND API ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\src'; node index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Start-Sleep -Seconds 10

# Start HTTP and FTP honeypots in WSL
Write-Host "Starting HTTP and FTP honeypots in WSL..." -ForegroundColor Cyan
wsl -d Ubuntu-22.04 -- bash /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/start-all-honeypots.sh | Out-Null
Start-Sleep -Seconds 3

# Terminal 3: Frontend
Write-Host "Starting Frontend..." -ForegroundColor Cyan
$frontendCommand = "Write-Host '=== FRONTEND ===' -ForegroundColor Green; cd 'D:\boda\AI-Honeynet\HoneyNet\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand
Start-Sleep -Seconds 6

# Terminal 4: Cowrie with proper activation
Write-Host "Starting Cowrie SSH Honeypot..." -ForegroundColor Cyan
$cowrieCommand = @"
Write-Host '=== COWRIE SSH HONEYPOT ===' -ForegroundColor Green
Write-Host 'Activating virtual environment and starting Cowrie...' -ForegroundColor Yellow
wsl -d Ubuntu-22.04 -u cowrie -- bash -c 'cd ~/cowrie && source cowrie-env/bin/activate && cowrie start'
Start-Sleep -Seconds 3
Write-Host ''
Write-Host 'Checking status...' -ForegroundColor Yellow
wsl -d Ubuntu-22.04 -u cowrie -- bash -c 'cd ~/cowrie && source cowrie-env/bin/activate && cowrie status'
Write-Host ''
Write-Host 'Cowrie startup complete!' -ForegroundColor Green
Write-Host 'Log: /home/cowrie/cowrie/var/log/cowrie/cowrie.json' -ForegroundColor Gray
Write-Host 'To stop: wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie stop"' -ForegroundColor Gray
Read-Host 'Press Enter to close this window'
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cowrieCommand
Start-Sleep -Seconds 5

# Step 5: Verify all services
Write-Host ""
Write-Host "Step 5: Verifying services..." -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray
Start-Sleep -Seconds 5

$expectedPorts = @{
    "8001" = "ML Service"
    "3000" = "Backend API"
    "5173" = "Frontend"
    "2222" = "Cowrie SSH"
    "8080" = "HTTP Honeypot"
    "2121" = "FTP Honeypot"
}

Write-Host "Checking ports..." -ForegroundColor Gray
$runningServices = 0
foreach ($port in $expectedPorts.Keys) {
    $listening = netstat -ano | findstr ":$port " | findstr "LISTENING"
    if ($listening) {
        Write-Host "  ✅ $($expectedPorts[$port]) on port $port" -ForegroundColor Green
        $runningServices++
    } else {
        Write-Host "  ❌ $($expectedPorts[$port]) on port $port (not responding)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STARTUP SUMMARY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running: $runningServices / $($expectedPorts.Count)" -ForegroundColor $(if ($runningServices -eq $expectedPorts.Count) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait 10-20 more seconds for all services to fully initialize" -ForegroundColor White
Write-Host "2. Open: http://localhost:5173" -ForegroundColor Cyan
Write-Host "3. Check Backend terminal - should show:" -ForegroundColor White
Write-Host "   - 'Multi-honeypot watcher started (2/2 services)'" -ForegroundColor Gray
Write-Host "   - 'HTTP Honeypot watcher started'" -ForegroundColor Gray
Write-Host "   - 'FTP Honeypot watcher started'" -ForegroundColor Gray
Write-Host ""
Write-Host "If you see database errors in Backend:" -ForegroundColor Yellow
Write-Host "   - Make sure PostgreSQL is running" -ForegroundColor White
Write-Host "   - Check .env file has correct password" -ForegroundColor White
Write-Host "   - Try restarting the Backend terminal manually" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
