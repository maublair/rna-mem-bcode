import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useHealth } from '../hooks/useInfrastructure';

const settingsSections = [
  {
    title: 'Pairing & Devices',
    items: ['Device pairing secret', 'Revocable bearer token', 'Local device fingerprint'],
  },
  {
    title: 'Memory Governance',
    items: ['Read/write policy', 'Agent rooms', 'Task board ownership', 'Audit trail'],
  },
  {
    title: 'Sync & Safety',
    items: ['Local-first writes', 'Offline queue', 'Graceful degradation', 'Admin moderation'],
  },
  {
    title: 'Future Modules',
    items: ['Search index', 'Collections browser', 'Home control readiness', 'Backup console'],
  },
];

export function SettingsPage() {
  const healthQuery = useHealth();

  return (
    <ConsoleShell title="Operations Console" subtitle="Settings" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-100">Console Settings</h2>
          <p className="text-sm text-slate-400 max-w-3xl">
            This page is the scaffold for the admin and governance controls described in the architecture docs.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {settingsSections.map((section) => (
            <section key={section.title} className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-lg font-semibold text-slate-100">{section.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {section.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </ConsoleShell>
  );
}
