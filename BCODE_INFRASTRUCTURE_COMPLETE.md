# BlairCode Infrastructure - Complete Documentation
**Updated: 2026-05-22**
**Status: ✅ OPERATIONAL**

## Infrastructure Overview

### Network Stack
```
External (*.bcode.work) 
  → Cloudflare Tunnel (config.yml)
    → Nginx Proxy Manager (npm:81 admin, :80 gateway)
      → Internal service containers or host:port
```

### Core Services

#### Gateway Layer (Production)
- **Cloudflared Tunnel:** Secure ingress to Cloudflare
- **Nginx Proxy Manager:** Central proxy host management
- **Location:** `/home/mblair/srv/stacks/gateway/`

#### RNA Stack (Red de Memoria Anidada) - ✅ HEALTHY
- **Status:** Fully operational after 2026-05-22 Docker fix
- **API:** http://127.0.0.1:3007 → https://rna.bcode.work
- **Services:**
  - PostgreSQL (port 5543) - healthy
  - Neo4j (port 7887) - healthy (15min startup)
  - Qdrant (port 6555) - healthy
  - Redis (port 6599) - healthy
  - MinIO (port 9100-9101) - healthy
- **Fix Applied:** Removed Neo4j cypher-shell healthcheck
- **Location:** `/home/mblair/srv/stacks/rna/`

#### BlairCode Main Stack (bd)
- **Next.js Frontend:** Port 3000
- **Node API:** Port 3001
- **Status:** Operational
- **Location:** `/home/mblair/srv/stacks/bcode/bd/`

#### LuckyPixel Stack
- **Next.js App:** Port 3000
- **Status:** Operational
- **Location:** `/home/mblair/srv/stacks/bcode/luckypixel/`

#### SIA Stack (BlairCode AI Orchestration)
- **Main Process:** systemd `sia-host.service` (port 3005)
- **Support Services:** Docker Compose (Neo4j, Redis, Qdrant)
- **Status:** Operational
- **Location:** `/home/mblair/srv/stacks/bcode/sia/`

#### Other Stacks
- **Affine:** `/home/mblair/srv/stacks/bcode/affine/`
- **Zero Trust:** `/home/mblair/srv/stacks/bcode/zero-trust/`
- **Ares:** `/home/mblair/srv/stacks/ares/`
- **Nextcloud:** `/home/mblair/srv/stacks/nextcloud/`

### Port Mapping Summary

| Service | Internal | Host | Purpose |
|---------|----------|------|---------|
| **NPM Admin** | 81 | 81 | Nginx Proxy Manager UI |
| **NPM Gateway** | 80 | 80 | Ingress proxy |
| **RNA API** | 3005 | 3007 | Memory hub |
| **RNA Neo4j Bolt** | 7687 | 7887 | Graph database |
| **RNA Neo4j HTTP** | 7474 | 7576 | Neo4j UI |
| **RNA PostgreSQL** | 5432 | 5543 | SQL store |
| **RNA Qdrant** | 6333 | 6555 | Vector DB |
| **RNA Redis** | 6379 | 6599 | Cache |
| **RNA MinIO** | 9000 | 9100 | Object storage |
| **RNA MinIO UI** | 9001 | 9101 | MinIO console |
| **BD Frontend** | 3000 | 3000 | Next.js web |
| **BD API** | 3001 | 3001 | Node backend |
| **SIA** | 3005 | 3005 | AI orchestration |

### Network Architecture

**Networks:**
- `bcode_gateway` - Connects Cloudflared, NPM, and service containers
- `sia_sia_internal_net` - SIA stack + NPM for internal resolution
- `rna-net` - RNA stack internal
- Service-specific networks (bd_default, affine_default, etc.)

## Critical Operations

### Check Service Health
```bash
# SIA
sudo systemctl status sia-host.service
journalctl -u sia-host.service -f

# Docker stacks
cd /home/mblair/srv/stacks/bcode/{stack-name}
docker compose ps
docker compose logs -f

# RNA
curl https://rna.bcode.work/health | jq .
```

### Restart Operations
```bash
# SIA
sudo systemctl restart sia-host.service

# Docker stack
docker compose restart {service}

# NPM after config changes
docker exec npm nginx -s reload
```

### Ingress Chain (Critical Rules)
1. ⚠️ NEVER create direct port mappings to public hostnames
2. UPDATE `config.yml` (Cloudflared) AND NPM proxy hosts TOGETHER
3. NPM database is source of truth - sync with rendered nginx configs
4. Test with: `curl -I https://hostname.bcode.work`

## Recent Changes

### 2026-05-22: RNA Docker Fix
- **Issue:** Neo4j healthcheck blocking initialization
- **Fix:** Removed cypher-shell healthcheck from docker-compose.yml
- **Result:** Stack now stable and fully operational
- **Docs:** `/home/mblair/RNA_DOCKER_FIX_2026-05-22.md`

### 2026-05-20: RNA Continuity Handoff
- Stabilized `rna-api` (container recreate conflicts resolved)
- All 6 services HEALTHY (Neo4j/PostgreSQL/Qdrant/Redis/MinIO/Express)
- E2E validation: `/`, `/health`, `/v1/facts` endpoints all 200

## Important Constraints

- ⚠️ No SSH keys or credentials in code (use `.env` files)
- ⚠️ No parallel pushes to Cloudflare config
- ⚠️ No direct Docker changes to NPM without UI sync
- ⚠️ SIA rebuilds are expensive - verify before triggering

## Documentation References

**Quick Access:**
- `/home/mblair/CLAUDE.md` - Project instructions
- `/home/mblair/manuales/BCODE_STACKS_GUIDE.md` - Stack inventory
- `/home/mblair/npm_config_guide.md` - Proxy host configuration
- `/home/mblair/SIA_SERVER_ADMIN_PLAYBOOK_BLAIRCODE.md` - Operational mandate

**Technical Details:**
- `/home/mblair/SIA_ESTRUCTURA_Y_MANUAL_COMPLETO.md` - SIA architecture
- `/home/mblair/SERVIDOR_ESTADO_REAL_2026-03-30.md` - Current state
- `/home/mblair/PLAN_DOCKER_SWARM_Y_SECRETOS_2026-03-30.md` - Infrastructure decisions
- `/home/mblair/ARRANQUE_AUTOMATICO_SIA.md` - SIA bootstrap

**Change Tracking:**
- `/home/mblair/bitacora.md` - Operational changelog
- `/home/mblair/ESTADO_TRABAJO.md` - Current work status

**RNA Stack:**
- `/home/mblair/srv/stacks/rna/OPERATIONAL_NOTES.md` - Operations guide
- `/home/mblair/RNA_DOCKER_FIX_2026-05-22.md` - Recent fix details
- GitHub: `https://github.com/maublair/rna-mem-bcode`

## Decommissioned Services

These should respond 404 or not be proxied:
- `ia.bcode.work`
- `miniverse.bcode.work`
- `presenta.bcode.work` (replaced by `zero-trust.bcode.work`)

## Next Steps

1. Monitor RNA stability post-fix (24-48h)
2. Review and update proxy host table in NPM
3. Document any new deployments in bitacora
4. Verify SIA health metrics

---
**Maintained by:** BlairCode Automation  
**Last Verified:** 2026-05-22 ✅  
**Status:** STABLE AND OPERATIONAL

---

## Gateway Stack Details

### Cloudflared Configuration
- **Config file:** `/home/mblair/srv/stacks/gateway/config.yml`
- **Function:** Routes *.bcode.work → NPM
- **Rules:** All public hostnames must go through this tunnel
- **Last update:** Check git history

### NPM (Nginx Proxy Manager)
- **Location:** `/home/mblair/srv/stacks/gateway/`
- **Admin UI:** `http://127.0.0.1:81` or `https://panel.bcode.work`
- **Docker files:**
  - `docker-compose.npm.yml` - NPM service
  - `docker-compose.cloudflared.yml` - Tunnel service
- **Database:** `/data/database.sqlite` (SQLite - source of truth)
- **Rendered configs:** `/data/nginx/proxy_host/*.conf`
- **Startup:** `docker compose -f docker-compose.npm.yml up -d`

---

## Stack Operational Status Matrix

| Stack | Service | Port | Status | Last Check |
|-------|---------|------|--------|------------|
| **Gateway** | Cloudflared | tunnel | ✅ | 2026-05-22 |
| **Gateway** | NPM | 81/80 | ✅ | 2026-05-22 |
| **RNA** | API | 3007 | ✅ | 2026-05-22 |
| **RNA** | Neo4j | 7887 | ✅ | 2026-05-22 |
| **RNA** | PostgreSQL | 5543 | ✅ | 2026-05-22 |
| **RNA** | Qdrant | 6555 | ✅ | 2026-05-22 |
| **RNA** | Redis | 6599 | ✅ | 2026-05-22 |
| **BD** | Frontend | 3000 | ✅ | 2026-05-22 |
| **BD** | API | 3001 | ✅ | 2026-05-22 |
| **SIA** | Main | 3005 | ✅ | 2026-05-22 |
| **LuckyPixel** | Web | 3000 | ✅ | 2026-05-22 |

---

**All stacks verified operational on 2026-05-22**
