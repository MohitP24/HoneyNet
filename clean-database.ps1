# ========================================
# Clean Database - Remove Imported CSV Data
# ========================================
# This script removes synthetic data from the CSV dataset
# and keeps only real attacks captured by Cowrie
# ========================================

Write-Host "`n=== DATABASE CLEANUP ===" -ForegroundColor Cyan
Write-Host "This will remove imported CSV data and keep only real Cowrie attacks`n" -ForegroundColor Yellow

# Show current state
Write-Host "BEFORE CLEANUP:" -ForegroundColor Green
$env:PGPASSWORD="honeynet123"
psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    'Total Events' as category,
    COUNT(*) as count
FROM events
UNION ALL
SELECT 
    'Real Cowrie Attacks (127.0.0.1)',
    COUNT(*)
FROM events
WHERE source_ip = '127.0.0.1'
UNION ALL
SELECT 
    'Imported CSV Data (other IPs)',
    COUNT(*)
FROM events
WHERE source_ip != '127.0.0.1';
"

Write-Host "`n"
$response = Read-Host "Do you want to DELETE all imported CSV data? (yes/no)"

if ($response -eq "yes") {
    Write-Host "`nDeleting imported data..." -ForegroundColor Yellow
    
    # Delete all non-localhost events (CSV imported data)
    psql -U honeynet -d honeynet -h localhost -p 5432 -c "
    DELETE FROM events WHERE source_ip != '127.0.0.1';
    "
    
    Write-Host "`nAFTER CLEANUP:" -ForegroundColor Green
    psql -U honeynet -d honeynet -h localhost -p 5432 -c "
    SELECT 
        source_ip,
        COUNT(*) as attacks,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_severity,
        COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_severity,
        COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_severity
    FROM events
    GROUP BY source_ip;
    "
    
    Write-Host "`n✅ Database cleaned! Only real Cowrie attacks remain." -ForegroundColor Green
    Write-Host "Your project now shows 100% authentic ML analysis." -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Cleanup cancelled. Database unchanged." -ForegroundColor Red
}
