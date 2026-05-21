import { Router } from 'express';
import postgres from '../services/postgresService.js';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import { ensureMemorySchema } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

router.get('/', async (_req, res) => {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, space_id, name, schema_version, visibility, owner_type, owner_id, policy, metadata, created_at, updated_at
     FROM rna_collections
     ORDER BY id`
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const id = String(req.body?.id || '').trim();
  const name = String(req.body?.name || id).trim();
  if (!id || !name) return res.status(400).json({ error: 'missing_id_or_name' });

  const spaceId = req.body?.space_id ? String(req.body.space_id) : null;
  if (spaceId) {
    await postgres.query(
      `INSERT INTO rna_spaces (id, name, path) VALUES ($1, $1, $1) ON CONFLICT (id) DO NOTHING`,
      [spaceId]
    );
  }

  const result = await postgres.query(
    `INSERT INTO rna_collections (id, space_id, name, schema_version, visibility, owner_type, owner_id, policy, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       schema_version = EXCLUDED.schema_version,
       visibility = EXCLUDED.visibility,
       policy = EXCLUDED.policy,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING *`,
    [
      id,
      spaceId,
      name,
      req.body?.schema_version || null,
      req.body?.visibility || 'shared',
      req.body?.owner_type || 'system',
      req.body?.owner_id || req.device?.deviceId || null,
      req.body?.policy || {},
      req.body?.metadata || {},
    ]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:collectionId/docs', async (req, res) => {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, collection_id, path, type, title, content, data, tags, created_by, updated_by, version, created_at, updated_at
     FROM rna_documents
     WHERE collection_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [req.params.collectionId, Math.min(Number(req.query.limit || 100), 500)]
  );
  res.json(result.rows);
});

router.post('/:collectionId/docs', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const type = String(req.body?.type || '').trim();
  if (!type) return res.status(400).json({ error: 'missing_type' });

  const result = await postgres.query(
    `INSERT INTO rna_documents (collection_id, path, type, title, content, data, tags, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
     RETURNING *`,
    [
      req.params.collectionId,
      req.body?.path || null,
      type,
      req.body?.title || null,
      req.body?.content || null,
      req.body?.data || {},
      Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [],
      req.body?.created_by || req.device?.deviceId || null,
    ]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/docs/:docId', async (req, res) => {
  await ensureMemorySchema();
  const result = await postgres.query(`SELECT * FROM rna_documents WHERE id = $1`, [req.params.docId]);
  if (!result.rows[0]) return res.status(404).json({ error: 'not_found' });
  res.json(result.rows[0]);
});

router.patch('/docs/:docId', async (req: AuthedRequest, res) => {
  await ensureMemorySchema();
  const current = await postgres.query(`SELECT * FROM rna_documents WHERE id = $1`, [req.params.docId]);
  const doc = current.rows[0];
  if (!doc) return res.status(404).json({ error: 'not_found' });

  await postgres.query(
    `INSERT INTO rna_document_revisions (document_id, version, data, content, changed_by, change_reason)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [doc.id, doc.version, doc.data, doc.content, req.body?.updated_by || req.device?.deviceId || null, req.body?.change_reason || null]
  );

  const result = await postgres.query(
    `UPDATE rna_documents SET
       title = COALESCE($2, title),
       content = COALESCE($3, content),
       data = COALESCE($4, data),
       tags = COALESCE($5, tags),
       updated_by = $6,
       version = version + 1,
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      req.params.docId,
      req.body?.title ?? null,
      req.body?.content ?? null,
      req.body?.data ?? null,
      Array.isArray(req.body?.tags) ? req.body.tags.map(String) : null,
      req.body?.updated_by || req.device?.deviceId || null,
    ]
  );
  res.json(result.rows[0]);
});

export default router;
