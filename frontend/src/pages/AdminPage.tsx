import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useHealth } from '../hooks/useInfrastructure';
import { useTraceData, useFactsData, useCollectionsData } from '../hooks/useRNAData';

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function AdminPage() {
  const healthQuery = useHealth();
  const traces = useTraceData({ limit: 25 }).data || [];
  const facts = useFactsData({ space: 'operacional', limit: 25 }).data || [];
  const collections = useCollectionsData().data || [];

  return (
    <ConsoleShell title="Operations Console" subtitle="Admin" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.10),_transparent_24%)]">
        <div className="p-6 space-y-6">
          <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl shadow-black/20 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
              Governance layer
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-3">Admin and Governance</h2>
            <p className="text-sm text-slate-300 max-w-3xl">
              This is where SIA should review execution, memory, audit trails, and operational learning without flattening the context.
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Metric label="Health" value={healthQuery.data?.status ?? 'unknown'} />
            <Metric label="Collections" value={collections.length} />
            <Metric label="Operational facts" value={facts.length} />
            <Metric label="Trace entries" value={traces.length} />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Recent trace</h3>
                  <p className="text-sm text-slate-400">Command trail, status, and result summary.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400">{traces.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {traces.map((trace) => (
                  <article key={trace.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-100">{trace.agent_id}</div>
                    <div className="text-xs text-slate-500">{new Date(trace.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">{trace.command}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-400/80">{trace.status}</div>
                  {trace.result_summary && <div className="mt-2 text-sm text-slate-400">{trace.result_summary}</div>}
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Operational learnings</h3>
                  <p className="text-sm text-slate-400">Facts worth preserving and reusing across agents.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400">{facts.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {facts.map((fact) => (
                  <article key={fact.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">{fact.type}</div>
                    <div className="text-xs text-slate-500">{new Date(fact.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{fact.content}</div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
