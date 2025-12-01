# Test Cowrie Honeypot Connection Script
# This script helps verify Cowrie is properly connected to AI-HONEYNET

Write-Host "`n=== Cowrie Connection Test ===" -ForegroundColor Cyan
Write-Host "This script will verify your Cowrie honeypot integration`n" -ForegroundColor Gray

# Read .env file
$envPath = Join-Path $PSScriptRoot "..\\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ ERROR: .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

# Parse COWRIE_LOG_PATH from .env
$cowrieLogPath = (Get-Content $envPath | Where-Object { $_ -match "^COWRIE_LOG_PATH=" }) -replace "COWRIE_LOG_PATH=", ""

Write-Host "📂 Cowrie Log Path: $cowrieLogPath" -ForegroundColor Yellow

# Test 1: Check if log file exists
Write-Host "`n[Test 1] Checking if Cowrie log file exists..." -ForegroundColor Cyan
if (Test-Path $cowrieLogPath) {
    Write-Host "✅ PASS: Log file exists" -ForegroundColor Green
    
    # Get file info
    $fileInfo = Get-Item $cowrieLogPath
    Write-Host "   Size: $($fileInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "   Last Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "❌ FAIL: Log file not found" -ForegroundColor Red
    Write-Host "   Expected: $cowrieLogPath" -ForegroundColor Yellow
    Write-Host "   Please check if Cowrie is running and generating logs" -ForegroundColor Yellow
    exit 1
}

# Test 2: Check if file is readable
Write-Host "`n[Test 2] Checking if log file is readable..." -ForegroundColor Cyan
try {
    $content = Get-Content $cowrieLogPath -TotalCount 1 -ErrorAction Stop
    Write-Host "✅ PASS: File is readable" -ForegroundColor Green
} catch {
    Write-Host "❌ FAIL: Cannot read file" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

# Test 3: Validate JSON format
Write-Host "`n[Test 3] Validating JSON format..." -ForegroundColor Cyan
$lines = Get-Content $cowrieLogPath -TotalCount 10
$validJson = 0
$totalLines = 0

foreach ($line in $lines) {
    if ($line.Trim() -ne "") {
        $totalLines++
        try {
            $null = $line | ConvertFrom-Json
            $validJson++
        } catch {
            # Skip invalid lines
        }
    }
}

if ($validJson -gt 0) {
    Write-Host "✅ PASS: Found $validJson valid JSON lines out of $totalLines" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: No valid JSON found in first 10 lines" -ForegroundColor Yellow
    Write-Host "   This might be normal if Cowrie just started" -ForegroundColor Gray
}

# Test 4: Check for recent activity
Write-Host "`n[Test 4] Checking for recent activity..." -ForegroundColor Cyan
if ($fileInfo.LastWriteTime -gt (Get-Date).AddMinutes(-5)) {
    Write-Host "✅ PASS: File was modified in last 5 minutes" -ForegroundColor Green
    Write-Host "   Cowrie appears to be actively logging" -ForegroundColor Gray
} else {
    Write-Host "⚠️  WARNING: File was last modified $($fileInfo.LastWriteTime)" -ForegroundColor Yellow
    Write-Host "   Cowrie might not be receiving traffic" -ForegroundColor Gray
}

# Test 5: Count events
Write-Host "`n[Test 5] Counting events..." -ForegroundColor Cyan
$eventCount = (Get-Content $cowrieLogPath | Measure-Object -Line).Lines
Write-Host "📊 Total events in log: $eventCount" -ForegroundColor Cyan

if ($eventCount -eq 0) {
    Write-Host "⚠️  No events found - Cowrie may be waiting for attackers" -ForegroundColor Yellow
} elseif ($eventCount -lt 100) {
    Write-Host "✅ Few events found - Cowrie is starting to collect data" -ForegroundColor Green
} else {
    Write-Host "✅ Many events found - Cowrie is actively collecting data!" -ForegroundColor Green
}

# Test 6: Sample recent event
Write-Host "`n[Test 6] Showing sample event..." -ForegroundColor Cyan
$lastLine = Get-Content $cowrieLogPath -Tail 1
if ($lastLine) {
    try {
        $event = $lastLine | ConvertFrom-Json
        Write-Host "✅ Most recent event:" -ForegroundColor Green
        Write-Host "   Event ID: $($event.eventid)" -ForegroundColor Gray
        Write-Host "   Timestamp: $($event.timestamp)" -ForegroundColor Gray
        if ($event.src_ip) {
            Write-Host "   Source IP: $($event.src_ip)" -ForegroundColor Gray
        }
        if ($event.session) {
            Write-Host "   Session: $($event.session)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Could not parse last event as JSON" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No events to display" -ForegroundColor Yellow
}

# Test 7: Check if backend can access the file
Write-Host "`n[Test 7] Testing backend access..." -ForegroundColor Cyan
$backendUrl = "http://localhost:3000/api/stats"

try {
    $response = Invoke-WebRequest -Uri $backendUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    $stats = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ PASS: Backend is running and accessible" -ForegroundColor Green
    Write-Host "   Total Events: $($stats.counts.total_events)" -ForegroundColor Gray
    Write-Host "   Total Sessions: $($stats.counts.total_sessions)" -ForegroundColor Gray
    Write-Host "   Total Attackers: $($stats.counts.total_attackers)" -ForegroundColor Gray
    
    if ([int]$stats.counts.total_events -gt 0) {
        Write-Host "✅ Backend is receiving events from Cowrie!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend is running but hasn't received events yet" -ForegroundColor Yellow
        Write-Host "   Try triggering a test SSH connection to Cowrie" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAIL: Cannot connect to backend" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Make sure backend is running: npm start" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Log File: $cowrieLogPath" -ForegroundColor Gray
Write-Host "Events Logged: $eventCount" -ForegroundColor Gray
Write-Host "`n💡 Next Steps:" -ForegroundColor Yellow

if ($eventCount -eq 0) {
    Write-Host "1. Verify Cowrie is running: docker ps | grep cowrie" -ForegroundColor Gray
    Write-Host "2. Test SSH connection: ssh -p 2222 root@localhost" -ForegroundColor Gray
    Write-Host "3. Check Cowrie logs: docker logs cowrie-honeypot" -ForegroundColor Gray
} else {
    Write-Host "1. Open dashboard: http://localhost:5173" -ForegroundColor Gray
    Write-Host "2. Monitor events in real-time" -ForegroundColor Gray
    Write-Host "3. Let Cowrie run to collect more data" -ForegroundColor Gray
}

Write-Host "`n✅ Connection test complete!`n" -ForegroundColor Green
