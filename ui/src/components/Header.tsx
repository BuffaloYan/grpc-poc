import React from 'react';
import type { HealthCheck } from '../types';

interface HeaderProps {
  health: HealthCheck | null;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, onRefreshHealth }) => {
  const overall = health?.status ?? health?.details?.overall ?? 'unknown';
  const badge = (status: string) => {
    const map: Record<string, string> = {
      healthy: 'bg-green-400/20 border-green-300/40 text-green-100',
      degraded: 'bg-yellow-400/20 border-yellow-300/40 text-yellow-100',
      unhealthy: 'bg-red-400/20 border-red-300/40 text-red-100',
      unknown: 'bg-slate-400/20 border-slate-300/40 text-slate-100',
    };
    return map[status] || map.unknown;
  };

  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-indigo-700" />
      <div className="absolute inset-0 opacity-40" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0, transparent 30%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15) 0, transparent 25%), radial-gradient(circle at 0% 100%, rgba(255,255,255,0.18) 0, transparent 25%)'}} />
      <div className="relative container mx-auto px-6 py-8 flex items-center justify-between text-white">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl ring-1 ring-white/20">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">gRPC Performance Tester</h1>
            <p className="text-sm text-white/80">Compare gRPC vs HTTP under configurable load with beautiful charts</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onRefreshHealth}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-colors shadow border border-white/20"
          >
            Refresh Health
          </button>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold shadow border ${badge(overall)}`}>
            {overall}
          </div>
        </div>
      </div>
    </header>
  );
};