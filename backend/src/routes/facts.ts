import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json([{ id: 'mock-fact-1', content: 'F25: Infraestructura base en progreso' }]);
});

router.post('/', (req, res) => {
  res.status(201).json({ status: 'created', id: 'new-mock-fact' });
});

export default router;
