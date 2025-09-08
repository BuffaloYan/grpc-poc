import React from 'react';
import type { Test } from '../types';
import { ApiService } from '../services/apiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TestResultsProps {
  test: Test | null;
}

export const TestResults: React.FC<TestResultsProps> = ({ test }) => {
  if (!test) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center shadow-lg">
          <span className="text-4xl">📈</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Test Results Yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Configure your performance test parameters and click "Run Performance Test" to see detailed analytics and comparisons.
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
      case 'running': return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200';
      case 'interrupted': return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200';
    }
  };

  const isRunning = test.status === 'running';

  const results = Object.values(test.results);
  
  // Prepare data for charts
  const throughputData = results.map(result => ({
    protocol: result.protocol.toUpperCase(),
    throughput: result.throughput,
  }));

  const latencyData = results.map(result => ({
    protocol: result.protocol.toUpperCase(),
    latency: result.averageLatency,
  }));



  return (
    <div className="space-y-8">
      {/* Test Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(test.status)} ${isRunning ? 'animate-pulse' : ''}`}>
            <div className="flex items-center space-x-2">
              {isRunning && (
                <div className="w-2 h-2 bg-current rounded-full animate-ping"></div>
              )}
              <span className="uppercase tracking-wide">{test.status}</span>
            </div>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Test Name</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{test.testName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Requests</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{test.config.numRequests}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Concurrency</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{test.config.concurrency}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Payload Size</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {ApiService.formatBytes(test.config.requestSize)} → {ApiService.formatBytes(test.config.responseSize)}
            </dd>
          </div>
        </div>

        {test.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{test.error}</p>
          </div>
        )}
      </div>

      {/* Performance Summary */}
      {test.comparison && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-primary-50 p-4 rounded-lg">
              <h4 className="font-medium text-primary-900">Fastest Protocol</h4>
              <p className="text-2xl font-bold text-primary-700">{test.comparison.summary.fastestProtocol?.toUpperCase() || 'N/A'}</p>
              <p className="text-sm text-primary-600">
                {ApiService.formatThroughput(test.comparison.summary.maxThroughput || 0)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Lowest Latency</h4>
              <p className="text-2xl font-bold text-green-700">{test.comparison.summary.lowestLatencyProtocol?.toUpperCase() || 'N/A'}</p>
              <p className="text-sm text-green-600">
                {test.comparison.summary.minLatency?.toFixed(2) || 'N/A'}ms avg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Throughput Chart */}
        <div className="card slide-in-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">📈</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Throughput Comparison</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={throughputData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
              <XAxis
                dataKey="protocol"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 14, fontWeight: 600, fill: '#6b7280' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value: number) => [ApiService.formatThroughput(value), 'Throughput']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Bar
                dataKey="throughput"
                fill="url(#throughputGradient)"
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
              />
              <defs>
                <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Chart */}
        <div className="card slide-in-up" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Average Latency Comparison</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={latencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
              <XAxis
                dataKey="protocol"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 14, fontWeight: 600, fill: '#6b7280' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value?.toFixed(2) || 'N/A'}ms`, 'Latency']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Bar
                dataKey="latency"
                fill="url(#latencyGradient)"
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
              />
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="card slide-in-up" style={{animationDelay: '0.4s'}}>
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">📋</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Detailed Results</h3>
        </div>
        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                    result.protocol === 'grpc'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}>
                    <span className="text-white text-lg font-bold">
                      {result.protocol === 'grpc' ? 'G' : 'H'}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">{result.protocol.toUpperCase()}</h4>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-500 mb-1">Success Rate</div>
                  <div className="text-lg font-bold text-green-600">
                    {result.totalRequests > 0 ? ((result.successfulRequests / result.totalRequests) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white/60 rounded-xl p-4 border border-gray-100">
                  <dt className="text-sm font-bold text-gray-500 uppercase tracking-wide">Throughput</dt>
                  <dd className="mt-2 text-2xl font-black text-blue-600">
                    {ApiService.formatThroughput(result.throughput)}
                  </dd>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-gray-100">
                  <dt className="text-sm font-bold text-gray-500 uppercase tracking-wide">Avg Latency</dt>
                  <dd className="mt-2 text-2xl font-black text-green-600">
                    {result.averageLatency?.toFixed(2) || 'N/A'}<span className="text-sm ml-1">ms</span>
                  </dd>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-gray-100">
                  <dt className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Duration</dt>
                  <dd className="mt-2 text-2xl font-black text-purple-600">
                    {ApiService.formatDuration(result.totalDuration)}
                  </dd>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-gray-100">
                  <dt className="text-sm font-bold text-gray-500 uppercase tracking-wide">Requests</dt>
                  <dd className="mt-2 text-2xl font-black text-orange-600">
                    {result.successfulRequests}/{result.totalRequests}
                  </dd>
                </div>
              </div>

              {/* Performance comparison */}
              {test.comparison && test.comparison.throughputComparison[result.protocol] && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">Throughput vs {test.comparison.throughputComparison[result.protocol]?.relativeTo || 'N/A'}:</span>
                      <span className={`font-medium ${
                        parseFloat(test.comparison.throughputComparison[result.protocol]?.improvement || '0') > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {test.comparison.throughputComparison[result.protocol]?.improvement || '0'}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">Latency vs {test.comparison.latencyComparison[result.protocol]?.relativeTo || 'N/A'}:</span>
                      <span className={`font-medium ${
                        parseFloat(test.comparison.latencyComparison[result.protocol]?.improvement || '0') > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {test.comparison.latencyComparison[result.protocol]?.improvement || '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Metadata */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Metadata</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Test ID</dt>
            <dd className="mt-1 text-gray-900 font-mono">{test.testId}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Start Time</dt>
            <dd className="mt-1 text-gray-900">{new Date(test.startTime).toLocaleString()}</dd>
          </div>
          {test.endTime && (
            <div>
              <dt className="font-medium text-gray-500">End Time</dt>
              <dd className="mt-1 text-gray-900">{new Date(test.endTime).toLocaleString()}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-gray-500">Protocols Tested</dt>
            <dd className="mt-1 text-gray-900">{test.config.protocols.join(', ').toUpperCase()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};