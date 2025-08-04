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
      <div className="text-center py-12">
        <span className="mx-auto text-4xl text-gray-400">📈</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No test results</h3>
        <p className="mt-1 text-sm text-gray-500">Run a performance test to see results here.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'interrupted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(test.status)}`}>
            {test.status}
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
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Throughput Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="protocol" />
              <YAxis />
              <Tooltip formatter={(value: number) => [ApiService.formatThroughput(value), 'Throughput']} />
              <Bar dataKey="throughput" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Latency Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="protocol" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value?.toFixed(2) || 'N/A'}ms`, 'Latency']} />
              <Bar dataKey="latency" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Results</h3>
        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">{result.protocol.toUpperCase()}</h4>
                <div className="text-sm text-gray-500">
                  {result.successfulRequests}/{result.totalRequests} successful
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Throughput</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {ApiService.formatThroughput(result.throughput)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Avg Latency</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {result.averageLatency?.toFixed(2) || 'N/A'}ms
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Duration</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {ApiService.formatDuration(result.totalDuration)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {result.totalRequests > 0 ? ((result.successfulRequests / result.totalRequests) * 100).toFixed(1) : '0.0'}%
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