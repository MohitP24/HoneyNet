# Demo Presentation - Show ML Analysis Results
# Run this to display compelling evidence of AI working

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "AI-DRIVEN ADAPTIVE HONEYNET" -ForegroundColor Cyan
Write-Host "Machine Learning Analysis Results" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = "honeynet123"

# 1. Show ML Classification Distribution
Write-Host "[1] ML CLASSIFICATION DISTRIBUTION" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray
$query1 = @"
SELECT 
    CASE 
        WHEN anomaly_score > 0.7 THEN 'HIGH (ML Score > 0.7)'
        WHEN anomaly_score > 0.4 THEN 'MEDIUM (ML Score 0.4-0.7)'
        ELSE 'LOW (ML Score < 0.4)'
    END as severity,
    COUNT(*) as count,
    ROUND(AVG(anomaly_score)::numeric, 3) as avg_score
FROM events 
WHERE anomaly_score IS NOT NULL
GROUP BY 
    CASE 
        WHEN anomaly_score > 0.7 THEN 'HIGH (ML Score > 0.7)'
        WHEN anomaly_score > 0.4 THEN 'MEDIUM (ML Score 0.4-0.7)'
        ELSE 'LOW (ML Score < 0.4)'
    END
ORDER BY avg_score DESC;
"@
psql -U honeynet -d honeynet -h localhost -p 5432 -c $query1
Write-Host ""

# 2. Show Top Dangerous Commands (Highest ML Scores)
Write-Host "[2] TOP 5 MOST DANGEROUS COMMANDS (Highest ML Scores)" -ForegroundColor Red
Write-Host "------------------------------------" -ForegroundColor Gray
$query2 = @"
SELECT 
    ROUND(anomaly_score::numeric, 3) as ml_score,
    source_ip,
    LEFT(command, 80) as command
FROM events 
WHERE anomaly_score IS NOT NULL AND command IS NOT NULL
ORDER BY anomaly_score DESC
LIMIT 5;
"@
psql -U honeynet -d honeynet -h localhost -p 5432 -c $query2
Write-Host ""

# 3. Show Adaptive Responses Triggered by ML
Write-Host "[3] AUTOMATED ADAPTATIONS (Triggered by ML)" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray
$query3 = @"
SELECT 
    timestamp,
    action_type,
    severity,
    CASE WHEN success THEN '✅ Success' ELSE '❌ Failed' END as status
FROM adaptations
WHERE automated = true
ORDER BY timestamp DESC
LIMIT 10;
"@
psql -U honeynet -d honeynet -h localhost -p 5432 -c $query3
Write-Host ""

# 4. Show ML Model Performance Metrics
Write-Host "[4] ML MODEL STATISTICS" -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Gray
$query4 = @"
SELECT 
    COUNT(*) as total_analyzed,
    COUNT(DISTINCT source_ip) as unique_ips,
    ROUND(AVG(anomaly_score)::numeric, 3) as avg_score,
    ROUND(STDDEV(anomaly_score)::numeric, 3) as std_dev,
    ROUND(MIN(anomaly_score)::numeric, 3) as min_score,
    ROUND(MAX(anomaly_score)::numeric, 3) as max_score
FROM events 
WHERE anomaly_score IS NOT NULL;
"@
psql -U honeynet -d honeynet -h localhost -p 5432 -c $query4
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Analysis Complete" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
