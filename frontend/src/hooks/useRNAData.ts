import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export const RNA_QUERY_KEYS = {
  spaces: ['rna', 'spaces'] as const,
  collections: ['rna', 'collections'] as const,
  facts: (filters?: object) => ['rna', 'facts', filters] as const,
  collectionDocs: (collectionId: string) => ['rna', 'collection-docs', collectionId] as const,
  collectionDoc: (docId: string) => ['rna', 'collection-doc', docId] as const,
  collectionPermissions: (collectionId: string) => ['rna', 'collection-permissions', collectionId] as const,
  documentRevisions: (docId: string) => ['rna', 'document-revisions', docId] as const,
  syncPending: ['rna', 'sync-pending'] as const,
  backupStatus: ['rna', 'backup-status'] as const,
  restorePlan: ['rna', 'restore-plan'] as const,
  restoreJobs: ['rna', 'restore-jobs'] as const,
  siaBackupHook: ['rna', 'sia-backup-hook'] as const,
  trace: (filters?: object) => ['rna', 'trace', filters] as const,
};

export function useSpacesData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.spaces,
    queryFn: api.getSpaces,
    staleTime: 30 * 1000,
  });
}

export function useCollectionsData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.collections,
    queryFn: api.getCollections,
    staleTime: 30 * 1000,
  });
}

export function useFactsData(filters?: { space?: string; space_id?: string; type?: string; tag?: string; target_agent?: string; limit?: number }) {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.facts(filters),
    queryFn: () => api.getFacts(filters),
    staleTime: 15 * 1000,
  });
}

export function useCollectionDocsData(collectionId?: string) {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.collectionDocs(collectionId || 'all'),
    queryFn: () => api.getCollectionDocs(collectionId || ''),
    enabled: Boolean(collectionId),
    staleTime: 15 * 1000,
  });
}

export function useCollectionPermissionsData(collectionId?: string) {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.collectionPermissions(collectionId || 'all'),
    queryFn: () => api.getCollectionPermissions(collectionId || ''),
    enabled: Boolean(collectionId),
    staleTime: 15 * 1000,
  });
}

export function useDocumentRevisionsData(docId?: string) {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.documentRevisions(docId || 'all'),
    queryFn: () => api.getDocumentRevisions(docId || ''),
    enabled: Boolean(docId),
    staleTime: 15 * 1000,
  });
}

export function useSyncPendingData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.syncPending,
    queryFn: api.getSyncPending,
    staleTime: 10 * 1000,
  });
}

export function useBackupStatusData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.backupStatus,
    queryFn: api.getBackupStatus,
    staleTime: 10 * 1000,
  });
}

export function useRestorePlanData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.restorePlan,
    queryFn: api.getRestorePlan,
    staleTime: 10 * 1000,
  });
}

export function useRestoreJobsData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.restoreJobs,
    queryFn: api.getRestoreJobs,
    staleTime: 10 * 1000,
  });
}

export function useSiaBackupHookData() {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.siaBackupHook,
    queryFn: api.getSiaBackupHookStatus,
    staleTime: 10 * 1000,
  });
}

export function useTraceData(filters?: { agent_id?: string; limit?: number }) {
  return useQuery({
    queryKey: RNA_QUERY_KEYS.trace(filters),
    queryFn: () => api.getAgentTrace(filters),
    staleTime: 10 * 1000,
  });
}
