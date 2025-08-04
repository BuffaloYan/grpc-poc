import React from 'react';
import type { HealthCheck } from '../types';

interface HealthStatusProps {
  health: HealthCheck;
}

export const HealthStatus: React.FC<HealthStatusProps> = ({ health }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="w-2 h-2 bg-green-500 rounded-full"></span>;
      case 'degraded':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>;
      case 'unhealthy':
        return <span className="w-2 h-2 bg-red-500 rounded-full"></span>;
      default:
        return <span className="w-2 h-2 bg-gray-500 rounded-full"></span>;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
          {health.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(health.status)}
          <div>
            <div className="font-medium text-gray-900">Overall Status</div>
            <div className="text-sm text-gray-500">Last checked: {new Date(health.timestamp).toLocaleString()}</div>
          </div>
        </div>

        {/* Service Details */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Service Status</h4>
          <div className="space-y-3">
            {/* gRPC Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(health.details.grpc.status)}
                <span className="text-sm font-medium text-gray-900">gRPC Service</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(health.details.grpc.status)}`}>
                  {health.details.grpc.status}
                </div>
                {health.details.grpc.responseTime && (
                  <div className="text-xs text-gray-500">{health.details.grpc.responseTime}ms</div>
                )}
                {health.details.grpc.error && (
                  <div className="text-xs text-red-600">{health.details.grpc.error}</div>
                )}
              </div>
            </div>

            {/* HTTP Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(health.details.http.status)}
                <span className="text-sm font-medium text-gray-900">HTTP Service</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(health.details.http.status)}`}>
                  {health.details.http.status}
                </div>
                {health.details.http.error && (
                  <div className="text-xs text-red-600">{health.details.http.error}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Service Information */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Service</dt>
              <dd className="text-gray-900">{health.service}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Version</dt>
              <dd className="text-gray-900">{health.version}</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};