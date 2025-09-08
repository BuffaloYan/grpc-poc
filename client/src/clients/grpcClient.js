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
        'grpc.default_compression_algorithm': 2, // gzip
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
      const payloadSize = request.metadata?.requestSize ? parseInt(request.metadata.requestSize) : (request.payload ? request.payload.length : 0);
      const timeout = Math.max(120000, payloadSize * 0.01); // At least 2 minutes, or 10ms per byte
      
      const deadline = new Date(Date.now() + timeout);
      
      this.client.processData(grpcRequest, { deadline }, (error, response) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (error) {
          logger.error(`gRPC processData error in ${duration}ms:`, error);
          reject(error);
        } else {
          logger.info(`gRPC processData completed in ${duration}ms (server: ${(response.getProcessingTimeNs() / 1000000).toFixed(2)}ms)`);
          // Return minimal object to avoid retaining large payloads in memory
          resolve({
            processingTimeNs: response.getProcessingTimeNs(),
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
      let requestsSent = 0;
      let responsesReceived = 0;
      let streamEnded = false;
      
      // Calculate timeout based on number of requests and payload size
      const totalPayloadSize = requests.reduce((sum, req) => sum + (req.metadata?.requestSize ? parseInt(req.metadata.requestSize) : (req.payload ? req.payload.length : 0)), 0);
      const timeout = Math.max(300000, totalPayloadSize * 0.01); // At least 5 minutes, or 10ms per byte
      const deadline = new Date(Date.now() + timeout);
      
      const call = this.client.processDataStream();
      
      call.on('data', (response) => {
        logger.debug('Received streaming response:', response.getId());
        // Push minimal response to reduce memory usage during streaming
        responses.push({
          processingTimeNs: response.getProcessingTimeNs(),
          protocol: 'grpc-stream'
        });
        responsesReceived++;

        // Check if we've received all responses and can end the stream
        if (responsesReceived === requests.length && !streamEnded) {
          streamEnded = true;
          call.end();
        }
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
        requestsSent++;
      });

      // Only end the stream if we've sent all requests and received all responses
      // If we haven't received all responses yet, the 'data' event handler will end it
      if (requestsSent === requests.length && responsesReceived === requests.length && !streamEnded) {
        streamEnded = true;
        call.end();
      }
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
    const clientLatencies = []; // Store client-side round-trip times for accurate latency measurement

    if (useStreaming) {
      // Use streaming for high throughput
      const batchSize = Math.ceil(numRequests / concurrency);
      const batches = [];
      
      for (let i = 0; i < numRequests; i += batchSize) {
        const batchRequests = this.generateTestRequests(batchSize, requestSize, responseSize);
        batches.push(batchRequests);
      }

      // Limit concurrent streams to prevent overwhelming the server
      const maxConcurrentStreams = Math.min(10, batches.length);
      const batchResults = [];
      
      for (let i = 0; i < batches.length; i += maxConcurrentStreams) {
        const batchSlice = batches.slice(i, i + maxConcurrentStreams);
        const batchPromises = batchSlice.map(batch => this.processDataStream(batch));
        const sliceResults = await Promise.all(batchPromises);
        batchResults.push(...sliceResults);
      }
      
      batchResults.forEach(batchResult => {
        // For streaming, use total stream time divided by number of responses for average latency
        const averageLatencyPerRequest = batchResult.clientDuration / batchResult.responses.length;
        for (let i = 0; i < batchResult.responses.length; i++) {
          clientLatencies.push(averageLatencyPerRequest);
        }
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
        logger.info(`Batch completed with ${batchResults.length} results`);
        // Extract client-side round-trip times from responses
        batchResults.forEach(result => {
          if (result.clientDuration) {
            clientLatencies.push(result.clientDuration);
            logger.info(`Individual request latency: ${result.clientDuration}ms`);
          } else {
            logger.warn('Missing clientDuration in result:', result);
          }
        });
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const successfulRequests = clientLatencies.length;
    const averageLatency = clientLatencies.reduce((sum, latency) => sum + latency, 0) / successfulRequests;

    logger.info(`gRPC performance test summary:`);
    logger.info(`- Total test time: ${totalDuration}ms`);
    logger.info(`- Successful requests: ${successfulRequests}`);
    logger.info(`- Client latencies: [${clientLatencies.slice(0, 5).join(', ')}${clientLatencies.length > 5 ? '...' : ''}]`);
    logger.info(`- Average latency: ${averageLatency.toFixed(2)}ms`);
    logger.info(`- Throughput: ${(successfulRequests / totalDuration * 1000).toFixed(2)} req/sec`);

    return {
      protocol: useStreaming ? 'grpc-stream' : 'grpc',
      totalRequests: numRequests,
      successfulRequests,
      totalDuration,
      averageLatency,
      throughput: (successfulRequests / totalDuration) * 1000,
      results: clientLatencies.map(latency => ({ clientDuration: latency })) // Keep minimal results for compatibility
    };
  }

  generateTestRequests(count, requestSize, responseSize) {
    const requests = [];
    
    // Create a single reusable JSON payload buffer to save memory
    const baseObject = {
      user: {
        id: 'u-123',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        roles: ['admin', 'editor', 'observer']
      },
      meta: { source: 'grpc', version: '1.0.0' },
      items: Array.from({ length: 16 }, (_, i) => ({ index: i, title: `Item ${i}`, active: i % 2 === 0 }))
    };
    let jsonString = JSON.stringify(baseObject);
    if (jsonString.length < requestSize) {
      const padLen = requestSize - jsonString.length;
      jsonString += 'X'.repeat(padLen);
    } else if (jsonString.length > requestSize) {
      jsonString = jsonString.slice(0, requestSize);
    }
    const payload = Buffer.from(jsonString, 'utf8');

    for (let i = 0; i < count; i++) {
      requests.push({
        id: `grpc-request-${i}`,
        timestamp: Date.now(),
        payload: payload, // Reuse the same buffer for all requests
        metadata: {
          requestIndex: i.toString(),
          expectedResponseSize: responseSize.toString(),
          testType: 'performance',
          contentType: 'application/json',
          requestSize: requestSize.toString(),
          omitPayload: 'true'
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