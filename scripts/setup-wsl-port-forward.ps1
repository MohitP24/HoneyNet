# ========================================
# WSL PORT FORWARDING - RUN AS ADMINISTRATOR
# ========================================
# This forwards Windows network port 2222 to WSL Cowrie
# ========================================

Write-Host "`n=== SETTING UP WSL PORT FORWARDING ===" -ForegroundColor Cyan

# Get WSL IP address
$wslIP = (wsl -d Ubuntu-22.04 hostname -I).Trim()
Write-Host "WSL IP Address: $wslIP" -ForegroundColor Yellow

# Remove existing rule if it exists
Write-Host "`nRemoving old port forwarding rules..." -ForegroundColor Gray
netsh interface portproxy delete v4tov4 listenport=2222 listenaddress=0.0.0.0 2>$null

# Add new port forwarding rule
Write-Host "Creating port forward: Windows 0.0.0.0:2222 → WSL $wslIP:2222" -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=2222 listenaddress=0.0.0.0 connectport=2222 connectaddress=$wslIP

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Port forwarding configured!" -ForegroundColor Green
    
    # Show current port forwarding rules
    Write-Host "`nActive port forwarding rules:" -ForegroundColor Cyan
    netsh interface portproxy show v4tov4
    
    # Test the port
    Write-Host "`nTesting port 2222..." -ForegroundColor Yellow
    netstat -an | findstr 2222
    
    Write-Host "`n✅ Setup complete!" -ForegroundColor Green
    Write-Host "Your other device can now connect to:" -ForegroundColor White
    Write-Host "ssh -p 2222 root@192.168.1.4`n" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Failed to create port forwarding!" -ForegroundColor Red
    Write-Host "Make sure you're running PowerShell as Administrator`n" -ForegroundColor Yellow
}
