import { Router } from 'express';
import neo4j from '../services/neo4jService.js';
import { deviceAuth } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

router.get('/', async (_req, res) => {
  try {
    const result = await neo4j.runQuery('MATCH (s:Space) RETURN s.id AS id, s.name AS name, s.path AS path');
    const spaces = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      path: record.get('path')
    }));
    res.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:id/facts', async (req, res) => {
  const { id } = req.params;
  res.status(201).json({ id: 'mock-fact-id', space: id, status: 'created' });
});

export default router;
