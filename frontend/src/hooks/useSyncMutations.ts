import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RNA_QUERY_KEYS } from './useRNAData';

export function useCreateSyncPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSyncPending,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.syncPending });
    },
  });
}

export function useUpdateSyncPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: string; retry_count?: number | null; last_error?: string | null }) =>
      api.updateSyncPending(input.id, {
        status: input.status,
        retry_count: input.retry_count ?? null,
        last_error: input.last_error ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.syncPending });
    },
  });
}
