import { Router } from 'express';
import postgres from '../services/postgresService.js';
import { verifyNeo4jConnectivity } from '../services/neo4jService.js';
import qdrant from '../services/qdrantService.js';

const router = Router();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

router.get('/', async (_req, res) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'unknown',
      neo4j: 'unknown',
      qdrant: 'unknown',
    },
  };

  try {
    await withTimeout(postgres.query('SELECT 1'), 1000);
    health.services.postgres = 'up';
  } catch {
    health.services.postgres = 'down';
    health.status = 'degraded';
  }

  try {
    await withTimeout(verifyNeo4jConnectivity(), 1200);
    health.services.neo4j = 'up';
  } catch {
    health.services.neo4j = 'unknown';
  }

  try {
    await withTimeout(qdrant.getCollections(), 1000);
    health.services.qdrant = 'up';
  } catch {
    health.services.qdrant = 'down';
    health.status = 'degraded';
  }

  res.json(health);
});

export default router;
