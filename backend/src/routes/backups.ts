import { Router } from 'express';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import postgres from '../services/postgresService.js';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import { ensureMemorySchema } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);
const execFileAsync = promisify(execFile);
const SNAPSHOT_SCRIPT = '/home/mblair/srv/stacks/rna/scripts/rna-snapshot.sh';
const DEFAULT_BACKUP_ROOT = '/home/mblair/backups/rna-sia';
const RESTORE_EXECUTOR = process.env.RNA_RESTORE_EXECUTOR || '/home/mblair/srv/stacks/rna/scripts/rna-restore.sh';

function resolveSnapshotLocation(targetLocation: string | null | undefined) {
  if (!targetLocation) {
    return null;
  }

  if (fs.existsSync(targetLocation)) {
    const stat = fs.statSync(targetLocation);
    if (stat.isDirectory()) {
      return targetLocation;
    }
  }

  return null;
}

function inspectSnapshotDir(snapshotDir: string) {
  const entries = fs.existsSync(snapshotDir) ? fs.readdirSync(snapshotDir) : [];
  const required = ['SHA256SUMS', 'postgres.dump', 'rna-config.tgz'];
  const optional = ['neo4j.dump', 'qdrant-data.tgz', 'minio-data.tgz', 'sia'];
  const missingRequired = required.filter((item) => !entries.includes(item));
  const presentOptional = optional.filter((item) => entries.includes(item));
  return {
    entries,
    missingRequired,
    presentOptional,
    hasChecksum: entries.includes('SHA256SUMS'),
  };
}

async function runRestoreExecutor(input: {
  jobId: string;
  mode: string;
  snapshotLocation: string;
  snapshotId?: string | null;
  snapshotKind?: string | null;
}) {
  if (!RESTORE_EXECUTOR) {
    return {
      executed: false,
      reason: 'restore_executor_not_configured',
      stdout: '',
      stderr: '',
    };
  }

  if (!fs.existsSync(RESTORE_EXECUTOR)) {
    return {
      executed: false,
      reason: 'restore_executor_not_found',
      stdout: '',
      stderr: '',
    };
  }

  const result = await execFileAsync(RESTORE_EXECUTOR, [
    input.jobId,
    input.mode,
    input.snapshotLocation,
    input.snapshotId || '',
    input.snapshotKind || '',
  ], {
    timeout: 1000 * 60 * 30,
    maxBuffer: 1024 * 1024 * 2,
    env: {
      ...process.env,
      RNA_RESTORE_MODE: input.mode,
      RNA_RESTORE_JOB_ID: input.jobId,
      RNA_RESTORE_SNAPSHOT_LOCATION: input.snapshotLocation,
      RNA_RESTORE_SNAPSHOT_ID: input.snapshotId || '',
      RNA_RESTORE_SNAPSHOT_KIND: input.snapshotKind || '',
    },
  });

  return {
    executed: true,
    reason: 'restore_executor_completed',
    stdout: result.stdout ? String(result.stdout).slice(-4000) : '',
    stderr: result.stderr ? String(result.stderr).slice(-4000) : '',
  };
}

router.get('/status', async (_req, res) => {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, kind, status, location, size_bytes, details, created_at
     FROM rna_snapshot_health
     ORDER BY created_at DESC
     LIMIT 100`
  );
  res.json(result.rows);
});

router.get('/restore-plan', async (_req, res) => {
  await ensureMemorySchema();
  const snapshotResult = await postgres.query(
    `SELECT id, kind, status, location, size_bytes, details, created_at
     FROM rna_snapshot_health
     ORDER BY created_at DESC
     LIMIT 10`
  );

  res.json({
    order: [
      'postgres',
      'neo4j',
      'qdrant',
      'minio',
      'rna-config',
    ],
    rule: [
      'Restore PostgreSQL first.',
      'Neo4j and Qdrant are projections and can be rebuilt from canonical memory.',
      'MinIO restores object data after the canonical store is back.',
      'Validate health after each step before moving to the next.',
    ],
    latest_snapshots: snapshotResult.rows,
  });
});

router.get('/restore/jobs', async (_req, res) => {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, mode, target_snapshot_id, target_snapshot_kind, target_location, status, current_step, step_index, total_steps, last_error, summary, created_by, created_at, updated_at, started_at, completed_at
     FROM rna_restore_jobs
     ORDER BY created_at DESC
     LIMIT 100`
  );
  res.json(result.rows);
});

router.post('/restore/jobs', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const mode = String(req.body?.mode || 'dry-run').trim();
  const targetSnapshotId = String(req.body?.target_snapshot_id || '').trim();
  const targetSnapshotKind = String(req.body?.target_snapshot_kind || '').trim();
  const targetLocation = String(req.body?.target_location || '').trim();
  const createdBy = req.device?.deviceId || req.body?.created_by || null;

  if (!targetSnapshotId && !targetLocation) {
    return res.status(400).json({ error: 'missing_snapshot_reference' });
  }

  const result = await postgres.query(
    `INSERT INTO rna_restore_jobs (
      mode, target_snapshot_id, target_snapshot_kind, target_location,
      status, current_step, step_index, total_steps, summary, created_by, started_at, completed_at
    )
    VALUES ($1, $2, $3, $4, 'running', 'plan', 0, 4, $5, $6, now(), NULL)
    RETURNING id, mode, target_snapshot_id, target_snapshot_kind, target_location, status, current_step, step_index, total_steps, last_error, summary, created_by, created_at, updated_at, started_at, completed_at`,
    [
      mode,
      targetSnapshotId || null,
      targetSnapshotKind || null,
      targetLocation || null,
      {
        steps: [
          'verify snapshot reference',
          'validate restore order',
          'prepare target services',
          'simulate restore completion',
        ],
        dry_run: mode !== 'apply',
      },
      createdBy,
    ]
  );

  res.status(201).json(result.rows[0]);
});

router.post('/restore/jobs/:id/run', async (_req, res) => {
  await ensureMemorySchema();
  const jobResult = await postgres.query(
    `SELECT id, mode, target_snapshot_id, target_snapshot_kind, target_location, status, current_step, step_index, total_steps, last_error, summary, created_by, created_at, updated_at, started_at, completed_at
     FROM rna_restore_jobs
     WHERE id = $1`,
    [_req.params.id]
  );

  const job = jobResult.rows[0];
  if (!job) {
    return res.status(404).json({ error: 'not_found' });
  }

  let resolvedLocation = resolveSnapshotLocation(job.target_location);
  if (!resolvedLocation && job.target_snapshot_id) {
    const snapshotLookup = await postgres.query(
      `SELECT id, kind, status, location, size_bytes, details, created_at
       FROM rna_snapshot_health
       WHERE id = $1
       LIMIT 1`,
      [job.target_snapshot_id]
    );
    const matchedSnapshot = snapshotLookup.rows[0];
    if (matchedSnapshot?.location) {
      resolvedLocation = resolveSnapshotLocation(matchedSnapshot.location);
    }
  }
  if (!resolvedLocation && job.summary && typeof job.summary === 'object') {
    const previousResolvedLocation = (job.summary as Record<string, unknown>).resolved_location;
    if (typeof previousResolvedLocation === 'string') {
      resolvedLocation = resolveSnapshotLocation(previousResolvedLocation);
    }
  }
  const snapshotInspection = resolvedLocation ? inspectSnapshotDir(resolvedLocation) : null;
  const steps = [
    'verify snapshot reference',
    'validate restore order',
    'prepare target services',
    'simulate restore completion',
  ];
  const simulateApply = job.mode !== 'apply';
  const validationErrors: string[] = [];
  let executorOutcome: { executed: boolean; reason: string; stdout: string; stderr: string } | null = null;

  if (!job.target_snapshot_id && !resolvedLocation) {
    validationErrors.push('missing_snapshot_reference');
  }
  if (job.target_location && !resolvedLocation) {
    validationErrors.push('snapshot_location_not_found');
  }
  if (resolvedLocation && snapshotInspection?.missingRequired.length) {
    validationErrors.push(`missing_required_artifacts:${snapshotInspection.missingRequired.join(',')}`);
  }
  if (job.mode === 'apply' && resolvedLocation && validationErrors.length === 0) {
    executorOutcome = await runRestoreExecutor({
      jobId: job.id,
      mode: job.mode,
      snapshotLocation: resolvedLocation,
      snapshotId: job.target_snapshot_id,
      snapshotKind: job.target_snapshot_kind,
    });
    if (!executorOutcome.executed) {
      validationErrors.push(executorOutcome.reason);
    }
  }

  const finalStatus = validationErrors.length > 0 ? 'blocked' : 'completed';
  const finalStep = validationErrors.length > 0 ? 'validation_failed' : 'completed';
  const summary = {
    ...(job.summary || {}),
    dry_run: simulateApply,
    steps,
    completed_steps: steps.length,
    result: finalStatus === 'completed' ? 'simulated' : 'blocked',
    validation_errors: validationErrors,
    resolved_location: resolvedLocation || null,
    snapshot_inspection: snapshotInspection,
    target_snapshot_resolved: Boolean(resolvedLocation),
    restore_executor: executorOutcome,
    note: finalStatus === 'completed'
      ? (job.mode === 'apply'
          ? 'This job executed through the configured restore executor.'
          : 'This job executed as a restore rehearsal with artifact validation.')
      : 'Restore blocked until the snapshot reference is valid and restore execution is configured.',
  };

  const updated = await postgres.query(
    `UPDATE rna_restore_jobs
     SET status = $2,
         current_step = $3,
         step_index = $4,
         total_steps = $5,
         last_error = $6,
         summary = $7,
         updated_at = now(),
         completed_at = now()
     WHERE id = $1
     RETURNING id, mode, target_snapshot_id, target_snapshot_kind, target_location, status, current_step, step_index, total_steps, last_error, summary, created_by, created_at, updated_at, started_at, completed_at`,
    [
      job.id,
      finalStatus,
      finalStep,
      steps.length,
      steps.length,
      validationErrors.length ? validationErrors.join('; ') : null,
      summary,
    ]
  );

  res.json({ status: finalStatus, job: updated.rows[0] });
});

router.get('/sia-hook', async (_req, res) => {
  const hookPath = process.env.SIA_BACKUP_HOOK || null;
  const exists = hookPath ? fs.existsSync(hookPath) : false;
  const executable = exists ? fs.statSync(hookPath!).mode & 0o111 ? true : false : false;
  res.json({
    configured: Boolean(hookPath),
    hook_path: hookPath,
    exists,
    executable,
  });
});

router.post('/sia-hook/test', async (_req, res) => {
  const hookPath = process.env.SIA_BACKUP_HOOK || '';
  if (!hookPath) {
    return res.status(400).json({ error: 'hook_not_configured' });
  }

  if (!fs.existsSync(hookPath)) {
    return res.status(404).json({ error: 'hook_not_found', hook_path: hookPath });
  }

  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rna-sia-hook-'));
  try {
    const result = await execFileAsync(hookPath, [testDir], {
      timeout: 1000 * 60 * 5,
      maxBuffer: 1024 * 1024 * 2,
    });
    const record = await postgres.query(
      `INSERT INTO rna_snapshot_health (kind, status, location, size_bytes, details)
       VALUES ('sia-hook-test', 'completed', $1, NULL, $2)
       RETURNING id, kind, status, location, size_bytes, details, created_at`,
      [
        testDir,
        {
          hook_path: hookPath,
          stdout: result.stdout ? String(result.stdout).slice(-4000) : '',
          stderr: result.stderr ? String(result.stderr).slice(-4000) : '',
        },
      ]
    );
    return res.status(201).json({ status: 'completed', snapshot: record.rows[0], test_dir: testDir });
  } catch (error: any) {
    const record = await postgres.query(
      `INSERT INTO rna_snapshot_health (kind, status, location, size_bytes, details)
       VALUES ('sia-hook-test', 'failed', $1, NULL, $2)
       RETURNING id, kind, status, location, size_bytes, details, created_at`,
      [
        testDir,
        {
          hook_path: hookPath,
          error: error?.message || String(error),
        },
      ]
    );
    return res.status(500).json({
      status: 'failed',
      detail: error?.message || String(error),
      snapshot: record.rows[0],
      test_dir: testDir,
    });
  }
});

router.post('/status', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const kind = String(req.body?.kind || '').trim();
  const status = String(req.body?.status || '').trim();
  if (!kind || !status) {
    return res.status(400).json({ error: 'missing_kind_or_status' });
  }

  const result = await postgres.query(
    `INSERT INTO rna_snapshot_health (kind, status, location, size_bytes, details)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, kind, status, location, size_bytes, details, created_at`,
    [
      kind,
      status,
      req.body?.location || null,
      req.body?.size_bytes || null,
      req.body?.details || {},
    ]
  );
  res.status(201).json(result.rows[0]);
});

router.post('/run', async (_req, res) => {
  await ensureMemorySchema();
  try {
    const result = await execFileAsync('bash', [SNAPSHOT_SCRIPT], {
      env: {
        ...process.env,
        RNA_STACK_DIR: '/home/mblair/srv/stacks/rna',
        RNA_BACKUP_ROOT: process.env.RNA_BACKUP_ROOT || DEFAULT_BACKUP_ROOT,
      },
      timeout: 1000 * 60 * 30,
      maxBuffer: 1024 * 1024 * 2,
    });

    const snapshot = await postgres.query(
      `INSERT INTO rna_snapshot_health (kind, status, location, size_bytes, details)
       VALUES ('rna', 'manual-run', $2, NULL, $1)
       RETURNING id, kind, status, location, size_bytes, details, created_at`,
      [{
        stdout: result.stdout ? String(result.stdout).slice(-4000) : '',
        stderr: result.stderr ? String(result.stderr).slice(-4000) : '',
        script: SNAPSHOT_SCRIPT,
        status: 'completed',
      }, process.env.RNA_BACKUP_ROOT || DEFAULT_BACKUP_ROOT]
    );
    return res.status(201).json({ status: 'completed', snapshot: snapshot.rows[0] });
  } catch (error: any) {
    const snapshot = await postgres.query(
      `INSERT INTO rna_snapshot_health (kind, status, location, size_bytes, details)
       VALUES ('rna', 'manual-run-failed', $2, NULL, $1)
       RETURNING id, kind, status, location, size_bytes, details, created_at`,
      [{
        script: SNAPSHOT_SCRIPT,
        error: error?.message || String(error),
      }, process.env.RNA_BACKUP_ROOT || DEFAULT_BACKUP_ROOT]
    );
    return res.status(500).json({
      status: 'failed',
      detail: error?.message || String(error),
      snapshot: snapshot.rows[0],
    });
  }
});

export default router;
