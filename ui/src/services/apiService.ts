import axios, { type AxiosInstance } from 'axios';
import type { TestConfig, Test, TestResult, HealthCheck, TestsResponse, ConfigResponse, ClientBackend } from '../types';

class ApiService {
  private clients: Record<string, AxiosInstance> = {};
  private availableBackends: ClientBackend[] = [
    {
      id: 'nodejs',
      name: 'Node.js Client',
      description: 'Original Node.js gRPC/HTTP client with orchestrator service',
      baseUrl: 'http://localhost:3000',
      status: 'unknown',
      features: ['Orchestration', 'Streaming', 'Batch Processing', 'Real-time Metrics'],
    },
    {
      id: 'java',
      name: 'Java High-Performance Client',
      description: 'High-performance Java client optimized for throughput and consistency',
      baseUrl: 'http://localhost:3002',
      status: 'unknown',
      features: ['High Throughput', 'Low Latency', 'Connection Pooling', 'Native Protobuf'],
    },
  ];
  private currentBackend: 'nodejs' | 'java' = this.loadCurrentBackend();

  constructor() {
    // Initialize clients for both backends
    this.availableBackends.forEach(backend => {
      this.clients[backend.id] = axios.create({
        baseURL: backend.baseUrl,
        timeout: 300000, // 5 minutes timeout for long-running tests
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add interceptors for each client
      this.addInterceptors(this.clients[backend.id], backend.name);
    });
  }

  private loadCurrentBackend(): 'nodejs' | 'java' {
    try {
      const saved = localStorage.getItem('grpc-demo-current-backend');
      return (saved === 'java' || saved === 'nodejs') ? saved : 'nodejs';
    } catch (error) {
      return 'nodejs';
    }
  }

  private saveCurrentBackend(backend: 'nodejs' | 'java'): void {
    try {
      localStorage.setItem('grpc-demo-current-backend', backend);
    } catch (error) {
      console.warn('Failed to save current backend to localStorage:', error);
    }
  }

  private addInterceptors(client: AxiosInstance, clientName: string) {
    // Request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        console.log(`${clientName} API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error(`${clientName} API Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        console.log(`${clientName} API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`${clientName} API Response Error:`, error.response?.data || error.message);
        
        // Transform error for better UX
        const message = error.response?.data?.message || error.message || 'An error occurred';
        throw new Error(`${clientName}: ${message}`);
      }
    );
  }

  getAvailableBackends(): ClientBackend[] {
    return this.availableBackends;
  }

  getCurrentBackend(): 'nodejs' | 'java' {
    return this.currentBackend;
  }

  setCurrentBackend(backend: 'nodejs' | 'java'): void {
    this.currentBackend = backend;
    this.saveCurrentBackend(backend);
  }

  private getClient(): AxiosInstance {
    return this.clients[this.currentBackend];
  }

  async getHealth(): Promise<HealthCheck> {
    const client = this.getClient();
    if (this.currentBackend === 'java') {
      const response = await client.get<HealthCheck>('/api/v1/performance/health');
      return response.data;
    } else {
      const response = await client.get<HealthCheck>('/api/health');
      return response.data;
    }
  }

  async checkBackendHealth(backendId: 'nodejs' | 'java'): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      const client = this.clients[backendId];
      if (backendId === 'java') {
        await client.get('/api/v1/performance/health');
      } else {
        await client.get('/api/health');
      }
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async updateBackendStatuses(): Promise<void> {
    for (const backend of this.availableBackends) {
      const healthCheck = await this.checkBackendHealth(backend.id);
      backend.status = healthCheck.status;
    }
  }

  async runTest(config: TestConfig): Promise<{ testId: string; results: Test }> {
    const client = this.getClient();
    
    if (this.currentBackend === 'java') {
      // Use Java client API for running tests
      const promises: Promise<any>[] = [];
      
      if (config.protocols.includes('grpc')) {
        promises.push(
          client.post('/api/v1/performance/test-grpc', null, {
            params: {
              concurrency: config.concurrency,
              requests: config.numRequests,
              payloadSize: config.requestSize,
              responseSize: config.responseSize,
            }
          })
        );
      }
      
      if (config.protocols.includes('http')) {
        promises.push(
          client.post('/api/v1/performance/test-http', null, {
            params: {
              concurrency: config.concurrency,
              requests: config.numRequests,
              payloadSize: config.requestSize,
              responseSize: config.responseSize,
            }
          })
        );
      }

      const results = await Promise.all(promises);
      
      // Transform Java client results to match expected format
      const testId = `java-test-${Date.now()}`;
      const transformedResults: Record<string, TestResult> = {};
      
      results.forEach((result, index) => {
        const protocol = config.protocols[index];
        const data = result.data;
        
        transformedResults[protocol] = {
          protocol: data.protocol,
          totalRequests: data.totalRequests,
          successfulRequests: data.totalRequests - data.errorCount,
          totalDuration: data.durationMs,
          averageLatency: data.avgLatencyMs,
          throughput: data.throughput,
          results: [],
        };
      });

      const test: Test = {
        testId,
        testName: config.testName,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        config,
        results: transformedResults,
      };

      return { testId, results: test };
    } else {
      // Use Node.js client API
      const response = await client.post<{ testId: string; results: Test }>('/api/tests', config);
      return response.data;
    }
  }

  async getTest(testId: string): Promise<Test> {
    // For Java client, we don't have persistent test storage, so return cached results
    if (testId.startsWith('java-test-')) {
      throw new Error('Java client test results are not stored persistently');
    }
    
    const client = this.getClient();
    const response = await client.get<Test>(`/api/tests/${testId}/results`);
    return response.data;
  }

  async getTests(): Promise<TestsResponse> {
    if (this.currentBackend === 'java') {
      // Java client doesn't have test history
      return { tests: [], total: 0 };
    }
    
    const client = this.getClient();
    const response = await client.get<TestsResponse>('/api/tests');
    return response.data;
  }

  async getConfig(): Promise<ConfigResponse> {
    const client = this.getClient();
    if (this.currentBackend === 'java') {
      const response = await client.get('/api/v1/performance/config');
      
      // Transform Java client config to match expected format
      const javaConfig = response.data;
      
      // Update backend with strategy info if available
      const backend = this.availableBackends.find(b => b.id === 'java');
      if (backend && javaConfig.httpClientStrategy) {
        backend.httpStrategy = javaConfig.httpClientStrategy;
        backend.availableHttpStrategies = javaConfig.availableHttpStrategies || ['blocking', 'reactive'];
      }
      
      return {
        performance: {
          defaultRequestSize: javaConfig.defaultPayloadSize || 1048576,
          defaultResponseSize: 0,
          defaultConcurrentRequests: javaConfig.defaultConcurrency || 10,
          defaultTestDuration: 30,
          maxPayloadSize: javaConfig.maxPayloadSize || 104857600,
        },
        server: {
          grpc: { host: 'localhost', port: 9090 },
          http: { host: 'localhost', port: 8080 },
        },
        version: '1.0.0-java',
      };
    } else {
      const response = await client.get<ConfigResponse>('/api/config');
      return response.data;
    }
  }

  async getJavaHttpStrategy(): Promise<{ currentStrategy: string; availableStrategies: string[] }> {
    if (this.currentBackend !== 'java') {
      throw new Error('HTTP strategy is only available for Java client');
    }
    
    const client = this.getClient();
    const response = await client.get('/api/v1/performance/strategy');
    return response.data;
  }

  async setJavaHttpStrategy(strategy: string): Promise<{ message: string; currentStrategy: string }> {
    if (this.currentBackend !== 'java') {
      throw new Error('HTTP strategy is only available for Java client');
    }
    
    const client = this.getClient();
    const response = await client.post('/api/v1/performance/strategy', { strategy });
    
    // Update backend info
    const backend = this.availableBackends.find(b => b.id === 'java');
    if (backend) {
      backend.httpStrategy = response.data.currentStrategy;
    }
    
    return response.data;
  }

  async generateSampleData(size: number): Promise<any> {
    const client = this.getClient();
    if (this.currentBackend === 'java') {
      // Java client doesn't have sample data generation
      throw new Error('Sample data generation is not available for Java client');
    }
    const response = await client.post('/api/sample-data', { size });
    return response.data;
  }

  // Utility method to format bytes
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Utility method to format duration
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  // Utility method to format throughput
  static formatThroughput(rps: number): string {
    if (rps < 1) return `${(rps * 1000).toFixed(2)} req/s`;
    if (rps < 1000) return `${rps.toFixed(2)} req/s`;
    return `${(rps / 1000).toFixed(2)}k req/s`;
  }

  // Utility method to calculate percentiles
  static calculatePercentiles(values: number[]): Record<string, number> {
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)],
      p90: sorted[Math.floor(len * 0.9)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
    };
  }

  // Utility method to parse size input (e.g., "1MB", "512KB")
  static parseSize(input: string): number {
    const match = input.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i);
    if (!match) throw new Error('Invalid size format');
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    
    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };
    
    return Math.floor(value * multipliers[unit]);
  }
}

export const apiService = new ApiService();
export { ApiService };