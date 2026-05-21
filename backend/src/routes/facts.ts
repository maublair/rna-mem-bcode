import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import neo4j from '../services/neo4jService.js';
import qdrant from '../services/qdrantService.js';
import { getEmbedding } from '../services/embeddingService.js';
import { deviceAuth } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

router.get('/', async (req, res) => {
  const space = (req.query.space || req.query.space_id) as string;
  const type = req.query.type as string;
  const tag = req.query.tag as string;
  const target_agent = req.query.target_agent as string;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    let query = 'MATCH (f:Fact)';
    let filters = [];
    const params: any = { limit };

    if (space) {
      query += `-[:IN_SPACE]->(s:Space {id: $space})`;
      params.space = space;
      filters.push('space specified');
    }

    query += ' WHERE true';

    if (type) {
      query += ' AND f.type = $type';
      params.type = type;
      filters.push(`type=${type}`);
    }

    if (tag) {
      query += ' AND $tag IN f.tags';
      params.tag = tag;
      filters.push(`tag=${tag}`);
    }

    if (target_agent) {
      query += ' AND $target_agent IN f.target_agents';
      params.target_agent = target_agent;
      filters.push(`target_agent=${target_agent}`);
    }

    query += ' RETURN f ORDER BY f.created_at DESC LIMIT $limit';

    const result = await neo4j.runQuery(query, params);
    const facts = result.records.map(record => record.get('f').properties);

    res.json({
      count: facts.length,
      filters: filters.length > 0 ? filters : ['no filters'],
      facts
    });
  } catch (error: any) {
    console.error('Error fetching facts:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  const { space, space_id, content, type, tags = [], target_agents = [] } = req.body;
  const space_to_use = space || space_id;

  if (!space_to_use || !content || !type) {
    return res.status(400).json({ error: 'missing_space_content_or_type' });
  }

  const id = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    // MERGE space if missing, create fact, and link
    await neo4j.runQuery(`
      MERGE (s:Space {id: $space_id})
      SET s.created_at = COALESCE(s.created_at, timestamp())
      CREATE (f:Fact {
        id: $id,
        content: $content,
        type: $type,
        tags: $tags,
        target_agents: $target_agents,
        created_at: $timestamp
      })
      CREATE (f)-[:IN_SPACE]->(s)
      RETURN f
    `, { space_id: space_to_use, id, content, type, tags, target_agents, timestamp });

    try {
      const vector = await getEmbedding(content);
      await qdrant.upsert('facts', {
        wait: true,
        points: [{
          id,
          vector,
          payload: { space_id: space_to_use, content, type, tags, target_agents, created_at: timestamp }
        }]
      });
    } catch (e) {
      console.error(`Embedding failed for fact ${id}, but Neo4j is done. skipping Qdrant.`, e);
    }

    res.status(201).json({ id, status: 'created', space: space_to_use });
  } catch (error: any) {
    console.error('Error creating fact:', error);
    res.status(500).json({ error: 'fact_creation_failed', detail: error.message });
  }
});

export default router;
