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
  const [currentClient, setCurrentClient] = useState<'nodejs' | 'java'>(apiService.getCurrentBackend());
  const [javaHttpStrategy, setJavaHttpStrategy] = useState<'blocking' | 'reactive'>('blocking');
  
  // Use currentClient to track backend changes
  console.log('Current client backend:', currentClient, 'Java strategy:', javaHttpStrategy);

  // Load initial data
  useEffect(() => {
    loadHealth();
    loadTests();
    
    // Load initial Java strategy if Java client is selected
    if (currentClient === 'java') {
      loadInitialJavaStrategy();
    }
  }, []);

  const loadInitialJavaStrategy = async () => {
    try {
      const strategyInfo = await apiService.getJavaHttpStrategy();
      setJavaHttpStrategy(strategyInfo.currentStrategy as 'blocking' | 'reactive');
    } catch (error) {
      console.warn('Failed to load initial Java strategy:', error);
    }
  };

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

  const handleStrategyChange = (strategy: 'blocking' | 'reactive') => {
    setJavaHttpStrategy(strategy);
    console.log('Strategy changed to:', strategy);
  };

  return (
    <div className="min-h-screen">
      <Header health={health} onRefreshHealth={loadHealth} />

      <main className="container mx-auto px-6 py-8">
        {/* Client Selector */}
        <div className="mb-8 scale-in">
          <ClientSelector onClientChange={handleClientChange} onStrategyChange={handleStrategyChange} />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-12 slide-in-up">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-2 shadow-2xl border border-white/20">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('test')}
                className={`flex-1 py-4 px-8 rounded-2xl font-bold text-sm transition-all duration-300 transform ${
                  activeTab === 'test'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>🧪</span>
                  <span>Run Test</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex-1 py-4 px-8 rounded-2xl font-bold text-sm transition-all duration-300 transform ${
                  activeTab === 'results'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>📊</span>
                  <span>Results</span>
                  {currentTest && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white ml-2 animate-pulse">
                      Current
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 px-8 rounded-2xl font-bold text-sm transition-all duration-300 transform ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>📚</span>
                  <span>History</span>
                  {tests.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white ml-2">
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
          <div className="mb-8 scale-in">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200/60 rounded-3xl p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-red-500 text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="ml-6 flex-1">
                  <h3 className="text-xl font-bold text-red-800 mb-2">Error Occurred</h3>
                  <div className="text-red-700 text-lg">{error}</div>
                </div>
                <div className="ml-6">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all duration-300 transform hover:scale-110"
                  >
                    <span className="sr-only">Dismiss</span>
                    <span className="text-xl font-bold">×</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="fade-in">
          {activeTab === 'test' && (
            <TestConfiguration 
              onRunTest={handleRunTest} 
              loading={loading} 
              javaHttpStrategy={javaHttpStrategy}
              currentClient={currentClient}
            />
          )}

          {activeTab === 'results' && (
            <TestResults test={currentTest} />
          )}

          {activeTab === 'history' && (
            <TestHistory tests={tests} onSelectTest={handleSelectTest} onRefresh={loadTests} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;