import { useMemo, useState, type ReactNode } from 'react';
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useHealth } from '../hooks/useInfrastructure';
import {
  useCollectionsData,
  useFactsData,
  useHandoffCardsData,
  useProjectDetailData,
  useProjectFilesData,
  useProjectsData,
  useSessionsData,
  useSpacesData,
  useTopicRelationsData,
  useTopicsData,
  useTraceData,
} from '../hooks/useRNAData';
import type {
  CollectionSummary,
  FactSummary,
  HandoffCardSummary,
  ProjectFileSummary,
  ProjectSummary,
  SessionSummary,
  SpaceSummary,
  TopicRelationSummary,
  TopicSummary,
} from '../types/infrastructure';

type AtlasKind = 'space' | 'project' | 'file' | 'collection' | 'topic' | 'session' | 'handoff' | 'fact' | 'trace' | 'relation';

type AtlasSelection =
  | { kind: 'space'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'file'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'topic'; id: string }
  | { kind: 'session'; id: string }
  | { kind: 'handoff'; id: string }
  | { kind: 'fact'; id: string }
  | { kind: 'trace'; id: string }
  | { kind: 'relation'; id: string };

type AtlasNode = {
  id: string;
  kind: AtlasKind;
  label: string;
  detail: string;
  count: number;
  accent: string;
};

function formatDate(value?: string | null) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

function shortText(value?: string | null, max = 120) {
  if (!value) return 'n/a';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function AtlasCard({ title, value, tone }: { title: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_0_30px_rgba(2,6,23,0.35)]">
      <div className={`text-[11px] uppercase tracking-[0.24em] ${tone}`}>{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400">{children}</span>;
}

function MemoryNode({ data }: any) {
  return (
    <div
      className="min-w-[190px] rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-[0_0_30px_rgba(15,23,42,0.55)] backdrop-blur"
      style={{ boxShadow: `0 0 0 1px color-mix(in srgb, ${data.accent} 25%, transparent), 0 18px 48px rgba(2, 6, 23, 0.55)` }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: data.accent }} />
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{data.kind}</div>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-50 leading-snug">{data.label}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-slate-400">{data.detail}</div>
      <div className="mt-2 text-[11px] text-cyan-300/90">{data.count} item(s)</div>
    </div>
  );
}

const nodeTypes = { memory: MemoryNode };

function buildAtlas(
  spaces: SpaceSummary[],
  projects: ProjectSummary[],
  files: ProjectFileSummary[],
  collections: CollectionSummary[],
  facts: FactSummary[],
  sessions: SessionSummary[],
  topics: TopicSummary[],
  relations: TopicRelationSummary[],
  handoffs: HandoffCardSummary[]
): { nodes: AtlasNode[]; edges: { id: string; source: string; target: string; label?: string }[] } {
  const nodes: AtlasNode[] = [];
  const edges: { id: string; source: string; target: string; label?: string }[] = [];
  const seen = new Set<string>();
  const addNode = (node: AtlasNode) => {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
  };

  spaces.forEach((space) => {
    addNode({
      id: `space:${space.id}`,
      kind: 'space',
      label: space.name,
      detail: space.path,
      count: projects.filter((project) => project.space_id === space.id).length,
      accent: '#22c55e',
    });
  });

  projects.slice(0, 20).forEach((project) => {
    addNode({
      id: `project:${project.project_id}`,
      kind: 'project',
      label: project.title,
      detail: shortText(project.objective || project.handoff_card || 'Project memory node', 88),
      count: (project.active_topics || []).length + (project.milestones || []).length,
      accent: '#38bdf8',
    });
    if (project.space_id) {
      edges.push({ id: `e-space-${project.project_id}`, source: `space:${project.space_id}`, target: `project:${project.project_id}`, label: 'contains' });
    }
  });

  files.slice(0, 30).forEach((file) => {
    addNode({
      id: `file:${file.id}`,
      kind: 'file',
      label: file.filename,
      detail: shortText(file.summary || file.content || 'Project file', 88),
      count: file.tags?.length || 0,
      accent: '#a78bfa',
    });
    edges.push({ id: `e-file-${file.id}`, source: `project:${file.project_id}`, target: `file:${file.id}`, label: 'file' });
  });

  collections.slice(0, 16).forEach((collection) => {
    addNode({
      id: `collection:${collection.id}`,
      kind: 'collection',
      label: collection.name,
      detail: collection.space_id || 'global collection',
      count: 1,
      accent: '#f59e0b',
    });
    if (collection.space_id) {
      edges.push({ id: `e-collection-${collection.id}`, source: `space:${collection.space_id}`, target: `collection:${collection.id}`, label: 'contains' });
    }
  });

  topics.slice(0, 24).forEach((topic) => {
    addNode({
      id: `topic:${topic.topic_id}`,
      kind: 'topic',
      label: topic.title,
      detail: shortText(topic.summary || (topic.tags || []).join(' • ') || 'Topic memory', 88),
      count: topic.related_topics?.length || 0,
      accent: '#f97316',
    });
    if (topic.session_id) {
      edges.push({ id: `e-topic-session-${topic.topic_id}`, source: `session:${topic.session_id}`, target: `topic:${topic.topic_id}`, label: 'anchors' });
    }
  });

  sessions.slice(0, 18).forEach((session) => {
    addNode({
      id: `session:${session.session_id}`,
      kind: 'session',
      label: session.agent_id,
      detail: shortText(session.objective || session.summary || 'Session handoff', 88),
      count: 1,
      accent: '#14b8a6',
    });
  });

  handoffs.slice(0, 18).forEach((handoff) => {
    addNode({
      id: `handoff:${handoff.id}`,
      kind: 'handoff',
      label: handoff.agent_id,
      detail: shortText(handoff.summary, 88),
      count: handoff.next_steps.length,
      accent: '#e879f9',
    });
    if (handoff.session_id) {
      edges.push({ id: `e-handoff-session-${handoff.id}`, source: `session:${handoff.session_id}`, target: `handoff:${handoff.id}`, label: 'handoff' });
    }
    if (handoff.topic_id) {
      edges.push({ id: `e-handoff-topic-${handoff.id}`, source: `handoff:${handoff.id}`, target: `topic:${handoff.topic_id}`, label: 'focus' });
    }
  });

  facts.slice(0, 36).forEach((fact) => {
    addNode({
      id: `fact:${fact.id}`,
      kind: 'fact',
      label: shortText(fact.content, 48),
      detail: [fact.type, fact.space_id, ...(fact.tags || [])].filter(Boolean).join(' • '),
      count: 1,
      accent: '#7dd3fc',
    });
    if (fact.source_agent) {
      edges.push({ id: `e-fact-agent-${fact.id}`, source: `session:${fact.source_agent}`, target: `fact:${fact.id}`, label: 'observed' });
    }
  });

  relations.slice(0, 24).forEach((relation) => {
    addNode({
      id: `relation:${relation.id}`,
      kind: 'relation',
      label: relation.relation_type,
      detail: `${relation.source_topic} → ${relation.target_topic}`,
      count: relation.weight,
      accent: '#fb7185',
    });
    edges.push({ id: `e-rel-${relation.id}`, source: `topic:${relation.source_topic}`, target: `topic:${relation.target_topic}`, label: relation.relation_type });
  });

  return { nodes, edges };
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value ?? 'n/a'}</div>
    </div>
  );
}

export function MemoryAtlasPage() {
  const healthQuery = useHealth();
  const spaces = useSpacesData().data || [];
  const projects = useProjectsData().data || [];
  const projectId = projects[0]?.project_id || '';
  const collections = useCollectionsData().data || [];
  const facts = useFactsData({ limit: 120 }).data || [];
  const sessions = useSessionsData({ limit: 60 }).data || [];
  const topics = useTopicsData({ limit: 80 }).data || [];
  const relations = useTopicRelationsData({ limit: 120 }).data || [];
  const handoffs = useHandoffCardsData({ limit: 60 }).data || [];
  const traces = useTraceData({ limit: 60 }).data || [];

  const safeSpaces = Array.isArray(spaces) ? spaces : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCollections = Array.isArray(collections) ? collections : [];
  const safeFacts = Array.isArray(facts) ? facts : [];
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeTopics = Array.isArray(topics) ? topics : [];
  const safeRelations = Array.isArray(relations) ? relations : [];
  const safeHandoffs = Array.isArray(handoffs) ? handoffs : [];
  const safeTraces = Array.isArray(traces) ? traces : [];

  const [selection, setSelection] = useState<AtlasSelection | null>(null);
  const selectedProjectId = selection?.kind === 'project' ? selection.id : projectId;
  const projectDetail = useProjectDetailData(selectedProjectId).data || null;
  const projectFiles = useProjectFilesData(selectedProjectId).data || [];
  const safeProjectFiles = Array.isArray(projectFiles) ? projectFiles : [];

  const { nodes, edges } = useMemo(
    () => buildAtlas(safeSpaces, safeProjects, safeProjectFiles, safeCollections, safeFacts, safeSessions, safeTopics, safeRelations, safeHandoffs),
    [safeSpaces, safeProjects, safeProjectFiles, safeCollections, safeFacts, safeSessions, safeTopics, safeRelations, safeHandoffs]
  );

  const layout = useMemo(() => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'LR', ranksep: 180, nodesep: 70, edgesep: 20 });
    nodes.forEach((node) => graph.setNode(node.id, { width: 220, height: 110 }));
    edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
    dagre.layout(graph);

    return {
      nodes: nodes.map((node) => {
        const pos = graph.node(node.id) || { x: 0, y: 0 };
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
        animated: edge.label === 'handoff',
        style: {
          stroke: edge.label === 'handoff' ? '#e879f9' : edge.label === 'contains' ? '#38bdf8' : '#475569',
          strokeWidth: 1.5,
        },
      })) as Edge[],
    };
  }, [nodes, edges]);

  const selectedProject = selection?.kind === 'project' ? safeProjects.find((project) => project.project_id === selection.id) || projectDetail?.project || null : projectDetail?.project || null;
  const selectedProjectFile = selection?.kind === 'file' ? safeProjectFiles.find((file) => file.id === selection.id) || null : null;
  const selectedSpace = selection?.kind === 'space' ? safeSpaces.find((space) => space.id === selection.id) || null : null;
  const selectedCollection = selection?.kind === 'collection' ? safeCollections.find((collection) => collection.id === selection.id) || null : null;
  const selectedFact = selection?.kind === 'fact' ? safeFacts.find((fact) => fact.id === selection.id) || null : null;
  const selectedSession = selection?.kind === 'session' ? safeSessions.find((session) => session.session_id === selection.id) || null : null;
  const selectedTopic = selection?.kind === 'topic' ? safeTopics.find((topic) => topic.topic_id === selection.id) || null : null;
  const selectedHandoff = selection?.kind === 'handoff' ? safeHandoffs.find((handoff) => handoff.id === selection.id) || null : null;
  const selectedTrace = selection?.kind === 'trace' ? safeTraces.find((trace) => trace.id === selection.id) || null : null;
  const selectedRelation = selection?.kind === 'relation' ? safeRelations.find((relation) => relation.id === selection.id) || null : null;
  const activeProjectFiles = useMemo(() => {
    if (selection?.kind === 'project') {
      return safeProjectFiles.filter((file) => file.project_id === selection.id);
    }
    return safeProjectFiles;
  }, [safeProjectFiles, selection]);

  const focusedNodes = useMemo(() => {
    if (!selection) return layout.nodes;
    const prefix = `${selection.kind}:${selection.id}`;
    return layout.nodes.map((node) => ({
      ...node,
      style: {
        opacity: node.id === prefix ? 1 : node.id.startsWith(`${selection.kind}:`) || node.id.includes(selection.id) ? 0.85 : 0.45,
      },
    }));
  }, [layout.nodes, selection]);

  const currentTitle =
    selection?.kind === 'project'
      ? selectedProject?.title
      : selection?.kind === 'space'
        ? selectedSpace?.name
        : selection?.kind === 'file'
          ? selectedProjectFile?.filename
          : selection?.kind === 'collection'
            ? selectedCollection?.name
            : selection?.kind === 'fact'
              ? selectedFact?.type
              : selection?.kind === 'session'
                ? selectedSession?.agent_id
                : selection?.kind === 'topic'
                  ? selectedTopic?.title
                  : selection?.kind === 'handoff'
                    ? selectedHandoff?.agent_id
                    : selection?.kind === 'trace'
                      ? selectedTrace?.agent_id
                      : selection?.kind === 'relation'
                        ? selectedRelation?.relation_type
                        : 'Atlas';

  return (
    <ConsoleShell title="Operations Console" subtitle="Memory Atlas" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
        <div className="p-5 lg:p-6">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
            <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-[19rem] lg:overflow-auto">
              <section className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                  Continuity-first memory
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">RNA Memory Atlas</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Graph-first, session-first, handoff-first. Click any node to inspect the full object and continue work
                  without re-diagnosing the same context.
                </p>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Quick stats</div>
                <div className="mt-4 space-y-3">
                  <AtlasCard title="Spaces" value={safeSpaces.length} tone="text-emerald-300" />
                  <AtlasCard title="Projects" value={safeProjects.length} tone="text-cyan-300" />
                  <AtlasCard title="Files" value={safeProjectFiles.length} tone="text-violet-300" />
                  <AtlasCard title="Facts" value={safeFacts.length} tone="text-amber-300" />
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Spaces</div>
                <div className="mt-3 space-y-2">
                  {safeSpaces.map((space) => (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => setSelection({ kind: 'space', id: space.id })}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                        selection?.kind === 'space' && selection.id === space.id
                          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{space.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{space.path}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Projects</div>
                <div className="mt-3 space-y-2">
                  {safeProjects.slice(0, 12).map((project) => (
                    <button
                      key={project.project_id}
                      type="button"
                      onClick={() => setSelection({ kind: 'project', id: project.project_id })}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                        selection?.kind === 'project' && selection.id === project.project_id
                          ? 'border-violet-400/40 bg-violet-500/10 text-violet-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{project.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{project.project_id}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Files</div>
                  <Chip>{activeProjectFiles.length}</Chip>
                </div>
                <div className="mt-3 space-y-2">
                  {activeProjectFiles.slice(0, 8).map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSelection({ kind: 'file', id: file.id })}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                        selection?.kind === 'file' && selection.id === file.id
                          ? 'border-violet-400/40 bg-violet-500/10 text-violet-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{file.filename}</div>
                      <div className="mt-1 text-xs text-slate-500">{file.summary || file.mime_type || 'project file'}</div>
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            <main className="min-w-0 flex-1 space-y-5">
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex flex-col gap-5">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                      Obsidian-style atlas
                    </div>
                    <h3 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                      Visual memory for projects, spaces, files, topics and handoff cards.
                    </h3>
                    <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
                      Click a node or a list item to open the full object on the right. The body stays vertical and readable;
                      the graph is there to expose relationships, not to replace the content.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">sessions</span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">topics</span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">relations</span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">projects</span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">files</span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">handoff cards</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <AtlasCard title="Health" value={healthQuery.data?.status ?? 'unknown'} tone="text-emerald-300" />
                    <AtlasCard title="Sessions" value={safeSessions.length} tone="text-cyan-300" />
                    <AtlasCard title="Topics" value={safeTopics.length} tone="text-violet-300" />
                    <AtlasCard title="Relations" value={safeRelations.length} tone="text-amber-300" />
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-slate-950/75 overflow-hidden shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Atlas graph</div>
                    <div className="text-xs text-slate-400">Click nodes to open the full object. Drag, zoom and inspect dependencies.</div>
                  </div>
                  <div className="text-xs text-slate-500">fit, inspect, continue</div>
                </div>
                <div className="h-[64vh] min-h-[540px]">
                  <ReactFlow
                    nodes={focusedNodes}
                    edges={layout.edges}
                    nodeTypes={nodeTypes}
                    fitView
                    onNodeClick={(_, node) => {
                      const [kind, ...rest] = node.id.split(':');
                      setSelection({ kind: kind as AtlasKind, id: rest.join(':') });
                    }}
                  >
                    <Background color="rgba(148,163,184,0.18)" gap={24} />
                    <Controls />
                    <MiniMap
                      nodeColor={(node) => (node.data as AtlasNode)?.accent || '#22d3ee'}
                      style={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </ReactFlow>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Recent memory</div>
                    <div className="text-xs text-slate-400">Facts and traces, so the next agent sees what changed.</div>
                  </div>
                  <div className="text-xs text-slate-500">{safeFacts.length} facts · {safeTraces.length} traces</div>
                </div>
                <div className="mt-4 space-y-3">
                  {safeFacts.slice(0, 6).map((fact) => (
                    <article
                      key={fact.id}
                      className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition-colors hover:border-cyan-400/30 hover:bg-slate-950/70"
                      onClick={() => setSelection({ kind: 'fact', id: fact.id })}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">{fact.type}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(fact.created_at)}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-100">{shortText(fact.content, 160)}</div>
                    </article>
                  ))}
                </div>
              </section>
            </main>

            <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-[25rem] lg:overflow-auto">
              <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.98)_100%)] p-5 shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Detail view</div>
                    <div className="mt-1 text-lg font-semibold text-white">{currentTitle || 'Atlas'}</div>
                  </div>
                  {selection ? (
                    <button
                      type="button"
                      onClick={() => setSelection(null)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 space-y-3">
                  {selection?.kind === 'space' ? (
                    <>
                      <DetailRow label="Type" value="Space" />
                      <DetailRow label="Path" value={selectedSpace?.path} />
                      <DetailRow label="Name" value={selectedSpace?.name} />
                      <DetailRow label="Projects" value={safeProjects.filter((project) => project.space_id === selectedSpace?.id).length} />
                    </>
                  ) : selection?.kind === 'project' ? (
                    <>
                      <DetailRow label="Type" value="Project" />
                      <DetailRow label="Project ID" value={selectedProject?.project_id} />
                      <DetailRow label="Objective" value={selectedProject?.objective || 'n/a'} />
                      <DetailRow label="Status" value={selectedProject?.status} />
                      <DetailRow label="Topics" value={(selectedProject?.active_topics || []).join(' • ') || 'n/a'} />
                      <DetailRow label="Files" value={projectDetail ? projectDetail.file_count : safeProjectFiles.filter((file) => file.project_id === selection.id).length} />
                    </>
                  ) : selection?.kind === 'file' ? (
                    <>
                      <DetailRow label="Type" value="Project file" />
                      <DetailRow label="File" value={selectedProjectFile?.filename} />
                      <DetailRow label="Summary" value={selectedProjectFile?.summary || selectedProjectFile?.content || 'n/a'} />
                      <DetailRow label="Raw content" value={selectedProjectFile?.content || 'n/a'} />
                      <DetailRow label="Tags" value={(selectedProjectFile?.tags || []).join(' • ') || 'n/a'} />
                      <DetailRow label="Source agent" value={selectedProjectFile?.source_agent || 'n/a'} />
                      <DetailRow label="Source device" value={selectedProjectFile?.source_device || 'n/a'} />
                      <DetailRow label="Source runtime" value={selectedProjectFile?.source_runtime || 'n/a'} />
                      <DetailRow label="Source workspace" value={selectedProjectFile?.source_workspace || 'n/a'} />
                    </>
                  ) : selection?.kind === 'collection' ? (
                    <>
                      <DetailRow label="Type" value="Collection" />
                      <DetailRow label="Collection ID" value={selectedCollection?.id} />
                      <DetailRow label="Visibility" value={selectedCollection?.visibility} />
                      <DetailRow label="Owner type" value={selectedCollection?.owner_type} />
                      <DetailRow label="Space" value={selectedCollection?.space_id || 'global'} />
                    </>
                  ) : selection?.kind === 'topic' ? (
                    <>
                      <DetailRow label="Type" value="Topic" />
                      <DetailRow label="Topic ID" value={selectedTopic?.topic_id} />
                      <DetailRow label="Summary" value={selectedTopic?.summary || 'n/a'} />
                      <DetailRow label="Tags" value={(selectedTopic?.tags || []).join(' • ') || 'n/a'} />
                      <DetailRow label="Related topics" value={(selectedTopic?.related_topics || []).join(' • ') || 'n/a'} />
                    </>
                  ) : selection?.kind === 'session' ? (
                    <>
                      <DetailRow label="Type" value="Session" />
                      <DetailRow label="Agent" value={selectedSession?.agent_id} />
                      <DetailRow label="Session ID" value={selectedSession?.session_id} />
                      <DetailRow label="Objective" value={selectedSession?.objective} />
                      <DetailRow label="Summary" value={selectedSession?.summary || 'n/a'} />
                      <DetailRow label="Status" value={selectedSession?.status} />
                    </>
                  ) : selection?.kind === 'handoff' ? (
                    <>
                      <DetailRow label="Type" value="Handoff card" />
                      <DetailRow label="Agent" value={selectedHandoff?.agent_id} />
                      <DetailRow label="Summary" value={selectedHandoff?.summary} />
                      <DetailRow label="Next steps" value={selectedHandoff?.next_steps.join(' • ') || 'n/a'} />
                      <DetailRow label="Blockers" value={selectedHandoff?.blockers.join(' • ') || 'n/a'} />
                      <DetailRow label="Avoid" value={selectedHandoff?.avoid.join(' • ') || 'n/a'} />
                    </>
                  ) : selection?.kind === 'fact' ? (
                    <>
                      <DetailRow label="Type" value="Fact" />
                      <DetailRow label="Space" value={selectedFact?.space_id} />
                      <DetailRow label="Content" value={selectedFact?.content} />
                      <DetailRow label="Tags" value={(selectedFact?.tags || []).join(' • ') || 'n/a'} />
                      <DetailRow label="Source agent" value={selectedFact?.source_agent || 'n/a'} />
                      <DetailRow label="Source device" value={selectedFact?.source_device || 'n/a'} />
                      <DetailRow label="Source runtime" value={selectedFact?.source_runtime || 'n/a'} />
                      <DetailRow label="Source workspace" value={selectedFact?.source_workspace || 'n/a'} />
                    </>
                  ) : selection?.kind === 'trace' ? (
                    <>
                      <DetailRow label="Type" value="Trace" />
                      <DetailRow label="Agent" value={selectedTrace?.agent_id} />
                      <DetailRow label="Command" value={selectedTrace?.command} />
                      <DetailRow label="Result" value={selectedTrace?.result_summary || 'n/a'} />
                      <DetailRow label="Status" value={selectedTrace?.status} />
                      <DetailRow label="Runtime" value={String(selectedTrace?.metadata?.runtime || selectedTrace?.metadata?.source_runtime || 'n/a')} />
                      <DetailRow label="Workspace" value={String(selectedTrace?.metadata?.workspace || selectedTrace?.metadata?.source_workspace || 'n/a')} />
                    </>
                  ) : selection?.kind === 'relation' ? (
                    <>
                      <DetailRow label="Type" value="Topic relation" />
                      <DetailRow label="Source topic" value={selectedRelation?.source_topic} />
                      <DetailRow label="Target topic" value={selectedRelation?.target_topic} />
                      <DetailRow label="Relation" value={selectedRelation?.relation_type} />
                      <DetailRow label="Weight" value={selectedRelation?.weight} />
                    </>
                  ) : (
                    <>
                      <DetailRow label="What to do" value="Select a node, project, space or file to inspect the full object." />
                      <DetailRow label="Focus" value="The atlas is designed to be read first, and only then expanded into raw facts or files." />
                    </>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Continuity rule</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Prefer the summary and relation graph before raw logs. Open the object here, then drill down only if you need
                    the original file or full trace.
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
