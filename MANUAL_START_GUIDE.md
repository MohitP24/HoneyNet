# 🚀 MANUAL STARTUP GUIDE - Step by Step

## Prerequisites
✅ Make sure you're in the main directory: `D:\boda\AI-Honeynet\HoneyNet`

---

## 🛑 STEP 1: Stop All Running Services First

Open **PowerShell** in `D:\boda\AI-Honeynet\HoneyNet` and run:

```powershell
# Stop all Node.js and Python processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop WSL honeypots and Cowrie
wsl -d Ubuntu-22.04 -- bash -c "pkill -f 'cowrie|python.*honeypot' 2>/dev/null; screen -ls | grep -o '[0-9]*\.' | xargs -I {} screen -S {} -X quit 2>/dev/null; exit 0"

Write-Host "✅ All services stopped" -ForegroundColor Green
```

**Wait 5 seconds** before proceeding.

---

## 🟢 STEP 2: Start Services (6 Terminals)

### **Terminal 1: ML Service**

```powershell
# Navigate to ml-service directory
cd D:\boda\AI-Honeynet\HoneyNet\ml-service

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start ML service
python app.py
```

**Expected Output:**
- You'll see TensorFlow messages (oneDNN, warnings) - **THESE ARE NORMAL**
- After 30-60 seconds: `INFO: Uvicorn running on http://0.0.0.0:8001`
- **Keep this terminal open**

---

### **Terminal 2: Backend**

```powershell
# Navigate to src directory
cd D:\boda\AI-Honeynet\HoneyNet\src

# Start backend
npm start
```

**Expected Output:**
```
✅ PostgreSQL connected successfully
✅ Multi-honeypot watcher started (2/2 services)
✅ HTTP Honeypot watcher started
✅ FTP Honeypot watcher started
✅ Server running on port 3000
```
- You may see "ML service is not healthy" warnings initially - **NORMAL**
- These will stop once ML service finishes loading
- **Keep this terminal open**

---

### **Terminal 3: Frontend**

```powershell
# Navigate to frontend directory
cd D:\boda\AI-Honeynet\HoneyNet\frontend

# Start frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```
- **Keep this terminal open**

---

### **Terminal 4: Cowrie SSH Honeypot**

```powershell
# Start Cowrie as cowrie user (NOT root)
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie start"
```

**Expected Output:**
```
Starting cowrie: [twistd --umask=0022 --pidfile ...]
CryptographyDeprecationWarning: TripleDES has been moved... (NORMAL - ignore)
cowrie is running (PID: XX)
```
- The deprecation warnings are **NORMAL**
- You'll see a PID number - that means it's running
- **Press Enter** to return to prompt
- **Keep terminal open or close it - Cowrie runs in background**

---

### **Terminal 5: HTTP Honeypot**

```powershell
# Start HTTP honeypot in screen session
wsl -d Ubuntu-22.04 -- bash -c "screen -dmS http_honeypot bash -c 'cd /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots && python3 http_honeypot.py'; sleep 1; screen -ls"
```

**Expected Output:**
```
There are screens on:
    XX.http_honeypot    (Detached)
1 Socket in /run/screen/S-root.
```
- **This means it's running in the background**
- **Keep terminal open or close it**

---

### **Terminal 6: FTP Honeypot**

```powershell
# Start FTP honeypot in screen session
wsl -d Ubuntu-22.04 -- bash -c "screen -dmS ftp_honeypot bash -c 'cd /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots && python3 ftp_honeypot.py'; sleep 1; screen -ls"
```

**Expected Output:**
```
There are screens on:
    XX.ftp_honeypot     (Detached)
    XX.http_honeypot    (Detached)
2 Sockets in /run/screen/S-root.
```
- **Both honeypots running in background**
- **Keep terminal open or close it**

---

## ✅ STEP 3: Verify All Services Running

Open a **new PowerShell terminal** and run:

```powershell
# Check all ports
netstat -ano | Select-String "8001|3000|5173|2222|8080|2121"
```

**Expected Output (you should see all 6 ports):**
```
TCP    0.0.0.0:2222           LISTENING    (Cowrie SSH)
TCP    0.0.0.0:3000           LISTENING    (Backend)
TCP    127.0.0.1:2121         LISTENING    (FTP)
TCP    127.0.0.1:8080         LISTENING    (HTTP)
TCP    127.0.0.1:8001         LISTENING    (ML Service)
TCP    [::1]:5173             LISTENING    (Frontend)
```

---

## 🎯 STEP 4: Access Dashboard

**Open your browser:**
```
http://localhost:5173
```

You should see:
- ✅ 3 Service Cards: **SSH**, **HTTP**, **FTP**
- ✅ All showing **"Active"** status
- ✅ Real-time events appearing

---

## 🧪 STEP 5: Test Attacks (Optional)

### From Another Device (Phone/Laptop on Same Network):

**Get your IP address first:**
```powershell
# Run this to find your local IP
ipconfig | Select-String "IPv4"
```

**Then from another device:**

1. **SSH Attack:**
   ```bash
   ssh root@YOUR_IP -p 2222
   # Try password: admin
   ```

2. **HTTP Attack:**
   ```bash
   curl http://YOUR_IP:8080/admin.php
   curl http://YOUR_IP:8080/wp-admin/
   ```

3. **FTP Attack:**
   ```bash
   ftp YOUR_IP 2121
   # Username: admin
   # Password: admin
   ```

**Watch the dashboard** - attacks should appear in real-time!

---

## 📊 Terminal Summary

| Terminal | Service | Directory | Command |
|----------|---------|-----------|---------|
| **1** | ML Service | `ml-service/` | `.\venv\Scripts\Activate.ps1` then `python app.py` |
| **2** | Backend | `src/` | `npm start` |
| **3** | Frontend | `frontend/` | `npm run dev` |
| **4** | Cowrie SSH | PowerShell | `wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie start"` |
| **5** | HTTP Honeypot | PowerShell | `wsl -d Ubuntu-22.04 -- bash -c "screen -dmS http_honeypot bash -c 'cd /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots && python3 http_honeypot.py'"` |
| **6** | FTP Honeypot | PowerShell | `wsl -d Ubuntu-22.04 -- bash -c "screen -dmS ftp_honeypot bash -c 'cd /mnt/d/boda/AI-Honeynet/HoneyNet/honeypots && python3 ftp_honeypot.py'"` |

---

## 🔍 Troubleshooting

### "Port already in use" Error

**Solution:** Run STEP 1 again to stop all services, wait 5 seconds, then restart.

### ML Service "Health Check Failed" in Backend

**This is NORMAL!** ML service takes 30-60 seconds to load TensorFlow. The warnings will stop automatically once it's ready.

### Cowrie "You must not run cowrie as root!"

**Solution:** Make sure you use `-u cowrie` flag in the WSL command (see Terminal 4).

### Can't see honeypot screen sessions

**Check if running:**
```powershell
wsl -d Ubuntu-22.04 -- screen -ls
```

**You should see:**
```
XX.http_honeypot    (Detached)
XX.ftp_honeypot     (Detached)
```

### Dashboard not showing attacks

1. **Wait 30 seconds** for ML service to load
2. **Check Backend terminal** - you should see "EVENT: Received" messages
3. **Refresh browser** (F5)

---

## ⚠️ Understanding "Warnings" (NOT Errors!)

### You Will See These (NORMAL):

✅ **TensorFlow oneDNN messages** - Optimization info
✅ **scikit-learn InconsistentVersionWarning** - Version difference (safe)
✅ **CryptographyDeprecationWarning** - Library update notice
✅ **ML service health check failed** - Temporary while loading (30-60s)

### These Are Real Errors (Should NOT See):

❌ `Port already in use` - Run STEP 1 to stop services
❌ `Database connection failed` - Check PostgreSQL is running
❌ `ENOENT: no such file` - You're in wrong directory

---

## 🎉 Success Checklist

- [ ] Terminal 1: ML Service shows `Uvicorn running on http://0.0.0.0:8001`
- [ ] Terminal 2: Backend shows `Server running on port 3000`
- [ ] Terminal 3: Frontend shows `Local: http://localhost:5173/`
- [ ] Cowrie shows `cowrie is running (PID: XX)`
- [ ] Screen sessions show both honeypots (http + ftp)
- [ ] `netstat` shows all 6 ports listening
- [ ] Dashboard opens and shows 3 active services

**If all checked ✅ - YOU'RE DONE! 🎊**

---

## 💡 Pro Tips

1. **Keep Terminals 1, 2, 3 open** to see logs in real-time
2. **Terminals 4, 5, 6 can be closed** after starting (services run in background)
3. **To stop everything:** Run STEP 1 commands
4. **To restart:** Run STEP 1, wait 5 seconds, then STEP 2

---

## 📞 Quick Commands Reference

**Check what's running:**
```powershell
netstat -ano | Select-String "8001|3000|5173|2222|8080|2121"
```

**Check WSL honeypots:**
```powershell
wsl -d Ubuntu-22.04 -- screen -ls
```

**View honeypot logs:**
```powershell
wsl -d Ubuntu-22.04 -- tail -f /tmp/http_honeypot.json
wsl -d Ubuntu-22.04 -- tail -f /tmp/ftp_honeypot.json
```

**Stop everything:**
```powershell
Get-Process -Name node,python -ErrorAction SilentlyContinue | Stop-Process -Force
wsl -d Ubuntu-22.04 -- bash -c "pkill -f 'cowrie|python.*honeypot'; screen -wipe"
```

---

**Created:** December 4, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
