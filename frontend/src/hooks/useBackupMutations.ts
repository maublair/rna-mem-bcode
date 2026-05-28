import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RNA_QUERY_KEYS } from './useRNAData';

export function useRecordBackupStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.recordBackupStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.backupStatus });
    },
  });
}

export function useRunBackupSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runBackupSnapshot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.backupStatus });
    },
  });
}

export function useTestSiaBackupHook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.testSiaBackupHook,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.backupStatus });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.siaBackupHook });
    },
  });
}

export function useCreateRestoreJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRestoreJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.restoreJobs });
    },
  });
}

export function useRunRestoreJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runRestoreJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.restoreJobs });
      qc.invalidateQueries({ queryKey: RNA_QUERY_KEYS.backupStatus });
    },
  });
}
