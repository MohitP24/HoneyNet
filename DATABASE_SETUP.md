# Database Setup Guide

## Quick Setup (for Phase 2)

This guide provides manual database setup instructions. Full Docker setup will be completed in Phase 4.

### Option 1: Using Docker (Simple)

```bash
# Start PostgreSQL container manually
docker run -d \
  --name honeynet-db \
  -e POSTGRES_USER=honeynet \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=honeynet \
  -p 5432:5432 \
  -v "%cd%\src\database\schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro" \
  postgres:15

# Wait a few seconds for database to initialize

# Verify database is running
docker ps | findstr honeynet-db

# Test connection
psql -h localhost -U honeynet -d honeynet -c "\dt"
# Password: password
```

### Option 2: Using Local PostgreSQL (if already installed)

```bash
# Create database
createdb honeynet
# Or with PS QL:
# psql -U postgres -c "CREATE DATABASE honeynet;"

# Run schema migration
psql -U postgres -d honeynet -f src/database/schema.sql

# Verify tables created
psql -U postgres -d honeynet -c "\dt"
```

### Verify Database Setup

Expected tables after migration:
- `sessions` - Tracks attacker sessions
- `events` - Stores all honeypot events
- `attackers` - Maintains attacker profiles
- `adaptations` - Records adaptive actions

You should see 4 tables plus 4 views.

### Connection Details

```
Host: localhost
Port: 5432
Database: honeynet
User: honeynet  (or postgres)
Password: password
```

### Update .env File

```bash
DATABASE_URL=postgresql://honeynet:password@localhost:5432/honeynet
DB_HOST=localhost
DB_PORT=5432
DB_NAME=honeynet
DB_USER=honeynet
DB_PASSWORD=password
```

### Test Database Connection

```bash
# From project root
cd HoneyNet
npm run migrate
```

This should execute the schema migration successfully.

## Phase 2 Complete ✓

Once you see the 4 tables created, Phase 2 is complete. You can proceed to Phase 3 (Frontend).

## Troubleshooting

**Issue**: `psql: command not found`
- **Solution**: PostgreSQL is not in PATH. Use full path or add to environment variables.

**Issue**: `password authentication failed`
- **Solution**: Check your PostgreSQL user/password. Default is often `postgres/postgres`.

**Issue**: Docker container won't start
- **Solution**: Ensure Docker Desktop is running. Check if port 5432 is already in use.

## Next Steps

After database is set up, proceed to Phase 3: Frontend Dashboard implementation.
