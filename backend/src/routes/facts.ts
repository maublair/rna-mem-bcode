import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import neo4j from '../services/neo4jService.js';
import qdrant from '../services/qdrantService.js';
import { getEmbedding } from '../services/embeddingService.js';
import { deviceAuth } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

router.get('/', async (req, res) => {
  const { space, space_id, type, tag, target_agent } = req.query;
  const params: any = {
    limit: Math.min(Number(req.query.limit || 50), 200),
  };
  const filters = ['1 = 1'];

  if (space || space_id) {
    params.space_id = String(space_id || space);
    filters.push('s.id = $space_id');
  }
  if (type) {
    params.type = String(type);
    filters.push('f.type = $type');
  }
  if (tag) {
    params.tag = String(tag);
    filters.push('$tag IN coalesce(f.tags, [])');
  }
  if (target_agent) {
    params.target_agent = `for:${String(target_agent)}`;
    filters.push("('for:any' IN coalesce(f.tags, []) OR $target_agent IN coalesce(f.tags, []))");
  }

  try {
    const result = await neo4j.runQuery(
      `
      MATCH (f:Fact)-[:IN_SPACE]->(s:Space)
      WHERE ${filters.join(' AND ')}
      RETURN f
      ORDER BY f.created_at DESC
      LIMIT $limit
      `,
      params
    );
    const facts = result.records.map(record => record.get('f').properties);
    res.json(facts);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  const { content, type, tags = [] } = req.body;
  const space_id = String(req.body.space_id || req.body.space || '').replace('rna:/', '');
  if (!space_id || !content || !type) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['space or space_id', 'content', 'type'] });
  }
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    await neo4j.runQuery(`
      MERGE (s:Space {id: $space_id})
        ON CREATE SET s.name = $space_id, s.path = $space_id
      CREATE (f:Fact {
        id: $id,
        content: $content,
        type: $type,
        tags: $tags,
        created_at: $timestamp
      })
      CREATE (f)-[:IN_SPACE]->(s)
      RETURN f
    `, { space_id, id, content, type, tags, timestamp });

    try {
      const vector = await getEmbedding(content);
      await qdrant.upsert('facts', {
        wait: true,
        points: [{ id, vector, payload: { space_id, content, type, tags, created_at: timestamp } }]
      });
    } catch (e) {
      console.error(`Embedding failed for fact ${id}, but Neo4j is done. skipping Qdrant.`, e);
    }

    res.status(201).json({ id, status: 'created' });
  } catch (error: any) {
    console.error('Error creating fact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
