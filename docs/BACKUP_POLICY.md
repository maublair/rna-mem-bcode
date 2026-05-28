# RNA + SIA Snapshot Policy

RNA must not replace SIA's own memory system. SIA keeps its memory. RNA exposes views inside SIA's dashboard and stores shared cross-agent memory, tasks, traces, and knowledge.

## Snapshot Schedule

- Create a snapshot every 4 hours.
- Keep all snapshots for the last 24 hours.
- After 24 hours, keep one daily snapshot for 7 days.
- After 7 days, keep one monthly snapshot.
- Older monthly snapshots can be pruned after long-term archive policy is defined.

## Snapshot Contents

RNA snapshot:

- PostgreSQL canonical memory.
- Neo4j graph projection.
- Qdrant vector projection.
- MinIO object data.
- RNA repo config, docs, migrations, scripts, and skill client.
- The snapshot completes even if a projection export times out; the canonical restore artifacts still include `postgres.dump`, `rna-config.tgz`, and `SHA256SUMS`, with optional projection archives when they finish in time.

SIA snapshot:

- Must be handled by SIA's own backup/export process.
- RNA backup scripts may call a SIA export hook through `SIA_BACKUP_HOOK`, but must not alter SIA's memory internals.
- The hook receives one argument: the destination directory for SIA's exported snapshot.

## Cron

Install on the server:

```cron
0 */4 * * * /home/mblair/srv/stacks/rna/scripts/rna-snapshot.sh >> /home/mblair/backups/rna-sia/snapshot.log 2>&1
```

## Manual Run

- The RNA console exposes `/backups` for snapshot health and restore points.
- The backend endpoint `POST /v1/backups/run` executes `scripts/rna-snapshot.sh` and records the result in `rna_snapshot_health`.
- Use the manual run when you need an immediate snapshot outside the cron cycle.
- The backend endpoint `GET /v1/backups/restore-plan` exposes the canonical restore order and latest snapshot list.

## SIA Export Hook

- RNA reads `SIA_BACKUP_HOOK` from the environment of the RNA API/snapshot process.
- The console exposes the configured hook status and a controlled test button on `/backups`.
- `POST /v1/backups/sia-hook/test` executes the hook against a temp export directory and stores the result in `rna_snapshot_health` under `kind = sia-hook-test`.

Restore jobs:

- The console exposes a restore rehearsal panel on `/backups`.
- `POST /v1/backups/restore/jobs` creates a tracked restore job in `dry-run` or `apply` mode.
- `POST /v1/backups/restore/jobs/:id/run` advances the job through a safe restore rehearsal.
- `GET /v1/backups/restore/jobs` lists the restore job history.
- `apply` mode uses the configured `RNA_RESTORE_EXECUTOR` script when available.
- If `RNA_RESTORE_EXECUTOR` is not set, RNA falls back to `/home/mblair/srv/stacks/rna/scripts/rna-restore.sh`.
- If the executor is missing, unreadable, or the snapshot artifacts are incomplete, the job is blocked with a recorded reason.
- The restore rehearsal validates the manifest and every present artifact before advancing the job.
- The hook must only export SIA state; it must not mutate SIA memory internals.

## Restore Rule

Restore PostgreSQL first. Neo4j and Qdrant are projections and can be rebuilt from canonical memory if needed.
