export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('rna_device_id');
  if (!deviceId) {
    deviceId = self.crypto.getRandomValues(new Uint8Array(16)).reduce((a, b) => a + ('0' + b.toString(16)).slice(-2), '');
    localStorage.setItem('rna_device_id', deviceId);
  }
  return deviceId;
}

export async function getFingerprint(deviceId: string): Promise<string> {
  const userAgent = navigator.userAgent;
  const data = new TextEncoder().encode(deviceId + ':' + userAgent);
  const hashBuffer = await self.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => ('0' + b.toString(16)).slice(-2)).join('');
}

export function getStoredToken(): string | null {
  return localStorage.getItem('rna_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('rna_token', token);
}

export function clearStoredToken(): void {
  localStorage.removeItem('rna_token');
}
