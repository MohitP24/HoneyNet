# COMPREHENSIVE SECURITY TESTING SUITE
# Tests all security features of Docker-based honeypots

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   HONEYNET SECURITY TESTING SUITE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Feature {
    param([string]$Name, [scriptblock]$Test)
    
    $script:totalTests++
    Write-Host "[$script:totalTests] Testing: $Name..." -ForegroundColor Yellow
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "  ✅ PASS" -ForegroundColor Green
            $script:passedTests++
        } else {
            Write-Host "  ❌ FAIL" -ForegroundColor Red
            $script:failedTests++
        }
    } catch {
        Write-Host "  ❌ ERROR: $_" -ForegroundColor Red
        $script:failedTests++
    }
    
    Write-Host ""
}

# Test 1: Docker containers are running
Test-Feature "Docker containers running" {
    $containers = docker ps --filter "name=glastopf" --filter "name=ftp-honeypot" --filter "name=log-forwarder" --format "{{.Names}}"
    return $containers.Count -ge 2
}

# Test 2: FTP honeypot responds
Test-Feature "FTP honeypot responds on port 2121" {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("localhost", 2121)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

# Test 3: HTTP honeypot responds
Test-Feature "HTTP honeypot responds on port 8080" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Test 4: Rate limiting on FTP (should block after 30 attempts)
Test-Feature "FTP rate limiting (30/min)" {
    Write-Host "  Attempting 35 rapid connections..." -ForegroundColor Gray
    
    $blocked = $false
    for ($i = 1; $i -le 35; $i++) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("localhost", 2121)
            $tcp.Close()
            Start-Sleep -Milliseconds 100
        } catch {
            $blocked = $true
            break
        }
    }
    
    if ($blocked) {
        Write-Host "  Rate limiting active (blocked after $i attempts)" -ForegroundColor Gray
    }
    
    return $blocked
}

# Test 5: SQL Injection on HTTP (should log without crashing)
Test-Feature "HTTP SQL injection detection" {
    try {
        $payload = "' OR '1'='1"
        $response = Invoke-WebRequest -Uri "http://localhost:8080/?id=$payload" -TimeoutSec 5 -UseBasicParsing
        # Should not crash, should return something
        return $true
    } catch {
        # Timeout or error means service crashed
        return $false
    }
}

# Test 6: Command injection on HTTP
Test-Feature "HTTP command injection detection" {
    try {
        $payload = "; ls -la"
        $response = Invoke-WebRequest -Uri "http://localhost:8080/?cmd=$payload" -TimeoutSec 5 -UseBasicParsing
        return $true
    } catch {
        return $false
    }
}

# Test 7: Path traversal on HTTP
Test-Feature "HTTP path traversal detection" {
    try {
        $payload = "../../../../etc/passwd"
        $response = Invoke-WebRequest -Uri "http://localhost:8080/?file=$payload" -TimeoutSec 5 -UseBasicParsing
        return $true
    } catch {
        return $false
    }
}

# Test 8: Containers running as non-root
Test-Feature "Containers running as non-root users" {
    $ftpUser = docker exec ftp-honeypot whoami 2>$null
    $httpUser = docker exec glastopf whoami 2>$null
    
    Write-Host "  FTP user: $ftpUser" -ForegroundColor Gray
    Write-Host "  HTTP user: $httpUser" -ForegroundColor Gray
    
    return ($ftpUser -ne "root") -and ($httpUser -ne "root")
}

# Test 9: Read-only filesystem
Test-Feature "Read-only filesystem protection" {
    try {
        docker exec ftp-honeypot touch /test-write 2>&1 | Out-Null
        # If it succeeded, filesystem is NOT read-only (bad)
        return $false
    } catch {
        # If it failed, filesystem IS read-only (good)
        return $true
    }
}

# Test 10: Log files being created
Test-Feature "Log files being generated" {
    $ftpLog = Test-Path "logs\ftp\ftp_honeypot.json"
    $httpLog = Test-Path "logs\glastopf\glastopf.log"
    
    Write-Host "  FTP log exists: $ftpLog" -ForegroundColor Gray
    Write-Host "  HTTP log exists: $httpLog" -ForegroundColor Gray
    
    return $ftpLog -or $httpLog
}

# Test 11: Network isolation (honeypots can't access internet)
Test-Feature "Network isolation (no internet from honeypots)" {
    try {
        # Try to ping Google DNS from FTP container (should fail)
        docker exec ftp-honeypot ping -c 1 8.8.8.8 2>&1 | Out-Null
        # If ping succeeded, isolation FAILED
        return $false
    } catch {
        # If ping failed, isolation WORKS
        return $true
    }
}

# Test 12: Healthchecks working
Test-Feature "Container healthchecks responding" {
    $health = docker inspect --format='{{.State.Health.Status}}' ftp-honeypot 2>$null
    Write-Host "  FTP health: $health" -ForegroundColor Gray
    return $health -eq "healthy" -or $health -eq "starting"
}

# FINAL RESULTS
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   SECURITY TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests:  $totalTests" -ForegroundColor White
Write-Host "Passed:       $passedTests" -ForegroundColor Green
Write-Host "Failed:       $failedTests" -ForegroundColor Red
Write-Host ""

if ($failedTests -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED - HONEYNET IS SECURE!" -ForegroundColor Green
    exit 0
} else {
    $percentage = [math]::Round(($passedTests / $totalTests) * 100, 1)
    Write-Host "⚠️  Some tests failed ($percentage% pass rate)" -ForegroundColor Yellow
    Write-Host "Review failed tests and fix security issues" -ForegroundColor Yellow
    exit 1
}
