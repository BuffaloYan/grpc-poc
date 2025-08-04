const grpc = require('@grpc/grpc-js');
const config = require('../config');
const logger = require('../utils/logger');

// Import generated gRPC code
const grpcService = require('../generated/demo_grpc_pb');
const messages = require('../generated/demo_pb');

class GrpcClient {
  constructor() {
    this.client = null;
    this.credentials = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Use insecure credentials for now (TLS disabled on server)
      this.credentials = grpc.credentials.createInsecure();

      // Create client with larger message size limits
      const serverAddress = `${config.grpc.host}:${config.grpc.port}`;
      const options = {
        'grpc.max_receive_message_length': 209715200, // 200MB
        'grpc.max_send_message_length': 209715200,    // 200MB
        'grpc.keepalive_time_ms': 60000, // 1 minute
        'grpc.keepalive_timeout_ms': 10000, // 10 seconds
        'grpc.keepalive_permit_without_calls': true,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.http2.min_time_between_pings_ms': 10000,
        'grpc.http2.min_ping_interval_without_data_ms': 300000,
        'grpc.max_metadata_size': 8388608, // 8MB metadata limit
        'grpc.client_idle_timeout_ms': 300000, // 5 minutes
        'grpc.max_concurrent_streams': 1000,
        'grpc.initial_window_size': 1048576 // 1MB initial window
      };
      this.client = new grpcService.PerformanceTestServiceClient(serverAddress, this.credentials, options);

      this.initialized = true;
      logger.info(`gRPC client initialized and connected to ${serverAddress}`);
    } catch (error) {
      logger.error('Failed to initialize gRPC client:', error);
      throw error;
    }
  }

  async processData(request) {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Create proper gRPC message object
      const grpcRequest = new messages.DataRequest();
      grpcRequest.setId(request.id);
      grpcRequest.setTimestamp(request.timestamp);
      grpcRequest.setPayload(request.payload);
      
      if (request.metadata) {
        const metadata = grpcRequest.getMetadataMap();
        Object.entries(request.metadata).forEach(([key, value]) => {
          metadata.set(key, value.toString());
        });
      }
      
      // Calculate timeout based on payload size
      const payloadSize = request.payload ? request.payload.length : 0;
      const timeout = Math.max(120000, payloadSize * 0.01); // At least 2 minutes, or 10ms per byte
      
      const deadline = new Date(Date.now() + timeout);
      
      this.client.processData(grpcRequest, { deadline }, (error, response) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (error) {
          logger.error(`gRPC processData error in ${duration}ms:`, error);
          reject(error);
        } else {
          logger.debug(`gRPC processData completed in ${duration}ms`);
          resolve({
            id: response.getId(),
            timestamp: response.getTimestamp(),
            payload: response.getPayload(),
            statusCode: response.getStatusCode(),
            message: response.getMessage(),
            clientDuration: duration,
            protocol: 'grpc'
          });
        }
      });
    });
  }

  async processDataStream(requests) {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const responses = [];
      const startTime = Date.now();
      
      const call = this.client.processDataStream();
      
      call.on('data', (response) => {
        logger.debug('Received streaming response:', response.getId());
        responses.push({
          id: response.getId(),
          timestamp: response.getTimestamp(),
          payload: response.getPayload(),
          statusCode: response.getStatusCode(),
          message: response.getMessage(),
          protocol: 'grpc-stream'
        });
      });

      call.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.info(`gRPC stream completed in ${duration}ms, received ${responses.length} responses`);
        resolve({
          responses,
          clientDuration: duration,
          protocol: 'grpc-stream'
        });
      });

      call.on('error', (error) => {
        logger.error('gRPC stream error:', error);
        reject(error);
      });

      // Send all requests
      requests.forEach((request, index) => {
        logger.debug(`Sending streaming request ${index + 1}/${requests.length}`);
        
        // Create proper gRPC message object for streaming
        const grpcRequest = new messages.DataRequest();
        grpcRequest.setId(request.id);
        grpcRequest.setTimestamp(request.timestamp);
        grpcRequest.setPayload(request.payload);
        
        if (request.metadata) {
          const metadata = grpcRequest.getMetadataMap();
          Object.entries(request.metadata).forEach(([key, value]) => {
            metadata.set(key, value.toString());
          });
        }
        
        call.write(grpcRequest);
      });

      call.end();
    });
  }

  async performanceTest(testConfig) {
    const {
      numRequests = 100,
      concurrency = 10,
      requestSize = config.performance.defaultRequestSize,
      responseSize = config.performance.defaultResponseSize,
      useStreaming = false
    } = testConfig;

    logger.info(`Starting gRPC performance test: ${numRequests} requests, concurrency: ${concurrency}, streaming: ${useStreaming}`);

    const startTime = Date.now();
    const results = [];

    if (useStreaming) {
      // Use streaming for high throughput
      const batchSize = Math.ceil(numRequests / concurrency);
      const batches = [];
      
      for (let i = 0; i < numRequests; i += batchSize) {
        const batchRequests = this.generateTestRequests(batchSize, requestSize, responseSize);
        batches.push(batchRequests);
      }

      const promises = batches.map(batch => this.processDataStream(batch));
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach(batchResult => {
        results.push(...batchResult.responses);
      });
    } else {
      // Use concurrent individual requests with controlled concurrency
      const promises = [];
      for (let i = 0; i < numRequests; i += concurrency) {
        const batchSize = Math.min(concurrency, numRequests - i);
        const batchRequests = this.generateTestRequests(batchSize, requestSize, responseSize);
        const batchPromises = batchRequests.map(request => this.processData(request));
        promises.push(Promise.all(batchPromises));
      }

      // Process batches sequentially to avoid overwhelming gRPC connection
      for (const batchPromise of promises) {
        const batchResults = await batchPromise;
        results.push(...batchResults);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return {
      protocol: useStreaming ? 'grpc-stream' : 'grpc',
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
    
    // Create a single reusable payload buffer to save memory
    const payload = Buffer.alloc(requestSize);
    for (let i = 0; i < requestSize; i++) {
      payload[i] = i % 256;
    }

    for (let i = 0; i < count; i++) {
      requests.push({
        id: `grpc-request-${i}`,
        timestamp: Date.now(),
        payload: payload, // Reuse the same buffer for all requests
        metadata: {
          requestIndex: i.toString(),
          expectedResponseSize: responseSize.toString(),
          testType: 'performance'
        }
      });
    }

    return requests;
  }

  async close() {
    if (this.client) {
      this.client.close();
      logger.info('gRPC client closed');
    }
  }
}

module.exports = GrpcClient;