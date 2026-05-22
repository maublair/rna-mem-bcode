import { useState } from 'react';
import { useServers, useServices, useDevices, useGraph, useHealth } from '../hooks/useInfrastructure';
import { AppShell } from '../components/layout/AppShell';
import { WikiView } from '../components/wiki/WikiView';
import { GraphView } from '../components/graph/GraphView';

export function DashboardPage() {
  const [viewMode, setViewMode] = useState<'wiki' | 'graph'>('wiki');

  const serversQuery = useServers();
  const servicesQuery = useServices();
  const devicesQuery = useDevices();
  const graphQuery = useGraph();
  const healthQuery = useHealth();

  const isLoading = serversQuery.isLoading || servicesQuery.isLoading || devicesQuery.isLoading;

  return (
    <AppShell
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      isHealthy={healthQuery.data?.status === 'healthy'}
      mainContent={
        isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400">Loading infrastructure...</div>
          </div>
        ) : viewMode === 'wiki' ? (
          <WikiView
            servers={serversQuery.data || []}
            services={servicesQuery.data || []}
            devices={devicesQuery.data || []}
          />
        ) : (
          <GraphView graph={graphQuery.data} isLoading={graphQuery.isLoading} />
        )
      }
    />
  );
}
