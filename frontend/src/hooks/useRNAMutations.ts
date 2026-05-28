import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RNA_QUERY_KEYS } from './useRNAData';

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCollection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collections });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.spaces });
    },
  });
}

export function useCreateCollectionDoc(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createCollectionDoc>[1]) => api.createCollectionDoc(collectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collectionDocs(collectionId) });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collections });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.facts() });
    },
  });
}

export function useUpdateCollectionDoc(docId: string, collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateCollectionDoc>[1]) => api.updateCollectionDoc(docId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collectionDocs(collectionId) });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collectionDoc(docId) });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.facts() });
    },
  });
}
