import { Router } from 'express';
import crypto from 'crypto';
import { getPairingSecretConfigured, registerDevice } from '../services/authService.js';

const router = Router();

router.post('/api-key/generate', (_req, res) => {
  res.status(410).json({ error: 'deprecated', message: 'Use device pairing via /auth/pair instead.' });
});

router.post('/login', async (req, res) => {
  const { device_id, device_name, fingerprint, pairing_secret } = req.body || {};
  if (!device_id || !device_name || !fingerprint) {
    return res.status(400).json({ error: 'missing_device_context' });
  }
  if (!getPairingSecretConfigured()) {
    return res.status(503).json({ error: 'pairing_not_configured' });
  }
  try {
    const session = await registerDevice({
      deviceId: String(device_id),
      deviceName: String(device_name),
      fingerprint: String(fingerprint),
      pairingSecret: pairing_secret ? String(pairing_secret) : undefined,
    });
    return res.json({ token: session.token, expiresAt: session.expiresAt, device: { id: session.deviceId, name: session.deviceName } });
  } catch (error: any) {
    return res.status(401).json({ error: 'pairing_failed', detail: error?.message || 'unknown' });
  }
});

router.post('/pair', async (req, res) => {
  const { device_id, device_name, fingerprint, pairing_secret } = req.body || {};
  if (!device_id || !device_name || !fingerprint || !pairing_secret) {
    return res.status(400).json({ error: 'missing_pairing_fields' });
  }
  try {
    const session = await registerDevice({
      deviceId: String(device_id),
      deviceName: String(device_name),
      fingerprint: String(fingerprint),
      pairingSecret: String(pairing_secret),
    });
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      device: { id: session.deviceId, name: session.deviceName },
      sessionId: crypto.randomUUID(),
    });
  } catch (error: any) {
    return res.status(401).json({ error: 'pairing_denied', detail: error?.message || 'unknown' });
  }
});

export default router;
