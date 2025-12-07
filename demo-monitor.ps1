# Real-time ML Classification Monitor for Demo
# Shows live ML analysis happening in real-time

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  LIVE ML CLASSIFICATION MONITOR" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = "honeynet123"

Write-Host "Monitoring database for new ML classifications..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$lastTimestamp = Get-Date

while ($true) {
    $query = @"
SELECT 
    timestamp,
    event_type,
    source_ip,
    LEFT(command, 60) as cmd,
    ROUND(anomaly_score::numeric, 3) as score,
    CASE 
        WHEN anomaly_score > 0.7 THEN 'HIGH'
        WHEN anomaly_score > 0.4 THEN 'MEDIUM'
        ELSE 'LOW'
    END as severity
FROM events 
WHERE 
    command IS NOT NULL 
    AND anomaly_score IS NOT NULL
    AND timestamp > '$($lastTimestamp.ToString("yyyy-MM-dd HH:mm:ss"))'
ORDER BY timestamp DESC
LIMIT 5;
"@

    $result = psql -U honeynet -d honeynet -h localhost -p 5432 -t -A -F"|" -c $query 2>$null
    
    if ($result -and $result.Length -gt 0) {
        foreach ($line in $result) {
            if ($line.Trim()) {
                $fields = $line -split '\|'
                $ts = $fields[0]
                $ip = $fields[2]
                $cmd = $fields[3]
                $score = $fields[4]
                $sev = $fields[5]
                
                $color = switch ($sev.Trim()) {
                    "HIGH" { "Red" }
                    "MEDIUM" { "Yellow" }
                    "LOW" { "Green" }
                    default { "White" }
                }
                
                Write-Host "[$ts] " -NoNewline -ForegroundColor Gray
                Write-Host "ML SCORE: $score " -NoNewline -ForegroundColor Cyan
                Write-Host "[$sev] " -NoNewline -ForegroundColor $color
                Write-Host "$ip - $cmd" -ForegroundColor White
            }
        }
        $lastTimestamp = Get-Date
    }
    
    Start-Sleep -Seconds 2
}
