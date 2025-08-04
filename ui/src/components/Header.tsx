import React from 'react';
import type { HealthCheck } from '../types';

interface HeaderProps {
  health: HealthCheck | null;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, onRefreshHealth }) => {

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="w-2 h-2 bg-green-500 rounded-full"></span>;
      case 'degraded':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>;
      case 'unhealthy':
        return <span className="w-2 h-2 bg-red-500 rounded-full"></span>;
      default:
        return <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>;
    }
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center border border-white border-opacity-30">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">gRPC Performance Tester</h1>
                <p className="text-blue-100">Compare gRPC vs HTTP performance with real-time metrics</p>
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="flex items-center space-x-4">
            {health && (
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium border ${
                  health.status === 'healthy' 
                    ? 'bg-green-500 bg-opacity-20 border-green-400 text-green-100' 
                    : health.status === 'degraded'
                    ? 'bg-yellow-500 bg-opacity-20 border-yellow-400 text-yellow-100'
                    : 'bg-red-500 bg-opacity-20 border-red-400 text-red-100'
                }`}>
                  {getHealthIcon(health.status)}
                  <span className="font-semibold">System {health.status}</span>
                </div>
                
                {/* Service Status Details */}
                <div className="hidden lg:flex items-center space-x-3 text-sm">
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg border ${
                    health.details.grpc.status === 'healthy' 
                      ? 'bg-green-500 bg-opacity-20 border-green-400 text-green-100' 
                      : 'bg-red-500 bg-opacity-20 border-red-400 text-red-100'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    <span className="font-medium">gRPC: {health.details.grpc.status}</span>
                    {health.details.grpc.responseTime && (
                      <span className="text-xs opacity-75">({health.details.grpc.responseTime}ms)</span>
                    )}
                  </div>
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg border ${
                    health.details.http.status === 'healthy' 
                      ? 'bg-green-500 bg-opacity-20 border-green-400 text-green-100' 
                      : 'bg-red-500 bg-opacity-20 border-red-400 text-red-100'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    <span className="font-medium">HTTP: {health.details.http.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefreshHealth}
              className="p-3 text-white text-opacity-80 hover:text-white rounded-xl hover:bg-white hover:bg-opacity-10 transition-all duration-200 border border-white border-opacity-20"
              title="Refresh health status"
            >
              <span className="text-sm">↻</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};