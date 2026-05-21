import { Router } from 'express';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import { queryFacts, storeFact } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

router.get('/', async (req, res) => {
  const { space, space_id, type, tag, target_agent } = req.query;
  try {
    const facts = await queryFacts({
      spaceId: space_id || space ? String(space_id || space) : undefined,
      type: type ? String(type) : undefined,
      tag: tag ? String(tag) : undefined,
      targetAgent: target_agent ? String(target_agent) : undefined,
      limit: Number(req.query.limit || 50),
    });
    res.json(facts);
  } catch (error: any) {
    console.error('Error fetching facts:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

router.post('/', async (req: AuthedRequest, res) => {
  const { content, type, tags = [] } = req.body;
  const space_id = String(req.body.space_id || req.body.space || '').replace('rna:/', '');
  if (!space_id || !content || !type) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['space or space_id', 'content', 'type'] });
  }

  try {
    const fact = await storeFact({
      spaceId: space_id,
      content: String(content),
      type: String(type),
      tags: Array.isArray(tags) ? tags.map(String) : [],
      sourceAgent: req.body.agent_id ? String(req.body.agent_id) : undefined,
      sourceDevice: req.device?.deviceId,
      metadata: req.body.metadata || {},
    });
    res.status(201).json({ id: fact.id, status: 'created', fact });
  } catch (error: any) {
    console.error('Error creating fact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
