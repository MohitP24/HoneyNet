# VERIFY NETWORK ATTACKS
# Run this AFTER attacking from other device

Write-Host ""
Write-Host "=== VERIFYING NETWORK ATTACKS ===" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD="honeynet123"

Write-Host "[CHECK 1] Recent Attacks from ALL Sources" -ForegroundColor Green
Write-Host "--------------------------------------------" -ForegroundColor Gray
Write-Host ""

psql -U honeynet -d honeynet -h localhost -p 5432 -c "SELECT source_ip, COUNT(*) as attacks, MAX(timestamp) as last_attack FROM events GROUP BY source_ip ORDER BY last_attack DESC LIMIT 5;"

Write-Host ""
Write-Host "[CHECK 2] Attacks from Non-Localhost (Network Attacks)" -ForegroundColor Green
Write-Host "--------------------------------------------" -ForegroundColor Gray
Write-Host ""

psql -U honeynet -d honeynet -h localhost -p 5432 -c "SELECT source_ip, LEFT(command, 60) as command, severity, ROUND(anomaly_score::numeric, 3) as ml_score, timestamp FROM events WHERE source_ip != '127.0.0.1' AND command IS NOT NULL ORDER BY timestamp DESC LIMIT 10;"

Write-Host ""
Write-Host "[CHECK 3] ML Analysis Summary (Last 10 Minutes)" -ForegroundColor Green
Write-Host "--------------------------------------------" -ForegroundColor Gray
Write-Host ""

psql -U honeynet -d honeynet -h localhost -p 5432 -c "SELECT source_ip, COUNT(*) as total_attacks, COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_severity, COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_severity, COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_severity, ROUND(AVG(anomaly_score)::numeric, 3) as avg_ml_score FROM events WHERE timestamp > NOW() - INTERVAL '10 minutes' GROUP BY source_ip ORDER BY total_attacks DESC;"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$nonLocalCount = psql -U honeynet -d honeynet -h localhost -p 5432 -t -c "SELECT COUNT(*) FROM events WHERE source_ip != '127.0.0.1' AND timestamp > NOW() - INTERVAL '10 minutes';"

if ($nonLocalCount -gt 0) {
    Write-Host "SUCCESS! Network attacks detected!" -ForegroundColor Green
    Write-Host "You have $nonLocalCount attacks from other devices in the last 10 minutes." -ForegroundColor White
    Write-Host ""
    Write-Host "Your project is now PROVEN to work over the network!" -ForegroundColor Cyan
    Write-Host "The ML analyzed attacks from a DIFFERENT IP address in real-time!" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "No network attacks detected yet." -ForegroundColor Yellow
    Write-Host "Make sure you:" -ForegroundColor White
    Write-Host "1. Ran attacks from your other device" -ForegroundColor Gray
    Write-Host "2. Used the correct IP address" -ForegroundColor Gray
    Write-Host "3. Port forwarding is set up (run setup-wsl-port-forward.ps1 as admin)" -ForegroundColor Gray
    Write-Host ""
}
