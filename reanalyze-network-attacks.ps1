# Reanalyze Network Attacks
# Run this after restarting ML service

Write-Host "Triggering re-analysis of network attacks..." -ForegroundColor Cyan

$env:PGPASSWORD="honeynet123"

# Get count of unanalyzed network attacks
$count = psql -U honeynet -d honeynet -h localhost -p 5432 -t -c "SELECT COUNT(*) FROM events WHERE source_ip = '172.26.16.1' AND is_analyzed = false;"

Write-Host "Found $count unanalyzed network attacks" -ForegroundColor Yellow
Write-Host "Backend should process these automatically within 30 seconds..." -ForegroundColor Gray
Write-Host "Waiting..." -ForegroundColor Gray

Start-Sleep -Seconds 30

Write-Host "`nChecking results..." -ForegroundColor Cyan
psql -U honeynet -d honeynet -h localhost -p 5432 -c "SELECT LEFT(command, 50) as command, severity, ROUND(anomaly_score::numeric, 3) as ml_score FROM events WHERE source_ip = '172.26.16.1' AND command IS NOT NULL ORDER BY timestamp DESC LIMIT 10;"
