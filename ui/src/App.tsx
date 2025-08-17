import { useState, useEffect } from 'react';
import { TestConfiguration } from './components/TestConfiguration';
import { TestResults } from './components/TestResults';
import { TestHistory } from './components/TestHistory';
import { Header } from './components/Header';
import ClientSelector from './components/ClientSelector';
import { apiService } from './services/apiService';
import type { Test, TestConfig, HealthCheck } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'test' | 'results' | 'history'>('test');
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentClient, setCurrentClient] = useState<'nodejs' | 'java'>('nodejs');
  
  // Use currentClient to track backend changes
  console.log('Current client backend:', currentClient);

  // Load initial data
  useEffect(() => {
    loadHealth();
    loadTests();
  }, []);

  const loadHealth = async () => {
    try {
      const healthData = await apiService.getHealth();
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to load health status:', err);
    }
  };

  const loadTests = async () => {
    try {
      const response = await apiService.getTests();
      setTests(response.tests);
    } catch (err) {
      console.error('Failed to load tests:', err);
    }
  };

  const handleRunTest = async (config: TestConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.runTest(config);
      setCurrentTest(result.results);
      setTests(prev => [result.results, ...prev]);
      setActiveTab('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTest = (test: Test) => {
    setCurrentTest(test);
    setActiveTab('results');
  };

  const handleClientChange = (clientId: 'nodejs' | 'java') => {
    setCurrentClient(clientId);
    // Clear current test and reload data for new client
    setCurrentTest(null);
    setError(null);
    loadHealth();
    loadTests();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header health={health} onRefreshHealth={loadHealth} />
      
      <main className="container mx-auto px-6 py-8">
        {/* Client Selector */}
        <div className="mb-6">
          <ClientSelector onClientChange={handleClientChange} />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="bg-white bg-opacity-70 rounded-2xl p-1 shadow-lg border border-gray-200">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('test')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'test'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:bg-opacity-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <span>Run Test</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'results'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:bg-opacity-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <span>Results</span>
                  {currentTest && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white ml-2">
                      Current
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:bg-opacity-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <span>History</span>
                  {tests.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white ml-2">
                      {tests.length}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                  <span className="text-red-500 text-xl">⚠</span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <div className="mt-2 text-red-700">{error}</div>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex items-center justify-center w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-200 rounded-full transition-colors"
                >
                  <span className="sr-only">Dismiss</span>
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'test' && (
          <TestConfiguration onRunTest={handleRunTest} loading={loading} />
        )}

        {activeTab === 'results' && (
          <TestResults test={currentTest} />
        )}

        {activeTab === 'history' && (
          <TestHistory tests={tests} onSelectTest={handleSelectTest} onRefresh={loadTests} />
        )}
      </main>
    </div>
  );
}

export default App;