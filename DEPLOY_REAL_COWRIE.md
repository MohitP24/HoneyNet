# 🍯 Deploy Real Cowrie Honeypot - Quick Guide

## Option 1: Docker (Recommended - Easiest)

### Step 1: Install Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop/
2. Install and restart your computer
3. Start Docker Desktop

### Step 2: Create Cowrie Directory
```powershell
mkdir C:\cowrie-data
mkdir C:\cowrie-data\logs
mkdir C:\cowrie-data\downloads
```

### Step 3: Run Cowrie in Docker
```powershell
docker run -d \
  --name cowrie \
  -p 2222:2222 \
  -p 2223:2223 \
  -v C:\cowrie-data\logs:/cowrie/var/log/cowrie \
  -v C:\cowrie-data\downloads:/cowrie/var/lib/cowrie/downloads \
  cowrie/cowrie:latest
```

### Step 4: Update Your .env File
Change this line in `HoneyNet\.env`:
```properties
# FROM:
COWRIE_LOG_PATH=./mock-data/cowrie.json

# TO:
COWRIE_LOG_PATH=C:/cowrie-data/logs/cowrie.json
```

### Step 5: Restart Backend
The log watcher will automatically start monitoring the real Cowrie logs!

### Step 6: Test It!
Try to SSH to your honeypot:
```powershell
ssh -p 2222 root@localhost
# Password: any password works!
```

---

## Option 2: WSL2 + Ubuntu (More Realistic)

### Step 1: Install WSL2
```powershell
wsl --install -d Ubuntu-22.04
```

### Step 2: Install Cowrie in Ubuntu
```bash
# Inside WSL Ubuntu
sudo apt update
sudo apt install -y git python3-virtualenv libssl-dev libffi-dev build-essential

# Create cowrie user
sudo adduser --disabled-password cowrie
sudo su - cowrie

# Clone Cowrie
git clone https://github.com/cowrie/cowrie.git
cd cowrie

# Setup virtualenv
python3 -m virtualenv cowrie-env
source cowrie-env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configure Cowrie
cp etc/cowrie.cfg.dist etc/cowrie.cfg
nano etc/cowrie.cfg  # Configure as needed

# Start Cowrie
bin/cowrie start
```

### Step 3: Configure Log Path
In WSL, find the log path:
```bash
ls -la /home/cowrie/cowrie/var/log/cowrie/cowrie.json
```

Mount it to Windows:
```powershell
# In Windows, access WSL path:
\\wsl$\Ubuntu-22.04\home\cowrie\cowrie\var\log\cowrie\cowrie.json
```

Update `.env`:
```properties
COWRIE_LOG_PATH=//wsl$/Ubuntu-22.04/home/cowrie/cowrie/var/log/cowrie/cowrie.json
```

---

## 🌍 Expose to Internet (DANGEROUS - Only for Testing!)

⚠️ **WARNING**: This will expose your honeypot to real attackers. Do this on a dedicated VM or cloud instance!

### Using ngrok (Free Tunnel)
```powershell
# Download ngrok: https://ngrok.com/download
ngrok tcp 2222
```

This gives you a public URL like: `tcp://0.tcp.ngrok.io:12345`

Attackers can now SSH to this URL and you'll capture their attacks!

---

## 🔥 What Happens Next?

Once Cowrie is running and exposed:

1. **Automated Attacks Start** within hours
2. **Your Dashboard Shows**:
   - Real attacker IPs from China, Russia, Iran, North Korea
   - Brute force login attempts
   - Malware downloads (crypto miners, botnets, ransomware)
   - Post-exploitation commands
   - GeoIP locations of attackers

3. **AI System Responds**:
   - ML model scores each attack
   - High-severity events trigger adaptations
   - Automated defenses activate
   - Real-time dashboard updates

---

## 📊 Expected Attack Volume

- **First Hour**: 5-10 scans
- **First Day**: 50-200 login attempts
- **First Week**: 500+ attacks from 20+ countries
- **First Month**: Thousands of attacks, dozens of malware samples

---

## 🛡️ Safety Tips

✅ **DO**:
- Run on isolated VM/container
- Monitor disk space (logs grow fast!)
- Keep logs backed up
- Review attacks regularly

❌ **DON'T**:
- Expose your main machine
- Use real passwords
- Store sensitive data on honeypot
- Forward to production SSH (port 22)

---

## 🎯 Quick Test Commands

```powershell
# Check if Cowrie is running
docker ps | findstr cowrie

# View live logs
docker logs -f cowrie

# Check database for new attacks
$env:PGPASSWORD='honeynet123'
psql -U honeynet -d honeynet -h localhost -c "SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '1 hour';"

# View latest attackers
psql -U honeynet -d honeynet -h localhost -c "SELECT DISTINCT source_ip, geo_country FROM events ORDER BY timestamp DESC LIMIT 10;"
```

---

## 🚨 Emergency Stop

```powershell
# Stop Cowrie immediately
docker stop cowrie

# Or in WSL
sudo su - cowrie
cd cowrie
bin/cowrie stop
```

---

## Next Steps

1. Choose your deployment method (Docker recommended)
2. Follow the steps above
3. Update `.env` with real log path
4. Restart backend: `npm run dev`
5. Watch your dashboard fill with REAL attacks!

**You're now running a real honeypot! 🍯**
