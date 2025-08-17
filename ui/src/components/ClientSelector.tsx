import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type { ClientBackend } from '../types';

interface ClientSelectorProps {
  onClientChange: (clientId: 'nodejs' | 'java') => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ onClientChange }) => {
  const [backends, setBackends] = useState<ClientBackend[]>([]);
  const [currentBackend, setCurrentBackend] = useState<'nodejs' | 'java'>('nodejs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBackends();
  }, []);

  const loadBackends = async () => {
    try {
      setLoading(true);
      const availableBackends = apiService.getAvailableBackends();
      await apiService.updateBackendStatuses();
      setBackends([...availableBackends]);
      setCurrentBackend(apiService.getCurrentBackend());
    } catch (error) {
      console.error('Failed to load backends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackendChange = (backendId: 'nodejs' | 'java') => {
    apiService.setCurrentBackend(backendId);
    setCurrentBackend(backendId);
    onClientChange(backendId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'unhealthy':
        return '🔴';
      default:
        return '🟡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Client Backend</h3>
        <button
          onClick={loadBackends}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          title="Refresh backend status"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="space-y-3">
        {backends.map((backend) => (
          <div
            key={backend.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              currentBackend === backend.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleBackendChange(backend.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="backend"
                  value={backend.id}
                  checked={currentBackend === backend.id}
                  onChange={() => handleBackendChange(backend.id)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{backend.name}</span>
                    <span className={`text-sm ${getStatusColor(backend.status)}`}>
                      {getStatusIcon(backend.status)} {backend.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{backend.description}</p>
                </div>
              </div>
              {backend.status === 'unhealthy' && (
                <span className="text-xs text-red-500 font-medium">Offline</span>
              )}
            </div>

            {/* Features */}
            <div className="mt-2 flex flex-wrap gap-1">
              {backend.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Base URL for debugging */}
            <div className="mt-2 text-xs text-gray-500">
              Endpoint: {backend.baseUrl}
            </div>
          </div>
        ))}
      </div>

      {/* Info section */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Backend Comparison</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Node.js Client:</strong> Full-featured with orchestration, streaming, and test history</div>
          <div><strong>Java Client:</strong> Optimized for high throughput and consistent performance</div>
        </div>
      </div>
    </div>
  );
};

export default ClientSelector;
