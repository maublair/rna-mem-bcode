import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';

export interface AuthedRequest extends Request {
  device?: { deviceId: string; deviceName: string; fingerprint: string };
}

export async function deviceAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing_bearer_token' });
  }
  try {
    req.device = await verifyToken(token);
    return next();
  } catch (error: any) {
    return res.status(401).json({ error: 'unauthorized', detail: error?.message || 'invalid_token' });
  }
}
