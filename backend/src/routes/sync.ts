import { Router } from 'express';
import postgres from '../services/postgresService.js';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import { ensureMemorySchema } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

router.get('/pending', async (req, res) => {
  await ensureMemorySchema();
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const result = await postgres.query(
    `SELECT id, source_device, source_agent, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at, created_at, updated_at, processed_at
     FROM rna_sync_outbox
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json(result.rows);
});

router.post('/pending', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const targetSpace = String(req.body?.target_space || req.body?.space || '').trim();
  const targetCollection = String(req.body?.target_collection || req.body?.collection || '').trim();
  const payload = req.body?.payload || {};
  if (!targetSpace && !targetCollection) {
    return res.status(400).json({ error: 'missing_target' });
  }

  const result = await postgres.query(
    `INSERT INTO rna_sync_outbox (source_device, source_agent, target_space, target_collection, payload, status, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,'pending',COALESCE($6, now()))
     RETURNING id, source_device, source_agent, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at, created_at, updated_at, processed_at`,
    [
      req.device?.deviceId || req.body?.source_device || null,
      req.body?.source_agent || req.body?.agent_id || null,
      targetSpace || null,
      targetCollection || null,
      payload,
      req.body?.scheduled_at || null,
    ]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/pending/:id', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const status = String(req.body?.status || '').trim();
  if (!status) {
    return res.status(400).json({ error: 'missing_status' });
  }

  const result = await postgres.query(
    `UPDATE rna_sync_outbox
     SET status = $2,
         retry_count = COALESCE($3, retry_count),
         last_error = COALESCE($4, last_error),
         processed_at = CASE WHEN $2 = 'done' THEN now() ELSE processed_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING id, source_device, source_agent, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at, created_at, updated_at, processed_at`,
    [
      req.params.id,
      status,
      req.body?.retry_count ?? null,
      req.body?.last_error ?? null,
    ]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json(result.rows[0]);
});

export default router;
