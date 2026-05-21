import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import postgres from './postgresService.js';

const JWT_SECRET = process.env.RNA_AUTH_SECRET || process.env.JWT_SECRET || 'rna-dev-secret-change-me';
const PAIRING_SECRET = process.env.RNA_PAIRING_SECRET || '';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  token: string;
  expiresAt: string;
}

export interface AuthClaims {
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  iat?: number;
  exp?: number;
}

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_device_sessions (
      device_id TEXT PRIMARY KEY,
      device_name TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      token_id TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_device_sessions_token_hash ON rna_device_sessions(token_hash)`);
  schemaReady = true;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function registerDevice(input: { deviceId: string; deviceName: string; fingerprint: string; pairingSecret?: string; }) {
  await ensureSchema();
  if (!PAIRING_SECRET || input.pairingSecret !== PAIRING_SECRET) {
    throw new Error('pairing_denied');
  }

  const tokenId = crypto.randomUUID();
  const claims: AuthClaims = {
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    fingerprint: input.fingerprint,
  };
  const token = jwt.sign(claims, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS, jwtid: tokenId });
  const tokenHash = hashToken(token);

  await postgres.query(
    `INSERT INTO rna_device_sessions (device_id, device_name, fingerprint, token_id, token_hash, active, issued_at, expires_at, last_seen)
     VALUES ($1,$2,$3,$4,$5,TRUE,now(),now() + interval '30 days',now())
     ON CONFLICT (device_id) DO UPDATE SET
       device_name = EXCLUDED.device_name,
       fingerprint = EXCLUDED.fingerprint,
       token_id = EXCLUDED.token_id,
       token_hash = EXCLUDED.token_hash,
       active = TRUE,
       issued_at = now(),
       expires_at = now() + interval '30 days',
       last_seen = now()`,
    [input.deviceId, input.deviceName, input.fingerprint, tokenId, tokenHash]
  );

  return { deviceId: input.deviceId, deviceName: input.deviceName, fingerprint: input.fingerprint, token, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString() } satisfies DeviceSession;
}

export async function verifyToken(token: string) {
  await ensureSchema();
  const payload = jwt.verify(token, JWT_SECRET) as AuthClaims;
  const tokenHash = hashToken(token);
  const { rows } = await postgres.query(
    `SELECT device_id, device_name, fingerprint, active, expires_at FROM rna_device_sessions WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row || !row.active) throw new Error('device_session_invalid');
  if (new Date(row.expires_at).getTime() <= Date.now()) throw new Error('device_session_expired');

  await postgres.query(`UPDATE rna_device_sessions SET last_seen = now() WHERE token_hash = $1`, [tokenHash]);
  return {
    deviceId: payload.deviceId || row.device_id,
    deviceName: payload.deviceName || row.device_name,
    fingerprint: payload.fingerprint || row.fingerprint,
  } as AuthClaims;
}

export function getPairingSecretConfigured() {
  return Boolean(PAIRING_SECRET);
}
