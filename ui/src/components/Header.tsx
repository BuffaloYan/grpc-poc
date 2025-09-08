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
    <header className="relative overflow-hidden mb-8 slide-in-up">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0, transparent 40%),
          radial-gradient(circle at 80% 0%, rgba(255,255,255,0.2) 0, transparent 30%),
          radial-gradient(circle at 0% 100%, rgba(255,255,255,0.25) 0, transparent 35%),
          radial-gradient(circle at 100% 80%, rgba(147, 197, 253, 0.15) 0, transparent 25%)
        `
      }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="relative container mx-auto px-6 py-12 flex items-center justify-between text-white">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl ring-2 ring-white/30 transform hover:scale-105 transition-transform duration-300">
            <span className="text-3xl">🚀</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight drop-shadow-lg bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              gRPC Performance Tester
            </h1>
            <p className="text-lg text-white/90 font-medium mt-2 drop-shadow-md">
              Compare gRPC vs HTTP under configurable load with beautiful analytics
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onRefreshHealth}
            className="px-6 py-3 bg-white/15 hover:bg-white/25 rounded-xl font-bold transition-all duration-300 shadow-lg border border-white/30 backdrop-blur-sm transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            🔄 Refresh Health
          </button>
          <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg border backdrop-blur-sm transform hover:scale-105 transition-all duration-300 ${badge(overall)}`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${overall === 'healthy' ? 'bg-green-400 animate-pulse' : overall === 'degraded' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="uppercase tracking-wide">{overall}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};