import { Router } from 'express';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import { listSyncOutbox, upsertSyncOutbox, updateSyncOutbox } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

router.get('/pending', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  res.json(await listSyncOutbox(limit));
});

router.post('/pending', async (req: AuthedRequest, res) => {
  const targetSpace = String(req.body?.target_space || req.body?.space || '').trim();
  const targetCollection = String(req.body?.target_collection || req.body?.collection || '').trim();
  const payload = req.body?.payload || {};
  if (!targetSpace && !targetCollection) {
    return res.status(400).json({ error: 'missing_target' });
  }
  const result = await upsertSyncOutbox({
    source_device: req.device?.deviceId || req.body?.source_device || null,
    source_agent: req.body?.source_agent || req.body?.agent_id || null,
    source_runtime: req.body?.source_runtime || req.body?.runtime || null,
    source_workspace: req.body?.source_workspace || req.body?.workspace || null,
    target_space: targetSpace || null,
    target_collection: targetCollection || null,
    payload,
    status: 'pending',
    scheduled_at: req.body?.scheduled_at || null,
  });
  res.status(201).json(result);
});

router.patch('/pending/:id', async (req: AuthedRequest, res) => {
  const status = String(req.body?.status || '').trim();
  if (!status) {
    return res.status(400).json({ error: 'missing_status' });
  }

  const result = await updateSyncOutbox(req.params.id, {
    status,
    retry_count: req.body?.retry_count ?? null,
    last_error: req.body?.last_error ?? null,
  });

  if (!result) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json(result);
});

export default router;
