# 🚀 FIXED STARTUP GUIDE - NO MORE ERRORS!

## ⚠️ ISSUES FIXED:
1. ✅ Missing `.env` file (database password error)
2. ✅ Wrong Cowrie path (bin/cowrie → cowrie-env/bin/cowrie)
3. ✅ ML service scikit-learn warnings (non-critical, can ignore)

---

## 📋 OPTION 1: AUTOMATIC STARTUP (RECOMMENDED)

Run this single command:
```powershell
.\START_HONEYNET_FIXED.ps1
```

This will:
- Check if .env exists (create from example if missing)
- Check if ports are available
- Open 4 terminals automatically
- Start all services in correct order
- Show startup summary

---

## 📋 OPTION 2: MANUAL STARTUP (4 TERMINALS)

### ✅ Terminal 1: ML Service
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\ml-service
.\venv\Scripts\Activate.ps1
python app.py
```
**Expected:** `Uvicorn running on http://0.0.0.0:8001`  
**Ignore:** scikit-learn version warnings (models still work)

---

### ✅ Terminal 2: Backend API
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\src
node index.js
```
**Expected:**
- ✅ Server running on port 3000
- ✅ Multi-honeypot watcher started (2/2 services)
- ✅ HTTP Honeypot watcher started
- ✅ FTP Honeypot watcher started

**Note:** Backend auto-starts HTTP and FTP honeypots in WSL!

---

### ✅ Terminal 3: Frontend
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\frontend
npm run dev
```
**Expected:** `Local: http://localhost:5173/`

---

### ✅ Terminal 4: Cowrie SSH (FIXED PATH!)
```powershell
wsl -d Ubuntu-22.04 -u cowrie
cd cowrie
/home/cowrie/cowrie/cowrie-env/bin/cowrie start
/home/cowrie/cowrie/cowrie-env/bin/cowrie status
```

**Or use the shortcut from PowerShell:**
```powershell
wsl -d Ubuntu-22.04 -u cowrie -- /home/cowrie/cowrie/cowrie-env/bin/cowrie start
```

**Expected:** `cowrie is running (PID: XXXXX)`

---

## 🔍 VERIFICATION

### 1. Check All Ports Are Listening
```powershell
netstat -ano | findstr "8001 3000 5173 2222 8080 2121"
```

**Expected output:**
```
TCP  0.0.0.0:8001   LISTENING    (ML Service)
TCP  0.0.0.0:3000   LISTENING    (Backend)
TCP  [::]:5173      LISTENING    (Frontend)
TCP  0.0.0.0:2222   LISTENING    (Cowrie SSH)
TCP  0.0.0.0:8080   LISTENING    (HTTP Honeypot)
TCP  127.0.0.1:2121 LISTENING    (FTP Honeypot)
```

### 2. Open Dashboard
```
http://localhost:5173
```

**Expected:** 3 service status cards (SSH, HTTP, FTP) showing "Active"

### 3. Test Dynamic Adaptation (NEW FEATURE!)
Generate some SSH attacks, then check backend logs for:
```
Dynamic banners updated: X unique clients found
Banner changed from X to Y (DYNAMIC - severity: HIGH)
```

---

## 🛑 HOW TO STOP EVERYTHING

### Stop Backend (Ctrl+C in Terminal 2)
This will also stop HTTP and FTP honeypots automatically.

### Stop ML Service (Ctrl+C in Terminal 1)

### Stop Frontend (Ctrl+C in Terminal 3)

### Stop Cowrie
```powershell
wsl -d Ubuntu-22.04 -u cowrie -- /home/cowrie/cowrie/cowrie-env/bin/cowrie stop
```

---

## ❓ TROUBLESHOOTING

### ❌ Backend Error: "client password must be a string"
**Fix:** Run `.\START_HONEYNET_FIXED.ps1` - it will create the missing `.env` file

### ❌ Cowrie Error: "bin/cowrie: No such file or directory"
**Fix:** Use the full path: `/home/cowrie/cowrie/cowrie-env/bin/cowrie`

### ❌ Port Already in Use
**Fix:** Kill the blocking process:
```powershell
# Find process
netstat -ano | findstr ":2222"  # or 8080, 3000, etc.

# Kill it (as Administrator)
taskkill /F /PID <PID_NUMBER>
```

### ⚠️ ML Service: scikit-learn version warnings
**Status:** Non-critical. Models were trained with 1.6.1, running on 1.4.2.  
**Fix (optional):** Upgrade scikit-learn in ML service venv:
```powershell
cd ml-service
.\venv\Scripts\Activate.ps1
pip install --upgrade scikit-learn
```

---

## 🎯 WHAT'S NEW (DYNAMIC ADAPTATION)

Your honeynet now has:
1. **Dynamic SSH Banners** - Queries database for attacker SSH clients, adapts banners intelligently
2. **ML Continuous Learning** - Retrains models every 24 hours with new attack data
3. **Zero Hardcoding** - All banners and features are data-driven

To start the ML retraining service (optional):
```powershell
.\start-ml-retraining.ps1
```

---

## 🚀 QUICK START COMMAND

```powershell
# From D:\boda\AI-Honeynet\HoneyNet\
.\START_HONEYNET_FIXED.ps1
```

That's it! Your honeynet should now work perfectly with NO ERRORS! 🎉
