# HONEYNET IMPLEMENTATION GUIDE
Complete step-by-step guide to convert your Honeypot to a full Honeynet

## CURRENT STATUS
✅ Cowrie SSH Honeypot (port 2222) - WORKING
❌ HTTP Honeypot - NOT IMPLEMENTED
❌ FTP Honeypot - NOT IMPLEMENTED  
❌ MySQL Honeypot - NOT IMPLEMENTED
❌ Telnet Honeypot - NOT IMPLEMENTED

## IMPLEMENTATION PHASES

### PHASE 1: Install Additional Honeypots (30 minutes)

#### Step 1.1: Install Dionaea (Multi-Protocol Honeypot)
```powershell
# Copy install script to WSL
wsl -d Ubuntu-22.04 -- bash -c "chmod +x /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/install-dionaea.sh"

# Run installation
wsl -d Ubuntu-22.04 -- bash /mnt/d/boda/AI-Honeynet/HoneyNet/scripts/install-dionaea.sh
```

**What this adds:**
- HTTP server on port 80
- FTP server on port 21
- MySQL server on port 3306
- Telnet server on port 23

#### Step 1.2: Configure Dionaea Logging
```bash
# SSH into WSL
wsl -d Ubuntu-22.04

# Create JSON log output
sudo tee -a /etc/dionaea/services.yaml > /dev/null <<EOF
services:
  - httpd
  - ftpd
  - mysqld
  - telnets

logging:
  - type: json
    filename: /var/log/dionaea/dionaea.json
EOF
```

#### Step 1.3: Start Dionaea
```bash
sudo systemctl enable dionaea
sudo systemctl start dionaea
sudo systemctl status dionaea
```

---

### PHASE 2: Update Database Schema (10 minutes)

#### Step 2.1: Run Migration
```powershell
cd D:\boda\AI-Honeynet\HoneyNet

$env:PGPASSWORD='honeynet123'
psql -h localhost -U honeynet -d honeynet -f src\database\migration_honeynet.sql
```

#### Step 2.2: Verify Tables Created
```powershell
$env:PGPASSWORD='honeynet123'
psql -h localhost -U honeynet -d honeynet -c "\dt"
```

Expected output:
- events (updated with service, protocol columns)
- honeypot_services (new table)
- service_stats (new view)

---

### PHASE 3: Update Backend Code (20 minutes)

#### Step 3.1: Install Dionaea Watcher
Already created: `src/services/dionaeaWatcher.js`

#### Step 3.2: Update src/index.js
Add these lines after cowrie logWatcher:

```javascript
const dionaeaWatcher = require('./services/dionaeaWatcher');

// Start Dionaea watcher
dionaeaWatcher.start().catch(err => {
  logger.warn('Dionaea watcher not started:', err.message);
});
```

#### Step 3.3: Create Services API Route
Create `src/routes/services.js`:

```javascript
const express = require('express');
const db = require('../database/connection');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM honeypot_services 
      ORDER BY port ASC
    `);
    res.json({ services: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

module.exports = router;
```

#### Step 3.4: Register Route in src/routes/index.js
```javascript
const servicesRouter = require('./services');
router.use('/services', servicesRouter);
```

---

### PHASE 4: Update Frontend (15 minutes)

#### Step 4.1: Add Service Status Component
Already created: `frontend/src/components/ServiceStatusGrid.jsx`

#### Step 4.2: Update Dashboard.jsx
Add import:
```javascript
import ServiceStatusGrid from './ServiceStatusGrid';
```

Add component above StatsCards:
```javascript
{/* Service Status */}
<div className="mb-8">
    <ServiceStatusGrid />
</div>
```

---

### PHASE 5: Configure Port Forwarding (5 minutes)

#### Step 5.1: Open Firewall Ports
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Honeynet HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Honeynet FTP" -Direction Inbound -LocalPort 21 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Honeynet MySQL" -Direction Inbound -LocalPort 3306 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Honeynet Telnet" -Direction Inbound -LocalPort 23 -Protocol TCP -Action Allow
```

#### Step 5.2: Create Port Forward Script
Create `setup-honeynet-ports.ps1`:

```powershell
# Requires Administrator
$WSL_IP = (wsl hostname -I).Trim()

Write-Host "WSL IP: $WSL_IP"

# Remove old rules
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=21 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=3306 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=23 listenaddress=0.0.0.0

# Add new rules
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=$WSL_IP
netsh interface portproxy add v4tov4 listenport=21 listenaddress=0.0.0.0 connectport=21 connectaddress=$WSL_IP
netsh interface portproxy add v4tov4 listenport=3306 listenaddress=0.0.0.0 connectport=3306 connectaddress=$WSL_IP
netsh interface portproxy add v4tov4 listenport=23 listenaddress=0.0.0.0 connectport=23 connectaddress=$WSL_IP

Write-Host "✅ Honeynet port forwarding configured!"
netsh interface portproxy show all
```

Run as admin:
```powershell
.\setup-honeynet-ports.ps1
```

---

### PHASE 6: Testing (10 minutes)

#### Test Each Service:

**1. SSH (Cowrie) - Port 2222**
```bash
ssh -p 2222 root@192.168.1.3
```

**2. HTTP - Port 80**
```bash
curl http://192.168.1.3/
```

**3. FTP - Port 21**
```bash
ftp 192.168.1.3
```

**4. Telnet - Port 23**
```bash
telnet 192.168.1.3
```

**5. MySQL - Port 3306**
```bash
mysql -h 192.168.1.3 -u root -p
```

#### Verify in Dashboard:
- Open http://localhost:5173
- Check "Honeynet Services Status" section
- All 5 services should show "● ACTIVE"
- Each attack should appear in "Recent Events" with service label

---

## STARTUP SEQUENCE FOR HONEYNET

### Terminal 1: Cowrie
```powershell
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && twistd --umask=0022 --pidfile var/run/cowrie.pid --logger cowrie.python.logfile.logger cowrie"
```

### Terminal 2: Dionaea
```powershell
wsl -d Ubuntu-22.04 -- sudo systemctl start dionaea
```

### Terminal 3: ML Service
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\ml-service
& .\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001
```

### Terminal 4: Backend
```powershell
cd D:\boda\AI-Honeynet\HoneyNet
npm start
```

### Terminal 5: Frontend
```powershell
cd D:\boda\AI-Honeynet\HoneyNet\frontend
npm run dev
```

### Terminal 6 (Admin): Port Forwarding
```powershell
.\setup-honeynet-ports.ps1
```

---

## EXPECTED RESULTS

### Dashboard Should Show:
```
🍯 Honeynet Services Status
┌──────────┬──────┬──────┬───────┬─────────┐
│ 🔐 SSH   │ 🌐 HTTP │ 📁 FTP │ 🗄️ MySQL │ 📟 Telnet │
│ Port 2222│ Port 80│ Port 21│ Port 3306│ Port 23  │
│ ● ACTIVE │ ● ACTIVE│ ● ACTIVE│ ● ACTIVE │ ● ACTIVE │
└──────────┴──────┴──────┴───────┴─────────┘
```

### Events Table:
```
Recent Events
─────────────────────────────────────────
HIGH | 192.168.1.5 | HTTP | GET /admin.php
HIGH | 172.26.16.1 | SSH  | wget malware.sh
MED  | 10.0.0.15   | FTP  | USER anonymous
LOW  | 192.168.1.8 | MySQL| SELECT * FROM users
```

---

## BENEFITS OF HONEYNET vs HONEYPOT

### Single Honeypot (Current):
- Captures only SSH attacks
- Limited attack surface
- Easy to detect (only 1 port open)

### Full Honeynet (After Implementation):
- Captures HTTP, FTP, MySQL, Telnet, SSH attacks
- Realistic attack surface (like real server)
- More data for ML training
- Better for research/demo
- Harder for attackers to detect

---

## TIMELINE

| Phase | Time | Difficulty |
|-------|------|------------|
| Install Dionaea | 30 min | Medium |
| Update Database | 10 min | Easy |
| Update Backend | 20 min | Medium |
| Update Frontend | 15 min | Easy |
| Port Forwarding | 5 min | Easy |
| Testing | 10 min | Easy |
| **TOTAL** | **90 min** | **Medium** |

---

## NEXT STEPS

1. ✅ Read this guide completely
2. ⏳ Execute Phase 1 (Install Dionaea)
3. ⏳ Execute Phase 2 (Database migration)
4. ⏳ Execute Phase 3 (Backend updates)
5. ⏳ Execute Phase 4 (Frontend updates)
6. ⏳ Execute Phase 5 (Port forwarding)
7. ⏳ Execute Phase 6 (Testing)
8. 🎉 Demo as full HONEYNET

---

## QUESTIONS?

Ask me:
- "Start Phase 1" - I'll guide you through Dionaea installation
- "Show me the changes" - I'll show what files were created
- "Test the honeynet" - I'll help you verify everything works
- "Explain [topic]" - I'll clarify any confusion
