import React, { useState, useEffect } from 'react';
import type { TestConfig } from '../types';
import { ApiService, apiService } from '../services/apiService';

interface TestConfigurationProps {
  onRunTest: (config: TestConfig) => void;
  loading: boolean;
  javaHttpStrategy?: 'blocking' | 'reactive';
  currentClient?: 'nodejs' | 'java';
}

export const TestConfiguration: React.FC<TestConfigurationProps> = ({ onRunTest, loading, javaHttpStrategy, currentClient }) => {
  const [config, setConfig] = useState<TestConfig>({
    numRequests: 100,
    concurrency: 10,
    requestSize: 1048576, // 1MB
    responseSize: 10485760, // 10MB
    protocols: ['grpc', 'http'],
    testName: '',
    clientBackend: apiService.getCurrentBackend(),
  });
  
  const [currentBackend, setCurrentBackend] = useState<'nodejs' | 'java'>(apiService.getCurrentBackend());

  // Update backend when currentClient prop changes
  useEffect(() => {
    if (currentClient && currentClient !== currentBackend) {
      setCurrentBackend(currentClient);
      setConfig(prev => ({
        ...prev,
        clientBackend: currentClient
      }));
    }
  }, [currentClient, currentBackend]);

  // Update config when javaHttpStrategy changes
  useEffect(() => {
    if (javaHttpStrategy && currentBackend === 'java') {
      setConfig(prev => ({
        ...prev,
        javaHttpStrategy
      }));
    }
  }, [javaHttpStrategy, currentBackend]);

  const [requestSizeInput, setRequestSizeInput] = useState('1MB');
  const [responseSizeInput, setResponseSizeInput] = useState('10MB');
  const [presets] = useState([
    { name: 'Quick Test', numRequests: 10, concurrency: 2, requestSize: '1KB', responseSize: '10KB' },
    { name: 'Light Load', numRequests: 40, concurrency: 5, requestSize: '100KB', responseSize: '1MB' },
    { name: 'Medium Load', numRequests: 40, concurrency: 8, requestSize: '1MB', responseSize: '10MB' },
    { name: 'Heavy Load', numRequests: 60, concurrency: 10, requestSize: '2MB', responseSize: '20MB' },
  ]);

  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      testName: `Performance Test ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
    }));
  }, []);

  // Update backend when it changes
  useEffect(() => {
    const newBackend = apiService.getCurrentBackend();
    if (newBackend !== currentBackend) {
      setCurrentBackend(newBackend);
      setConfig(prev => ({
        ...prev,
        clientBackend: newBackend,
      }));
    }
  }, [currentBackend]);

  const handleInputChange = (field: keyof TestConfig, value: string | number | boolean | string[]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeInputChange = (field: 'requestSize' | 'responseSize', input: string) => {
    try {
      const bytes = ApiService.parseSize(input);
      setConfig(prev => ({ ...prev, [field]: bytes }));
      
      if (field === 'requestSize') {
        setRequestSizeInput(input);
      } else {
        setResponseSizeInput(input);
      }
    } catch {
      // Invalid input, keep the input field but don't update config
      if (field === 'requestSize') {
        setRequestSizeInput(input);
      } else {
        setResponseSizeInput(input);
      }
    }
  };

  const handleProtocolChange = (protocol: 'grpc' | 'http', checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      protocols: checked 
        ? [...prev.protocols, protocol]
        : prev.protocols.filter(p => p !== protocol)
    }));
  };

  const handleHttpMaxSockets = (value: number) => {
    setConfig(prev => ({ ...prev, httpMaxSockets: Math.max(1, Math.min(200, value)) }));
  };

  const handlePresetSelect = (preset: typeof presets[0]) => {
    setConfig(prev => ({
      ...prev,
      numRequests: preset.numRequests,
      concurrency: preset.concurrency,
      requestSize: ApiService.parseSize(preset.requestSize),
      responseSize: ApiService.parseSize(preset.responseSize),
    }));
    setRequestSizeInput(preset.requestSize);
    setResponseSizeInput(preset.responseSize);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.protocols.length === 0) {
      alert('Please select at least one protocol to test');
      return;
    }
    
    // Ensure the current backend is set
    const testConfig = {
      ...config,
      clientBackend: currentBackend,
    };
    
    onRunTest(testConfig);
  };

  const isValidSize = (input: string) => {
    try {
      ApiService.parseSize(input);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Configuration Form */}
      <div className="lg:col-span-2">
        <div className="card slide-in-up">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">⚙️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Test Configuration</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Test Name */}
            <div>
              <label className="label">Test Name</label>
              <input
                type="text"
                value={config.testName}
                onChange={(e) => handleInputChange('testName', e.target.value)}
                className="input-field"
                placeholder="Enter test name"
                required
              />
            </div>

            {/* Load Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Number of Requests</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={config.numRequests}
                  onChange={(e) => handleInputChange('numRequests', parseInt(e.target.value))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Concurrency</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.concurrency}
                  onChange={(e) => handleInputChange('concurrency', parseInt(e.target.value))}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Payload Sizes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Request Size</label>
                <input
                  type="text"
                  value={requestSizeInput}
                  onChange={(e) => handleSizeInputChange('requestSize', e.target.value)}
                  className={`input-field ${!isValidSize(requestSizeInput) ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="e.g., 1MB, 512KB, 1024B"
                  required
                />
                {!isValidSize(requestSizeInput) && (
                  <p className="mt-1 text-sm text-red-600">Invalid size format</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Current: {ApiService.formatBytes(config.requestSize)}
                </p>
              </div>
              <div>
                <label className="label">Response Size</label>
                <input
                  type="text"
                  value={responseSizeInput}
                  onChange={(e) => handleSizeInputChange('responseSize', e.target.value)}
                  className={`input-field ${!isValidSize(responseSizeInput) ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="e.g., 10MB, 5MB, 2048KB"
                  required
                />
                {!isValidSize(responseSizeInput) && (
                  <p className="mt-1 text-sm text-red-600">Invalid size format</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Current: {ApiService.formatBytes(config.responseSize)}
                </p>
              </div>
            </div>

            {/* Protocol Selection */}
            <div>
              <label className="label">Protocols to Test</label>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.protocols.includes('grpc')}
                    onChange={(e) => handleProtocolChange('grpc', e.target.checked)}
                    className="checkbox-field"
                  />
                  <span className="ml-2 text-sm text-gray-700">gRPC</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.protocols.includes('http')}
                    onChange={(e) => handleProtocolChange('http', e.target.checked)}
                    className="checkbox-field"
                  />
                  <span className="ml-2 text-sm text-gray-700">HTTP (+ Batch)</span>
                </label>
              </div>
            </div>

            {/* Client Backend Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600 font-medium">🔧 Client Backend:</span>
                <span className="font-semibold text-blue-800">
                  {currentBackend === 'java' ? 'Java High-Performance Client' : 'Node.js Client'}
                </span>
              </div>
              
              {/* Java HTTP Strategy Display */}
              {currentBackend === 'java' && javaHttpStrategy && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-600 font-medium">⚡ HTTP Strategy:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    javaHttpStrategy === 'reactive' 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                  }`}>
                    {javaHttpStrategy === 'reactive' ? '⚡ Reactive (WebClient)' : '🔄 Blocking (HttpClient)'}
                  </span>
                </div>
              )}
              
              <p className="text-sm text-blue-600">
                {currentBackend === 'java' 
                  ? 'Optimized for consistent high throughput and low latency performance'
                  : 'Full-featured client with orchestration, streaming, and test history'
                }
              </p>
              {currentBackend === 'java' && (
                <div className="mt-2 text-xs text-blue-500">
                  Note: Test history is not available for Java client
                </div>
              )}
            </div>

            {/* gRPC Options */}
            <div>
              <label className="label">gRPC Options</label>
              <div className="flex items-center space-x-3">
                <input
                  id="useGrpcStreaming"
                  type="checkbox"
                  checked={Boolean(config.useGrpcStreaming)}
                  onChange={(e) => handleInputChange('useGrpcStreaming', e.target.checked)}
                  className="checkbox-field"
                />
                <label htmlFor="useGrpcStreaming" className="text-sm text-gray-700">Use gRPC Streaming</label>
              </div>
            </div>

            {/* HTTP Options */}
            <div>
              <label className="label">HTTP Options</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="text-sm text-gray-700">Max Sockets</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={config.httpMaxSockets || 50}
                    onChange={(e) => handleHttpMaxSockets(parseInt(e.target.value))}
                    className="input-field"
                  />
                  <p className="mt-1 text-xs text-gray-500">Controls parallel HTTP connections</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading || config.protocols.length === 0 || !isValidSize(requestSizeInput) || !isValidSize(responseSizeInput)}
                className="btn-primary flex items-center space-x-3 text-lg disabled:transform-none"
              >
                {loading && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span className="flex items-center space-x-2">
                  {!loading && <span>🚀</span>}
                  <span>{loading ? 'Running Test...' : 'Run Performance Test'}</span>
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Presets Sidebar */}
      <div className="space-y-8">
        <div className="card scale-in" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Quick Presets</h3>
          </div>
          <div className="space-y-4">
            {presets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(preset)}
                className="w-full text-left preset-button disabled:transform-none"
                disabled={loading}
                style={{animationDelay: `${0.2 + index * 0.1}s`}}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md mt-0.5 flex-shrink-0">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-base">{preset.name}</div>
                    <div className="text-sm text-gray-600 mt-1 font-medium">
                      {preset.numRequests} requests • {preset.concurrency} concurrent
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                      {preset.requestSize} → {preset.responseSize}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Test Info */}
        <div className="card slide-in-up" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">📊</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Test Information</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Total Data Transfer:</span>
              <span className="font-bold text-lg text-blue-600">
                {ApiService.formatBytes((config.requestSize + config.responseSize) * config.numRequests)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Request Payload:</span>
              <span className="font-bold text-lg text-green-600">{ApiService.formatBytes(config.requestSize)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Response Payload:</span>
              <span className="font-bold text-lg text-purple-600">{ApiService.formatBytes(config.responseSize)}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 font-medium">Estimated Duration:</span>
              <span className="font-bold text-lg text-orange-600">
                {Math.ceil(config.numRequests / config.concurrency)} - {Math.ceil(config.numRequests / config.concurrency * 2)}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};