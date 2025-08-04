import React, { useState } from 'react';
import type { Test } from '../types';
import { ApiService } from '../services/apiService';

interface TestHistoryProps {
  tests: Test[];
  onSelectTest: (test: Test) => void;
  onRefresh: () => void;
}

export const TestHistory: React.FC<TestHistoryProps> = ({ tests, onSelectTest, onRefresh }) => {
  const [sortBy, setSortBy] = useState<'startTime' | 'testName' | 'status'>('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'interrupted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const sortedTests = [...tests].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'startTime':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        break;
      case 'testName':
        comparison = a.testName.localeCompare(b.testName);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) {
      return <span className="text-gray-400 text-xs">↕</span>;
    }
    
    return sortOrder === 'asc' ? (
      <span className="text-blue-600 text-xs">↑</span>
    ) : (
      <span className="text-blue-600 text-xs">↓</span>
    );
  };

  if (tests.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="mx-auto text-4xl text-gray-400">📊</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No test history</h3>
        <p className="mt-1 text-sm text-gray-500">Run some performance tests to see them here.</p>
        <div className="mt-6">
          <button onClick={onRefresh} className="btn-primary">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Test History</h2>
        <button onClick={onRefresh} className="btn-secondary flex items-center space-x-2">
          <span>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Tests Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('testName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Test Name</span>
                    {getSortIcon('testName')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Configuration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('startTime')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {getSortIcon('startTime')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTests.map((test) => (
                <tr key={test.testId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{test.testName}</div>
                    <div className="text-sm text-gray-500 font-mono">{test.testId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}>
                      {test.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{test.config.numRequests} requests</div>
                    <div className="text-gray-500">
                      {ApiService.formatBytes(test.config.requestSize)} → {ApiService.formatBytes(test.config.responseSize)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.status === 'completed' && Object.keys(test.results).length > 0 ? (
                      <div>
                        <div>{Object.keys(test.results).join(', ').toUpperCase()}</div>
                        {test.comparison && (
                          <div className="text-gray-500">
                            Fastest: {test.comparison.summary.fastestProtocol.toUpperCase()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(test.startTime).toLocaleDateString()}</div>
                    <div className="text-gray-500">{new Date(test.startTime).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onSelectTest(test)}
                      className="text-primary-600 hover:text-primary-900 transition-colors"
                    >
                      View Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{tests.length}</div>
          <div className="text-sm text-gray-500">Total Tests</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {tests.filter(t => t.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {tests.filter(t => t.status === 'failed').length}
          </div>
          <div className="text-sm text-gray-500">Failed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {tests.filter(t => t.status === 'running').length}
          </div>
          <div className="text-sm text-gray-500">Running</div>
        </div>
      </div>
    </div>
  );
};