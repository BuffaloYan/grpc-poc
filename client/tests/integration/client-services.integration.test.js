const GrpcClient = require('../../src/clients/grpcClient');
const HttpClient = require('../../src/clients/httpClient');
const config = require('../../src/config');

// Mock the generated gRPC code
jest.mock('../../src/generated/demo_grpc_pb', () => ({
  PerformanceTestServiceClient: jest.fn()
}));

jest.mock('../../src/generated/demo_pb', () => ({
  DataRequest: jest.fn().mockImplementation(() => ({
    setId: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    setPayload: jest.fn().mockReturnThis(),
    getMetadataMap: jest.fn().mockReturnValue({
      set: jest.fn()
    })
  })),
  DataResponse: jest.fn().mockImplementation(() => ({
    getId: jest.fn().mockReturnValue('test-id'),
    getTimestamp: jest.fn().mockReturnValue(Date.now()),
    getPayload: jest.fn().mockReturnValue(Buffer.from('test-payload')),
    getStatusCode: jest.fn().mockReturnValue(200),
    getMessage: jest.fn().mockReturnValue('Success'),
    getProcessingTimeNs: jest.fn().mockReturnValue(1000000)
  }))
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('Client Services Integration Tests', () => {
  let grpcClient;
  let httpClient;
  let mockGrpcService;
  let mockAxiosInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock gRPC service
    mockGrpcService = {
      processData: jest.fn(),
      processDataStream: jest.fn(),
      close: jest.fn()
    };

    const { PerformanceTestServiceClient } = require('../../src/generated/demo_grpc_pb');
    PerformanceTestServiceClient.mockImplementation(() => mockGrpcService);

    // Mock axios instance
    const axios = require('axios');
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    // Create client instances
    grpcClient = new GrpcClient();
    httpClient = new HttpClient();
  });

  describe('gRPC Client Tests', () => {
    test('should initialize gRPC client successfully', async () => {
      await grpcClient.initialize();

      expect(grpcClient.initialized).toBe(true);
      expect(grpcClient.client).toBeDefined();
    });

    test('should process data via gRPC', async () => {
      const testRequest = {
        id: 'test-grpc',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024),
        metadata: {
          test: 'grpc-processing'
        }
      };

      const mockResponse = {
        getId: jest.fn().mockReturnValue('test-grpc'),
        getTimestamp: jest.fn().mockReturnValue(Date.now()),
        getPayload: jest.fn().mockReturnValue(Buffer.from('response-payload')),
        getStatusCode: jest.fn().mockReturnValue(200),
        getMessage: jest.fn().mockReturnValue('Success'),
        getProcessingTimeNs: jest.fn().mockReturnValue(1000000)
      };

      mockGrpcService.processData.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await grpcClient.initialize();
      const result = await grpcClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'test-grpc',
        statusCode: 200,
        message: 'Success',
        protocol: 'grpc'
      });
      expect(result.clientDuration).toBeDefined();
    });

    test('should handle gRPC errors', async () => {
      const testRequest = {
        id: 'test-error',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024)
      };

      const mockError = new Error('gRPC connection failed');
      mockGrpcService.processData.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await grpcClient.initialize();
      
      await expect(grpcClient.processData(testRequest)).rejects.toThrow('gRPC connection failed');
    });

    test('should process large payloads via gRPC', async () => {
      const largePayload = global.testUtils.generateTestPayload(1048576); // 1MB
      const testRequest = {
        id: 'test-large-grpc',
        timestamp: Date.now(),
        payload: largePayload,
        metadata: {
          test: 'large-payload'
        }
      };

      const mockResponse = {
        getId: jest.fn().mockReturnValue('test-large-grpc'),
        getTimestamp: jest.fn().mockReturnValue(Date.now()),
        getPayload: jest.fn().mockReturnValue(largePayload),
        getStatusCode: jest.fn().mockReturnValue(200),
        getMessage: jest.fn().mockReturnValue('Success'),
        getProcessingTimeNs: jest.fn().mockReturnValue(2000000)
      };

      mockGrpcService.processData.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await grpcClient.initialize();
      const result = await grpcClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'test-large-grpc',
        statusCode: 200,
        message: 'Success'
      });
      expect(result.payload).toEqual(largePayload);
    });

    test('should run performance test via gRPC', async () => {
      const testConfig = {
        numRequests: 10,
        concurrency: 5,
        requestSize: 1024,
        responseSize: 1024,
        useStreaming: false
      };

      const mockResponse = {
        getId: jest.fn().mockReturnValue('perf-test'),
        getTimestamp: jest.fn().mockReturnValue(Date.now()),
        getPayload: jest.fn().mockReturnValue(Buffer.from('response')),
        getStatusCode: jest.fn().mockReturnValue(200),
        getMessage: jest.fn().mockReturnValue('Success'),
        getProcessingTimeNs: jest.fn().mockReturnValue(1000000)
      };

      mockGrpcService.processData.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await grpcClient.initialize();
      const result = await grpcClient.performanceTest(testConfig);

      expect(result).toMatchObject({
        protocol: 'grpc',
        totalRequests: 10,
        successfulRequests: 10
      });
      expect(result.averageLatency).toBeDefined();
      expect(result.throughput).toBeDefined();
    });

    test('should close gRPC client', async () => {
      await grpcClient.initialize();
      await grpcClient.close();

      expect(mockGrpcService.close).toHaveBeenCalled();
    });
  });

  describe('HTTP Client Tests', () => {
    test('should process data via HTTP', async () => {
      const testRequest = {
        id: 'test-http',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024),
        metadata: {
          test: 'http-processing'
        }
      };

      const mockResponse = {
        data: {
          id: 'test-http',
          timestamp: Date.now(),
          payload: Buffer.from('response-payload'),
          statusCode: 200,
          message: 'Success',
          clientDuration: 15,
          protocol: 'http'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'test-http',
        statusCode: 200,
        message: 'Success',
        protocol: 'http'
      });
      expect(result.clientDuration).toBe(15);
    });

    test('should handle HTTP errors', async () => {
      const testRequest = {
        id: 'test-error',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024)
      };

      const mockError = new Error('Request failed');
      mockError.response = {
        status: 500,
        data: { error: 'Internal server error' }
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(httpClient.processData(testRequest)).rejects.toThrow('Request failed');
    });

    test('should process large payloads via HTTP', async () => {
      const largePayload = global.testUtils.generateTestPayload(1048576); // 1MB
      const testRequest = {
        id: 'test-large-http',
        timestamp: Date.now(),
        payload: largePayload,
        metadata: {
          test: 'large-payload'
        }
      };

      const mockResponse = {
        data: {
          id: 'test-large-http',
          timestamp: Date.now(),
          payload: largePayload,
          statusCode: 200,
          message: 'Success',
          clientDuration: 25,
          protocol: 'http'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'test-large-http',
        statusCode: 200,
        message: 'Success'
      });
      expect(result.payload).toEqual(largePayload);
    });

    test('should process batch requests via HTTP', async () => {
      const testRequests = [
        {
          id: 'batch-1',
          timestamp: Date.now(),
          payload: global.testUtils.generateTestPayload(1024),
          metadata: { batch: '1' }
        },
        {
          id: 'batch-2',
          timestamp: Date.now(),
          payload: global.testUtils.generateTestPayload(2048),
          metadata: { batch: '2' }
        }
      ];

      const mockResponse = {
        data: [
          {
            id: 'batch-1',
            statusCode: 200,
            message: 'Success',
            protocol: 'http-batch'
          },
          {
            id: 'batch-2',
            statusCode: 200,
            message: 'Success',
            protocol: 'http-batch'
          }
        ]
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.processBatch(testRequests);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'batch-1',
        statusCode: 200,
        protocol: 'http-batch'
      });
      expect(result[1]).toMatchObject({
        id: 'batch-2',
        statusCode: 200,
        protocol: 'http-batch'
      });
    });

    test('should run performance test via HTTP', async () => {
      const testConfig = {
        numRequests: 10,
        concurrency: 5,
        requestSize: 1024,
        responseSize: 1024,
        useBatch: false
      };

      const mockResponse = {
        data: {
          id: 'perf-test',
          timestamp: Date.now(),
          payload: Buffer.from('response'),
          statusCode: 200,
          message: 'Success',
          clientDuration: 18,
          protocol: 'http'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.performanceTest(testConfig);

      expect(result).toMatchObject({
        protocol: 'http',
        totalRequests: 10,
        successfulRequests: 10
      });
      expect(result.averageLatency).toBeDefined();
      expect(result.throughput).toBeDefined();
    });

    test('should run performance test with batch processing', async () => {
      const testConfig = {
        numRequests: 10,
        concurrency: 5,
        requestSize: 1024,
        responseSize: 1024,
        useBatch: true
      };

      const mockResponse = {
        data: Array(10).fill().map((_, i) => ({
          id: `batch-${i + 1}`,
          statusCode: 200,
          message: 'Success',
          protocol: 'http-batch'
        }))
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.performanceTest(testConfig);

      expect(result).toMatchObject({
        protocol: 'http-batch',
        totalRequests: 10,
        successfulRequests: 20 // The client processes 2 batches of 5 requests each, each batch returns 10 items
      });
    });

    test('should check health via HTTP', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'performance-test',
          version: '1.0.0'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await httpClient.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        service: 'performance-test',
        version: '1.0.0'
      });
    });

    test('should get configuration via HTTP', async () => {
      const mockResponse = {
        data: {
          defaultResponseSize: 10485760,
          maxResponseSize: 104857600,
          protocols: ['http', 'grpc']
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await httpClient.getConfig();

      expect(result).toMatchObject({
        defaultResponseSize: 10485760,
        maxResponseSize: 104857600,
        protocols: ['http', 'grpc']
      });
    });

    test('should generate test data via HTTP', async () => {
      const size = 1048576; // 1MB
      const mockResponse = {
        data: {
          id: 'generated-test',
          timestamp: Date.now(),
          payload: global.testUtils.generateTestPayload(size),
          metadata: {
            generated: 'true',
            size: size.toString()
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.generateTestData(size, 'generated-test');

      expect(result).toMatchObject({
        id: 'generated-test',
        metadata: {
          generated: 'true',
          size: size.toString()
        }
      });
    });
  });

  describe('Client Configuration Tests', () => {
    test('should use correct configuration for gRPC client', async () => {
      await grpcClient.initialize();

      expect(grpcClient.client).toBeDefined();
      // Verify that the client was created with the correct server address
      const { PerformanceTestServiceClient } = require('../../src/generated/demo_grpc_pb');
      expect(PerformanceTestServiceClient).toHaveBeenCalledWith(
        `${config.grpc.host}:${config.grpc.port}`,
        expect.any(Object), // credentials
        expect.objectContaining({
          'grpc.max_receive_message_length': 104857600,
          'grpc.max_send_message_length': 104857600
        })
      );
    });

    test('should use correct configuration for HTTP client', () => {
      expect(httpClient.baseURL).toBe(`${config.http.protocol}://${config.http.host}:${config.http.port}/api/v1/performance`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle gRPC client initialization failure', async () => {
      const { PerformanceTestServiceClient } = require('../../src/generated/demo_grpc_pb');
      PerformanceTestServiceClient.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(grpcClient.initialize()).rejects.toThrow('Connection failed');
    });

    test('should handle HTTP client network errors', async () => {
      const testRequest = {
        id: 'network-error',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024)
      };

      const mockError = new Error('Connection refused');
      mockError.code = 'ECONNREFUSED';
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(httpClient.processData(testRequest)).rejects.toThrow('Connection refused');
    });

    test('should handle empty payloads', async () => {
      const testRequest = {
        id: 'empty-payload',
        timestamp: Date.now(),
        payload: Buffer.alloc(0),
        metadata: { test: 'empty' }
      };

      const mockResponse = {
        data: {
          id: 'empty-payload',
          statusCode: 200,
          message: 'Success',
          payload: Buffer.alloc(0)
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'empty-payload',
        statusCode: 200,
        message: 'Success'
      });
    });

    test('should handle null metadata', async () => {
      const testRequest = {
        id: 'null-metadata',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024),
        metadata: null
      };

      const mockResponse = {
        data: {
          id: 'null-metadata',
          statusCode: 200,
          message: 'Success'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'null-metadata',
        statusCode: 200,
        message: 'Success'
      });
    });

    test('should handle very large payloads', async () => {
      const largePayload = global.testUtils.generateTestPayload(10485760); // 10MB
      const testRequest = {
        id: 'very-large',
        timestamp: Date.now(),
        payload: largePayload,
        metadata: { test: 'very-large' }
      };

      const mockResponse = {
        data: {
          id: 'very-large',
          statusCode: 200,
          message: 'Success',
          payload: largePayload
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await httpClient.processData(testRequest);

      expect(result).toMatchObject({
        id: 'very-large',
        statusCode: 200,
        message: 'Success'
      });
      expect(result.payload).toEqual(largePayload);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent gRPC requests', async () => {
      const testRequest = {
        id: 'concurrent-grpc',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024)
      };

      const mockResponse = {
        getId: jest.fn().mockReturnValue('concurrent-grpc'),
        getTimestamp: jest.fn().mockReturnValue(Date.now()),
        getPayload: jest.fn().mockReturnValue(Buffer.from('response')),
        getStatusCode: jest.fn().mockReturnValue(200),
        getMessage: jest.fn().mockReturnValue('Success'),
        getProcessingTimeNs: jest.fn().mockReturnValue(1000000)
      };

      mockGrpcService.processData.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await grpcClient.initialize();

      // Make concurrent requests
      const promises = Array(5).fill().map(() =>
        grpcClient.processData(testRequest)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toMatchObject({
          id: 'concurrent-grpc',
          statusCode: 200,
          message: 'Success'
        });
      });

      expect(mockGrpcService.processData).toHaveBeenCalledTimes(5);
    });

    test('should handle concurrent HTTP requests', async () => {
      const testRequest = {
        id: 'concurrent-http',
        timestamp: Date.now(),
        payload: global.testUtils.generateTestPayload(1024)
      };

      const mockResponse = {
        data: {
          id: 'concurrent-http',
          statusCode: 200,
          message: 'Success',
          clientDuration: 15,
          protocol: 'http'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Make concurrent requests
      const promises = Array(5).fill().map(() =>
        httpClient.processData(testRequest)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toMatchObject({
          id: 'concurrent-http',
          statusCode: 200,
          message: 'Success'
        });
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(5);
    });
  });
}); 