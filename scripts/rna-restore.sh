#!/usr/bin/env bash
set -euo pipefail

JOB_ID="${1:-}"
MODE="${2:-}"
SNAPSHOT_LOCATION="${3:-}"
SNAPSHOT_ID="${4:-}"
SNAPSHOT_KIND="${5:-}"

ROOT_DIR="${RNA_STACK_DIR:-/home/mblair/srv/stacks/rna}"
BACKUP_ROOT="${RNA_BACKUP_ROOT:-/home/mblair/backups/rna-sia}"
POSTGRES_USER="${RNA_POSTGRES_USER:-rna_admin}"
POSTGRES_DB="${RNA_POSTGRES_DB:-rna_db}"
MINIO_VOLUME="${RNA_MINIO_VOLUME:-rna_minio_data}"
QDRANT_VOLUME="${RNA_QDRANT_VOLUME:-rna_qdrant_data}"
NEO4J_CONTAINER="${RNA_NEO4J_CONTAINER:-rna-neo4j}"
POSTGRES_CONTAINER="${RNA_POSTGRES_CONTAINER:-rna-postgres}"

if [ -z "$JOB_ID" ] || [ -z "$MODE" ] || [ -z "$SNAPSHOT_LOCATION" ]; then
  echo "usage: rna-restore.sh <job_id> <mode> <snapshot_location> [snapshot_id] [snapshot_kind]" >&2
  exit 2
fi

if [ "$MODE" != "apply" ] && [ "$MODE" != "dry-run" ]; then
  echo "invalid restore mode: $MODE" >&2
  exit 2
fi

cd "$ROOT_DIR"

if [ ! -d "$SNAPSHOT_LOCATION" ]; then
  echo "snapshot location not found: $SNAPSHOT_LOCATION" >&2
  exit 3
fi

required_files=(SHA256SUMS postgres.dump rna-config.tgz)
for file in "${required_files[@]}"; do
  if [ ! -f "$SNAPSHOT_LOCATION/$file" ]; then
    echo "missing required snapshot artifact: $file" >&2
    exit 4
  fi
done

echo "RNA restore job: $JOB_ID"
echo "Mode: $MODE"
echo "Snapshot: $SNAPSHOT_LOCATION"
echo "Snapshot ID: ${SNAPSHOT_ID:-n/a}"
echo "Snapshot kind: ${SNAPSHOT_KIND:-n/a}"

echo "Validating checksum manifest"
(
  cd "$SNAPSHOT_LOCATION"
  sha256sum -c SHA256SUMS
)

if [ "$MODE" = "dry-run" ]; then
  echo "Dry run complete: artifact validation passed."
  exit 0
fi

echo "Restoring PostgreSQL"
docker compose exec -T "$POSTGRES_CONTAINER" pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --dbname "$POSTGRES_DB" \
  -U "$POSTGRES_USER" \
  < "$SNAPSHOT_LOCATION/postgres.dump"

if [ -f "$SNAPSHOT_LOCATION/neo4j.dump" ]; then
  echo "Attempting Neo4j restore"
  if docker compose exec -T "$NEO4J_CONTAINER" bash -lc "neo4j-admin database load neo4j --from-path=/tmp --overwrite-destination=true" < /dev/null; then
    echo "Neo4j restore complete"
  else
    echo "Neo4j restore unavailable or failed; projection can be rebuilt from canonical memory" >&2
  fi
else
  echo "Neo4j dump missing; projection will be rebuilt from canonical memory" >&2
fi

echo "Restoring Qdrant volume"
docker run --rm \
  -v "${QDRANT_VOLUME}:/data" \
  -v "${SNAPSHOT_LOCATION}:/backup:ro" \
  alpine:3.20 \
  sh -c 'rm -rf /data/* && tar -xzf /backup/qdrant-data.tgz -C /data'

echo "Restoring MinIO volume"
docker run --rm \
  -v "${MINIO_VOLUME}:/data" \
  -v "${SNAPSHOT_LOCATION}:/backup:ro" \
  alpine:3.20 \
  sh -c 'rm -rf /data/* && tar -xzf /backup/minio-data.tgz -C /data'

echo "Restore apply complete"
