# Quick Cowrie Deployment Script for Windows
# Run this in PowerShell (Administrator)

Write-Host "AI-HONEYNET - Cowrie Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "[X] Docker not found!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "After installation, restart this script." -ForegroundColor Yellow
    exit
}

Write-Host " Docker is installed!" -ForegroundColor Green
Write-Host ""

# Create directories
Write-Host "Creating Cowrie data directories..." -ForegroundColor Yellow
$cowrieDataPath = "C:\cowrie-data"
New-Item -ItemType Directory -Force -Path "$cowrieDataPath\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$cowrieDataPath\downloads" | Out-Null
Write-Host " Directories created at: $cowrieDataPath" -ForegroundColor Green
Write-Host ""

# Stop existing Cowrie container if running
Write-Host "Checking for existing Cowrie container..." -ForegroundColor Yellow
$existingContainer = docker ps -a --filter "name=cowrie" --format "{{.Names}}"
if ($existingContainer) {
    Write-Host "Found existing container, removing..." -ForegroundColor Yellow
    docker stop cowrie 2>$null
    docker rm cowrie 2>$null
}
Write-Host " Ready to deploy new container" -ForegroundColor Green
Write-Host ""

# Pull Cowrie image
Write-Host "Pulling Cowrie Docker image (this may take a few minutes)..." -ForegroundColor Yellow
docker pull cowrie/cowrie:latest
Write-Host " Image downloaded!" -ForegroundColor Green
Write-Host ""

# Run Cowrie container
Write-Host "Starting Cowrie honeypot container..." -ForegroundColor Yellow
docker run -d `
    --name cowrie `
    --restart unless-stopped `
    -p 2222:2222 `
    -p 2223:2223 `
    -v "${cowrieDataPath}\logs:/cowrie/var/log/cowrie" `
    -v "${cowrieDataPath}\downloads:/cowrie/var/lib/cowrie/downloads" `
    cowrie/cowrie:latest

Write-Host " Cowrie is running!" -ForegroundColor Green
Write-Host ""

# Wait for Cowrie to initialize
Write-Host "Waiting for Cowrie to initialize (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if log file exists
Write-Host "Checking for Cowrie log file..." -ForegroundColor Yellow
$logPath = "$cowrieDataPath\logs\cowrie.json"
$attempts = 0
while (-not (Test-Path $logPath) -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    $attempts++
}

if (Test-Path $logPath) {
    Write-Host " Log file created: $logPath" -ForegroundColor Green
} else {
    Write-Host "  Log file not found yet. It will be created when first attack arrives." -ForegroundColor Yellow
}
Write-Host ""

# Update .env file
Write-Host "Updating .env configuration..." -ForegroundColor Yellow
$envPath = "D:\boda\AI-Honeynet\HoneyNet\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $envContent = $envContent -replace 'COWRIE_LOG_PATH=.*', "COWRIE_LOG_PATH=C:/cowrie-data/logs/cowrie.json"
    $envContent | Set-Content $envPath
    Write-Host " .env file updated!" -ForegroundColor Green
} else {
    Write-Host "  .env file not found at: $envPath" -ForegroundColor Yellow
}
Write-Host ""

# Display status
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " COWRIE DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Honeypot Details:" -ForegroundColor White
Write-Host "   SSH Port: 2222" -ForegroundColor White
Write-Host "   Telnet Port: 2223" -ForegroundColor White
Write-Host "   Logs: C:\cowrie-data\logs\cowrie.json" -ForegroundColor White
Write-Host "   Downloads: C:\cowrie-data\downloads" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your backend server" -ForegroundColor White
Write-Host "     cd D:\boda\AI-Honeynet\HoneyNet" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Test the honeypot:" -ForegroundColor White
Write-Host "     ssh -p 2222 root@localhost" -ForegroundColor Gray
Write-Host "     (Use any password - they all work!)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Watch attacks appear in your dashboard!" -ForegroundColor White
Write-Host "     http://localhost:5173" -ForegroundColor Gray
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View Cowrie logs:  docker logs -f cowrie" -ForegroundColor Gray
Write-Host "  Stop Cowrie:       docker stop cowrie" -ForegroundColor Gray
Write-Host "  Start Cowrie:      docker start cowrie" -ForegroundColor Gray
Write-Host "  Restart Cowrie:    docker restart cowrie" -ForegroundColor Gray
Write-Host ""

Write-Host "WARNING: This honeypot is currently only accessible locally." -ForegroundColor Yellow
Write-Host "To receive real attacks from the internet, you need to:" -ForegroundColor Yellow
Write-Host "  1. Port forward 2222 to 2222 on your router" -ForegroundColor White
Write-Host "  2. OR use ngrok: ngrok tcp 2222" -ForegroundColor White
Write-Host ""
Write-Host "Happy hunting!" -ForegroundColor Green

