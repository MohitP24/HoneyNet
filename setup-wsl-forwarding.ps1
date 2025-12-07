# Run this script as Administrator to set up WSL port forwarding
# Right-click PowerShell and select "Run as Administrator"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "      WSL Port Forwarding Setup (ADMIN REQUIRED)        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Right-click PowerShell" -ForegroundColor Gray
    Write-Host "  2. Select 'Run as Administrator'" -ForegroundColor Gray
    Write-Host "  3. Run this script again: .\setup-wsl-forwarding.ps1" -ForegroundColor Gray
    Write-Host ""
    pause
    exit 1
}

Write-Host "Running as Administrator" -ForegroundColor Green
Write-Host ""

# Get WSL IP
Write-Host "Finding WSL IP address..." -ForegroundColor Yellow
$wslIP = (wsl -d Ubuntu-22.04 -- hostname -I).Trim().Split()[0]
Write-Host "   WSL IP: $wslIP" -ForegroundColor Cyan
Write-Host ""

# Remove existing rules (if any)
Write-Host "Cleaning up old port forwarding rules..." -ForegroundColor Yellow
try {
    netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0 2>$null | Out-Null
    netsh interface portproxy delete v4tov4 listenport=2121 listenaddress=0.0.0.0 2>$null | Out-Null
    Write-Host "   Old rules removed" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   No old rules to remove" -ForegroundColor Gray
    Write-Host ""
}

# Add new port forwarding rules
Write-Host "Creating port forwarding rules..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   Setting up HTTP (8080) -> WSL..." -ForegroundColor Gray
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=$wslIP
Write-Host "   HTTP port forwarding configured" -ForegroundColor Green

Write-Host ""
Write-Host "   Setting up FTP (2121) -> WSL..." -ForegroundColor Gray
netsh interface portproxy add v4tov4 listenport=2121 listenaddress=0.0.0.0 connectport=2121 connectaddress=$wslIP
Write-Host "   FTP port forwarding configured" -ForegroundColor Green
Write-Host ""

# Open firewall ports
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "HTTP Honeypot (8080)" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "FTP Honeypot (2121)" -Direction Inbound -Protocol TCP -LocalPort 2121 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "   Firewall rules configured" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   Firewall rules may already exist" -ForegroundColor Yellow
    Write-Host ""
}

# Show current rules
Write-Host "============================================================" -ForegroundColor Gray
Write-Host "ACTIVE PORT FORWARDING RULES:" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Gray
netsh interface portproxy show v4tov4

Write-Host "" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Gray
Write-Host "PORT FORWARDING SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Gray

Write-Host "============================================================" -ForegroundColor Gray

Write-Host "Now you can test from your phone:" -ForegroundColor Yellow
$hostIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "   SSH:  ssh root@$hostIP -p 2222" -ForegroundColor Cyan
Write-Host "   HTTP: curl http://${hostIP}:8080/admin.php" -ForegroundColor Cyan
Write-Host "   FTP:  ftp $hostIP 2121" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================" -ForegroundColor Gray
Write-Host ""

pause
