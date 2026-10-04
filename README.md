# HoneyNet

AI-driven adaptive honeynet: decoy SSH/HTTP/FTP services feed events into a Node.js controller, an ML classifier, PostgreSQL, and a React dashboard.

Application code under `src/`, `frontend/`, `ml-service/`, and `honeypots/` is unchanged. This cleanup only removed leftover docs, duplicate start scripts, and the unused `ai_honeynet_inference` copy of the ML service.

## Layout

```
HoneyNet/
├── start.ps1                      # Start ML + backend + dashboard
├── docker-compose.yml             # Postgres, ML, backend, frontend
├── docker-compose-honeypots.yml   # Isolated HTTP/FTP honeypot containers
├── src/                           # Node.js API and log watchers
├── frontend/                      # Vite + React dashboard
├── ml-service/                    # FastAPI threat scoring (port 8001)
├── honeypots/                     # HTTP/FTP/Telnet decoys and Docker builds
├── mock-data/                     # Sample Cowrie JSON for local/Docker use
├── scripts/                       # Cowrie install, WSL helpers, Docker honeypots
└── .env.example                   # Copy to .env and set credentials
```

## Prerequisites

- Node.js 16+ and npm
- Python 3.10+ (for the ML service)
- PostgreSQL 15 (local) **or** Docker Desktop
- Optional: WSL Ubuntu 22.04 for Cowrie and the Python HTTP/FTP decoys

## First-time setup

1. Copy environment config and set a real database password:

```powershell
cd HoneyNet
copy .env.example .env
```

Edit `.env`: `DB_*` / `DATABASE_URL` must match PostgreSQL. For local Vite, keep `CORS_ORIGIN=http://localhost:5173`. Cowrie log path on Windows typically looks like:

`COWRIE_LOG_PATH=\\wsl$\Ubuntu-22.04\home\cowrie\cowrie\var\log\cowrie\cowrie.json`

2. Install Node dependencies:

```powershell
npm install
cd frontend
npm install
cd ..
```

3. Create a Python venv for ML (from `HoneyNet`):

```powershell
cd ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

Trained files must exist in `ml-service/model/` (`isolation_forest_model.pkl`, `autoencoder_model_colab.keras`, scalers).

4. Create the database schema. Either:

```powershell
docker compose up -d database
npm run migrate
```

or point `.env` at an existing Postgres instance named `honeynet` and run `npm run migrate`.

5. Optional Cowrie (SSH decoy on port 2222), once, inside WSL:

```bash
bash scripts/install-cowrie-wsl.sh
```

If Cowrie should be reachable from other machines on your LAN, run `scripts/setup-wsl-port-forward.ps1` in an elevated PowerShell.

## Run (development — usual path)

From `HoneyNet`:

```powershell
.\start.ps1
```

That opens three windows: ML (`8001`), backend (`3000`), dashboard (`5173`). You can also start them yourself:

```powershell
# Terminal 1 — ML
cd ml-service
.\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001

# Terminal 2 — API
npm start

# Terminal 3 — UI
cd frontend
npm run dev
```

Open **http://localhost:5173**. Health check: **http://localhost:3000/health**.

Optional decoys (same Wi-Fi / local only):

- HTTP/FTP Python honeypots: `start.ps1` prompts, or `wsl` + `scripts/start-all-honeypots.sh`
- Docker HTTP/FTP: `.\scripts\start-docker-honeypots.ps1` (Docker Desktop must be running)
- Cowrie: `wsl -d Ubuntu-22.04 -u cowrie -- bash scripts/start-cowrie.sh` if that script is copied into the Cowrie home, or:

```bash
wsl -d Ubuntu-22.04 -u cowrie -- bash -c "cd ~/cowrie && source cowrie-env/bin/activate && cowrie start"
```

Firewall helper (Administrator): `.\scripts\setup-firewall-secure.ps1`

## Run (full Docker stack)

From `HoneyNet`, with Docker Desktop running:

```powershell
docker compose up --build
```

- API: http://localhost:3000  
- Dashboard: http://localhost:3001  
- ML: http://localhost:8001  

Set `.env` / compose `CORS_ORIGIN` to `http://localhost:3001` if you use this mode. This stack does not replace Cowrie in WSL; SSH decoy is still started separately if you need it.

Stop: `docker compose down`

## Ports

| Service | Port |
| --- | --- |
| Backend API | 3000 |
| Dashboard (Vite) | 5173 |
| Dashboard (Docker nginx) | 3001 |
| ML service | 8001 |
| Postgres | 5432 |
| Cowrie SSH | 2222 |
| HTTP honeypot | 8080 |
| FTP honeypot | 2121 |

## Notes

- Do not expose these ports to the public internet. Honeypots are for isolated lab or tightly firewalled research networks.
- Logs write under `logs/`. Backend tails Cowrie JSON plus WSL paths `/tmp/http_honeypot.json` and `/tmp/ftp_honeypot.json` for the Python decoys.
- `ENABLE_AUTO_ADAPTATION` and optional webhooks/API keys in `.env` stay off unless you configure them.
