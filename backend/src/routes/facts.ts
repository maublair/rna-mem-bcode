import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import neo4j from '../services/neo4jService.js';
import qdrant from '../services/qdrantService.js';
import { getEmbedding } from '../services/embeddingService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await neo4j.runQuery('MATCH (f:Fact) RETURN f LIMIT 50');
    const facts = result.records.map(record => record.get('f').properties);
    res.json(facts);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  const { space_id, content, type, tags = [] } = req.body;
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    console.log(`Creating fact ${id}: starting Neo4j`);
    // 1. Store in Neo4j
    await neo4j.runQuery(`
      MATCH (s:Space {id: $space_id})
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

    console.log(`Creating fact ${id}: Neo4j done, attempting embedding`);
    try {
      // 2. Generate Embedding and Store in Qdrant
      const vector = await getEmbedding(content);
      console.log(`Creating fact ${id}: Embedding done, starting Qdrant upsert`);
      await qdrant.upsert('facts', {
        wait: true,
        points: [{
          id,
          vector,
          payload: { space_id, content, type, tags, created_at: timestamp }
        }]
      });
    } catch (e) {
      console.error(`Embedding failed for fact ${id}, but Neo4j is done. skipping Qdrant.`, e);
    }

    console.log(`Creating fact ${id}: Qdrant done, responding`);
    res.status(201).json({ id, status: 'created' });
  } catch (error: any) {
    console.error('Error creating fact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
