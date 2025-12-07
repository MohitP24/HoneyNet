# ========================================
# FIREWALL SETUP - RUN AS ADMINISTRATOR
# ========================================
# Right-click PowerShell → "Run as Administrator"
# Then run this script

Write-Host "`n=== OPENING FIREWALL FOR COWRIE ===" -ForegroundColor Cyan

# Open port 2222 for incoming SSH connections
New-NetFirewallRule -DisplayName "Cowrie Honeypot SSH" -Direction Inbound -LocalPort 2222 -Protocol TCP -Action Allow

Write-Host "`n✅ Firewall rule created!" -ForegroundColor Green
Write-Host "Port 2222 is now open for network connections`n" -ForegroundColor White

# Show your network IP
Write-Host "`nYour network IPs:" -ForegroundColor Yellow
ipconfig | findstr IPv4

Write-Host "`nFrom another device, connect using:" -ForegroundColor Cyan
Write-Host "ssh -p 2222 root@YOUR_IP_ADDRESS" -ForegroundColor White
Write-Host "(Replace YOUR_IP_ADDRESS with one of the IPs above)" -ForegroundColor Gray
Write-Host ""
