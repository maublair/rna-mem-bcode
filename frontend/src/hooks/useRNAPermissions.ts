import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RNA_QUERY_KEYS } from './useRNAData';

export function useCreateCollectionPermission(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject_type: string; subject_id: string; permissions: string[] }) =>
      api.createCollectionPermission(collectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collectionPermissions(collectionId) });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.collections });
    },
  });
}
