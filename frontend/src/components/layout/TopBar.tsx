import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  viewMode: 'wiki' | 'graph';
  onViewModeChange: (mode: 'wiki' | 'graph') => void;
}

export function TopBar({ viewMode, onViewModeChange }: TopBarProps) {
  const { logout } = useAuth();

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onViewModeChange('wiki')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'wiki'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Wiki
        </button>
        <button
          onClick={() => onViewModeChange('graph')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Graph
        </button>
      </div>

      <button
        onClick={logout}
        className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
