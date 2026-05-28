import {
  CollectionSummary,
  CollectionPermission,
  Device,
  DocumentSummary,
  DocumentRevision,
  FactSummary,
  HealthResponse,
  InfraGraph,
  PairResponse,
  Relationship,
  Server,
  Service,
  SpaceSummary,
  SyncOutboxEntry,
  SnapshotHealth,
  RestoreJob,
  SiaBackupHookStatus,
  RestorePlan,
  TraceEntry,
} from '../types/infrastructure';

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

  getSpaces: () => request<SpaceSummary[]>('/v1/spaces'),

  getCollections: () => request<CollectionSummary[]>('/v1/collections'),
  createCollection: (body: {
    id: string;
    space_id?: string | null;
    name: string;
    schema_version?: string | null;
    visibility?: string;
    owner_type?: string;
    owner_id?: string | null;
    policy?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) => request<CollectionSummary>('/v1/collections', { method: 'POST', body: JSON.stringify(body) }),
  getCollectionDocs: (collectionId: string) => request<DocumentSummary[]>(`/v1/collections/${collectionId}/docs`),
  createCollectionDoc: (
    collectionId: string,
    body: {
      path?: string | null;
      type: string;
      title?: string | null;
      content?: string | null;
      data?: Record<string, unknown>;
      tags?: string[];
      created_by?: string | null;
    }
  ) => request<DocumentSummary>(`/v1/collections/${collectionId}/docs`, { method: 'POST', body: JSON.stringify(body) }),
  getCollectionDoc: (docId: string) => request<DocumentSummary>(`/v1/collections/docs/${docId}`),
  updateCollectionDoc: (
    docId: string,
    body: {
      title?: string | null;
      content?: string | null;
      data?: Record<string, unknown> | null;
      tags?: string[] | null;
      updated_by?: string | null;
      change_reason?: string | null;
    }
  ) => request<DocumentSummary>(`/v1/collections/docs/${docId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getCollectionPermissions: (collectionId: string) =>
    request<CollectionPermission[]>(`/v1/collections/${collectionId}/permissions`),
  createCollectionPermission: (
    collectionId: string,
    body: { subject_type: string; subject_id: string; permissions: string[] }
  ) => request<CollectionPermission>(`/v1/collections/${collectionId}/permissions`, { method: 'POST', body: JSON.stringify(body) }),
  getDocumentRevisions: (docId: string) => request<DocumentRevision[]>(`/v1/collections/docs/${docId}/revisions`),

  getSyncPending: () => request<SyncOutboxEntry[]>('/v1/sync/pending'),
  createSyncPending: (body: {
    target_space?: string | null;
    target_collection?: string | null;
    source_agent?: string | null;
    source_device?: string | null;
    payload?: Record<string, unknown>;
    scheduled_at?: string | null;
  }) => request<SyncOutboxEntry>('/v1/sync/pending', { method: 'POST', body: JSON.stringify(body) }),
  updateSyncPending: (id: string, body: { status: string; retry_count?: number | null; last_error?: string | null }) =>
    request<SyncOutboxEntry>(`/v1/sync/pending/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getBackupStatus: () => request<SnapshotHealth[]>('/v1/backups/status'),
  getRestorePlan: () => request<RestorePlan>('/v1/backups/restore-plan'),
  getRestoreJobs: () => request<RestoreJob[]>('/v1/backups/restore/jobs'),
  createRestoreJob: (body: {
    mode?: string;
    target_snapshot_id?: string;
    target_snapshot_kind?: string;
    target_location?: string;
    created_by?: string | null;
  }) => request<RestoreJob>('/v1/backups/restore/jobs', { method: 'POST', body: JSON.stringify(body) }),
  runRestoreJob: (id: string) => request<{ status: string; job: RestoreJob }>(`/v1/backups/restore/jobs/${id}/run`, { method: 'POST' }),
  getSiaBackupHookStatus: () => request<SiaBackupHookStatus>('/v1/backups/sia-hook'),
  recordBackupStatus: (body: { kind: string; status: string; location?: string | null; size_bytes?: number | null; details?: Record<string, unknown> }) =>
    request<SnapshotHealth>('/v1/backups/status', { method: 'POST', body: JSON.stringify(body) }),
  runBackupSnapshot: () => request<{ status: string; snapshot: SnapshotHealth }>('/v1/backups/run', { method: 'POST' }),
  testSiaBackupHook: () => request<{ status: string; snapshot: SnapshotHealth; test_dir: string }>('/v1/backups/sia-hook/test', { method: 'POST' }),

  getFacts: (filters?: { space?: string; space_id?: string; type?: string; tag?: string; target_agent?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.space) params.append('space', filters.space);
    if (filters?.space_id) params.append('space_id', filters.space_id);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tag) params.append('tag', filters.tag);
    if (filters?.target_agent) params.append('target_agent', filters.target_agent);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString();
    return request<FactSummary[]>(`/v1/facts${query ? `?${query}` : ''}`);
  },
  createFact: (body: { space?: string; space_id?: string; content: string; type: string; tags?: string[]; agent_id?: string; metadata?: Record<string, unknown> }) =>
    request<{ id: string; status: string; fact: FactSummary }>('/v1/facts', { method: 'POST', body: JSON.stringify(body) }),

  getAgentTrace: (filters?: { agent_id?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.agent_id) params.append('agent_id', filters.agent_id);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString();
    return request<TraceEntry[]>(`/v1/agents/trace${query ? `?${query}` : ''}`);
  },
};
