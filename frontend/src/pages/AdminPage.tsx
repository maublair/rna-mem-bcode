import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useHealth } from '../hooks/useInfrastructure';
import { useAgentMessagesData, useCollectionsData, useFactsData, useHandoffCardsData, useSessionsData, useTopicRelationsData, useTopicsData, useTraceData } from '../hooks/useRNAData';
import type { AgentMessageSummary, HandoffCardSummary, SessionSummary, TopicSummary, TraceEntry } from '../types/infrastructure';
import { api } from '../lib/api';

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400">{children}</span>;
}

export function AdminPage() {
  const healthQuery = useHealth();
  const [agentFilter, setAgentFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [runtimeFilter, setRuntimeFilter] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [messageComposer, setMessageComposer] = useState('');
  const [messageTarget, setMessageTarget] = useState('all');

  const traces = useTraceData({ limit: 80 }).data || [];
  const sessions = useSessionsData({ agent_id: agentFilter || undefined, limit: 60 }).data || [];
  const topics = useTopicsData({ limit: 80 }).data || [];
  const relations = useTopicRelationsData({ limit: 120 }).data || [];
  const handoffs = useHandoffCardsData({ agent_id: agentFilter || undefined, limit: 60 }).data || [];
  const messages = useAgentMessagesData({ to_agent: messageTarget || undefined, limit: 80 }).data || [];
  const facts = useFactsData({ space: 'operacional', limit: 120 }).data || [];
  const collections = useCollectionsData().data || [];

  const filteredFacts = useMemo(() => facts.filter((fact) => {
    const agentOk = !agentFilter || (fact.source_agent || '').toLowerCase().includes(agentFilter.toLowerCase());
    const deviceOk = !deviceFilter || (fact.source_device || '').toLowerCase().includes(deviceFilter.toLowerCase());
    const runtimeOk = !runtimeFilter || (fact.source_runtime || '').toLowerCase().includes(runtimeFilter.toLowerCase());
    const workspaceOk = !workspaceFilter || (fact.source_workspace || '').toLowerCase().includes(workspaceFilter.toLowerCase());
    const topicOk = !topicFilter || fact.content.toLowerCase().includes(topicFilter.toLowerCase()) || (fact.tags || []).some((tag) => tag.toLowerCase().includes(topicFilter.toLowerCase()));
    return agentOk && deviceOk && runtimeOk && workspaceOk && topicOk;
  }), [facts, agentFilter, deviceFilter, runtimeFilter, workspaceFilter, topicFilter]);

  const filteredTraces = useMemo(() => traces.filter((trace: TraceEntry) => {
    const agentOk = !agentFilter || trace.agent_id.toLowerCase().includes(agentFilter.toLowerCase());
    const deviceOk = !deviceFilter || (trace.device_id || '').toLowerCase().includes(deviceFilter.toLowerCase());
    const runtimeValue = String(trace.metadata?.runtime || trace.metadata?.source_runtime || '');
    const workspaceValue = String(trace.metadata?.workspace || trace.metadata?.source_workspace || '');
    const runtimeOk = !runtimeFilter || runtimeValue.toLowerCase().includes(runtimeFilter.toLowerCase());
    const workspaceOk = !workspaceFilter || workspaceValue.toLowerCase().includes(workspaceFilter.toLowerCase());
    const topicOk = !topicFilter || trace.command.toLowerCase().includes(topicFilter.toLowerCase()) || (trace.result_summary || '').toLowerCase().includes(topicFilter.toLowerCase());
    return agentOk && deviceOk && runtimeOk && workspaceOk && topicOk;
  }), [traces, agentFilter, deviceFilter, runtimeFilter, workspaceFilter, topicFilter]);

  const filteredSessions = useMemo(() => sessions.filter((session: SessionSummary) => {
    const agentOk = !agentFilter || session.agent_id.toLowerCase().includes(agentFilter.toLowerCase());
    const topicOk = !topicFilter || session.objective.toLowerCase().includes(topicFilter.toLowerCase()) || (session.summary || '').toLowerCase().includes(topicFilter.toLowerCase());
    return agentOk && topicOk;
  }), [sessions, agentFilter, topicFilter]);

  const filteredTopics = useMemo(() => topics.filter((topic: TopicSummary) => {
    const topicOk = !topicFilter || topic.title.toLowerCase().includes(topicFilter.toLowerCase()) || topic.topic_id.toLowerCase().includes(topicFilter.toLowerCase());
    const topicMeta = topic.metadata as { origin?: { source_agent?: string } } | undefined;
    const agentOk = !agentFilter || String(topicMeta?.origin?.source_agent || '').toLowerCase().includes(agentFilter.toLowerCase());
    return topicOk && agentOk;
  }), [topics, agentFilter, topicFilter]);

  const filteredHandoffs = useMemo(() => handoffs.filter((handoff: HandoffCardSummary) => {
    const agentOk = !agentFilter || handoff.agent_id.toLowerCase().includes(agentFilter.toLowerCase());
    const topicOk = !topicFilter || handoff.summary.toLowerCase().includes(topicFilter.toLowerCase()) || handoff.next_steps.some((step) => step.toLowerCase().includes(topicFilter.toLowerCase()));
    return agentOk && topicOk;
  }), [handoffs, agentFilter, topicFilter]);

  const relationPreview = relations.slice(0, 14);

  const filteredMessages = useMemo(() => messages.filter((message: AgentMessageSummary) => {
    const agentOk = !agentFilter || message.from_agent.toLowerCase().includes(agentFilter.toLowerCase()) || message.to_agent.toLowerCase().includes(agentFilter.toLowerCase());
    const topicOk = !topicFilter || message.content.toLowerCase().includes(topicFilter.toLowerCase()) || (message.tags || []).some((tag) => tag.toLowerCase().includes(topicFilter.toLowerCase()));
    return agentOk && topicOk;
  }), [messages, agentFilter, topicFilter]);

  const sendMessage = async () => {
    const content = messageComposer.trim();
    if (!content) return;
    await api.sendAgentMessage({
      from_agent: agentFilter || 'codex',
      to_agent: messageTarget || 'all',
      channel: 'public',
      content,
      metadata: {
        source_workspace: workspaceFilter || 'rna-console',
        source_runtime: runtimeFilter || 'browser',
      },
    });
    setMessageComposer('');
  };

  return (
    <ConsoleShell title="Operations Console" subtitle="Admin" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.10),_transparent_24%)]">
        <div className="p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                Governance layer
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">Admin and Governance</h2>
              <p className="max-w-3xl text-sm text-slate-300">
                Review what every agent advanced, who wrote it, which device it came from, and how the work should continue without breaking context.
              </p>
            </header>

            <section className="space-y-4">
              <Metric label="Health" value={healthQuery.data?.status ?? 'unknown'} />
              <Metric label="Collections" value={collections.length} />
              <Metric label="Operational facts" value={filteredFacts.length} />
              <Metric label="Trace entries" value={filteredTraces.length} />
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Memory filters</h3>
                  <p className="text-sm text-slate-400">Filter by agent, device, runtime, workspace, or topic to compare work across sessions.</p>
                </div>
                <Chip>cross-agent view</Chip>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Agent', value: agentFilter, onChange: setAgentFilter, placeholder: 'codex, sia, ares' },
                  { label: 'Device', value: deviceFilter, onChange: setDeviceFilter, placeholder: 'device id' },
                  { label: 'Runtime', value: runtimeFilter, onChange: setRuntimeFilter, placeholder: 'browser, linux:node' },
                  { label: 'Workspace', value: workspaceFilter, onChange: setWorkspaceFilter, placeholder: 'rna-console' },
                  { label: 'Topic', value: topicFilter, onChange: setTopicFilter, placeholder: 'memory, routing...' },
                ].map((field) => (
                  <label key={field.label} className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{field.label}</span>
                    <input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-50">Recent trace</h3><p className="text-sm text-slate-400">Command trail, status, result summary, and runtime context.</p></div><Chip>{filteredTraces.length}</Chip></div>
              <div className="mt-4 space-y-3">
                {filteredTraces.map((trace) => (
                  <article key={trace.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3"><div className="font-medium text-slate-100">{trace.agent_id}</div><div className="text-xs text-slate-500">{new Date(trace.created_at).toLocaleString()}</div></div>
                    <div className="mt-2 text-sm text-slate-300">{trace.command}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-400/80">{trace.status}</div>
                    {trace.result_summary && <div className="mt-2 text-sm text-slate-400">{trace.result_summary}</div>}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {trace.device_id ? <Chip>{`device:${trace.device_id}`}</Chip> : null}
                      {trace.session_id ? <Chip>{`session:${trace.session_id}`}</Chip> : null}
                      {trace.metadata?.runtime ? <Chip>{`runtime:${String(trace.metadata.runtime)}`}</Chip> : null}
                      {trace.metadata?.workspace ? <Chip>{`workspace:${String(trace.metadata.workspace)}`}</Chip> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-50">Operational learnings</h3><p className="text-sm text-slate-400">Facts worth preserving and reusing across agents.</p></div><Chip>{filteredFacts.length}</Chip></div>
              <div className="mt-4 space-y-3">
                {filteredFacts.map((fact) => (
                  <article key={fact.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3"><div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">{fact.type}</div><div className="text-xs text-slate-500">{new Date(fact.created_at).toLocaleString()}</div></div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{fact.content}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {fact.source_agent ? <Chip>{`agent:${fact.source_agent}`}</Chip> : null}
                      {fact.source_device ? <Chip>{`device:${fact.source_device}`}</Chip> : null}
                      {fact.source_runtime ? <Chip>{`runtime:${fact.source_runtime}`}</Chip> : null}
                      {fact.source_workspace ? <Chip>{`workspace:${fact.source_workspace}`}</Chip> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-50">Sessions</h3><p className="text-sm text-slate-400">What each agent is actively carrying.</p></div><Chip>{filteredSessions.length}</Chip></div>
              <div className="mt-4 space-y-3">
                {filteredSessions.map((session) => (
                  <article key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3"><div className="font-medium text-slate-100">{session.agent_id}</div><Chip>{session.status}</Chip></div>
                    <div className="mt-2 text-sm text-slate-300">{session.objective}</div>
                    {session.summary ? <div className="mt-2 text-xs text-slate-400">{session.summary}</div> : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500"><Chip>{session.session_id}</Chip>{session.started_at ? <Chip>{new Date(session.started_at).toLocaleString()}</Chip> : null}</div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-50">Topics and relations</h3><p className="text-sm text-slate-400">Topic clusters that should guide continuation.</p></div><Chip>{filteredTopics.length}</Chip></div>
              <div className="mt-4 space-y-3">
                {filteredTopics.slice(0, 12).map((topic) => (
                  <article key={topic.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3"><div className="font-medium text-slate-100">{topic.title}</div><div className="text-xs text-slate-500">{topic.topic_id}</div></div>
                    {topic.summary ? <div className="mt-2 text-sm text-slate-300">{topic.summary}</div> : null}
                    <div className="mt-3 flex flex-wrap gap-2">{topic.tags.slice(0, 5).map((tag) => (<Chip key={tag}>{tag}</Chip>))}</div>
                  </article>
                ))}
                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent relations</div>
                  <div className="mt-3 space-y-2">
                    {relationPreview.map((relation) => (<div key={relation.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"><span className="truncate">{relation.source_topic}</span><span className="text-xs text-cyan-300">{relation.relation_type}</span><span className="truncate">{relation.target_topic}</span></div>))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-50">Handoff cards</h3><p className="text-sm text-slate-400">What the next agent should do and avoid.</p></div><Chip>{filteredHandoffs.length}</Chip></div>
              <div className="mt-4 space-y-3">
                {filteredHandoffs.map((handoff) => (
                  <article key={handoff.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3"><div className="font-medium text-slate-100">{handoff.agent_id}</div><Chip>{handoff.session_id || 'no-session'}</Chip></div>
                    <div className="mt-2 text-sm text-slate-300">{handoff.summary}</div>
                    <div className="mt-3 space-y-2 text-xs text-slate-400"><div><span className="text-slate-500">Next:</span> {handoff.next_steps.join(' • ') || '—'}</div><div><span className="text-slate-500">Blockers:</span> {handoff.blockers.join(' • ') || '—'}</div><div><span className="text-slate-500">Avoid:</span> {handoff.avoid.join(' • ') || '—'}</div></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Central messages</h3>
                  <p className="text-sm text-slate-400">Public messages shared between agents. This is the central coordination lane, not a local queue.</p>
                </div>
                <Chip>{filteredMessages.length}</Chip>
              </div>

              <div className="mt-4 space-y-4">
                <div className="mt-4 flex flex-col gap-3">
                  <textarea
                    value={messageComposer}
                    onChange={(e) => setMessageComposer(e.target.value)}
                    placeholder="Write a message for the rest of the agents..."
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <div className="space-y-3">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">To</span>
                      <input
                        value={messageTarget}
                        onChange={(e) => setMessageTarget(e.target.value)}
                        placeholder="all, sia, codex..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={sendMessage}
                      className="w-full rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
                    >
                      Publish message
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredMessages.slice(0, 12).map((message) => (
                    <article key={message.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-100">{message.from_agent} → {message.to_agent}</div>
                        <div className="text-xs text-slate-500">{new Date(message.created_at).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{message.content}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <Chip>{message.channel}</Chip>
                        <Chip>{message.status}</Chip>
                        {message.source_device ? <Chip>{`device:${message.source_device}`}</Chip> : null}
                        {message.source_runtime ? <Chip>{`runtime:${message.source_runtime}`}</Chip> : null}
                        {message.source_workspace ? <Chip>{`workspace:${message.source_workspace}`}</Chip> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
