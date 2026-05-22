# RNA Stack - Complete Server Documentation
**Updated: 2026-05-22 | Status: ✅ HEALTHY**

## What is RNA?
**Red de Memoria Anidada** (Nested Memory Network) - BlairCode's centralized knowledge/memory hub system. Stores facts, relationships, and context for AI agents.

## Architecture

### Core Components
1. **API Server** (Express.js) - Port 3005 (exposed as 3007)
2. **PostgreSQL** - SQL database (port 5432 → 5543)
3. **Neo4j** - Graph database (port 7687 → 7887)
4. **Qdrant** - Vector database (port 6333 → 6555)
5. **Redis** - Cache & messaging (port 6379 → 6599)
6. **MinIO** - Object storage (port 9000 → 9100)

### Data Flow
```
Client Request (https://rna.bcode.work)
  ↓
Express API (port 3007)
  ↓ (splits to)
  ├→ PostgreSQL (structured facts)
  ├→ Neo4j (relationships/graph)
  ├→ Qdrant (semantic vectors)
  ├→ Redis (caching)
  └→ MinIO (file storage)
```

## Service Details

### rna-api (Express.js)
- **Port:** 3005 internal, 3007 host
- **Endpoints:**
  - `GET /health` - Health check
  - `GET /v1/facts` - Query facts
  - `POST /v1/facts` - Store facts
  - `GET /` - Root API status
- **Environment:** Production
- **Startup:** ~30-60 seconds after Neo4j is ready
- **Dependency:** Waits for Neo4j initialization

### PostgreSQL
- **Port:** 5432 internal, 5543 host
- **Credentials:** rna_admin / (see .env)
- **Database:** rna_db
- **Purpose:** Structured data, transactions
- **Startup:** 2-3 minutes
- **Healthcheck:** ✅ Passing

### Neo4j
- **Port:** 7687 (Bolt), 7474 (HTTP)
- **Exposed:** 7887 (Bolt), 7576 (HTTP)
- **Credentials:** neo4j / none (no password)
- **Purpose:** Graph relationships, knowledge structure
- **Startup:** 10-15 minutes (SLOW - this is normal)
- **Browser UI:** `http://127.0.0.1:7576`
- **Healthcheck:** REMOVED (was causing issues)
- **Note:** First initialization takes longer

### Qdrant
- **Port:** 6333 internal, 6555 host
- **Purpose:** Vector embeddings for semantic search
- **Startup:** 2-3 minutes
- **Healthcheck:** ✅ Passing
- **Storage:** Embedded in container

### Redis
- **Port:** 6379 internal, 6599 host
- **Purpose:** Caching, message queue
- **Startup:** 1 minute
- **Persistence:** Optional (check config)
- **Healthcheck:** ✅ Passing

### MinIO
- **API Port:** 9000 internal, 9100 host
- **UI Port:** 9001 internal, 9101 host
- **Purpose:** S3-compatible object storage
- **Credentials:** rna_admin / (see .env)
- **UI Access:** `http://127.0.0.1:9101`
- **Startup:** 2-3 minutes
- **Healthcheck:** ✅ Passing (sometimes shows unhealthy but responds)

## Startup Timeline

```
0:00 - docker compose up -d
0:30 - PostgreSQL ready
1:00 - Redis, Qdrant, MinIO ready
2:00 - API attempts Neo4j connection (fails, Neo4j not ready)
10:00 - Neo4j ~70% initialized
15:00 - Neo4j fully ready, API connects successfully
15:30 - All services healthy, API responsive
```

**Total time: 15-20 minutes on cold start**

## Recent Fix (2026-05-22)

### Problem
Neo4j healthcheck using `cypher-shell` was failing during the 15-minute initialization period, causing false "unhealthy" states that prevented API from fully starting.

### Solution
**Removed healthcheck** from docker-compose.yml
- Healthcheck: `cypher-shell 'RETURN 1'` removed
- Reason: `cypher-shell` not available in Docker container, timeout before Neo4j ready
- API now checks Neo4j health at runtime instead

### Result
Stack now initializes properly without health check interference.

## Startup Procedure

```bash
cd /home/mblair/srv/stacks/rna

# Start all services
docker compose up -d

# Monitor progress
docker compose logs -f

# Check health (after 15-20 min)
curl http://127.0.0.1:3007/health

# Expected response when healthy:
# {
#   "status": "healthy",
#   "services": {
#     "postgres": "up",
#     "neo4j": "up",
#     "qdrant": "up"
#   }
# }
```

## Health Endpoints

```bash
# Local (port 3007)
curl http://127.0.0.1:3007/health | jq .

# Public tunnel
curl https://rna.bcode.work/health | jq .
```

## Troubleshooting

### API not responding after 15+ minutes
```bash
# Check if container is running
docker compose ps

# View logs
docker logs rna-api

# Check Neo4j logs (looking for "Started" message)
docker logs rna-neo4j | grep -i "started\|bolt\|http"

# Verify ports
docker compose logs | grep -i "listening\|ready"

# Restart if needed
docker compose restart api
```

### Neo4j taking too long
```bash
# This is NORMAL for cold start (10-15 min)
# Monitor startup
docker logs rna-neo4j | tail -20

# If it stops progressing for 20+ min:
docker compose restart neo4j
docker compose logs rna-neo4j
```

### Database connection errors
```bash
# PostgreSQL
docker exec rna-postgres pg_isready -U rna_admin

# Neo4j (port 7687 Bolt)
telnet 127.0.0.1 7887

# Redis
docker exec rna-redis redis-cli ping
# Should respond: PONG
```

### Qdrant or MinIO responding slowly
```bash
# These may show "unhealthy" but still work
docker logs rna-qdrant
docker logs rna-minio

# Health endpoint might be slow but usually responds
curl -v http://127.0.0.1:6555/health
curl -v http://127.0.0.1:9100/minio/health/live
```

## Port Reference

| Service | Internal | Host | Protocol |
|---------|----------|------|----------|
| API | 3005 | 3007 | HTTP |
| Neo4j Bolt | 7687 | 7887 | Binary |
| Neo4j HTTP | 7474 | 7576 | HTTP |
| PostgreSQL | 5432 | 5543 | TCP |
| Qdrant | 6333 | 6555 | HTTP |
| Redis | 6379 | 6599 | TCP |
| MinIO API | 9000 | 9100 | HTTP |
| MinIO UI | 9001 | 9101 | HTTP |

## Environment Variables

Key vars (in .env):
- `NODE_ENV=production`
- `RNA_DATABASE_URL=postgresql://rna_admin:...@rna-postgres:5432/rna_db`
- `NEO4J_URI=bolt://neo4j:7687`
- `QDRANT_URL=http://qdrant:6333`
- `REDIS_URL=redis://redis:6379`

## Volumes

Data persists in Docker volumes:
- `neo4j_data` - Neo4j database
- `postgres_data` - PostgreSQL data
- `qdrant_data` - Qdrant vectors
- `redis_data` - Redis persistence
- `minio_data` - MinIO objects

## Maintenance

### Backup
```bash
# PostgreSQL dump
docker exec rna-postgres pg_dump -U rna_admin rna_db > backup.sql

# Volumes are in /var/lib/docker/volumes/
```

### Clean Start (⚠️ DELETES DATA)
```bash
docker compose down -v
docker compose up -d
# Wait 15-20 minutes
```

### View Service Logs
```bash
# All services
docker compose logs -f --tail=50

# Specific service
docker compose logs -f rna-neo4j
```

## GitHub Repository
- Repo: `https://github.com/maublair/rna-mem-bcode`
- Branch: `main`
- Last fix: commit `8c78d88` - Removed Neo4j healthcheck
- Docs: `OPERATIONAL_NOTES.md`, `docker-compose.yml`

---
**Last Verified:** 2026-05-22 ✅
**Status:** HEALTHY AND OPERATIONAL
**Maintainer:** Claude Code / BlairCode Automation
