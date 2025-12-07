# Database Connection Test Script
# Run this to verify your database is working

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DATABASE CONNECTION TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".\.env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please run from the HoneyNet directory" -ForegroundColor Yellow
    exit 1
}

# Read DATABASE_URL from .env
$envContent = Get-Content ".\.env" -Raw
if ($envContent -match "DATABASE_URL=(.+)") {
    $dbUrl = $matches[1].Trim()
    Write-Host "Database URL: $dbUrl" -ForegroundColor Gray
    
    # Extract components
    if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
        $dbUser = $matches[1]
        $dbPass = $matches[2]
        $dbHost = $matches[3]
        $dbPort = $matches[4]
        $dbName = $matches[5]
        
        Write-Host ""
        Write-Host "Database Configuration:" -ForegroundColor Yellow
        Write-Host "  Host: $dbHost" -ForegroundColor White
        Write-Host "  Port: $dbPort" -ForegroundColor White
        Write-Host "  User: $dbUser" -ForegroundColor White
        Write-Host "  Password: $('*' * $dbPass.Length)" -ForegroundColor White
        Write-Host "  Database: $dbName" -ForegroundColor White
        Write-Host ""
        
        # Test with psql
        Write-Host "Testing connection with psql..." -ForegroundColor Yellow
        $env:PGPASSWORD = $dbPass
        $result = psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c "SELECT version();" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ DATABASE CONNECTION SUCCESSFUL!" -ForegroundColor Green
            Write-Host ""
            Write-Host "PostgreSQL Version:" -ForegroundColor Gray
            Write-Host $result -ForegroundColor Gray
        } else {
            Write-Host "❌ DATABASE CONNECTION FAILED!" -ForegroundColor Red
            Write-Host ""
            Write-Host "Error details:" -ForegroundColor Yellow
            Write-Host $result -ForegroundColor Red
            Write-Host ""
            Write-Host "Troubleshooting:" -ForegroundColor Yellow
            Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor White
            Write-Host "2. Check if password in .env matches database" -ForegroundColor White
            Write-Host "3. Verify database 'honeynet' exists" -ForegroundColor White
            Write-Host "4. Check if user 'honeynet' has proper permissions" -ForegroundColor White
        }
        
        Remove-Item Env:PGPASSWORD
    }
} else {
    Write-Host "ERROR: Could not parse DATABASE_URL from .env" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
