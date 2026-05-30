import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useHealth } from '../hooks/useInfrastructure';
import {
  useCollectionDocsData,
  useCollectionPermissionsData,
  useCollectionsData,
  useDocumentRevisionsData,
  useFactsData,
  useSyncPendingData,
} from '../hooks/useRNAData';
import { useCreateCollectionPermission } from '../hooks/useRNAPermissions';
import { useCreateSyncPending, useUpdateSyncPending } from '../hooks/useSyncMutations';
import type { CollectionSummary, DocumentRevision, FactSummary } from '../types/infrastructure';
import { getOrCreateDeviceId } from '../lib/auth';

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{children}</span>;
}

export function SyncPage() {
  const healthQuery = useHealth();
  const collections = useCollectionsData().data || [];
  const facts = useFactsData({ limit: 100 }).data || [];
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [permissionSubjectType, setPermissionSubjectType] = useState('agent');
  const [permissionSubjectId, setPermissionSubjectId] = useState('');
  const [permissionList, setPermissionList] = useState('read');
  const [syncTargetSpace, setSyncTargetSpace] = useState('operacional');
  const [syncPayload, setSyncPayload] = useState('{"content":"new offline note"}');
  const [syncSourceAgent, setSyncSourceAgent] = useState('rna-console');
  const [syncSourceWorkspace, setSyncSourceWorkspace] = useState('rna-console');
  const [syncSourceRuntime, setSyncSourceRuntime] = useState(() => `browser:${navigator.userAgent.slice(0, 48)}`);

  const docs = useCollectionDocsData(selectedCollection || undefined).data || [];
  const permissions = useCollectionPermissionsData(selectedCollection || undefined).data || [];
  const revisions = useDocumentRevisionsData(selectedDoc || undefined).data || [];
  const pendingSync = useSyncPendingData().data || [];
  const createPermission = useCreateCollectionPermission(selectedCollection || '');
  const createSync = useCreateSyncPending();
  const updateSync = useUpdateSyncPending();

  const pendingProjections = useMemo(
    () =>
      facts.filter((fact: FactSummary) => {
        const projection = fact.projection_status || {};
        return projection.neo4j !== 'done' || projection.qdrant !== 'done';
      }),
    [facts]
  );

  const selectedCollectionData = collections.find((collection: CollectionSummary) => collection.id === selectedCollection) || null;
  const selectedCollectionSync = pendingSync.filter((entry) => entry.target_collection === selectedCollection);

  const handleCreatePermission = async () => {
    if (!selectedCollection || !permissionSubjectType.trim() || !permissionSubjectId.trim()) return;
    await createPermission.mutateAsync({
      subject_type: permissionSubjectType.trim(),
      subject_id: permissionSubjectId.trim(),
      permissions: permissionList
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean),
    });
    setPermissionSubjectId('');
    setPermissionList('read');
    setPermissionSubjectType('agent');
  };

  const handleCreateSync = async () => {
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(syncPayload || '{}') as Record<string, unknown>;
    } catch {
      parsedPayload = { raw: syncPayload };
    }

    await createSync.mutateAsync({
      target_space: syncTargetSpace.trim() || selectedCollectionData?.space_id || 'operacional',
      target_collection: selectedCollectionData?.id || selectedCollection || null,
      source_agent: syncSourceAgent.trim() || 'rna-console',
      source_device: getOrCreateDeviceId(),
      source_runtime: syncSourceRuntime.trim() || 'browser',
      source_workspace: syncSourceWorkspace.trim() || 'rna-console',
      payload: parsedPayload,
    });
  };

  return (
    <ConsoleShell title="Operations Console" subtitle="Sync & Audit" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.10),_transparent_24%)]">
        <div className="p-6 space-y-6">
          <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl shadow-black/20 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
              Synchronization control
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">Sync Monitor and Audit</h2>
            <p className="text-sm text-slate-300 max-w-3xl">
              Review projections, permissions, revisions, and queued writes without losing the thread between sessions.
            </p>
          </header>

          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Collections</div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{collections.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Documents</div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{docs.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Pending projections</div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{pendingProjections.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Permissions</div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{permissions.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Sync pending</div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{pendingSync.length}</div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Collections</div>
                  <div className="mt-1 text-base font-semibold text-slate-100">Projection scope</div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => {
                        setSelectedCollection(collection.id);
                        setSelectedDoc('');
                      }}
                      className={`shrink-0 rounded-full border px-3 py-2 text-left transition-all ${
                        selectedCollection === collection.id
                          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8'
                      }`}
                    >
                      <div className="font-medium">{collection.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{collection.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50">Pending projections</h3>
                    <p className="text-sm text-slate-400">Facts whose Neo4j/Qdrant projection is not complete yet.</p>
                  </div>
                  <Chip>{pendingProjections.length} pending</Chip>
                </div>
                <div className="mt-4 space-y-3">
                  {pendingProjections.map((fact: FactSummary) => {
                    const projection = fact.projection_status || {};
                    return (
                          <article key={fact.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-100">{fact.type}</div>
                          <div className="text-xs text-slate-500">{new Date(fact.created_at).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{fact.content}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {fact.source_agent ? <Chip>{`agent:${fact.source_agent}`}</Chip> : null}
                          {fact.source_device ? <Chip>{`device:${fact.source_device}`}</Chip> : null}
                          {fact.source_workspace ? <Chip>{`workspace:${fact.source_workspace}`}</Chip> : null}
                          {fact.source_runtime ? <Chip>{`runtime:${fact.source_runtime}`}</Chip> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Chip>{`neo4j:${projection.neo4j ?? 'unknown'}`}</Chip>
                          <Chip>{`qdrant:${projection.qdrant ?? 'unknown'}`}</Chip>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {selectedCollectionData && (
                <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-50">Permissions for {selectedCollectionData.name}</h3>
                      <p className="text-sm text-slate-400">Collection access and policy.</p>
                    </div>
                    <Chip>{permissions.length} entries</Chip>
                  </div>

                  <div className="mt-4 space-y-3">
                    {permissions.map((permission) => (
                      <article key={permission.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-100">
                            {permission.subject_type}:{permission.subject_id}
                          </div>
                          <div className="text-xs text-slate-500">{new Date(permission.created_at).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {permission.permissions.map((perm) => (
                            <Chip key={perm}>{perm}</Chip>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h4 className="text-sm font-semibold text-slate-50">Assign permission</h4>
                    <p className="mt-1 text-sm text-slate-400">Grant access to an agent, device, user, or role for this collection.</p>
                    <div className="mt-4 space-y-3">
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Subject type</span>
                        <select
                          value={permissionSubjectType}
                          onChange={(e) => setPermissionSubjectType(e.target.value)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                        >
                          <option value="agent">agent</option>
                          <option value="device">device</option>
                          <option value="user">user</option>
                          <option value="role">role</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Subject id</span>
                        <input
                          value={permissionSubjectId}
                          onChange={(e) => setPermissionSubjectId(e.target.value)}
                          placeholder="codex, sia, mauricio..."
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Permissions</span>
                        <input
                          value={permissionList}
                          onChange={(e) => setPermissionList(e.target.value)}
                          placeholder="read,write,admin"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCreatePermission}
                        disabled={createPermission.isPending}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {createPermission.isPending ? 'Saving...' : 'Assign permission'}
                      </button>
                      {createPermission.isError ? <span className="text-sm text-rose-400">Permission update failed</span> : null}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <h4 className="text-sm font-semibold text-slate-50">Create sync entry</h4>
                        <p className="mt-1 text-sm text-slate-400">Queue an offline write or a deferred action for this collection.</p>
                        <div className="mt-4 space-y-3">
                          <label className="space-y-2 block">
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Target space</span>
                            <input
                              value={syncTargetSpace}
                              onChange={(e) => setSyncTargetSpace(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                            />
                          </label>
                          <label className="space-y-2 block">
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Payload JSON</span>
                            <textarea
                              value={syncPayload}
                              onChange={(e) => setSyncPayload(e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                            />
                          </label>
                          <div className="space-y-3">
                            <label className="space-y-2 block">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Source agent</span>
                              <input
                                value={syncSourceAgent}
                                onChange={(e) => setSyncSourceAgent(e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                              />
                            </label>
                            <label className="space-y-2 block">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Source workspace</span>
                              <input
                                value={syncSourceWorkspace}
                                onChange={(e) => setSyncSourceWorkspace(e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                              />
                            </label>
                            <label className="space-y-2 block">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Source runtime</span>
                              <input
                                value={syncSourceRuntime}
                                onChange={(e) => setSyncSourceRuntime(e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                              />
                            </label>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCreateSync}
                            disabled={createSync.isPending}
                            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {createSync.isPending ? 'Queueing...' : 'Queue sync item'}
                          </button>
                          {createSync.isError ? <span className="text-sm text-rose-400">Sync queue failed</span> : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-50">Pending sync items</h4>
                          <Chip>{selectedCollectionSync.length}</Chip>
                        </div>
                        <div className="mt-4 space-y-3">
                          {selectedCollectionSync.map((entry) => (
                            <article key={entry.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-slate-100">{entry.status}</div>
                                <div className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</div>
                              </div>
                              <div className="mt-2 text-xs text-slate-400">
                                {entry.target_space || 'no-space'} / {entry.target_collection || 'no-collection'}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                {entry.source_agent ? <Chip>{`agent:${entry.source_agent}`}</Chip> : null}
                                {entry.source_device ? <Chip>{`device:${entry.source_device}`}</Chip> : null}
                                {entry.source_workspace ? <Chip>{`workspace:${entry.source_workspace}`}</Chip> : null}
                                {entry.source_runtime ? <Chip>{`runtime:${entry.source_runtime}`}</Chip> : null}
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateSync.mutate({ id: entry.id, status: 'done', retry_count: entry.retry_count })}
                                  className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500/40"
                                >
                                  Mark done
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSync.mutate({
                                      id: entry.id,
                                      status: 'error',
                                      retry_count: entry.retry_count + 1,
                                      last_error: 'manual review required',
                                    })
                                  }
                                  className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-rose-500/40"
                                >
                                  Mark error
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-50">Documents / revisions</h4>
                        <Chip>{docs.length}</Chip>
                      </div>

                      <div className="mt-4 space-y-3">
                        {docs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setSelectedDoc(doc.id)}
                            className={`w-full rounded-xl border p-4 text-left transition-colors ${
                              selectedDoc === doc.id
                                ? 'border-cyan-500/40 bg-cyan-500/10'
                                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-slate-100">{doc.title || doc.type}</div>
                              <div className="text-xs text-slate-500">v{doc.version}</div>
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-400/80">{doc.type}</div>
                          </button>
                        ))}
                      </div>

                      {selectedDoc && (
                        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-50">Revision history</h4>
                            <Chip>{revisions.length}</Chip>
                          </div>
                          <div className="mt-4 space-y-3">
                            {revisions.map((revision: DocumentRevision) => (
                              <article key={revision.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm text-slate-100">Version {revision.version}</div>
                                  <div className="text-xs text-slate-500">{new Date(revision.created_at).toLocaleString()}</div>
                                </div>
                                <div className="mt-2 text-xs text-slate-400">By {revision.changed_by || 'unknown'}</div>
                                {revision.change_reason && <div className="mt-2 text-sm text-slate-300">{revision.change_reason}</div>}
                                {revision.content && <div className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{revision.content}</div>}
                              </article>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </section>
        </div>
      </div>
    </ConsoleShell>
  );
}
