import { useState } from 'react';
import { useServers, useServices, useDevices, useGraph, useHealth } from '../hooks/useInfrastructure';
import { AppShell } from '../components/layout/AppShell';
import { WikiView } from '../components/wiki/WikiView';
import { GraphView } from '../components/graph/GraphView';
import { EntityDetail } from '../components/wiki/EntityDetail';

export function DashboardPage() {
  const [viewMode, setViewMode] = useState<'wiki' | 'graph'>('wiki');
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null);

  const serversQuery = useServers();
  const servicesQuery = useServices();
  const devicesQuery = useDevices();
  const graphQuery = useGraph();
  const healthQuery = useHealth();

  const isLoading = serversQuery.isLoading || servicesQuery.isLoading || devicesQuery.isLoading;

  const selectedData =
    selectedEntity?.type === 'server'
      ? serversQuery.data?.find((s) => s.id === selectedEntity.id)
      : selectedEntity?.type === 'service'
        ? servicesQuery.data?.find((s) => s.id === selectedEntity.id)
        : selectedEntity?.type === 'device'
          ? devicesQuery.data?.find((d) => d.id === selectedEntity.id)
          : null;

  const handleSelectEntity = (type: string, id: string) => {
    setSelectedEntity({ type, id });
  };

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
            onSelectEntity={handleSelectEntity}
          />
        ) : (
          <GraphView
            graph={graphQuery.data}
            isLoading={graphQuery.isLoading}
            onSelectEntity={handleSelectEntity}
          />
        )
      }
      detailPanel={
        selectedEntity && selectedData ? (
          <EntityDetail
            entityType={selectedEntity.type}
            data={selectedData}
            onClose={() => setSelectedEntity(null)}
          />
        ) : null
      }
    />
  );
}
