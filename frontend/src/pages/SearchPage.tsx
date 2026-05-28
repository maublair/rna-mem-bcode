import { useMemo, useState } from 'react';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useCollectionsData, useFactsData } from '../hooks/useRNAData';
import { useHealth } from '../hooks/useInfrastructure';
import type { CollectionSummary, FactSummary } from '../types/infrastructure';

type SearchHit =
  | { kind: 'collection'; id: string; title: string; meta: string; data: CollectionSummary }
  | { kind: 'fact'; id: string; title: string; meta: string; data: FactSummary };

export function SearchPage() {
  const [query, setQuery] = useState('');
  const healthQuery = useHealth();
  const collections = useCollectionsData().data || [];
  const facts = useFactsData({ limit: 100 }).data || [];

  const hits = useMemo<SearchHit[]>(() => {
    const needle = query.trim().toLowerCase();
    const collectionHits: SearchHit[] = collections.map((collection) => ({
      kind: 'collection',
      id: collection.id,
      title: collection.name,
      meta: [collection.space_id, collection.visibility, collection.owner_type].filter(Boolean).join(' • '),
      data: collection,
    }));
    const factHits: SearchHit[] = facts.map((fact) => ({
      kind: 'fact',
      id: fact.id,
      title: fact.content.slice(0, 80),
      meta: [fact.space_id, fact.type, fact.tags?.join(', ')].filter(Boolean).join(' • '),
      data: fact,
    }));
    const pool = [...collectionHits, ...factHits];
    if (!needle) return pool;
    return pool.filter((item) => `${item.kind} ${item.title} ${item.meta} ${item.id}`.toLowerCase().includes(needle));
  }, [collections, facts, query]);

  return (
    <ConsoleShell title="Operations Console" subtitle="Search" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.10),_transparent_24%)]">
        <div className="p-6 space-y-6">
        <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl shadow-black/20 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
            Knowledge lookup
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-3">Unified Search</h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            This searches the real RNA collections and operational facts. It is the first step toward a full knowledge search.
          </p>
        </header>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search collections, spaces, facts..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none shadow-inner shadow-black/20"
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {hits.map((hit) => (
            <article key={`${hit.kind}:${hit.id}`} className="rounded-2xl border border-white/10 bg-slate-950/65 p-4 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">{hit.kind}</div>
                <div className="text-xs text-slate-500 font-mono">{hit.id}</div>
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-100">{hit.title}</div>
              <div className="mt-1 text-sm text-slate-400">{hit.meta || 'No metadata'}</div>
              {hit.kind === 'fact' ? (
                <div className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">{hit.data.content}</div>
              ) : (
                <div className="mt-3 text-sm text-slate-300">
                  Space: {hit.data.space_id || 'none'} • Owner: {hit.data.owner_type}
                </div>
              )}
            </article>
          ))}
        </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
