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

SIA snapshot:

- Must be handled by SIA's own backup/export process.
- RNA backup scripts may call a SIA export hook through `SIA_BACKUP_HOOK`, but must not alter SIA's memory internals.
- The hook receives one argument: the destination directory for SIA's exported snapshot.

## Cron

Install on the server:

```cron
0 */4 * * * /home/mblair/srv/stacks/rna/scripts/rna-snapshot.sh >> /home/mblair/backups/rna-sia/snapshot.log 2>&1
```

## Restore Rule

Restore PostgreSQL first. Neo4j and Qdrant are projections and can be rebuilt from canonical memory if needed.
