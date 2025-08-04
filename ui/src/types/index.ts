export interface TestConfig {
  numRequests: number;
  concurrency: number;
  requestSize: number;
  responseSize: number;
  protocols: ('grpc' | 'http')[];
  testName: string;
}

export interface TestResult {
  protocol: string;
  totalRequests: number;
  successfulRequests: number;
  totalDuration: number;
  averageLatency: number;
  throughput: number;
  results: any[];
}

export interface ComparisonMetrics {
  throughputComparison: Record<string, {
    value: number;
    relativeTo: string;
    ratio: number;
    improvement: string;
  }>;
  latencyComparison: Record<string, {
    value: number;
    relativeTo: string;
    ratio: number;
    improvement: string;
  }>;
  summary: {
    fastestProtocol: string;
    lowestLatencyProtocol: string;
    maxThroughput: number;
    minLatency: number;
  };
}

export interface Test {
  testId: string;
  testName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'interrupted';
  config: TestConfig;
  results: Record<string, TestResult>;
  comparison?: ComparisonMetrics;
  error?: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  details: {
    grpc: {
      status: string;
      responseTime?: number;
      error?: string;
    };
    http: {
      status: string;
      error?: string;
    };
    overall: string;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface TestsResponse {
  tests: Test[];
  total: number;
}

export interface ConfigResponse {
  performance: {
    defaultRequestSize: number;
    defaultResponseSize: number;
    defaultConcurrentRequests: number;
    defaultTestDuration: number;
    maxPayloadSize: number;
  };
  server: {
    grpc: {
      host: string;
      port: number;
    };
    http: {
      host: string;
      port: number;
    };
  };
  version: string;
}