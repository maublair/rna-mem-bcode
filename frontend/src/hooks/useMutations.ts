import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { QUERY_KEYS } from './useInfrastructure';
import { Device, Relationship, Server, Service } from '../types/infrastructure';

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Server, 'id' | 'created_at' | 'updated_at'>) => api.createServer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.servers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.graph });
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => api.createService(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.services });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.graph });
    },
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Device, 'id' | 'created_at' | 'updated_at'>) => api.createDevice(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.devices });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.graph });
    },
  });
}

export function useCreateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Relationship, 'id'>) => api.createRelationship(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.relationships() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.graph });
    },
  });
}
