import axios, { type AxiosInstance } from 'axios';
import type { TestConfig, Test, HealthCheck, TestsResponse, ConfigResponse } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    // Use environment variable or default to localhost:3000
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes timeout for long-running tests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        
        // Transform error for better UX
        const message = error.response?.data?.message || error.message || 'An error occurred';
        throw new Error(message);
      }
    );
  }

  async getHealth(): Promise<HealthCheck> {
    const response = await this.client.get<HealthCheck>('/api/health');
    return response.data;
  }

  async runTest(config: TestConfig): Promise<{ testId: string; results: Test }> {
    const response = await this.client.post<{ testId: string; results: Test }>('/api/tests', config);
    return response.data;
  }

  async getTest(testId: string): Promise<Test> {
    const response = await this.client.get<Test>(`/api/tests/${testId}/results`);
    return response.data;
  }

  async getTests(): Promise<TestsResponse> {
    const response = await this.client.get<TestsResponse>('/api/tests');
    return response.data;
  }

  async getConfig(): Promise<ConfigResponse> {
    const response = await this.client.get<ConfigResponse>('/api/config');
    return response.data;
  }

  async generateSampleData(size: number): Promise<any> {
    const response = await this.client.post('/api/sample-data', { size });
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