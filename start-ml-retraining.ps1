# ML MODEL RETRAINING SERVICE STARTUP
# Runs continuous learning for honeynet ML models

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   ML MODEL RETRAINING SERVICE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python environment is activated
Write-Host "[1/3] Checking Python environment..." -ForegroundColor Yellow

$pythonPath = Get-Command python -ErrorAction SilentlyContinue

if (-not $pythonPath) {
    Write-Host "  ❌ Python not found!" -ForegroundColor Red
    Write-Host "  Please activate the ml-service virtual environment first" -ForegroundColor Yellow
    exit 1
}

Write-Host "  ✅ Python found: $($pythonPath.Source)" -ForegroundColor Green

# Check required packages
Write-Host "[2/3] Checking dependencies..." -ForegroundColor Yellow

$requiredPackages = @("psycopg2", "schedule", "sklearn", "tensorflow", "pandas")
$missingPackages = @()

foreach ($package in $requiredPackages) {
    $installed = python -c "import $package" 2>$null
    if ($LASTEXITCODE -ne 0) {
        $missingPackages += $package
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host "  ⚠️  Missing packages: $($missingPackages -join ', ')" -ForegroundColor Yellow
    Write-Host "  Installing missing packages..." -ForegroundColor Yellow
    
    cd ml-service
    pip install -r requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Failed to install packages!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  ✅ All dependencies installed" -ForegroundColor Green

# Set environment variables
Write-Host "[3/3] Starting retraining service..." -ForegroundColor Yellow

$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "honeynet"
$env:DB_USER = "honeynet"
$env:DB_PASSWORD = "honeynet123"
$env:MODEL_DIR = ".\model"
$env:BACKUP_DIR = ".\model_backups"
$env:RETRAIN_INTERVAL_HOURS = "24"
$env:MIN_NEW_SAMPLES = "100"
$env:CONTAMINATION = "0.1"
$env:MIN_IMPROVEMENT = "0.05"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor White
Write-Host "  Database: $env:DB_NAME@$env:DB_HOST:$env:DB_PORT" -ForegroundColor Gray
Write-Host "  Model directory: $env:MODEL_DIR" -ForegroundColor Gray
Write-Host "  Retraining interval: $env:RETRAIN_INTERVAL_HOURS hours" -ForegroundColor Gray
Write-Host "  Minimum samples: $env:MIN_NEW_SAMPLES" -ForegroundColor Gray
Write-Host ""

cd ml-service

Write-Host "🚀 Starting ML Retraining Service..." -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

python retrain_service.py
