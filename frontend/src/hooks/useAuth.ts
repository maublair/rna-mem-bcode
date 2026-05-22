import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { getOrCreateDeviceId, getFingerprint, getStoredToken, setStoredToken, clearStoredToken } from '../lib/auth';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isPairing, setIsPairing] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const pair = useCallback(async (pairingSecret: string) => {
    setIsPairing(true);
    setPairingError(null);

    try {
      const deviceId = getOrCreateDeviceId();
      const fingerprint = await getFingerprint(deviceId);

      const response = await api.pair({
        device_id: deviceId,
        device_name: 'RNA Infrastructure Dashboard',
        fingerprint,
        pairing_secret: pairingSecret,
      });

      setStoredToken(response.token);
      setToken(response.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pairing failed';
      setPairingError(message);
      throw error;
    } finally {
      setIsPairing(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('rna:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('rna:unauthorized', handleUnauthorized);
  }, [logout]);

  const isPaired = Boolean(token);

  return {
    token,
    isPaired,
    pair,
    logout,
    isPairing,
    pairingError,
  };
}
