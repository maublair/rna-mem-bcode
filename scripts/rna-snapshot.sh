#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${RNA_STACK_DIR:-/home/mblair/srv/stacks/rna}"
BACKUP_ROOT="${RNA_BACKUP_ROOT:-/home/mblair/backups/rna-sia}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SNAP_DIR="$BACKUP_ROOT/snapshots/$TS"

mkdir -p "$SNAP_DIR"
cd "$ROOT_DIR"

echo "Creating RNA snapshot at $SNAP_DIR"

docker compose exec -T rna-postgres pg_dump \
  -U "${RNA_POSTGRES_USER:-rna_admin}" \
  -d "${RNA_POSTGRES_DB:-rna_db}" \
  --format=custom \
  > "$SNAP_DIR/postgres.dump"

docker compose exec -T neo4j neo4j-admin database dump neo4j --to-path=/tmp >/dev/null 2>&1 || true
docker cp rna-neo4j:/tmp/neo4j.dump "$SNAP_DIR/neo4j.dump" >/dev/null 2>&1 || true

docker run --rm \
  -v rna_qdrant_data:/data:ro \
  -v "$SNAP_DIR:/backup" \
  alpine:3.20 \
  sh -c 'tar -czf /backup/qdrant-data.tgz -C /data .' >/dev/null

docker run --rm \
  -v rna_minio_data:/data:ro \
  -v "$SNAP_DIR:/backup" \
  alpine:3.20 \
  sh -c 'tar -czf /backup/minio-data.tgz -C /data .' >/dev/null

tar -czf "$SNAP_DIR/rna-config.tgz" \
  --exclude='.env' \
  docker-compose.yml backend docs migrations scripts skill-client README.md .env.example

if [ -n "${SIA_BACKUP_HOOK:-}" ] && [ -x "$SIA_BACKUP_HOOK" ]; then
  echo "Running SIA backup hook"
  "$SIA_BACKUP_HOOK" "$SNAP_DIR/sia" || echo "SIA backup hook failed; RNA snapshot will continue" >&2
else
  echo "SIA backup hook not configured; skipping SIA export"
fi

sha256sum "$SNAP_DIR"/* > "$SNAP_DIR/SHA256SUMS"

# Retention:
# - keep all snapshots from the last 24 hours
# - keep one daily snapshot for the last 7 days
# - keep one monthly snapshot after that
find "$BACKUP_ROOT/snapshots" -mindepth 1 -maxdepth 1 -type d -mmin +1440 -print0 |
while IFS= read -r -d '' dir; do
  day_marker="$BACKUP_ROOT/daily/$(basename "$dir" | cut -c1-8)"
  mkdir -p "$BACKUP_ROOT/daily"
  if [ ! -e "$day_marker" ]; then
    ln -s "$dir" "$day_marker"
  else
    rm -rf "$dir"
  fi
done

find "$BACKUP_ROOT/daily" -mindepth 1 -maxdepth 1 -type l -mtime +7 -print0 |
while IFS= read -r -d '' link; do
  target="$(readlink -f "$link" || true)"
  month_marker="$BACKUP_ROOT/monthly/$(basename "$link" | cut -c1-6)"
  mkdir -p "$BACKUP_ROOT/monthly"
  if [ -n "$target" ] && [ ! -e "$month_marker" ]; then
    ln -s "$target" "$month_marker"
  elif [ -n "$target" ]; then
    rm -rf "$target"
  fi
  rm -f "$link"
done

find "$BACKUP_ROOT/monthly" -mindepth 1 -maxdepth 1 -type l -mtime +370 -delete

echo "Snapshot complete: $SNAP_DIR"
