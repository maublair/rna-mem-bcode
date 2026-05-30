import { useState } from 'react';
import { useDevices, useGraph, useHealth, useServers, useServices } from '../hooks/useInfrastructure';
import { useFactsData, useTraceData } from '../hooks/useRNAData';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { WikiView } from '../components/wiki/WikiView';
import { GraphView } from '../components/graph/GraphView';
import { EntityDetail } from '../components/wiki/EntityDetail';

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4 shadow-inner shadow-black/20">
      <div className={`text-[11px] uppercase tracking-[0.22em] ${tone}`}>{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}

export function DashboardPage() {
  const [viewMode, setViewMode] = useState<'wiki' | 'graph'>('wiki');
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null);

  const serversQuery = useServers();
  const servicesQuery = useServices();
  const devicesQuery = useDevices();
  const graphQuery = useGraph();
  const healthQuery = useHealth();
  const factsQuery = useFactsData({ space: 'operacional', limit: 8 });
  const traceQuery = useTraceData({ limit: 8 });

  const servers = serversQuery.data || [];
  const services = servicesQuery.data || [];
  const devices = devicesQuery.data || [];
  const facts = factsQuery.data || [];
  const traces = traceQuery.data || [];

  const isLoading = serversQuery.isLoading || servicesQuery.isLoading || devicesQuery.isLoading;

  const selectedData =
    selectedEntity?.type === 'server'
      ? servers.find((s) => s.id === selectedEntity.id)
      : selectedEntity?.type === 'service'
        ? services.find((s) => s.id === selectedEntity.id)
        : selectedEntity?.type === 'device'
          ? devices.find((d) => d.id === selectedEntity.id)
          : null;

  return (
    <ConsoleShell
      title="Operations Console"
      subtitle="Dashboard"
      isHealthy={healthQuery.data?.status === 'healthy'}
      rightPanel={
        selectedEntity && selectedData ? (
          <EntityDetail
            entityType={selectedEntity.type}
            data={selectedData}
            onClose={() => setSelectedEntity(null)}
          />
        ) : null
      }
    >
      <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_25%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.12),_transparent_24%)]">
        <div className="p-6 space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                  RNA Control Surface
                </div>
                <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-white">
                  A professional continuity console for memory, graph, and operational handoff.
                </h2>
                <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-300">
                  Use this page when you need the current state of the stack, the most recent learnings, and a visual path
                  to resume work without repeating the same diagnosis.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:min-w-[320px]">
                <StatCard label="Servers" value={servers.length} tone="text-indigo-300" />
                <StatCard label="Services" value={services.length} tone="text-cyan-300" />
                <StatCard label="Devices" value={devices.length} tone="text-emerald-300" />
                <StatCard label="Health" value={healthQuery.data?.status ?? 'unknown'} tone="text-amber-300" />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/78 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Mode</h3>
                  <p className="text-sm text-slate-400">Narrative wiki or structural graph.</p>
                </div>
                <div className="inline-flex rounded-full border border-white/10 bg-slate-900 p-1">
                  <button
                    onClick={() => setViewMode('wiki')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      viewMode === 'wiki' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Wiki
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      viewMode === 'graph' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Graph
                  </button>
                </div>
              </div>

              <div className="mt-4 min-h-[58vh] rounded-3xl border border-white/10 bg-slate-950/55 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[58vh] text-slate-400">Loading infrastructure...</div>
                ) : viewMode === 'wiki' ? (
                  <WikiView
                    servers={servers}
                    services={services}
                    devices={devices}
                    onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
                  />
                ) : (
                  <GraphView
                    graph={graphQuery.data}
                    isLoading={graphQuery.isLoading}
                    onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
                  />
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Current Handoff</h3>
              <p className="mt-2 text-sm text-slate-300">
                The next agent should see this before touching any stack or prompt.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Recent facts</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{facts.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Recent traces</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{traces.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Continuity rule</div>
                  <div className="mt-2 text-sm text-slate-200">
                    Prefer RNA summaries, topic relations, and handoff cards before raw logs or re-diagnosis.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Recent Learning</h3>
              <div className="mt-4 space-y-3">
                {facts.map((fact) => (
                  <article key={fact.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">{fact.type}</div>
                      <div className="text-[11px] text-slate-500">{new Date(fact.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-100">{fact.content}</div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Recent Traces</h3>
              <div className="mt-4 space-y-3">
                {traces.map((trace) => (
                  <article key={trace.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white">{trace.agent_id}</div>
                      <div className="text-[11px] text-slate-500">{new Date(trace.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-300 line-clamp-3">{trace.command}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">{trace.status}</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </ConsoleShell>
  );
}
