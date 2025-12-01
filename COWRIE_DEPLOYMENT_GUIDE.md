# 🍯 Cowrie Honeypot Deployment Guide for AI-HONEYNET

**Complete step-by-step guide to deploy a real Cowrie SSH/Telnet honeypot and connect it to your AI-HONEYNET system.**

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker - Recommended)](#quick-start-docker---recommended)
3. [Manual Installation (Ubuntu/Debian)](#manual-installation-ubuntudebian)
4. [Integration with AI-HONEYNET](#integration-with-ai-honeynet)
5. [Testing & Verification](#testing--verification)
6. [Security & Best Practices](#security--best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Linux server** (Ubuntu 20.04+ or Debian 11+ recommended) OR Windows with WSL2/Docker
- **2GB RAM minimum** (4GB recommended)
- **10GB disk space**
- **Open ports**: 22 (SSH), 23 (Telnet) - or alternative ports like 2222/2223
- **Python 3.8+** (for manual installation)
- **Docker** (for Docker installation)

### Network Requirements
- Static IP or dynamic DNS (for internet-facing honeypot)
- Port forwarding configured on your router (if behind NAT)
- **WARNING**: Only expose honeypot on isolated/virtual networks for safety

---

## Quick Start (Docker - Recommended)

### Step 1: Install Docker (if not already installed)

**On Ubuntu/Debian:**
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
```

**On Windows:**
- Install Docker Desktop: https://www.docker.com/products/docker-desktop/
- Enable WSL2 integration

### Step 2: Create Cowrie Directories

```bash
# Create directory for Cowrie logs
mkdir -p ~/cowrie-data/logs
mkdir -p ~/cowrie-data/downloads

# Set permissions
chmod -R 755 ~/cowrie-data
```

### Step 3: Run Cowrie Container

```bash
# Pull the official Cowrie image
docker pull cowrie/cowrie:latest

# Run Cowrie with persistent storage
docker run -d \
  --name cowrie-honeypot \
  --restart unless-stopped \
  -p 2222:2222/tcp \
  -p 2223:2223/tcp \
  -v ~/cowrie-data/logs:/cowrie/var/log/cowrie \
  -v ~/cowrie-data/downloads:/cowrie/var/lib/cowrie/downloads \
  cowrie/cowrie:latest

# Verify container is running
docker ps | grep cowrie
```

### Step 4: Verify JSON Logging

```bash
# Wait a few seconds, then check if log file exists
ls -lh ~/cowrie-data/logs/

# You should see: cowrie.json

# Monitor logs in real-time
tail -f ~/cowrie-data/logs/cowrie.json
```

### Step 5: (Optional) Forward Standard Ports

**⚠️ WARNING**: This makes your honeypot publicly accessible on standard SSH/Telnet ports. Only do this on dedicated honeypot servers!

```bash
# Forward port 22 → 2222 (SSH)
sudo iptables -t nat -A PREROUTING -p tcp --dport 22 -j REDIRECT --to-port 2222

# Forward port 23 → 2223 (Telnet)  
sudo iptables -t nat -A PREROUTING -p tcp --dport 23 -j REDIRECT --to-port 2223

# Save iptables rules (Ubuntu/Debian)
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

---

## Manual Installation (Ubuntu/Debian)

### Step 1: Create Dedicated User

```bash
# Create cowrie user (no login shell for security)
sudo adduser --disabled-password --gecos "" cowrie
sudo su - cowrie
```

### Step 2: Install Dependencies

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y git python3 python3-venv python3-pip \
  libssl-dev libffi-dev build-essential \
  libpython3-dev python3-minimal authbind virtualenv

# Install Rust (needed for some dependencies)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Step 3: Download Cowrie

```bash
# Clone Cowrie repository
cd /home/cowrie
git clone https://github.com/cowrie/cowrie.git
cd cowrie
```

### Step 4: Create Virtual Environment

```bash
# Create Python virtual environment
python3 -m venv cowrie-env

# Activate virtual environment
source cowrie-env/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install Cowrie dependencies
pip install --upgrade -r requirements.txt
```

### Step 5: Configure Cowrie

```bash
# Copy default config
cp etc/cowrie.cfg.dist etc/cowrie.cfg

# Edit configuration (optional customization)
nano etc/cowrie.cfg
```

**Key Configuration Settings** (already enabled by default):
```ini
[honeypot]
hostname = server01
log_path = var/log/cowrie
download_path = var/lib/cowrie/downloads

[output_jsonlog]
enabled = true
logfile = var/log/cowrie/cowrie.json
```

### Step 6: Configure Port Binding

**Option A: Use ports 2222/2223 (no special permissions needed)**
- Already configured by default
- Recommended for testing

**Option B: Use standard ports 22/23 (requires authbind)**
```bash
# Install authbind
sudo apt install authbind

# Create authbind permissions for port 22
sudo touch /etc/authbind/byport/22
sudo chmod 777 /etc/authbind/byport/22

# Create authbind permissions for port 23
sudo touch /etc/authbind/byport/23
sudo chmod 777 /etc/authbind/byport/23

# Edit cowrie.cfg
nano etc/cowrie.cfg
```

Change these lines:
```ini
[ssh]
listen_endpoints = tcp:22:interface=0.0.0.0

[telnet]
listen_endpoints = tcp:23:interface=0.0.0.0
```

### Step 7: Start Cowrie

```bash
# Make sure you're in cowrie directory and venv is activated
cd /home/cowrie/cowrie
source cowrie-env/bin/activate

# Start Cowrie
bin/cowrie start

# Check status
bin/cowrie status

# View logs
tail -f var/log/cowrie/cowrie.json
```

### Step 8: Create Systemd Service (Auto-start)

```bash
# Exit cowrie user
exit

# Create systemd service file
sudo nano /etc/systemd/system/cowrie.service
```

**Paste this content:**
```ini
[Unit]
Description=Cowrie SSH/Telnet Honeypot
After=network.target

[Service]
Type=forking
User=cowrie
Group=cowrie
WorkingDirectory=/home/cowrie/cowrie
ExecStart=/home/cowrie/cowrie/bin/cowrie start
ExecStop=/home/cowrie/cowrie/bin/cowrie stop
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable cowrie
sudo systemctl start cowrie
sudo systemctl status cowrie
```

---

## Integration with AI-HONEYNET

### Option 1: Same Server (Simple File Path)

If Cowrie and AI-HONEYNET backend are on the same server:

1. **Find Cowrie log path:**
   - Docker: `~/cowrie-data/logs/cowrie.json`
   - Manual: `/home/cowrie/cowrie/var/log/cowrie/cowrie.json`

2. **Update `.env` file:**
   ```bash
   cd d:\boda\AI-Honeynet\HoneyNet
   nano .env
   ```

   Change:
   ```env
   COWRIE_LOG_PATH=./mock-data/cowrie.json
   ```

   To (for Docker):
   ```env
   COWRIE_LOG_PATH=/home/YOUR_USERNAME/cowrie-data/logs/cowrie.json
   ```

   Or (for Manual):
   ```env
   COWRIE_LOG_PATH=/home/cowrie/cowrie/var/log/cowrie/cowrie.json
   ```

3. **Set permissions:**
   ```bash
   # Docker installation
   chmod 644 ~/cowrie-data/logs/cowrie.json
   
   # Manual installation
   sudo chmod 644 /home/cowrie/cowrie/var/log/cowrie/cowrie.json
   ```

4. **Restart backend:**
   ```powershell
   # In your AI-Honeynet terminal
   # Press Ctrl+C to stop backend
   # Then restart:
   cd "d:\boda\AI-Honeynet\HoneyNet"
   npm start
   ```

### Option 2: Different Servers (Network Mount)

If Cowrie is on a different server:

**On Cowrie Server:**
```bash
# Install NFS server
sudo apt install nfs-kernel-server

# Create export directory
sudo mkdir -p /export/cowrie-logs
sudo chmod 755 /export/cowrie-logs

# Create bind mount
sudo mount --bind ~/cowrie-data/logs /export/cowrie-logs

# Make permanent in /etc/fstab
echo "/home/$USER/cowrie-data/logs /export/cowrie-logs none bind 0 0" | sudo tee -a /etc/fstab

# Configure NFS export
echo "/export/cowrie-logs YOUR_BACKEND_SERVER_IP(ro,sync,no_subtree_check)" | sudo tee -a /etc/exports

# Restart NFS
sudo exportfs -a
sudo systemctl restart nfs-kernel-server
```

**On AI-HONEYNET Backend Server:**
```bash
# Install NFS client
sudo apt install nfs-common

# Create mount point
sudo mkdir -p /mnt/cowrie-logs

# Mount NFS share
sudo mount COWRIE_SERVER_IP:/export/cowrie-logs /mnt/cowrie-logs

# Make permanent
echo "COWRIE_SERVER_IP:/export/cowrie-logs /mnt/cowrie-logs nfs defaults 0 0" | sudo tee -a /etc/fstab

# Update .env
COWRIE_LOG_PATH=/mnt/cowrie-logs/cowrie.json
```

### Option 3: Windows (WSL/Network Share)

**If Cowrie runs in WSL on Windows:**

1. **Find WSL path from Windows:**
   ```powershell
   # WSL paths are accessible at:
   \\wsl$\Ubuntu\home\YOUR_USERNAME\cowrie-data\logs\cowrie.json
   ```

2. **Update `.env` with Windows path:**
   ```env
   COWRIE_LOG_PATH=\\wsl$\Ubuntu\home\YOUR_USERNAME\cowrie-data\logs\cowrie.json
   ```

   Or convert to Windows path:
   ```env
   COWRIE_LOG_PATH=C:\Users\YOUR_USERNAME\AppData\Local\Packages\CanonicalGroupLimited.Ubuntu_XXX\LocalState\rootfs\home\YOUR_USERNAME\cowrie-data\logs\cowrie.json
   ```

---

## Testing & Verification

### Step 1: Test Cowrie Connectivity

```bash
# Test SSH (from another machine or terminal)
ssh -p 2222 root@YOUR_SERVER_IP
# Try password: password123

# Or telnet
telnet YOUR_SERVER_IP 2223
```

### Step 2: Simulate Attack Activity

```bash
# Connect via SSH
ssh -p 2222 root@localhost

# Run some commands
whoami
ls -la
cat /etc/passwd
wget http://example.com/fakefile
curl http://malicious-site.com
exit
```

### Step 3: Verify Log Generation

```bash
# Check log file is being written
tail -f ~/cowrie-data/logs/cowrie.json

# You should see JSON events like:
# {"eventid":"cowrie.session.connect","src_ip":"192.168.1.100",...}
# {"eventid":"cowrie.login.success","username":"root",...}
# {"eventid":"cowrie.command.input","input":"ls -la",...}
```

### Step 4: Verify AI-HONEYNET Integration

1. **Check backend logs:**
   ```powershell
   # Backend should show:
   # [info]: Received event - type: cowrie.login.success, ip: 192.168.1.100
   ```

2. **Open dashboard:**
   ```
   http://localhost:5173
   ```

3. **Verify data appears:**
   - **Events Table**: Should show your test SSH session
   - **Attackers Table**: Should show your source IP
   - **Stats Cards**: Should increment from 0
   - **ML Analysis**: Should show threat severity scores

---

## Security & Best Practices

### 🔒 Critical Security Rules

1. **NEVER run honeypot on your main network**
   - Use dedicated VLAN or separate physical network
   - Use cloud VPS/EC2 instance (DigitalOcean, AWS, Azure)

2. **Firewall Configuration**
   ```bash
   # Block outbound connections to prevent honeypot being used for attacks
   sudo iptables -A OUTPUT -p tcp --dport 22 -m owner --uid-owner cowrie -j DROP
   sudo iptables -A OUTPUT -p tcp --dport 23 -m owner --uid-owner cowrie -j DROP
   ```

3. **Monitor Resource Usage**
   ```bash
   # Set resource limits
   sudo nano /etc/systemd/system/cowrie.service
   ```
   Add:
   ```ini
   [Service]
   CPUQuota=50%
   MemoryLimit=1G
   ```

4. **Regular Updates**
   ```bash
   # Update Cowrie weekly
   cd /home/cowrie/cowrie
   git pull
   source cowrie-env/bin/activate
   pip install --upgrade -r requirements.txt
   bin/cowrie restart
   ```

5. **Backup Logs**
   ```bash
   # Rotate logs daily
   sudo nano /etc/logrotate.d/cowrie
   ```
   ```
   /home/cowrie/cowrie/var/log/cowrie/cowrie.json {
       daily
       rotate 30
       compress
       delaycompress
       notifempty
       create 644 cowrie cowrie
   }
   ```

### 🌐 Cloud Deployment Recommendations

**Best Free/Cheap VPS Providers for Honeypots:**
- **Oracle Cloud** - Always Free tier (ARM instances)
- **Google Cloud** - $300 free credit
- **AWS** - 12 months free tier (t2.micro)
- **DigitalOcean** - $200 free credit
- **Vultr** - $100 free credit

**Recommended Setup:**
- **1 vCPU, 1GB RAM** - Sufficient for Cowrie
- **Ubuntu 22.04 LTS** - Best compatibility
- **20GB disk** - Adequate for logs
- **Firewall**: Only open 22, 23, 80, 443

---

## Troubleshooting

### Issue: Cowrie won't start

```bash
# Check logs
docker logs cowrie-honeypot
# Or for manual:
cat /home/cowrie/cowrie/var/log/cowrie/cowrie.log

# Common fixes:
# 1. Port already in use
sudo lsof -i :2222
sudo kill -9 PID

# 2. Permission errors
sudo chown -R cowrie:cowrie /home/cowrie/cowrie
chmod +x /home/cowrie/cowrie/bin/cowrie

# 3. Python dependencies
source /home/cowrie/cowrie/cowrie-env/bin/activate
pip install --upgrade -r requirements.txt
```

### Issue: No JSON logs generated

```bash
# Verify JSON output is enabled
cat /home/cowrie/cowrie/etc/cowrie.cfg | grep -A5 "output_jsonlog"

# Should show:
# [output_jsonlog]
# enabled = true

# Force recreation of log file
rm ~/cowrie-data/logs/cowrie.json
docker restart cowrie-honeypot
```

### Issue: AI-HONEYNET not receiving events

```bash
# Check file permissions
ls -l ~/cowrie-data/logs/cowrie.json
# Should be readable (644 or 666)

# Check file path in .env
cat d:/boda/AI-Honeynet/HoneyNet/.env | grep COWRIE_LOG_PATH

# Check backend logs
# Should show: "Starting log watcher on: /path/to/cowrie.json"

# Test file watching
tail -f ~/cowrie-data/logs/cowrie.json
# Then trigger an event (SSH connection)
```

### Issue: "Too many open files" error

```bash
# Increase file descriptor limits
sudo nano /etc/security/limits.conf

# Add:
cowrie soft nofile 65536
cowrie hard nofile 65536

# Reboot or restart cowrie
sudo systemctl restart cowrie
```

---

## Quick Reference Commands

```bash
# Docker Commands
docker start cowrie-honeypot          # Start container
docker stop cowrie-honeypot           # Stop container  
docker restart cowrie-honeypot        # Restart container
docker logs -f cowrie-honeypot        # View container logs
docker exec -it cowrie-honeypot bash  # Enter container shell

# Manual Installation Commands
sudo systemctl start cowrie           # Start service
sudo systemctl stop cowrie            # Stop service
sudo systemctl restart cowrie         # Restart service
sudo systemctl status cowrie          # Check status
tail -f /home/cowrie/cowrie/var/log/cowrie/cowrie.json  # Monitor logs

# Log Monitoring
tail -f ~/cowrie-data/logs/cowrie.json                    # Docker
tail -f /home/cowrie/cowrie/var/log/cowrie/cowrie.json    # Manual
grep "cowrie.login.success" cowrie.json                   # Filter successful logins
grep "cowrie.command.input" cowrie.json                   # Filter commands

# Statistics
wc -l cowrie.json                     # Count total events
grep -c "login.success" cowrie.json   # Count successful logins
grep -o '"src_ip":"[^"]*"' cowrie.json | sort -u  # Unique IPs
```

---

## Next Steps

Once Cowrie is running and integrated:

1. **Let it run for 24 hours** - Real attackers will find it
2. **Monitor the dashboard** - Watch events appear in real-time
3. **Analyze patterns** - ML service will identify attack campaigns
4. **Enable adaptations** - System will automatically adjust defenses
5. **Export threat intel** - Use STIX/MISP export for sharing

**Congratulations! Your AI-HONEYNET is now capturing real-world attacks! 🎉**

---

## Support

- **Cowrie Documentation**: https://cowrie.readthedocs.io/
- **Cowrie GitHub**: https://github.com/cowrie/cowrie
- **AI-HONEYNET Issues**: Check `ERRORS_RESOLVED.md`

