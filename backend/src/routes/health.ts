import { Router } from 'express';
import postgres from '../services/postgresService.js';
import neo4j from '../services/neo4jService.js';
import qdrant from '../services/qdrantService.js';

const router = Router();

router.get('/', async (req, res) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'unknown',
      neo4j: 'unknown',
      qdrant: 'unknown'
    }
  };

  try {
    await postgres.query('SELECT 1');
    health.services.postgres = 'up';
  } catch (e) {
    health.services.postgres = 'down';
    health.status = 'degraded';
  }

  try {
    await neo4j.runQuery('RETURN 1');
    health.services.neo4j = 'up';
  } catch (e) {
    health.services.neo4j = 'down';
    health.status = 'degraded';
  }

  try {
    await qdrant.getCollections();
    health.services.qdrant = 'up';
  } catch (e) {
    health.services.qdrant = 'down';
    health.status = 'degraded';
  }

  res.json(health);
});

export default router;
