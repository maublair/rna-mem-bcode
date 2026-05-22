import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function PairPage() {
  const { pair, isPairing, pairingError } = useAuth();
  const [pairingSecret, setPairingSecret] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingSecret.trim()) return;

    try {
      await pair(pairingSecret);
    } catch (error) {
      console.error('Pairing failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">RNA Infrastructure</h1>
          <p className="text-slate-400">Obsidian-style infrastructure visualization</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pairing Secret
            </label>
            <input
              type="password"
              value={pairingSecret}
              onChange={(e) => setPairingSecret(e.target.value)}
              placeholder="Enter the pairing secret"
              disabled={isPairing}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-2">
              Find this in /home/mblair/srv/stacks/rna/.env as RNA_PAIRING_SECRET
            </p>
          </div>

          {pairingError && (
            <div className="p-3 bg-red-900 border border-red-700 rounded text-red-100 text-sm">
              {pairingError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPairing || !pairingSecret.trim()}
            className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPairing ? 'Pairing...' : 'Pair Device'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-slate-800 rounded border border-slate-700 text-sm text-slate-300">
          <p className="font-medium mb-2">First time?</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Get the pairing secret from the server</li>
            <li>Enter it above</li>
            <li>Your token will be saved for 30 days</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
