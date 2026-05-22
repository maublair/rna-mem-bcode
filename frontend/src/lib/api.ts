import { Device, HealthResponse, InfraGraph, PairResponse, Relationship, Server, Service } from '../types/infrastructure';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('rna_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string>),
    },
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event('rna:unauthorized'));
    throw new Error('unauthorized');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  pair: (body: { device_id: string; device_name: string; fingerprint: string; pairing_secret: string }) =>
    request<PairResponse>('/auth/pair', { method: 'POST', body: JSON.stringify(body) }),

  getServers: () => request<Server[]>('/v1/infrastructure/servers'),
  createServer: (body: Omit<Server, 'id' | 'created_at' | 'updated_at'>) =>
    request<Server>('/v1/infrastructure/servers', { method: 'POST', body: JSON.stringify(body) }),

  getServices: () => request<Service[]>('/v1/infrastructure/services'),
  createService: (body: Omit<Service, 'id' | 'created_at' | 'updated_at'>) =>
    request<Service>('/v1/infrastructure/services', { method: 'POST', body: JSON.stringify(body) }),

  getDevices: () => request<Device[]>('/v1/infrastructure/devices'),
  createDevice: (body: Omit<Device, 'id' | 'created_at' | 'updated_at'>) =>
    request<Device>('/v1/infrastructure/devices', { method: 'POST', body: JSON.stringify(body) }),

  getRelationships: (filters?: { sourceId?: string; targetId?: string; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.sourceId) params.append('sourceId', filters.sourceId);
    if (filters?.targetId) params.append('targetId', filters.targetId);
    if (filters?.type) params.append('type', filters.type);
    const query = params.toString();
    return request<Relationship[]>(`/v1/infrastructure/relationships${query ? '?' + query : ''}`);
  },

  createRelationship: (body: Omit<Relationship, 'id'>) =>
    request<Relationship>('/v1/infrastructure/relationships', { method: 'POST', body: JSON.stringify(body) }),

  getGraph: () => request<InfraGraph>('/v1/infrastructure/graph'),

  getHealth: () => request<HealthResponse>('/health'),
};
