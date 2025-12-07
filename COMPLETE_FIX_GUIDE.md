# 🎯 COMPLETE FIX GUIDE - ALL ERRORS RESOLVED

## ✅ What Was Fixed

### 1. Backend Database Error ❌→✅
**Error:** `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

**Root Cause:** Node.js was running from `src/` directory but `.env` file is in parent directory. `require('dotenv').config()` looks in current directory by default.

**Fix Applied:**
```javascript
// Before (in src/index.js):
require('dotenv').config();

// After:
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
```

**Result:** Backend can now find and load database credentials from `.env` file

---

### 2. Cowrie Startup Error ❌→✅
**Error:** `FileNotFoundError: [Errno 2] No such file or directory` (twistd not found)

**Root Cause:** Cowrie's `twistd` command is inside the virtual environment (`cowrie-env/bin/twistd`), but the startup command didn't activate the venv first.

**Fix Applied:**
```bash
# Before:
/home/cowrie/cowrie/cowrie-env/bin/cowrie start

# After:
cd ~/cowrie && source cowrie-env/bin/activate && cowrie start
```

**Result:** Virtual environment is activated, making `twistd` and `cowrie` commands available

---

### 3. HTTP & FTP Honeypots Not Starting ❌→✅
**Error:** No HTTP/FTP honeypots visible in dashboard

**Root Cause:** Backend auto-starts HTTP and FTP honeypots, but Backend crashed due to database error. No Backend = No HTTP/FTP.

**Fix:** Once Backend database issue is resolved (fix #1), Backend will successfully:
1. Connect to PostgreSQL
2. Start HTTP honeypot in WSL (port 8080)
3. Start FTP honeypot in WSL (port 2121)
4. Watch logs from both honeypots
5. Display them in dashboard

---

## 🚀 How to Start (3 Methods)

### Method 1: Automated with Checks (RECOMMENDED)
```powershell
.\START_EVERYTHING.ps1
```

This script will:
- ✅ Stop all running services
- ✅ Verify `.env` configuration
- ✅ Test database connection  
- ✅ Start all 4 services in order
- ✅ Verify they're running correctly
- ✅ Show detailed status report

---

### Method 2: Quick Start
```powershell
.\START_SIMPLE.ps1
```

Use this if you know database is working and just want to start quickly.

---

### Method 3: Manual (4 Terminals)

**Terminal 1 - ML Service:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\ml-service
.\venv\Scripts\Activate.ps1
python app.py
```
Expected: `Uvicorn running on http://0.0.0.0:8001`  
(Ignore scikit-learn warnings - non-critical)

**Terminal 2 - Backend API:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\src
node index.js
```
**CRITICAL - Watch for these lines:**
- ✅ `Server running on port 3000`
- ✅ `Multi-honeypot watcher started (2/2 services)`
- ✅ `HTTP Honeypot watcher started`
- ✅ `FTP Honeypot watcher started`

If you see database errors instead, run `.\test-database.ps1` to diagnose.

**Terminal 3 - Frontend:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\frontend
npm run dev
```
Expected: `Local: http://localhost:5173/`

**Terminal 4 - Cowrie SSH:**
```powershell
wsl -d Ubuntu-22.04 -u cowrie
cd cowrie
source cowrie-env/bin/activate
cowrie start
cowrie status
```
Expected: `cowrie is running (PID: XXXXX)`

---

## 🔍 Pre-Flight Check

**BEFORE starting services, test database:**
```powershell
.\test-database.ps1
```

**Expected output:**
```
✅ DATABASE CONNECTION SUCCESSFUL!
PostgreSQL Version: ...
```

**If database test fails:**

1. **Start PostgreSQL service:**
   - Check if running: `Get-Service postgresql*`
   - Start it: `Start-Service postgresql-x64-XX`

2. **Verify credentials match:**
   - Open `.env` file
   - Check `DATABASE_URL=postgresql://honeynet:honeynet123@localhost:5432/honeynet`
   - Password should match your actual PostgreSQL password

3. **Create database if missing:**
   ```powershell
   psql -U postgres -c "CREATE DATABASE honeynet;"
   psql -U postgres -c "CREATE USER honeynet WITH PASSWORD 'honeynet123';"
   psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE honeynet TO honeynet;"
   ```

---

## ✅ Verification Checklist

After starting all services:

### 1. Check All Ports Are Listening
```powershell
netstat -ano | findstr "8001 3000 5173 2222 8080 2121"
```

Expected output:
```
TCP  0.0.0.0:8001   LISTENING  (ML Service)
TCP  0.0.0.0:3000   LISTENING  (Backend)
TCP  [::]:5173      LISTENING  (Frontend)
TCP  0.0.0.0:2222   LISTENING  (Cowrie SSH)
TCP  0.0.0.0:8080   LISTENING  (HTTP Honeypot)
TCP  127.0.0.1:2121 LISTENING  (FTP Honeypot)
```

### 2. Verify Backend Started All Honeypots

**Check Backend terminal output** for these exact lines:
```
✅ Multi-honeypot watcher started (2/2 services)
✅ HTTP Honeypot watcher started
✅ FTP Honeypot watcher started
```

**If these lines are missing:**
- Backend couldn't connect to database
- HTTP and FTP honeypots won't start
- Fix database issue first, then restart Backend

### 3. Open Dashboard
```
http://localhost:5173
```

Should show 3 service status cards:
- SSH (Cowrie)
- HTTP
- FTP

All should show "Active" status.

### 4. Check Honeypot Logs

**Cowrie logs:**
```bash
wsl -d Ubuntu-22.04 -u cowrie -- tail -f ~/cowrie/var/log/cowrie/cowrie.json
```

**HTTP honeypot logs:**
```bash
wsl -d Ubuntu-22.04 -- tail -f /tmp/http_honeypot.json
```

**FTP honeypot logs:**
```bash
wsl -d Ubuntu-22.04 -- tail -f /tmp/ftp_honeypot.json
```

### 5. Test from Another Device

**SSH attacks:**
```bash
ssh root@YOUR_IP -p 2222
# Try passwords: password, admin, root123
```

**HTTP attacks:**
```bash
curl http://YOUR_IP:8080/admin.php
curl http://YOUR_IP:8080/wp-admin/
```

**FTP attacks:**
```bash
ftp YOUR_IP 2121
# Try login: anonymous / password
```

---

## 🛑 How to Stop Everything

1. **Stop Backend** (Ctrl+C in Terminal 2)  
   → This automatically stops HTTP and FTP honeypots

2. **Stop ML Service** (Ctrl+C in Terminal 1)

3. **Stop Frontend** (Ctrl+C in Terminal 3)

4. **Stop Cowrie:**
   ```powershell
   wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie stop"
   ```

---

## ❓ Troubleshooting

### Problem: Backend shows database password error

**Symptoms:**
```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

**Solutions:**
1. Run `.\test-database.ps1` to diagnose
2. Make sure PostgreSQL is running
3. Verify password in `.env` matches your database
4. Check DATABASE_URL format:  
   `postgresql://honeynet:PASSWORD@localhost:5432/honeynet`
5. Restart Backend terminal after fixing

---

### Problem: Cowrie shows FileNotFoundError for twistd

**Symptoms:**
```
FileNotFoundError: [Errno 2] No such file or directory
```

**Solution:**
Must activate virtual environment FIRST:
```bash
cd ~/cowrie
source cowrie-env/bin/activate
cowrie start
```

---

### Problem: HTTP/FTP honeypots not showing in dashboard

**Symptoms:**
- Dashboard shows only SSH service
- No "Multi-honeypot watcher started" in Backend logs

**Root Cause:**
Backend failed to start, so it couldn't launch HTTP/FTP honeypots.

**Solutions:**
1. Check Backend terminal output
2. Should see "Multi-honeypot watcher started (2/2 services)"
3. If missing, Backend crashed (usually database connection issue)
4. Fix database connection
5. Restart Backend terminal
6. Wait 10-20 seconds for honeypots to start
7. Refresh dashboard

---

### Problem: Dashboard shows no attacks

**Solutions:**
1. Honeypots need time to receive attacks from internet
2. Test manually from another device (see verification section)
3. Check if logs are being written:
   ```bash
   ls -lh /home/cowrie/cowrie/var/log/cowrie/cowrie.json
   ls -lh /tmp/http_honeypot.json
   ls -lh /tmp/ftp_honeypot.json
   ```
4. If logs exist but dashboard is empty:
   - Check Backend is watching the correct log paths
   - Verify .env has correct `COWRIE_LOG_PATH`
   - Restart Backend

---

## 📁 Files Modified/Created

### Modified Files:
- ✅ `src/index.js` - Fixed .env path loading
- ✅ `scripts/start-cowrie.sh` - Added venv activation
- ✅ `START_SIMPLE.ps1` - Updated Cowrie command with venv

### New Files:
- ✅ `START_EVERYTHING.ps1` - Comprehensive startup with checks
- ✅ `test-database.ps1` - Database connection tester
- ✅ `COMPLETE_FIX_GUIDE.md` - This document

---

## 🎯 Expected Behavior

When everything starts correctly:

### ML Service (Port 8001)
- Loads TensorFlow models
- Starts FastAPI server
- Provides `/predict` and `/health` endpoints
- ⚠️ Warnings about scikit-learn versions are normal (models still work)

### Backend API (Port 3000)
1. Connects to PostgreSQL database ✅
2. Starts Cowrie log watcher ✅
3. Launches HTTP honeypot in WSL (screen session) ✅
4. Launches FTP honeypot in WSL (screen session) ✅
5. Starts HTTP honeypot log watcher ✅
6. Starts FTP honeypot log watcher ✅
7. Starts API server on port 3000 ✅

### Frontend (Port 5173)
- Starts Vite dev server
- Serves React dashboard
- Connects to Backend API on port 3000

### Cowrie SSH (Port 2222)
- Runs SSH honeypot
- Logs to `/home/cowrie/cowrie/var/log/cowrie/cowrie.json`
- Emulates Linux shell
- Records all attacker commands

### HTTP Honeypot (Port 8080)
- Auto-started by Backend in WSL screen session
- Serves fake admin pages
- Logs to `/tmp/http_honeypot.json`
- Detects attack patterns (SQL injection, path traversal, etc.)

### FTP Honeypot (Port 2121)
- Auto-started by Backend in WSL screen session  
- Accepts any credentials
- Logs to `/tmp/ftp_honeypot.json`
- Records all FTP commands

---

## 🎉 You're Ready!

### Recommended Startup Sequence:

1. **Test Database:**
   ```powershell
   .\test-database.ps1
   ```

2. **Start All Services:**
   ```powershell
   .\START_EVERYTHING.ps1
   ```

3. **Wait 20-30 seconds** for all services to initialize

4. **Open Dashboard:**
   ```
   http://localhost:5173
   ```

5. **Verify 3 service cards** (SSH, HTTP, FTP) all show "Active"

6. **Generate test attacks** from another device

7. **Watch real-time events** appear in dashboard

---

Your complete honeynet with 3 honeypots (SSH + HTTP + FTP) + ML threat classification + dynamic adaptation is now ready! 🚀
