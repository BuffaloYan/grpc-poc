const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class HttpClient {
  constructor() {
    this.baseURL = `${config.http.protocol}://${config.http.host}:${config.http.port}/api/v1/performance`;
    // Create HTTP agent with connection pooling
    const httpAgent = new (require('http').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50, // Limit concurrent connections
      maxFreeSockets: 10,
      timeout: 60000
    });

    // Create HTTPS agent with connection pooling
    const httpsAgent = config.http.protocol === 'https' ? new (require('https').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50, // Limit concurrent connections
      maxFreeSockets: 10,
      timeout: 60000,
      rejectUnauthorized: false // Allow self-signed certificates
    }) : undefined;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // 2 minutes timeout for large payloads
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpAgent: httpAgent,
      httpsAgent: httpsAgent
    });

    // Add request/response interceptors for logging and metrics
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        logger.debug(`HTTP request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('HTTP request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        logger.debug(`HTTP response: ${response.status} in ${duration}ms`);
        if (response.data && typeof response.data === 'object') {
          response.data.clientDuration = duration;
          response.data.protocol = 'http';
        }
        return response;
      },
      (error) => {
        const duration = error.config?.metadata ? Date.now() - error.config.metadata.startTime : 0;
        logger.error(`HTTP error: ${error.response?.status || 'NETWORK_ERROR'} in ${duration}ms`, error.message);
        return Promise.reject(error);
      }
    );

    logger.info(`HTTP client initialized with base URL: ${this.baseURL}`);
  }

  async processData(request, responseSize = 0) {
    try {
      // Calculate timeout based on payload size
      const payloadSize = request.payload ? Buffer.from(request.payload, 'base64').length : 0;
      const timeout = Math.max(120000, payloadSize * 0.01); // At least 2 minutes, or 10ms per byte
      
      // Always use base64 endpoint since we're sending base64-encoded payloads
      const response = await this.client.post('/process-base64', request, {
        params: responseSize > 0 ? { responseSize } : {},
        timeout: timeout
      });
      return response.data;
    } catch (error) {
      logger.error('HTTP processData error:', error.response?.data || error.message);
      throw error;
    }
  }



  async performanceTest(testConfig) {
    const {
      numRequests = 100,
      concurrency = 10,
      requestSize = config.performance.defaultRequestSize,
      responseSize = config.performance.defaultResponseSize
    } = testConfig;

    logger.info(`Starting HTTP performance test: ${numRequests} requests, concurrency: ${concurrency}`);

    const startTime = Date.now();
    const results = [];

    // Use concurrent individual requests with controlled concurrency
    const promises = [];
    for (let i = 0; i < numRequests; i += concurrency) {
      const batchSize = Math.min(concurrency, numRequests - i);
      const batchRequests = this.generateTestRequests(batchSize, requestSize, responseSize);
      const batchPromises = batchRequests.map(request => this.processData(request, responseSize));
      promises.push(Promise.all(batchPromises));
    }

    // Process batches sequentially to avoid overwhelming connection pool
    for (const batchPromise of promises) {
      const batchResults = await batchPromise;
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return {
      protocol: 'http',
      totalRequests: numRequests,
      successfulRequests: results.length,
      totalDuration,
      averageLatency: results.reduce((sum, r) => sum + (r.processingTimeNs / 1000000), 0) / results.length,
      throughput: (results.length / totalDuration) * 1000,
      results
    };
  }

  generateTestRequests(count, requestSize, responseSize) {
    const requests = [];
    
    // Generate test payload as base64 string for JSON transport
    const payload = Buffer.alloc(requestSize);
    for (let i = 0; i < requestSize; i++) {
      payload[i] = i % 256;
    }

    for (let i = 0; i < count; i++) {
      requests.push({
        id: `http-request-${i}`,
        timestamp: Date.now(),
        payload: payload.toString('base64'), // Use base64 encoding for JSON transport
        metadata: {
          requestIndex: i.toString(),
          expectedResponseSize: responseSize.toString(),
          testType: 'performance'
        }
      });
    }

    return requests;
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('HTTP health check error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getConfig() {
    try {
      const response = await this.client.get('/config');
      return response.data;
    } catch (error) {
      logger.error('HTTP config fetch error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateTestData(payloadSize = config.performance.defaultRequestSize, id = 'test') {
    try {
      const response = await this.client.post('/generate-test-data', {}, {
        params: { payloadSize, id }
      });
      return response.data;
    } catch (error) {
      logger.error('HTTP test data generation error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = HttpClient;