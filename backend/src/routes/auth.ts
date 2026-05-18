import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// Mock in-memory storage for API keys for now (should be in DB later)
const apiKeys = new Set<string>();

router.post('/api-key/generate', (req, res) => {
  const newKey = crypto.randomBytes(32).toString('hex');
  apiKeys.add(newKey);
  res.json({ api_key: newKey });
});

router.post('/login', (req, res) => {
  // Skeleton logic
  res.json({ token: 'mock-jwt-token' });
});

export default router;
