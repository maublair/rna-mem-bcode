import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  viewMode: 'wiki' | 'graph';
  onViewModeChange: (mode: 'wiki' | 'graph') => void;
  isHealthy: boolean;
  mainContent: ReactNode;
}

export function AppShell({ viewMode, onViewModeChange, isHealthy, mainContent }: AppShellProps) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-indigo-400">RNA</h1>
          <p className="text-xs text-slate-500">Infrastructure</p>
        </div>
        <div className="flex-1 overflow-auto">
          <Sidebar />
        </div>
        <div className="p-4 border-t border-slate-700 text-xs">
          {isHealthy ? (
            <span className="text-green-400">✓ Connected</span>
          ) : (
            <span className="text-red-400">✗ Disconnected</span>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <TopBar viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <div className="flex-1 overflow-auto">
          {mainContent}
        </div>
      </div>
    </div>
  );
}
