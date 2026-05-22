import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export const QUERY_KEYS = {
  servers: ['infrastructure', 'servers'] as const,
  services: ['infrastructure', 'services'] as const,
  devices: ['infrastructure', 'devices'] as const,
  relationships: (filters?: object) => ['infrastructure', 'relationships', filters] as const,
  graph: ['infrastructure', 'graph'] as const,
  health: ['health'] as const,
};

export function useServers() {
  return useQuery({
    queryKey: QUERY_KEYS.servers,
    queryFn: api.getServers,
    staleTime: 30 * 1000,
  });
}

export function useServices() {
  return useQuery({
    queryKey: QUERY_KEYS.services,
    queryFn: api.getServices,
    staleTime: 30 * 1000,
  });
}

export function useDevices() {
  return useQuery({
    queryKey: QUERY_KEYS.devices,
    queryFn: api.getDevices,
    staleTime: 30 * 1000,
  });
}

export function useGraph() {
  return useQuery({
    queryKey: QUERY_KEYS.graph,
    queryFn: api.getGraph,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: api.getHealth,
    refetchInterval: 60 * 1000,
  });
}
