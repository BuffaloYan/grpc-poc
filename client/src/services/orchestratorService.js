const GrpcClient = require('../clients/grpcClient');
const HttpClient = require('../clients/httpClient');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class OrchestratorService {
  constructor() {
    this.grpcClient = new GrpcClient();
    this.httpClient = new HttpClient();
    this.activeTests = new Map(); // Track running tests
  }

  async initialize() {
    try {
      await this.grpcClient.initialize();
      logger.info('Orchestrator service initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize gRPC client (server may not be running):', error.message);
      logger.info('Orchestrator service initialized with HTTP client only');
      // Don't throw error, allow client to start with HTTP only
    }
  }

  async runPerformanceComparison(testConfig) {
    const testId = uuidv4();
    const {
      numRequests = 100,
      concurrency = 10,
      requestSize = 1048576, // 1MB
      responseSize = 10485760, // 10MB
      protocols = ['grpc', 'http'],
      testName = `Performance Test ${new Date().toISOString()}`
    } = testConfig;

    logger.info(`Starting performance comparison test ${testId}`, {
      testId,
      testName,
      numRequests,
      concurrency,
      requestSize,
      responseSize,
      protocols
    });

    const testResults = {
      testId,
      testName,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      config: testConfig,
      results: {}
    };

    this.activeTests.set(testId, testResults);

    try {
      const promises = [];

      // Run gRPC tests if requested
      if (protocols.includes('grpc')) {
        promises.push(
          this.grpcClient.performanceTest({
            numRequests,
            concurrency,
            requestSize,
            responseSize,
            useStreaming: false
          }).then(result => ({ protocol: 'grpc', ...result }))
          .catch(error => {
            logger.warn('gRPC performance test failed:', error.message);
            return { protocol: 'grpc', error: error.message, totalRequests: 0, successfulRequests: 0, failedRequests: numRequests };
          })
        );

        promises.push(
          this.grpcClient.performanceTest({
            numRequests,
            concurrency,
            requestSize,
            responseSize,
            useStreaming: true
          }).then(result => ({ protocol: 'grpc-stream', ...result }))
          .catch(error => {
            logger.warn('gRPC streaming performance test failed:', error.message);
            return { protocol: 'grpc-stream', error: error.message, totalRequests: 0, successfulRequests: 0, failedRequests: numRequests };
          })
        );
      }

      // Run HTTP tests if requested
      if (protocols.includes('http')) {
        promises.push(
          this.httpClient.performanceTest({
            numRequests,
            concurrency,
            requestSize,
            responseSize,
            useBatch: false
          }).then(result => ({ protocol: 'http', ...result }))
          .catch(error => {
            logger.warn('HTTP performance test failed:', error.message);
            return { protocol: 'http', error: error.message, totalRequests: 0, successfulRequests: 0, failedRequests: numRequests };
          })
        );

        promises.push(
          this.httpClient.performanceTest({
            numRequests,
            concurrency,
            requestSize,
            responseSize,
            useBatch: true
          }).then(result => ({ protocol: 'http-batch', ...result }))
          .catch(error => {
            logger.warn('HTTP batch performance test failed:', error.message);
            return { protocol: 'http-batch', error: error.message, totalRequests: 0, successfulRequests: 0, failedRequests: numRequests };
          })
        );
      }



      const results = await Promise.all(promises);

      // Process and store results
      results.forEach(result => {
        testResults.results[result.protocol] = result;
      });

      testResults.endTime = new Date().toISOString();
      testResults.status = 'completed';

      // Calculate comparison metrics
      testResults.comparison = this.calculateComparisonMetrics(results);

      logger.info(`Performance comparison test ${testId} completed successfully`);
      return testResults;

    } catch (error) {
      testResults.endTime = new Date().toISOString();
      testResults.status = 'failed';
      testResults.error = error.message;
      
      logger.error(`Performance comparison test ${testId} failed:`, error);
      throw error;
    } finally {
      this.activeTests.set(testId, testResults);
    }
  }

  calculateComparisonMetrics(results) {
    const metrics = {
      throughputComparison: {},
      latencyComparison: {},
      summary: {}
    };

    // Handle empty results
    if (!results || results.length === 0) {
      metrics.summary = {
        fastestProtocol: undefined,
        lowestLatencyProtocol: undefined,
        maxThroughput: 0,
        minLatency: 0
      };
      return metrics;
    }

    const baselineResult = results.find(r => r.protocol === 'grpc') || results[0];
    
    results.forEach(result => {
      const protocol = result.protocol;
      
      // Throughput comparison (requests per second)
      metrics.throughputComparison[protocol] = {
        value: result.throughput,
        relativeTo: baselineResult.protocol,
        ratio: result.throughput / baselineResult.throughput,
        improvement: ((result.throughput - baselineResult.throughput) / baselineResult.throughput * 100).toFixed(2)
      };

      // Latency comparison (milliseconds)
      metrics.latencyComparison[protocol] = {
        value: result.averageLatency,
        relativeTo: baselineResult.protocol,
        ratio: result.averageLatency / baselineResult.averageLatency,
        improvement: ((baselineResult.averageLatency - result.averageLatency) / baselineResult.averageLatency * 100).toFixed(2)
      };
    });

    // Summary
    const fastest = results.reduce((prev, current) => 
      prev.throughput > current.throughput ? prev : current
    );
    const lowestLatency = results.reduce((prev, current) => 
      prev.averageLatency < current.averageLatency ? prev : current
    );

    metrics.summary = {
      fastestProtocol: fastest.protocol,
      lowestLatencyProtocol: lowestLatency.protocol,
      maxThroughput: fastest.throughput,
      minLatency: lowestLatency.averageLatency
    };

    return metrics;
  }

  async getTestStatus(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }
    return test;
  }

  async getAllTests() {
    return Array.from(this.activeTests.values()).map(test => {
      // Create a lightweight version without large payloads
      const lightweightTest = {
        testId: test.testId,
        testName: test.testName,
        startTime: test.startTime,
        endTime: test.endTime,
        status: test.status,
        config: test.config
      };

      // Only include results summary, not full payloads
      if (test.results) {
        lightweightTest.results = {};
        for (const [protocol, result] of Object.entries(test.results)) {
          lightweightTest.results[protocol] = {
            totalRequests: result.totalRequests,
            successfulRequests: result.successfulRequests,
            failedRequests: result.failedRequests,
            averageLatency: result.averageLatency,
            minLatency: result.minLatency,
            maxLatency: result.maxLatency,
            throughput: result.throughput,
            totalDataTransferred: result.totalDataTransferred,
            averageRequestSize: result.averageRequestSize,
            averageResponseSize: result.averageResponseSize,
            duration: result.duration,
            startTime: result.startTime,
            endTime: result.endTime
          };
        }
      }

      return lightweightTest;
    }).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  async healthCheck() {
    const checks = {
      grpc: null,
      http: null,
      overall: 'healthy'
    };

    try {
      // Check HTTP health
      checks.http = await this.httpClient.healthCheck();
    } catch (error) {
      checks.http = { status: 'unhealthy', error: error.message };
      checks.overall = 'degraded';
    }

    try {
      // Check gRPC health by making a simple request
      const testRequest = {
        id: 'health-check',
        timestamp: Date.now(),
        payload: Buffer.from('health'),
        metadata: { type: 'health-check' }
      };
      const grpcResponse = await this.grpcClient.processData(testRequest);
      checks.grpc = { status: 'healthy', responseTime: grpcResponse.clientDuration };
    } catch (error) {
      checks.grpc = { status: 'unhealthy', error: error.message };
      // Only mark as degraded if HTTP is also unhealthy
      if (checks.http.status === 'unhealthy') {
        checks.overall = 'degraded';
      } else {
        checks.overall = 'healthy'; // HTTP is working, gRPC is optional
      }
    }

    return checks;
  }

  async generateSampleData(size = 1048576) {
    try {
      const httpData = await this.httpClient.generateTestData(size, 'sample');
      
      const grpcData = {
        id: 'grpc-sample',
        timestamp: Date.now(),
        payload: Buffer.alloc(size),
        metadata: { type: 'sample', size: size.toString() }
      };

      // Fill payload with pattern
      for (let i = 0; i < size; i++) {
        grpcData.payload[i] = i % 256;
      }

      return {
        http: httpData,
        grpc: grpcData,
        size,
        generated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to generate sample data:', error);
      throw error;
    }
  }

  async shutdown() {
    logger.info('Shutting down orchestrator service');
    
    // Mark all running tests as interrupted
    for (const [testId, test] of this.activeTests) {
      if (test.status === 'running') {
        test.status = 'interrupted';
        test.endTime = new Date().toISOString();
      }
    }

    // Close clients
    try {
      await this.grpcClient.close();
    } catch (error) {
      logger.warn('Error closing gRPC client:', error.message);
    }
    
    logger.info('Orchestrator service shutdown complete');
  }
}

module.exports = OrchestratorService;