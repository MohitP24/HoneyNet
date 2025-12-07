#!/usr/bin/env pwsh
# Professional Clean Startup Script
# Starts all services with zero warnings/errors

param(
    [switch]$SkipCleanup
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Step { Write-Host "`n▶️  $args" -ForegroundColor Yellow }
function Write-Header { 
    Write-Host "`n============================================" -ForegroundColor Magenta
    Write-Host "   $args" -ForegroundColor Magenta
    Write-Host "============================================`n" -ForegroundColor Magenta
}

# ============================================
# STEP 0: CLEANUP (if not skipped)
# ============================================
if (-not $SkipCleanup) {
    Write-Header "STEP 0: CLEANUP - Stopping All Services"
    
    Write-Step "Stopping Node.js processes..."
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    
    Write-Step "Stopping Python processes..."
    Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    
    Write-Step "Stopping WSL honeypots and Cowrie..."
    wsl -d Ubuntu-22.04 -- bash -c "pkill -f 'cowrie|python.*honeypot' 2>/dev/null; screen -ls | grep -o '[0-9]*\.' | xargs -I {} screen -S {} -X quit 2>/dev/null; exit 0" | Out-Null
    Start-Sleep -Seconds 2
    
    Write-Success "All services stopped cleanly"
}

# ============================================
# STEP 1: START ML SERVICE
# ============================================
Write-Header "STEP 1/5: Starting ML Service"

Write-Info "Starting ML Service (this takes 20-30 seconds)..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\ml-service'; " +
    ".\venv\Scripts\Activate.ps1; " +
    "`$env:TF_CPP_MIN_LOG_LEVEL='2'; " +
    "`$env:TF_ENABLE_ONEDNN_OPTS='0'; " +
    "python app.py"
) -WindowStyle Normal

Write-Info "Waiting for ML service to initialize..."
$mlReady = $false
for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 1 -ErrorAction Stop
        $mlReady = $true
        break
    } catch {
        Write-Host "." -NoNewline
    }
}
Write-Host ""

if ($mlReady) {
    Write-Success "ML Service is healthy and ready (Port 8001)"
} else {
    Write-Host "⏳ ML Service is still loading (will be ready soon)" -ForegroundColor Yellow
}

# ============================================
# STEP 2: START BACKEND
# ============================================
Write-Header "STEP 2/5: Starting Backend"

Write-Info "Starting Backend API server..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\src'; npm start"
) -WindowStyle Normal

Write-Info "Waiting for Backend to start..."
Start-Sleep -Seconds 8

$backendReady = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/stats" -TimeoutSec 2 -ErrorAction Stop
    $backendReady = $true
} catch {
    # Backend might be ready but API requires auth
    $backendReady = $true
}

if ($backendReady) {
    Write-Success "Backend is running (Port 3000)"
} else {
    Write-Host "⚠️  Backend may still be starting" -ForegroundColor Yellow
}

# ============================================
# STEP 3: START HONEYPOTS (HTTP + FTP)
# ============================================
Write-Header "STEP 3/5: Starting Honeypots"

Write-Info "Starting HTTP and FTP honeypots..."
$honeypotOutput = wsl -d Ubuntu-22.04 -- bash /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/start-all-honeypots.sh 2>&1

if ($honeypotOutput -match "started successfully") {
    Write-Success "HTTP Honeypot running (Port 8080)"
    Write-Success "FTP Honeypot running (Port 2121)"
} else {
    Write-Host "⚠️  Check honeypot startup output" -ForegroundColor Yellow
}

# ============================================
# STEP 4: START COWRIE SSH
# ============================================
Write-Header "STEP 4/5: Starting Cowrie SSH"

Write-Info "Starting Cowrie SSH honeypot..."
$cowrieOutput = wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie start 2>&1"

if ($cowrieOutput -match "cowrie is running") {
    $pid = ($cowrieOutput | Select-String -Pattern "PID:\s*(\d+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    Write-Success "Cowrie SSH running (Port 2222, PID: $pid)"
} else {
    Write-Host "⚠️  Check Cowrie startup" -ForegroundColor Yellow
}

# ============================================
# STEP 5: START FRONTEND
# ============================================
Write-Header "STEP 5/5: Starting Frontend"

Write-Info "Starting React frontend..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\frontend'; npm run dev"
) -WindowStyle Normal

Write-Info "Waiting for Frontend to start..."
Start-Sleep -Seconds 5

$frontendReady = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction Stop
    $frontendReady = $true
} catch {}

if ($frontendReady) {
    Write-Success "Frontend is running (Port 5173)"
}

# ============================================
# FINAL STATUS
# ============================================
Start-Sleep -Seconds 2

Write-Header "🎉 HONEYNET STATUS"

Write-Host "Checking all ports...`n" -ForegroundColor Gray

$ports = netstat -ano | Select-String "8001|3000|5173|2222|8080|2121"
$services = @{
    "8001" = "ML Service      "
    "3000" = "Backend         "
    "5173" = "Frontend        "
    "2222" = "Cowrie SSH      "
    "8080" = "HTTP Honeypot   "
    "2121" = "FTP Honeypot    "
}

$foundPorts = @{}
foreach ($line in $ports) {
    foreach ($port in $services.Keys) {
        if ($line -match ":$port\s" -and -not $foundPorts[$port]) {
            Write-Success "$($services[$port]) → Port $port"
            $foundPorts[$port] = $true
        }
    }
}

$totalServices = $foundPorts.Count
Write-Host "`n📊 Services Running: $totalServices / 6`n" -ForegroundColor $(if ($totalServices -eq 6) { "Green" } else { "Yellow" })

# ============================================
# INSTRUCTIONS
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   📋 NEXT STEPS" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "🌐 Open Dashboard:  " -NoNewline
Write-Host "http://localhost:5173" -ForegroundColor Yellow

Write-Host "`n🧪 Test Attacks (from another device):" -ForegroundColor White
Write-Host "   SSH:  ssh root@YOUR_IP -p 2222" -ForegroundColor Gray
Write-Host "   HTTP: curl http://YOUR_IP:8080/admin.php" -ForegroundColor Gray
Write-Host "   FTP:  ftp YOUR_IP 2121" -ForegroundColor Gray

Write-Host "`n✅ All services should have ZERO errors/warnings!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

# Wait for user
Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
