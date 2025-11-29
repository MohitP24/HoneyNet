# AI-HONEYNET Deployment Guide

This guide details how to deploy the full AI-HONEYNET system in a production environment.

## Architecture

The system consists of 4 Docker containers:
1. **Frontend**: React dashboard (Port 3001/80)
2. **Backend**: Node.js API (Port 3000)
3. **ML Service**: Python Flask API (Port 8001)
4. **Database**: PostgreSQL 15 (Port 5432)

## Prerequisites

- Docker & Docker Compose installed
- 4GB+ RAM
- 10GB+ Disk Space

## Deployment Steps

### 1. Clone & Configure

```bash
git clone <repository-url>
cd HoneyNet
cp .env.example .env
```

Edit `.env` with secure passwords and configuration:
```ini
DB_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret
```

### 2. Build & Start

```bash
docker compose build
docker compose up -d
```

### 3. Verify Deployment

Check service health:
```bash
docker compose ps
```
All services should be `healthy` or `running`.

### 4. Access Dashboard

Open `http://localhost:3001` (or your server IP) in a browser.

## Production Considerations

### Security
- **Firewall**: Restrict access to ports 3000, 5432, and 8001. Only expose 3001 (Frontend) and SSH (for management).
- **SSL/TLS**: Use a reverse proxy (Nginx/Traefik) to serve the frontend over HTTPS.
- **Passwords**: Change all default passwords in `docker-compose.yml` and `.env`.

### Data Persistence
- Database data is persisted in the `postgres-data` Docker volume.
- To back up:
  ```bash
  docker run --rm -v honeynet_postgres-data:/volume -v $(pwd):/backup alpine tar -czf /backup/db_backup.tar.gz /volume
  ```

### Scaling
- The **ML Service** can be scaled horizontally if load increases.
- The **Backend** is stateless and can also be scaled.

## Troubleshooting

**Logs**:
```bash
docker compose logs -f backend
docker compose logs -f ml-service
```

**Database Connection Issues**:
- Ensure `DB_HOST` is set to `database` (service name) in `.env`.
- Check if PostgreSQL container is healthy.

**ML Service Issues**:
- If models fail to load, ensure `train.py` ran successfully during build.
- Check memory usage (`docker stats`).
