import { Router } from 'express';
import postgres from '../services/postgresService.js';
import { deviceAuth } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

router.post('/update', async (req, res) => {
  const { device_id, type, metrics, timestamp } = req.body;
  try {
    await postgres.query(
      `INSERT INTO rna_devices (id, type, metrics, last_seen) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id) DO UPDATE 
       SET metrics = $3, last_seen = $4, type = $2`,
      [device_id, type, JSON.stringify(metrics), timestamp || new Date().toISOString()]
    );
    res.json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:id/state', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await postgres.query('SELECT * FROM rna_devices WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching device state:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
