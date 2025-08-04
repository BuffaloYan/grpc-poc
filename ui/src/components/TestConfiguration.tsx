import React, { useState, useEffect } from 'react';
import type { TestConfig } from '../types';
import { ApiService } from '../services/apiService';

interface TestConfigurationProps {
  onRunTest: (config: TestConfig) => void;
  loading: boolean;
}

export const TestConfiguration: React.FC<TestConfigurationProps> = ({ onRunTest, loading }) => {
  const [config, setConfig] = useState<TestConfig>({
    numRequests: 100,
    concurrency: 10,
    requestSize: 1048576, // 1MB
    responseSize: 10485760, // 10MB
    protocols: ['grpc', 'http'],
    testName: '',
  });

  const [requestSizeInput, setRequestSizeInput] = useState('1MB');
  const [responseSizeInput, setResponseSizeInput] = useState('10MB');
  const [presets] = useState([
    { name: 'Quick Test', numRequests: 10, concurrency: 2, requestSize: '1KB', responseSize: '10KB' },
    { name: 'Light Load', numRequests: 100, concurrency: 10, requestSize: '100KB', responseSize: '1MB' },
    { name: 'Medium Load', numRequests: 500, concurrency: 25, requestSize: '1MB', responseSize: '10MB' },
    { name: 'Heavy Load', numRequests: 1000, concurrency: 50, requestSize: '5MB', responseSize: '50MB' },
  ]);

  useEffect(() => {
    if (!config.testName) {
      setConfig(prev => ({
        ...prev,
        testName: `Performance Test ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      }));
    }
  }, []);

  const handleInputChange = (field: keyof TestConfig, value: any) => {
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
    } catch (error) {
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
    onRunTest(config);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Configuration Form */}
      <div className="lg:col-span-2">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Test Configuration</h2>
          
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
                  <span className="ml-2 text-sm text-gray-700">gRPC (+ Streaming)</span>
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

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || config.protocols.length === 0 || !isValidSize(requestSizeInput) || !isValidSize(responseSizeInput)}
                className="btn-primary flex items-center space-x-2"
              >
                {loading && (
                  <span className="animate-spin text-sm">⟳</span>
                )}
                <span>{loading ? 'Running Test...' : 'Run Performance Test'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Presets Sidebar */}
      <div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Presets</h3>
          <div className="space-y-3">
            {presets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(preset)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                disabled={loading}
              >
                <div className="font-medium text-gray-900">{preset.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {preset.numRequests} requests, {preset.concurrency} concurrent
                </div>
                <div className="text-sm text-gray-500">
                  {preset.requestSize} → {preset.responseSize}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Test Info */}
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Information</h3>
                      <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Data Transfer:</span>
              <span className="font-medium">
                {ApiService.formatBytes((config.requestSize + config.responseSize) * config.numRequests)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Request Payload:</span>
              <span className="font-medium">{ApiService.formatBytes(config.requestSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Response Payload:</span>
              <span className="font-medium">{ApiService.formatBytes(config.responseSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Duration:</span>
              <span className="font-medium">
                {Math.ceil(config.numRequests / config.concurrency)} - {Math.ceil(config.numRequests / config.concurrency * 2)}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};