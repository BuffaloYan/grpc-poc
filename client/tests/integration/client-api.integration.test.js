const request = require('supertest');
const express = require('express');
const { OrchestratorService } = require('../../src/services/orchestratorService');

// Mock the orchestrator service
const mockOrchestrator = {
  healthCheck: jest.fn(),
  runPerformanceComparison: jest.fn(),
  getTestStatus: jest.fn(),
  getAllTests: jest.fn(),
  generateSampleData: jest.fn(),
  initialize: jest.fn(),
  shutdown: jest.fn()
};

jest.mock('../../src/services/orchestratorService', () => ({
  OrchestratorService: jest.fn(() => mockOrchestrator)
}));

describe('Client API Integration Tests', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ extended: true, limit: '100mb' }));

    // Reset all mocks
    jest.clearAllMocks();

    // Add routes (simplified version of the actual routes)
    app.get('/api/health', async (req, res) => {
      try {
        const health = await mockOrchestrator.healthCheck();
        res.json({
          status: health.overall,
          timestamp: new Date().toISOString(),
          service: 'grpc-demo-client',
          version: '1.0.0',
          details: health
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    app.post('/api/tests', async (req, res) => {
      try {
        const testConfig = req.body;
        const validatedConfig = {
          numRequests: Math.min(parseInt(testConfig.numRequests) || 100, 10000),
          concurrency: Math.min(parseInt(testConfig.concurrency) || 10, 100),
          requestSize: Math.min(parseInt(testConfig.requestSize) || 1048576, 104857600),
          responseSize: Math.min(parseInt(testConfig.responseSize) || 10485760, 104857600),
          protocols: testConfig.protocols || ['grpc', 'http'],
          testName: testConfig.testName || `Test ${new Date().toISOString()}`
        };

        const testInfo = await mockOrchestrator.runPerformanceComparison(validatedConfig);
        
        res.status(201).json({
          message: 'Performance test completed',
          testId: testInfo.testId,
          results: testInfo
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to start performance test',
          message: error.message
        });
      }
    });

    app.get('/api/tests/:testId', async (req, res) => {
      try {
        const { testId } = req.params;
        const testStatus = await mockOrchestrator.getTestStatus(testId);
        res.json(testStatus);
      } catch (error) {
        res.status(404).json({
          error: 'Test not found',
          message: error.message
        });
      }
    });

    app.get('/api/tests', async (req, res) => {
      try {
        const tests = await mockOrchestrator.getAllTests();
        res.json({
          tests,
          total: tests.length
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get tests',
          message: error.message
        });
      }
    });

    app.get('/api/tests/:testId/results', async (req, res) => {
      try {
        const { testId } = req.params;
        const test = await mockOrchestrator.getTestStatus(testId);
        
        const lightweightTest = {
          testId: test.testId,
          testName: test.testName,
          startTime: test.startTime,
          endTime: test.endTime,
          status: test.status,
          config: test.config,
          error: test.error
        };

        if (test.results) {
          lightweightTest.results = {};
          for (const [protocol, result] of Object.entries(test.results)) {
            lightweightTest.results[protocol] = {
              protocol: result.protocol,
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

        res.json(lightweightTest);
      } catch (error) {
        res.status(404).json({
          error: 'Test not found',
          message: error.message
        });
      }
    });

    app.post('/api/sample-data', async (req, res) => {
      try {
        const { size = 1048576 } = req.body;
        const sampleData = await mockOrchestrator.generateSampleData(size);
        res.json(sampleData);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to generate sample data',
          message: error.message
        });
      }
    });

    app.get('/api/config', (req, res) => {
      res.json({
        performance: {
          defaultRequestSize: 1048576,
          defaultResponseSize: 10485760,
          maxPayloadSize: 104857600
        },
        server: {
          grpc: { host: 'localhost', port: 9090 },
          http: { host: 'localhost', port: 8080 }
        },
        version: '1.0.0'
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    test('GET /api/health should return healthy status', async () => {
      mockOrchestrator.healthCheck.mockResolvedValue({
        overall: 'healthy',
        grpc: { status: 'healthy', latency: 10 },
        http: { status: 'healthy', latency: 15 },

      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'grpc-demo-client',
        version: '1.0.0'
      });
      expect(response.body.details).toBeDefined();
      expect(mockOrchestrator.healthCheck).toHaveBeenCalledTimes(1);
    });

    test('GET /api/health should return unhealthy status when service fails', async () => {
      mockOrchestrator.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: 'Service unavailable'
      });
    });
  });

  describe('Configuration Endpoint', () => {
    test('GET /api/config should return configuration', async () => {
      const response = await request(app)
        .get('/api/config')
        .expect(200);

      expect(response.body).toMatchObject({
        performance: {
          defaultRequestSize: 1048576,
          defaultResponseSize: 10485760,
          maxPayloadSize: 104857600
        },
        server: {
          grpc: { host: 'localhost', port: 9090 },
          http: { host: 'localhost', port: 8080 }
        },
        version: '1.0.0'
      });
    });
  });

  describe('Performance Test Endpoint', () => {
    test('POST /api/tests should start performance test with valid config', async () => {
      const testConfig = {
        numRequests: 100,
        concurrency: 10,
        requestSize: 1048576,
        responseSize: 10485760,
        protocols: ['grpc', 'http'],
        testName: 'Integration Test'
      };

      const mockTestResult = {
        testId: 'test-123',
        testName: 'Integration Test',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        results: {
          grpc: {
            protocol: 'grpc',
            totalRequests: 100,
            successfulRequests: 100,
            failedRequests: 0,
            averageLatency: 15.5,
            throughput: 6451.6
          },
          http: {
            protocol: 'http',
            totalRequests: 100,
            successfulRequests: 100,
            failedRequests: 0,
            averageLatency: 18.2,
            throughput: 5494.5
          }
        }
      };

      mockOrchestrator.runPerformanceComparison.mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/tests')
        .send(testConfig)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Performance test completed',
        testId: 'test-123'
      });
      expect(response.body.results).toBeDefined();
      expect(mockOrchestrator.runPerformanceComparison).toHaveBeenCalledWith({
        numRequests: 100,
        concurrency: 10,
        requestSize: 1048576,
        responseSize: 10485760,
        protocols: ['grpc', 'http'],
        testName: 'Integration Test'
      });
    });

    test('POST /api/tests should validate and limit config values', async () => {
      const testConfig = {
        numRequests: 20000, // Should be limited to 10000
        concurrency: 200,   // Should be limited to 100
        requestSize: 200000000, // Should be limited to maxPayloadSize
        responseSize: 200000000, // Should be limited to maxPayloadSize
        protocols: ['grpc'],
        testName: 'Validation Test'
      };

      const mockTestResult = {
        testId: 'test-456',
        testName: 'Validation Test',
        status: 'completed'
      };

      mockOrchestrator.runPerformanceComparison.mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/tests')
        .send(testConfig)
        .expect(201);

      expect(mockOrchestrator.runPerformanceComparison).toHaveBeenCalledWith({
        numRequests: 10000, // Limited
        concurrency: 100,   // Limited
        requestSize: 104857600, // Limited to maxPayloadSize
        responseSize: 104857600, // Limited to maxPayloadSize
        protocols: ['grpc'],
        testName: 'Validation Test'
      });
    });

    test('POST /api/tests should handle missing config values', async () => {
      const testConfig = {}; // Empty config

      const mockTestResult = {
        testId: 'test-789',
        testName: expect.stringContaining('Test'),
        status: 'completed'
      };

      mockOrchestrator.runPerformanceComparison.mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/tests')
        .send(testConfig)
        .expect(201);

      expect(mockOrchestrator.runPerformanceComparison).toHaveBeenCalledWith({
        numRequests: 100,
        concurrency: 10,
        requestSize: 1048576,
        responseSize: 10485760,
        protocols: ['grpc', 'http'],
        testName: expect.stringContaining('Test')
      });
    });

    test('POST /api/tests should handle orchestrator errors', async () => {
      const testConfig = {
        numRequests: 100,
        concurrency: 10
      };

      mockOrchestrator.runPerformanceComparison.mockRejectedValue(
        new Error('Failed to start test')
      );

      const response = await request(app)
        .post('/api/tests')
        .send(testConfig)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to start performance test',
        message: 'Failed to start test'
      });
    });
  });

  describe('Test Status Endpoint', () => {
    test('GET /api/tests/:testId should return test status', async () => {
      const testId = 'test-123';
      const mockTestStatus = {
        testId,
        testName: 'Test Status',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        results: {
          grpc: {
            protocol: 'grpc',
            totalRequests: 100,
            successfulRequests: 100
          }
        }
      };

      mockOrchestrator.getTestStatus.mockResolvedValue(mockTestStatus);

      const response = await request(app)
        .get(`/api/tests/${testId}`)
        .expect(200);

      expect(response.body).toEqual(mockTestStatus);
      expect(mockOrchestrator.getTestStatus).toHaveBeenCalledWith(testId);
    });

    test('GET /api/tests/:testId should return 404 for non-existent test', async () => {
      const testId = 'non-existent';
      mockOrchestrator.getTestStatus.mockRejectedValue(new Error('Test not found'));

      const response = await request(app)
        .get(`/api/tests/${testId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Test not found',
        message: 'Test not found'
      });
    });
  });

  describe('All Tests Endpoint', () => {
    test('GET /api/tests should return all tests', async () => {
      const mockTests = [
        {
          testId: 'test-1',
          testName: 'Test 1',
          status: 'completed'
        },
        {
          testId: 'test-2',
          testName: 'Test 2',
          status: 'running'
        }
      ];

      mockOrchestrator.getAllTests.mockResolvedValue(mockTests);

      const response = await request(app)
        .get('/api/tests')
        .expect(200);

      expect(response.body).toMatchObject({
        tests: mockTests,
        total: 2
      });
    });

    test('GET /api/tests should handle orchestrator errors', async () => {
      mockOrchestrator.getAllTests.mockRejectedValue(new Error('Failed to get tests'));

      const response = await request(app)
        .get('/api/tests')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to get tests',
        message: 'Failed to get tests'
      });
    });
  });

  describe('Test Results Endpoint', () => {
    test('GET /api/tests/:testId/results should return lightweight results', async () => {
      const testId = 'test-123';
      const mockTest = {
        testId,
        testName: 'Test Results',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        config: { numRequests: 100 },
        results: {
          grpc: {
            protocol: 'grpc',
            totalRequests: 100,
            successfulRequests: 100,
            failedRequests: 0,
            averageLatency: 15.5,
            minLatency: 10.2,
            maxLatency: 25.8,
            throughput: 6451.6,
            totalDataTransferred: 104857600,
            averageRequestSize: 1048576,
            averageResponseSize: 10485760,
            duration: 15500,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString()
          }
        }
      };

      mockOrchestrator.getTestStatus.mockResolvedValue(mockTest);

      const response = await request(app)
        .get(`/api/tests/${testId}/results`)
        .expect(200);

      expect(response.body).toMatchObject({
        testId,
        testName: 'Test Results',
        status: 'completed',
        config: { numRequests: 100 }
      });
      expect(response.body.results.grpc).toMatchObject({
        protocol: 'grpc',
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0,
        averageLatency: 15.5,
        throughput: 6451.6
      });
    });

    test('GET /api/tests/:testId/results should handle missing results', async () => {
      const testId = 'test-123';
      const mockTest = {
        testId,
        testName: 'Test No Results',
        status: 'completed',
        config: { numRequests: 100 }
        // No results property
      };

      mockOrchestrator.getTestStatus.mockResolvedValue(mockTest);

      const response = await request(app)
        .get(`/api/tests/${testId}/results`)
        .expect(200);

      expect(response.body).toMatchObject({
        testId,
        testName: 'Test No Results',
        status: 'completed'
      });
      expect(response.body.results).toBeUndefined();
    });
  });

  describe('Sample Data Endpoint', () => {
    test('POST /api/sample-data should generate sample data', async () => {
      const size = 1048576; // 1MB
      const mockSampleData = {
        http: 'base64-encoded-http-data',
        grpc: {
          id: 'grpc-sample',
          timestamp: Date.now(),
          payload: Buffer.alloc(size),
          metadata: { type: 'sample', size: size.toString() }
        },
        size,
        generated: new Date().toISOString()
      };

      mockOrchestrator.generateSampleData.mockResolvedValue(mockSampleData);

      const response = await request(app)
        .post('/api/sample-data')
        .send({ size })
        .expect(200);

      expect(response.body).toMatchObject({
        http: mockSampleData.http,
        grpc: {
          id: mockSampleData.grpc.id,
          metadata: mockSampleData.grpc.metadata
        },
        size: mockSampleData.size,
        generated: expect.any(String)
      });
      expect(mockOrchestrator.generateSampleData).toHaveBeenCalledWith(size);
    });

    test('POST /api/sample-data should use default size when not provided', async () => {
      const mockSampleData = {
        id: 'sample-data',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1048576),
        metadata: { generated: 'true' }
      };

      mockOrchestrator.generateSampleData.mockResolvedValue(mockSampleData);

      const response = await request(app)
        .post('/api/sample-data')
        .send({}) // No size specified
        .expect(200);

      expect(mockOrchestrator.generateSampleData).toHaveBeenCalledWith(1048576);
    });

    test('POST /api/sample-data should handle orchestrator errors', async () => {
      mockOrchestrator.generateSampleData.mockRejectedValue(
        new Error('Failed to generate data')
      );

      const response = await request(app)
        .post('/api/sample-data')
        .send({ size: 1048576 })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to generate sample data',
        message: 'Failed to generate data'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/tests')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('should handle missing required fields gracefully', async () => {
      const mockTestResult = {
        testId: 'test-defaults',
        testName: expect.stringContaining('Test'),
        status: 'completed'
      };

      mockOrchestrator.runPerformanceComparison.mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/tests')
        .send({ invalidField: 'value' })
        .expect(201); // Should still work with defaults
    });

    test('should handle very large payloads', async () => {
      const largePayload = {
        numRequests: 100,
        concurrency: 10,
        requestSize: 1048576,
        responseSize: 10485760,
        protocols: ['grpc', 'http'],
        testName: 'Large Payload Test',
        largeData: 'x'.repeat(1000000) // 1MB string
      };

      const mockTestResult = {
        testId: 'test-large',
        testName: 'Large Payload Test',
        status: 'completed'
      };

      mockOrchestrator.runPerformanceComparison.mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/tests')
        .send(largePayload)
        .expect(201);

      expect(response.body.testId).toBe('test-large');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent requests', async () => {
      const testConfig = {
        numRequests: 10,
        concurrency: 5,
        protocols: ['grpc']
      };

      const mockTestResult = {
        testId: 'concurrent-test',
        status: 'completed'
      };

      mockOrchestrator.runPerformanceComparison.mockResolvedValue(mockTestResult);

      // Make multiple concurrent requests
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/api/tests')
          .send(testConfig)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.testId).toBe('concurrent-test');
      });

      expect(mockOrchestrator.runPerformanceComparison).toHaveBeenCalledTimes(5);
    });

    test('should handle rapid status requests', async () => {
      const testId = 'rapid-test';
      const mockTestStatus = {
        testId,
        testName: 'Rapid Test',
        status: 'running'
      };

      mockOrchestrator.getTestStatus.mockResolvedValue(mockTestStatus);

      // Make rapid status requests
      const promises = Array(10).fill().map(() =>
        request(app)
          .get(`/api/tests/${testId}`)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.testId).toBe(testId);
      });

      expect(mockOrchestrator.getTestStatus).toHaveBeenCalledTimes(10);
    });
  });
}); 