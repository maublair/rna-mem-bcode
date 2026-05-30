import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useHealth } from '../hooks/useInfrastructure';
import { useBackupStatusData, useRestoreJobsData, useRestorePlanData, useSiaBackupHookData } from '../hooks/useRNAData';
import { useCreateRestoreJob, useRunBackupSnapshot, useRunRestoreJob, useTestSiaBackupHook } from '../hooks/useBackupMutations';
import type { RestoreJob, SnapshotHealth } from '../types/infrastructure';
import { useMemo, useState } from 'react';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function BackupsPage() {
  const healthQuery = useHealth();
  const snapshots = useBackupStatusData().data || [];
  const restorePlan = useRestorePlanData().data || null;
  const restoreJobs = useRestoreJobsData().data || [];
  const hook = useSiaBackupHookData().data || null;
  const runBackup = useRunBackupSnapshot();
  const testHook = useTestSiaBackupHook();
  const createRestoreJob = useCreateRestoreJob();
  const runRestoreJob = useRunRestoreJob();
  const [restoreSnapshotId, setRestoreSnapshotId] = useState('');
  const [restoreMode, setRestoreMode] = useState('dry-run');
  const [restoreLocation, setRestoreLocation] = useState('');

  const latest = snapshots[0] || null;
  const latestRestoreJob = useMemo(() => restoreJobs[0] || null, [restoreJobs]);

  return (
    <ConsoleShell title="Operations Console" subtitle="Backups" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.10),_transparent_24%)]">
        <div className="p-6 space-y-6">
          <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl shadow-black/20 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
              Continuity and recovery
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-3">Backup Console</h2>
            <p className="text-sm text-slate-300 max-w-3xl">
              Snapshot health, restore rehearsals, and the SIA export hook. RNA keeps the operational evidence close to the memory graph.
            </p>
          </header>

          <section className="grid grid-cols-1 gap-4">
            <Stat label="Snapshots" value={snapshots.length} />
            <Stat label="Latest status" value={latest?.status ?? 'none'} />
            <Stat label="Latest kind" value={latest?.kind ?? 'none'} />
            <Stat label="Health" value={healthQuery.data?.status ?? 'unknown'} />
          </section>

          <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-50">SIA backup hook</h3>
                <p className="text-sm text-slate-400">RNA can call an external SIA export hook if it is configured on this host.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => testHook.mutate()}
                  disabled={testHook.isPending}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-500/40 disabled:opacity-50"
                >
                  {testHook.isPending ? 'Testing...' : 'Test hook'}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <Stat label="Configured" value={hook?.configured ? 'yes' : 'no'} />
              <Stat label="Exists" value={hook?.exists ? 'yes' : 'no'} />
              <Stat label="Executable" value={hook?.executable ? 'yes' : 'no'} />
              <Stat label="Path" value={hook?.hook_path || 'none'} />
            </div>
            {testHook.isError ? <div className="mt-4 text-sm text-rose-400">Hook test failed</div> : null}
            {testHook.data ? (
              <div className="mt-4 text-sm text-slate-400">
                Last test: <span className="text-slate-100">{testHook.data.status}</span> at{' '}
                <span className="text-slate-100 font-mono">{testHook.data.test_dir}</span>
              </div>
            ) : null}
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => runBackup.mutate()}
              disabled={runBackup.isPending}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {runBackup.isPending ? 'Running...' : 'Run manual snapshot'}
            </button>
            {runBackup.isError ? <span className="text-sm text-rose-400">Snapshot run failed</span> : null}
          </div>

          {latest && (
            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <h3 className="text-lg font-semibold text-slate-50">Latest snapshot</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-400">
              <div>Status: <span className="text-slate-100">{latest.status}</span></div>
              <div>Kind: <span className="text-slate-100">{latest.kind}</span></div>
              <div>Location: <span className="text-slate-100">{latest.location || 'n/a'}</span></div>
              <div>Size: <span className="text-slate-100">{latest.size_bytes ? `${latest.size_bytes} bytes` : 'n/a'}</span></div>
              <div>Created: <span className="text-slate-100">{new Date(latest.created_at).toLocaleString()}</span></div>
              <div>ID: <span className="text-slate-100 font-mono">{latest.id}</span></div>
            </div>
            {latest.details && Object.keys(latest.details).length > 0 && (
              <pre className="mt-4 overflow-auto rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
                {JSON.stringify(latest.details, null, 2)}
              </pre>
            )}
            </section>
          )}

          {restorePlan && (
            <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
              <h3 className="text-lg font-semibold text-slate-50">Restore plan</h3>
            <p className="mt-1 text-sm text-slate-400">
              Restore PostgreSQL first, then rebuild projections. This matches the backup policy and keeps canonical memory intact.
            </p>
              <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Order</div>
                <div className="space-y-2">
                  {restorePlan.order.map((item, idx) => (
                    <div key={item} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
                      {idx + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Rules</div>
                <div className="space-y-2">
                  {restorePlan.rule.map((rule) => (
                    <div key={rule} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {restorePlan.latest_snapshots.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Latest snapshots</div>
                <div className="space-y-2">
                  {restorePlan.latest_snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
                      <span className="text-slate-100">{snapshot.kind}</span> - {snapshot.status} -{' '}
                      {new Date(snapshot.created_at).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </section>
          )}

          <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Restore jobs</h3>
              <p className="mt-1 text-sm text-slate-400">
                Restore execution is tracked as a job. Dry-run is safe by default; apply mode uses the configured restore executor when available.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
              >
                <option value="dry-run">dry-run</option>
                <option value="apply">apply</option>
              </select>
              <input
                value={restoreSnapshotId}
                onChange={(e) => setRestoreSnapshotId(e.target.value)}
                placeholder="snapshot id"
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
              />
              <input
                value={restoreLocation}
                onChange={(e) => setRestoreLocation(e.target.value)}
                placeholder="snapshot location (optional)"
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() =>
                  createRestoreJob.mutate(
                    {
                      mode: restoreMode,
                      target_snapshot_id: restoreSnapshotId || undefined,
                      target_location: restoreLocation || undefined,
                      target_snapshot_kind: latest?.kind || undefined,
                    },
                    {
                      onSuccess: (job) => {
                        if (job.id) {
                          runRestoreJob.mutate(job.id);
                        }
                      },
                    }
                  )
                }
                disabled={createRestoreJob.isPending || runRestoreJob.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {createRestoreJob.isPending || runRestoreJob.isPending ? 'Starting...' : 'Run restore job'}
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
            <Stat label="Restore jobs" value={restoreJobs.length} />
            <Stat label="Latest mode" value={latestRestoreJob?.mode ?? 'none'} />
            <Stat label="Latest status" value={latestRestoreJob?.status ?? 'none'} />
          </div>
          {latestRestoreJob ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              <div>Step: <span className="text-slate-100">{latestRestoreJob.current_step || 'n/a'}</span></div>
              <div>Snapshot: <span className="text-slate-100">{latestRestoreJob.target_snapshot_id || 'n/a'}</span></div>
              <div>Location: <span className="text-slate-100">{latestRestoreJob.target_location || 'n/a'}</span></div>
              <div>Progress: <span className="text-slate-100">{latestRestoreJob.step_index}/{latestRestoreJob.total_steps}</span></div>
              <div>Created: <span className="text-slate-100">{new Date(latestRestoreJob.created_at).toLocaleString()}</span></div>
              {latestRestoreJob.last_error ? <div className="text-rose-400">Last error: {latestRestoreJob.last_error}</div> : null}
              {latestRestoreJob.summary ? (
                <pre className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-xs text-slate-300">
                  {JSON.stringify(latestRestoreJob.summary, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
          {restoreJobs.length > 0 ? (
            <div className="mt-4 space-y-2">
              {restoreJobs.map((job: RestoreJob) => (
                <div key={job.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                  <span className="text-slate-100">{job.mode}</span> - {job.status} - {new Date(job.created_at).toLocaleString()}
                </div>
              ))}
            </div>
          ) : null}
          </section>

          <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
            <h3 className="text-lg font-semibold text-slate-50">Snapshot history</h3>
            <div className="mt-4 space-y-3">
              {snapshots.map((snapshot: SnapshotHealth) => (
                <article key={snapshot.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-100">{snapshot.kind}</div>
                  <div className="text-xs text-slate-500">{new Date(snapshot.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Status: <span className="text-slate-100">{snapshot.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Location: <span className="text-slate-100">{snapshot.location || 'n/a'}</span>
                </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ConsoleShell>
  );
}
