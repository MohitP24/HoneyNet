# SECURE FIREWALL CONFIGURATION FOR HONEYNET
# Run as Administrator

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   CONFIGURING SECURE FIREWALL RULES FOR HONEYNET" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Remove any existing honeypot rules (clean slate)
Write-Host "[1/5] Removing old firewall rules..." -ForegroundColor Yellow
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Honeypot*" -or $_.DisplayName -like "*Honeynet*"} | Remove-NetFirewallRule -ErrorAction SilentlyContinue

# Rule 1: BLOCK all inbound traffic to honeypot ports from local network (security)
Write-Host "[2/5] Creating BLOCK rule for local network..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Honeynet - Block Local Network" `
    -Direction Inbound `
    -LocalPort 2222,8080,2121 `
    -Protocol TCP `
    -Action Block `
    -RemoteAddress 192.168.0.0/16,10.0.0.0/8,172.16.0.0/12 `
    -Profile Any `
    -Enabled True `
    -Description "SECURITY: Block honeypot access from local network to prevent internal attacks"

# Rule 2: ALLOW only from specific external IPs (if testing from phone)
Write-Host "[3/5] Creating ALLOW rule for testing..." -ForegroundColor Yellow
$testIP = Read-Host "Enter your phone's IP address for testing (or press Enter to skip)"

if ($testIP) {
    New-NetFirewallRule -DisplayName "Honeynet - Allow Test Device" `
        -Direction Inbound `
        -LocalPort 2222,8080,2121 `
        -Protocol TCP `
        -Action Allow `
        -RemoteAddress $testIP `
        -Profile Any `
        -Enabled True `
        -Description "TESTING: Allow access from authorized test device"
    Write-Host "  ✅ Test device $testIP can access honeypots" -ForegroundColor Green
}

# Rule 3: BLOCK all other inbound (unless you want internet attacks)
Write-Host "[4/5] Creating default BLOCK rule..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Honeynet - Block All Other" `
    -Direction Inbound `
    -LocalPort 2222,8080,2121 `
    -Protocol TCP `
    -Action Block `
    -Profile Any `
    -Enabled True `
    -Description "SECURITY: Block all unauthorized access to honeypot ports"

# Rule 4: ALLOW localhost (for backend to access logs)
Write-Host "[5/5] Creating localhost ALLOW rule..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Honeynet - Allow Localhost" `
    -Direction Inbound `
    -LocalPort 2222,8080,2121,3000,5173,8001 `
    -Protocol TCP `
    -Action Allow `
    -RemoteAddress 127.0.0.1 `
    -Profile Any `
    -Enabled True `
    -Description "REQUIRED: Allow localhost access for system components"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   FIREWALL RULES CONFIGURED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Security Status:" -ForegroundColor White
Write-Host "  ✅ Local network blocked from honeypots" -ForegroundColor Green
Write-Host "  ✅ Localhost access allowed for backend" -ForegroundColor Green
if ($testIP) {
    Write-Host "  ✅ Test device ($testIP) authorized" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No test device configured" -ForegroundColor Yellow
}
Write-Host "  ✅ All other external access blocked by default" -ForegroundColor Green
Write-Host ""

# Display current rules
Write-Host "Current Honeynet Firewall Rules:" -ForegroundColor Cyan
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Honeynet*"} | Format-Table DisplayName, Enabled, Direction, Action -AutoSize

Write-Host ""
Write-Host "To allow internet attacks (DANGEROUS), manually edit rules in:" -ForegroundColor Yellow
Write-Host "  Control Panel > Windows Defender Firewall > Advanced Settings" -ForegroundColor Gray
Write-Host ""
