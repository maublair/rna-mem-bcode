import { Router } from 'express';
import postgres from '../services/postgresService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await postgres.query('SELECT * FROM rna_transactions ORDER BY date DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  const { space_id, transaction_type, amount, date, description } = req.body;
  try {
    const { rows } = await postgres.query(
      'INSERT INTO rna_transactions (space_id, transaction_type, amount, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [space_id, transaction_type, amount, date, description]
    );
    res.status(201).json({ status: 'created', id: rows[0].id });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
