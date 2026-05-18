import { Router } from 'express';
import neo4j from '../services/neo4jService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    console.log('Fetching spaces: starting query');
    const result = await neo4j.runQuery('MATCH (s:Space) RETURN s.id AS id, s.name AS name, s.path AS path');
    console.log('Fetching spaces: query completed, parsing records');
    const spaces = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      path: record.get('path')
    }));
    console.log('Fetching spaces: responding with JSON');
    res.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:id/facts', async (req, res) => {
  const { id } = req.params;
  const { content, type, tags } = req.body;
  // TODO: Add full validation and insert to Qdrant + Neo4j
  res.status(201).json({ id: 'mock-fact-id', space: id, status: 'created' });
});

export default router;
