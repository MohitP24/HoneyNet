# 🪟 Quick Start: Cowrie Honeypot on Windows

**Fast guide to deploy Cowrie using Docker Desktop on Windows**

---

## Prerequisites

- Windows 10/11 (64-bit)
- Administrator access
- 8GB RAM minimum
- Docker Desktop for Windows

---

## Step 1: Install Docker Desktop

1. **Download Docker Desktop:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"

2. **Install Docker Desktop:**
   - Run the installer
   - Enable WSL 2 when prompted
   - Restart computer when installation completes

3. **Verify Installation:**
   ```powershell
   docker --version
   docker ps
   ```

---

## Step 2: Create Cowrie Directories

```powershell
# Create directory in your user folder
mkdir C:\cowrie-data\logs
mkdir C:\cowrie-data\downloads

# Navigate to directory
cd C:\cowrie-data
```

---

## Step 3: Run Cowrie Container

```powershell
# Pull Cowrie image
docker pull cowrie/cowrie:latest

# Run Cowrie
docker run -d `
  --name cowrie-honeypot `
  --restart unless-stopped `
  -p 2222:2222/tcp `
  -p 2223:2223/tcp `
  -v C:\cowrie-data\logs:/cowrie/var/log/cowrie `
  -v C:\cowrie-data\downloads:/cowrie/var/lib/cowrie/downloads `
  cowrie/cowrie:latest

# Verify it's running
docker ps
```

You should see:
```
CONTAINER ID   IMAGE             STATUS         PORTS                              NAMES
abc123def456   cowrie/cowrie     Up 10 seconds  0.0.0.0:2222->2222/tcp, ...       cowrie-honeypot
```

---

## Step 4: Verify Log File Creation

```powershell
# Wait 10 seconds for Cowrie to initialize
Start-Sleep -Seconds 10

# Check if log file exists
dir C:\cowrie-data\logs\

# You should see: cowrie.json
```

---

## Step 5: Update AI-HONEYNET Configuration

1. **Open `.env` file:**
   ```powershell
   cd d:\boda\AI-Honeynet\HoneyNet
   notepad .env
   ```

2. **Update `COWRIE_LOG_PATH`:**
   ```env
   COWRIE_LOG_PATH=C:\cowrie-data\logs\cowrie.json
   ```

3. **Save and close** the file.

---

## Step 6: Restart Backend

```powershell
# Stop backend (if running)
# Press Ctrl+C in the backend terminal

# Restart backend
cd d:\boda\AI-Honeynet\HoneyNet
npm start
```

You should see:
```
[info]: Starting log watcher on: C:\cowrie-data\logs\cowrie.json
[info]: Log watcher active
```

---

## Step 7: Test the Honeypot

1. **Test SSH connection:**
   ```powershell
   # From Windows PowerShell or WSL
   ssh -p 2222 root@localhost
   
   # Try any password (e.g., "password123")
   # Once connected, try some commands:
   whoami
   ls
   cat /etc/passwd
   exit
   ```

2. **Verify events are logged:**
   ```powershell
   # View log file
   Get-Content C:\cowrie-data\logs\cowrie.json -Tail 20
   ```

3. **Check dashboard:**
   - Open: http://localhost:5173
   - You should see your test session in the Events table
   - Stats should increment from 0

---

## Common Commands

```powershell
# Start Cowrie
docker start cowrie-honeypot

# Stop Cowrie  
docker stop cowrie-honeypot

# Restart Cowrie
docker restart cowrie-honeypot

# View Cowrie logs
docker logs -f cowrie-honeypot

# View captured events
Get-Content C:\cowrie-data\logs\cowrie.json -Tail 50

# Enter Cowrie container
docker exec -it cowrie-honeypot bash

# Remove Cowrie (if needed)
docker stop cowrie-honeypot
docker rm cowrie-honeypot
```

---

## Testing Script

Run the automated test script:

```powershell
cd d:\boda\AI-Honeynet\HoneyNet
.\scripts\test-cowrie-connection.ps1
```

This will verify:
- ✅ Log file exists
- ✅ File is readable
- ✅ JSON format is valid
- ✅ Backend can access the file
- ✅ Events are being captured

---

## Port Forwarding (Optional - Advanced)

To expose Cowrie on standard ports (22/23) instead of 2222/2223:

**⚠️ WARNING**: Only do this on a dedicated honeypot machine!

```powershell
# Run PowerShell as Administrator

# Forward port 22 to 2222
netsh interface portproxy add v4tov4 `
  listenport=22 `
  listenaddress=0.0.0.0 `
  connectport=2222 `
  connectaddress=127.0.0.1

# Forward port 23 to 2223
netsh interface portproxy add v4tov4 `
  listenport=23 `
  listenaddress=0.0.0.0 `
  connectport=2223 `
  connectaddress=127.0.0.1

# View port forwarding rules
netsh interface portproxy show all

# Remove forwarding (when needed)
netsh interface portproxy delete v4tov4 listenport=22 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=23 listenaddress=0.0.0.0
```

---

## Troubleshooting

### Docker won't start
- Make sure Windows Features "Hyper-V" and "WSL 2" are enabled
- Restart computer
- Check Docker Desktop is running (system tray icon)

### Port already in use
```powershell
# Find what's using port 2222
netstat -ano | findstr :2222

# Kill the process (replace PID with actual process ID)
taskkill /PID 1234 /F
```

### Log file not created
```powershell
# Check Cowrie container logs
docker logs cowrie-honeypot

# Restart container
docker restart cowrie-honeypot
```

### Backend can't read log file
```powershell
# Check file permissions
icacls C:\cowrie-data\logs\cowrie.json

# Grant full access (if needed)
icacls C:\cowrie-data\logs\cowrie.json /grant Everyone:F
```

---

## Next Steps

✅ **Cowrie is running!**

Now you can:
1. Let it run and wait for real attackers (they will find it!)
2. Monitor events on the dashboard: http://localhost:5173
3. Analyze ML-powered threat detection
4. Export threat intelligence in STIX format

**Your honeypot is now capturing real-world cyber attacks! 🎉**

