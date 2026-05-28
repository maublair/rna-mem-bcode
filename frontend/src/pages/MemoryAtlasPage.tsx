import { useMemo, useState } from 'react';
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useCollectionsData, useFactsData, useTraceData } from '../hooks/useRNAData';
import { useHealth } from '../hooks/useInfrastructure';
import type { CollectionSummary, FactSummary, TraceEntry } from '../types/infrastructure';

type TopicNode = {
  id: string;
  label: string;
  kind: 'space' | 'collection' | 'topic' | 'session';
  detail: string;
  count: number;
  color: string;
};

function buildSessionLabel(trace: TraceEntry) {
  const when = new Date(trace.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${trace.agent_id} · ${trace.session_id || 'session'} · ${when}`;
}

function deriveTopics(
  facts: FactSummary[],
  collections: CollectionSummary[],
  traces: TraceEntry[]
): { nodes: TopicNode[]; edges: { id: string; source: string; target: string; label?: string }[] } {
  const nodes: TopicNode[] = [];
  const edges: { id: string; source: string; target: string; label?: string }[] = [];
  const seen = new Map<string, TopicNode>();
  const addNode = (node: TopicNode) => {
    if (!seen.has(node.id)) {
      seen.set(node.id, node);
      nodes.push(node);
    }
  };

  addNode({
    id: 'space:operacional',
    label: 'operacional',
    kind: 'space',
    detail: 'Current operational memory space',
    count: facts.filter((fact) => fact.space_id === 'operacional').length,
    color: '#14b8a6',
  });

  collections.slice(0, 12).forEach((collection) => {
    const id = `collection:${collection.id}`;
    addNode({
      id,
      label: collection.name,
      kind: 'collection',
      detail: collection.space_id || 'global collection',
      count: 1,
      color: '#38bdf8',
    });
    if (collection.space_id === 'operacional') {
      edges.push({ id: `e-space-${collection.id}`, source: 'space:operacional', target: id, label: 'contains' });
    }
  });

  const tagCounts = new Map<string, number>();
  const tagToFacts = new Map<string, string[]>();
  facts.forEach((fact) => {
    (fact.tags || []).forEach((tag) => {
      const key = tag.toLowerCase();
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      const factNodeId = `fact:${fact.id}`;
      tagToFacts.set(key, [...(tagToFacts.get(key) || []), factNodeId]);
    });

    addNode({
      id: `fact:${fact.id}`,
      label: fact.content.slice(0, 48),
      kind: 'topic',
      detail: [fact.type, fact.space_id, ...(fact.tags || [])].filter(Boolean).join(' • '),
      count: 1,
      color: '#a78bfa',
    });
    if (fact.space_id === 'operacional') {
      edges.push({ id: `ef-${fact.id}`, source: 'space:operacional', target: `fact:${fact.id}`, label: fact.type });
    }
  });

  const topicNodes = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([tag, count]) => {
      const id = `topic:${tag}`;
      addNode({
        id,
        label: tag,
        kind: 'topic',
        detail: `${count} fact(s) share this topic`,
        count,
        color: '#f59e0b',
      });
      const relatedFacts = tagToFacts.get(tag) || [];
      relatedFacts.slice(0, 8).forEach((factId) => {
        edges.push({ id: `e-${id}-${factId}`, source: id, target: factId, label: 'related' });
      });
      return { id, tag, count };
    });

  topicNodes.slice(0, 5).forEach((topic, index) => {
    const next = topicNodes[index + 1];
    if (next) {
      edges.push({ id: `r-${topic.id}-${next.id}`, source: topic.id, target: next.id, label: 'cluster' });
    }
  });

  const sessionGroups = new Map<string, TraceEntry[]>();
  traces.slice(0, 30).forEach((trace) => {
    const key = trace.session_id || `${trace.agent_id}:${new Date(trace.created_at).toISOString().slice(0, 10)}`;
    const list = sessionGroups.get(key) || [];
    list.push(trace);
    sessionGroups.set(key, list);
  });

  Array.from(sessionGroups.entries())
    .slice(0, 12)
    .forEach(([sessionId, list]) => {
      const latest = list[list.length - 1];
      const nodeId = `session:${sessionId}`;
      addNode({
        id: nodeId,
        label: latest.agent_id,
        kind: 'session',
        detail: `${list.length} trace event(s)`,
        count: list.length,
        color: '#22c55e',
      });
      const connectedTopic = topicNodes[0];
      if (connectedTopic) {
        edges.push({ id: `es-${nodeId}-${connectedTopic.id}`, source: nodeId, target: connectedTopic.id, label: 'active' });
      }
    });

  return { nodes, edges };
}

function MemoryNode({ data }: any) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-[0_0_30px_rgba(2,132,199,0.08)] backdrop-blur"
      style={{ minWidth: 180 }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: data.color }} />
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{data.kind}</div>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-100 leading-snug">{data.label}</div>
      <div className="mt-1 text-[11px] text-slate-400">{data.detail}</div>
      <div className="mt-2 text-[11px] text-cyan-300/80">{data.count} item(s)</div>
    </div>
  );
}

const nodeTypes = { memory: MemoryNode };

export function MemoryAtlasPage() {
  const healthQuery = useHealth();
  const facts = useFactsData({ limit: 100 }).data || [];
  const collections = useCollectionsData().data || [];
  const traces = useTraceData({ limit: 60 }).data || [];
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => deriveTopics(facts, collections, traces), [facts, collections, traces]);

  const layout = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 220, nodesep: 80 });
    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 220, height: 110 }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);
    return {
      nodes: nodes.map((node) => {
        const pos = dagreGraph.node(node.id) || { x: 0, y: 0 };
        return {
          id: node.id,
          type: 'memory',
          data: node,
          position: { x: pos.x - 110, y: pos.y - 55 },
        } as Node;
      }),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: edge.label === 'active',
        style: { stroke: edge.label === 'active' ? '#22c55e' : '#475569', strokeWidth: 1.5 },
      })) as Edge[],
    };
  }, [nodes, edges]);

  const topicFacts = useMemo(() => {
    if (!selectedTopic) return facts.slice(0, 8);
    const needle = selectedTopic.replace(/^topic:/, '').replace(/^fact:/, '').toLowerCase();
    return facts.filter((fact) => fact.content.toLowerCase().includes(needle) || (fact.tags || []).some((tag) => tag.toLowerCase() === needle)).slice(0, 10);
  }, [facts, selectedTopic]);

  const recentTrace = traces[0];

  return (
    <ConsoleShell title="Operations Console" subtitle="Memory Atlas" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
        <div className="p-6 space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                  Continuity-first memory
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">RNA Memory Atlas</h2>
                  <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-300">
                    Obsidian-like navigation for sessions, topics, and relationships. This is the layer that lets any agent
                    resume work without reopening raw logs, while still keeping the full structure visible when needed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">sessions</span>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">topics</span>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">relations</span>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">handoff cards</span>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">token savings</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[360px]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Facts</div>
                  <div className="mt-2 text-3xl font-semibold text-white">{facts.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Topics</div>
                  <div className="mt-2 text-3xl font-semibold text-white">{nodes.filter((n) => n.kind === 'topic').length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Sessions</div>
                  <div className="mt-2 text-3xl font-semibold text-white">{nodes.filter((n) => n.kind === 'session').length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Health</div>
                  <div className="mt-2 text-3xl font-semibold text-white">{healthQuery.data?.status ?? 'unknown'}</div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_0.95fr] gap-6 min-h-[72vh]">
            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 overflow-hidden shadow-2xl shadow-black/30">
              <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Topic Graph</div>
                  <div className="text-xs text-slate-400">Relationships derived from facts, collections and sessions</div>
                </div>
                <div className="text-xs text-slate-500">drag, zoom, explore</div>
              </div>
              <div className="h-[calc(72vh-68px)]">
                <ReactFlow
                  nodes={layout.nodes}
                  edges={layout.edges}
                  nodeTypes={nodeTypes}
                  fitView
                  onNodeClick={(_, node) => setSelectedTopic(node.id)}
                >
                  <Background color="rgba(148,163,184,0.18)" gap={24} />
                  <Controls />
                  <MiniMap
                    nodeColor={(node) => (node.data as TopicNode)?.color || '#22d3ee'}
                    style={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </ReactFlow>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-semibold text-white">Handoff Card</div>
                <p className="mt-2 text-sm text-slate-300">
                  What the next agent should know before continuing the work.
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Active topic</div>
                    <div className="mt-1 font-medium text-white">{selectedTopic || 'none selected'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Latest trace</div>
                    <div className="mt-1 font-medium text-white">{recentTrace ? buildSessionLabel(recentTrace) : 'no trace data'}</div>
                    <div className="mt-2 text-slate-300">{recentTrace?.command?.slice(0, 140) || 'No command context yet.'}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Related facts</div>
                    <div className="text-xs text-slate-400">Filtered by the selected node</div>
                  </div>
                  <div className="text-xs text-slate-500">{topicFacts.length} shown</div>
                </div>
                <div className="mt-4 space-y-3 max-h-[38vh] overflow-auto pr-1">
                  {topicFacts.map((fact) => (
                    <article key={fact.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">{fact.type}</div>
                        <div className="text-[11px] text-slate-500">{new Date(fact.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-100">{fact.content}</div>
                      <div className="mt-2 text-xs text-slate-400">{(fact.tags || []).join(' • ') || 'no tags'}</div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-semibold text-white">Continuity policy</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300 list-disc list-inside">
                  <li>Prefer the session summary before any raw trace.</li>
                  <li>Use related topics to continue adjacent work without replaying the same investigation.</li>
                  <li>Write a handoff card after every meaningful fix.</li>
                  <li>Keep the graph visible so the next agent can see dependencies at a glance.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
