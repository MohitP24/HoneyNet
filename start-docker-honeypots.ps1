# SECURE HONEYNET STARTUP SCRIPT
# Launches Docker-based isolated honeypots with proper security

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   STARTING SECURE DOCKER-BASED HONEYNET" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "  ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker is not running!" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Stop any existing honeypot containers
Write-Host "[2/6] Stopping old containers..." -ForegroundColor Yellow
docker-compose -f docker-compose-honeypots.yml down 2>$null
Write-Host "  ✅ Old containers stopped" -ForegroundColor Green

# Build containers
Write-Host "[3/6] Building secure containers..." -ForegroundColor Yellow
docker-compose -f docker-compose-honeypots.yml build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Containers built successfully" -ForegroundColor Green

# Create log directories
Write-Host "[4/6] Creating log directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "logs\http" | Out-Null
New-Item -ItemType Directory -Force -Path "logs\ftp" | Out-Null
New-Item -ItemType Directory -Force -Path "logs\glastopf" | Out-Null
Write-Host "  ✅ Log directories ready" -ForegroundColor Green

# Start containers
Write-Host "[5/6] Starting honeypot containers..." -ForegroundColor Yellow
docker-compose -f docker-compose-honeypots.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Failed to start containers!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Containers started" -ForegroundColor Green

# Wait for healthchecks
Write-Host "[6/6] Waiting for containers to become healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check container status
$containers = docker-compose -f docker-compose-honeypots.yml ps --format json | ConvertFrom-Json

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   DOCKER HONEYPOTS STATUS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

foreach ($container in $containers) {
    $name = $container.Service
    $state = $container.State
    $health = $container.Health
    
    if ($state -eq "running") {
        Write-Host "  ✅ $name : RUNNING ($health)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $name : $state" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Exposed Ports:" -ForegroundColor White
Write-Host "  🔐 SSH (Cowrie):    localhost:2222" -ForegroundColor Cyan
Write-Host "  🌐 HTTP (Glastopf): localhost:8080" -ForegroundColor Cyan
Write-Host "  📁 FTP:             localhost:2121" -ForegroundColor Cyan
Write-Host ""
Write-Host "Security Features:" -ForegroundColor White
Write-Host "  ✅ Network isolation (no internet access from honeypots)" -ForegroundColor Green
Write-Host "  ✅ Non-root execution (ftphoney, glasthoney users)" -ForegroundColor Green
Write-Host "  ✅ Read-only filesystems" -ForegroundColor Green
Write-Host "  ✅ Capability restrictions (cap_drop: ALL)" -ForegroundColor Green
Write-Host "  ✅ Rate limiting (30/min for FTP, 60/min for HTTP)" -ForegroundColor Green
Write-Host "  ✅ Input validation (injection prevention)" -ForegroundColor Green
Write-Host ""
Write-Host "View logs: docker-compose -f docker-compose-honeypots.yml logs -f" -ForegroundColor Gray
Write-Host "Stop: docker-compose -f docker-compose-honeypots.yml down" -ForegroundColor Gray
Write-Host ""
