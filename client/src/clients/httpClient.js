const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class HttpClient {
  constructor(maxSocketsOverride) {
    this.baseURL = `${config.http.protocol}://${config.http.host}:${config.http.port}/api/v1/performance`;
    // Create HTTP agent with connection pooling
    const httpAgent = new (require('http').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: maxSocketsOverride || 50, // Limit concurrent connections
      maxFreeSockets: 10,
      timeout: 60000
    });

    // Create HTTPS agent with connection pooling
    const httpsAgent = config.http.protocol === 'https' ? new (require('https').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: maxSocketsOverride || 50, // Limit concurrent connections
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
        logger.info(`HTTP response: ${response.status} in ${duration}ms`);
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
      // Calculate timeout based on payload size without decoding base64 repeatedly
      const payloadSize = request.metadata?.requestSize ? parseInt(request.metadata.requestSize) : 0;
      const timeout = Math.max(120000, payloadSize * 0.01); // At least 2 minutes, or 10ms per byte
      
      // Always use base64 endpoint since we're sending base64-encoded payloads
      const response = await this.client.post('/process-base64', request, {
        params: responseSize > 0 ? { responseSize, lite: true } : { lite: true },
        timeout: timeout
      });
      // Return minimal object to avoid retaining large payloads in memory
      return {
        processingTimeNs: response.data?.processingTimeNs,
        clientDuration: response.data?.clientDuration,
        protocol: 'http'
      };
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
    const averageLatency = results.length ? results.reduce((sum, r) => sum + (r.clientDuration || 0), 0) / results.length : 0;

    logger.info(`HTTP performance test summary:`);
    logger.info(`- Total test time: ${totalDuration}ms`);
    logger.info(`- Successful requests: ${results.length}`);
    const clientDurations = results.map(r => r.clientDuration || 0);
    logger.info(`- Client latencies: [${clientDurations.slice(0, 5).join(', ')}${clientDurations.length > 5 ? '...' : ''}]`);
    logger.info(`- Average latency: ${averageLatency.toFixed(2)}ms`);
    logger.info(`- Throughput: ${(results.length / totalDuration * 1000).toFixed(2)} req/sec`);

    return {
      protocol: 'http',
      totalRequests: numRequests,
      successfulRequests: results.length,
      totalDuration,
      averageLatency,
      throughput: (results.length / totalDuration) * 1000,
      // Do not return full results array with large payloads to save memory
      results: results
    };
  }

  generateTestRequests(count, requestSize, responseSize) {
    const requests = [];
    
    // Generate JSON payload once and reuse across requests to reduce memory footprint
    const baseObject = {
      user: {
        id: 'u-123',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        roles: ['admin', 'editor', 'observer']
      },
      meta: { source: 'http', version: '1.0.0' },
      items: Array.from({ length: 16 }, (_, i) => ({ index: i, title: `Item ${i}`, active: i % 2 === 0 }))
    };
    let jsonString = JSON.stringify(baseObject);
    if (jsonString.length < requestSize) {
      const padLen = requestSize - jsonString.length;
      jsonString += 'X'.repeat(padLen);
    } else if (jsonString.length > requestSize) {
      jsonString = jsonString.slice(0, requestSize);
    }
    const payloadBase64 = Buffer.from(jsonString, 'utf8').toString('base64');

    for (let i = 0; i < count; i++) {
      requests.push({
        id: `http-request-${i}`,
        timestamp: Date.now(),
        payload: payloadBase64, // Reuse same base64 string reference
        metadata: {
          requestIndex: i.toString(),
          expectedResponseSize: responseSize.toString(),
          testType: 'performance',
          requestSize: requestSize.toString(),
          contentType: 'application/json'
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