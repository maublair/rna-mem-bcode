import { Router } from 'express';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { runMigrations, isMigrationExecuted } from '../services/migrationService.js';
import infrastructureMigration from '../migrations/001-initial-infrastructure.js';

const router = Router();
router.use(deviceAuth);

const migrations = [infrastructureMigration];

router.post('/migrations/run', async (req, res) => {
  try {
    const results: any[] = [];
    for (const migration of migrations) {
      const isExecuted = await isMigrationExecuted(migration.name);
      results.push({ name: migration.name, executed: isExecuted });
    }

    await runMigrations(migrations);

    res.json({ status: 'completed', migrations: results });
  } catch (error: any) {
    console.error('Error running migrations:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/migrations/status', async (req, res) => {
  try {
    const results: any[] = [];
    for (const migration of migrations) {
      const isExecuted = await isMigrationExecuted(migration.name);
      results.push({ name: migration.name, executed: isExecuted });
    }
    res.json({ migrations: results });
  } catch (error: any) {
    console.error('Error fetching migration status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
