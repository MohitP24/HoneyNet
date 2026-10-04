# Start ML service, backend, and frontend from this repo (relative paths).
# Optional: start WSL Python honeypots and Cowrie.

$Root = $PSScriptRoot
Set-Location $Root

function ConvertTo-WslPath([string]$WinPath) {
    $full = (Resolve-Path $WinPath).Path
    $full = $full -replace '\\', '/'
    if ($full -match '^([A-Za-z]):(.*)$') {
        return "/mnt/$($Matches[1].ToLower())$($Matches[2])"
    }
    return $full
}

if (-not (Test-Path (Join-Path $Root '.env'))) {
    Copy-Item (Join-Path $Root '.env.example') (Join-Path $Root '.env')
    Write-Host "Created .env from .env.example. Update DB credentials before continuing." -ForegroundColor Yellow
}

Write-Host "Starting HoneyNet services..." -ForegroundColor Cyan

$mlDir = Join-Path $Root 'ml-service'
$mlCmd = @"
Set-Location '$mlDir'
if (Test-Path '.\venv\Scripts\python.exe') {
  & .\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001
} else {
  python -m uvicorn app:app --host 0.0.0.0 --port 8001
}
"@
Start-Process powershell -ArgumentList '-NoExit', '-Command', $mlCmd

Start-Sleep -Seconds 3

$backendCmd = @"
Set-Location '$Root'
npm start
"@
Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd

Start-Sleep -Seconds 2

$frontendDir = Join-Path $Root 'frontend'
$frontendCmd = @"
Set-Location '$frontendDir'
npm run dev
"@
Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd

$startHoneypots = Read-Host "Start WSL HTTP/FTP honeypots? (y/N)"
if ($startHoneypots -match '^[Yy]') {
    $hp = ConvertTo-WslPath (Join-Path $Root 'honeypots')
    wsl -d Ubuntu-22.04 -- bash -c "screen -dmS ftp_honey python3 '$hp/ftp_honeypot.py'"
    wsl -d Ubuntu-22.04 -- bash -c "screen -dmS http_honey python3 '$hp/http_honeypot.py'"
    Write-Host "HTTP (8080) and FTP (2121) honeypots started in WSL." -ForegroundColor Green
}

$startCowrie = Read-Host "Start Cowrie SSH honeypot in WSL? (y/N)"
if ($startCowrie -match '^[Yy]') {
    wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie start && cowrie status"
}

Write-Host ""
Write-Host "ML service : http://localhost:8001" -ForegroundColor Cyan
Write-Host "Backend    : http://localhost:3000" -ForegroundColor Cyan
Write-Host "Dashboard  : http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Keep the new PowerShell windows open while the stack is running."
