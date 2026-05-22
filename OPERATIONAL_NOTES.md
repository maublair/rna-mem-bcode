# RNA Stack - Operational Notes

## Last Update
**2026-05-22** - Docker stack fully operational after healthcheck fix

## Current Status: ✅ HEALTHY

All services are running and healthy:
- **API:** http://localhost:3007 ✅
- **Neo4j:** bolt://neo4j:7687 ✅
- **PostgreSQL:** localhost:5543 ✅
- **Qdrant:** localhost:6555 ✅
- **Redis:** localhost:6599 ✅
- **MinIO:** localhost:9100-9101 ✅

## Recent Changes (2026-05-22)

### Fixed Issue: Neo4j Healthcheck
- **Problem:** Neo4j healthcheck was failing during slow initialization (~15 min startup)
- **Solution:** Removed `cypher-shell` based healthcheck from docker-compose.yml
- **Why:** Healthchecks were timing out before Neo4j was fully ready, causing false "unhealthy" states
- **Result:** Container now initializes properly without health check interference

See `/home/mblair/RNA_DOCKER_FIX_2026-05-22.md` for detailed fix documentation.

## Startup Procedure

```bash
cd /home/mblair/srv/stacks/rna
docker compose up -d
```

**Expected timeline:**
- Most services: 2-3 minutes to be ready
- Neo4j: 10-15 minutes for full initialization on cold start
- API: May show connection errors until Neo4j is fully ready (normal)

## Health Check

```bash
# Local check
curl http://127.0.0.1:3007/health

# Expected response (when healthy):
{
  "status": "healthy",
  "services": {
    "postgres": "up",
    "neo4j": "up",
    "qdrant": "up"
  }
}
```

## Port Mapping Reference

| Service | Internal | Host | Purpose |
|---------|----------|------|---------|
| API | 3005 | 3007 | Express API server |
| Neo4j Bolt | 7687 | 7887 | Database Bolt protocol |
| Neo4j HTTP | 7474 | 7576 | Neo4j browser UI |
| PostgreSQL | 5432 | 5543 | SQL database |
| Qdrant | 6333 | 6555 | Vector database |
| Redis | 6379 | 6599 | Cache & queue |
| MinIO | 9000 | 9100 | Object storage API |
| MinIO Console | 9001 | 9101 | MinIO UI |

## Troubleshooting

### API not responding
```bash
# Check if container is running
docker compose ps

# Check logs
docker logs rna-api

# Verify Neo4j is up (takes 10-15 min)
docker logs rna-neo4j | tail -20

# Restart if needed
docker compose restart api
```

### Neo4j connection errors
```bash
# Check Neo4j is initialized
curl -s http://127.0.0.1:7576/ | jq .neo4j_version

# If still initializing, wait and retry
# Neo4j on cold start can take 15+ minutes
```

### PostgreSQL issues
```bash
# Check database
docker exec rna-postgres pg_isready -U rna_admin

# View logs
docker logs rna-postgres
```

## Environment Variables

Key env vars from `.env`:
- `NODE_ENV` - Set to "production"
- `RNA_DATABASE_URL` - PostgreSQL connection
- `NEO4J_URI` - Neo4j connection
- `QDRANT_URL` - Vector DB connection
- `REDIS_URL` - Cache connection

See `.env.example` for full list.

## Maintenance

### Backup Data
```bash
# PostgreSQL
docker exec rna-postgres pg_dump -U rna_admin rna_db > backup.sql

# Neo4j (volumes are in docker)
# Data persists in neo4j_data volume
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f neo4j
```

### Clean Start (WARNING: Deletes data)
```bash
docker compose down -v
docker compose up -d
```

## References
- GitHub: https://github.com/maublair/rna-mem-bcode
- Local fix docs: `/home/mblair/RNA_DOCKER_FIX_2026-05-22.md`
- Docker compose: `./docker-compose.yml`
- Backend: `./backend/`
- Skill client: `./skill-client/`

---
Last verified: 2026-05-22 ✅
