# Test if HTTP events are in database via API
Write-Host "`n=== Checking HTTP Events via Backend API ===`n" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/events?limit=50" -ErrorAction Stop
    
    Write-Host "Total events found: $($response.events.Count)" -ForegroundColor Yellow
    
    $httpEvents = $response.events | Where-Object { $_.protocol -eq 'HTTP' }
    
    if ($httpEvents) {
        Write-Host "`n✅ HTTP Events Found: $($httpEvents.Count)" -ForegroundColor Green
        Write-Host "`nRecent HTTP Events:" -ForegroundColor Cyan
        $httpEvents | Select-Object -First 10 | Format-Table event_type, source_ip, command, timestamp -AutoSize
    } else {
        Write-Host "`n❌ No HTTP events found in database!" -ForegroundColor Red
        Write-Host "`nAll events:" -ForegroundColor Yellow
        $response.events | Select-Object -First 10 | Format-Table event_type, protocol, source_ip, command -AutoSize
    }
} catch {
    Write-Host "`n❌ Error: Cannot connect to Backend API on port 3000" -ForegroundColor Red
    Write-Host "Make sure the Backend is running!" -ForegroundColor Yellow
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Gray
}
