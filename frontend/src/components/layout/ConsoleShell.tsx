import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface ConsoleShellProps {
  title: string;
  subtitle: string;
  isHealthy: boolean;
  children: ReactNode;
  rightPanel?: ReactNode;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/memory', label: 'Memory Atlas' },
  { to: '/spaces', label: 'Spaces' },
  { to: '/search', label: 'Search' },
  { to: '/sync', label: 'Sync' },
  { to: '/backups', label: 'Backups' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin', label: 'Admin' },
];

export function ConsoleShell({ title, subtitle, isHealthy, children, rightPanel }: ConsoleShellProps) {
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100 lg:flex-row">
      <aside className="w-full border-b border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94)_0%,rgba(2,6,23,0.98)_100%)] shadow-2xl shadow-black/30 lg:w-[19rem] lg:border-b-0 lg:border-r lg:flex lg:flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
            RNA
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50">{title}</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-[15rem]">{subtitle}</p>
        </div>

        <nav className="p-3 border-b border-white/10">
          <div className="grid gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2.5 rounded-xl text-sm transition-all border ${
                    active
                      ? 'bg-cyan-500/14 text-cyan-200 border-cyan-400/30 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]'
                      : 'border-transparent text-slate-300 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 overflow-auto lg:min-h-0">
          <Sidebar />
        </div>

        <div className="p-4 border-t border-white/10">
          <div className={`text-xs font-medium ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isHealthy ? 'Connected' : 'Disconnected'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Operations console · memory-first</div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 border-b border-white/10 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6">
          <div>
            <div className="text-sm text-slate-400">RNA / {subtitle}</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            {location.pathname}
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>

      {rightPanel && (
        <aside className="hidden w-[24rem] overflow-auto border-l border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.98)_100%)] lg:block">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
