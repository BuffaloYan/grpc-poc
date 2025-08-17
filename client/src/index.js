const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const promClient = require('prom-client');
const config = require('./config');
const logger = require('./utils/logger');
const OrchestratorService = require('./services/orchestratorService');

// Create Express app
const app = express();
const orchestrator = new OrchestratorService();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize Prometheus metrics collection
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Routes

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = await orchestrator.healthCheck();
    res.json({
      status: health.overall,
      timestamp: new Date().toISOString(),
      service: 'grpc-demo-client',
      version: '1.0.0',
      details: health
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Start performance test
app.post('/api/tests', async (req, res) => {
  // Set timeout for this request to 5 minutes
  req.setTimeout(300000);
  res.setTimeout(300000);
  
  try {
    const testConfig = req.body;
    
    // Validate test configuration
    const validatedConfig = {
      numRequests: Math.min(parseInt(testConfig.numRequests) || 100, 10000),
      concurrency: Math.min(parseInt(testConfig.concurrency) || 10, 100),
      requestSize: Math.min(parseInt(testConfig.requestSize) || 1048576, config.performance.maxPayloadSize),
      responseSize: Math.min(parseInt(testConfig.responseSize) || 10485760, config.performance.maxPayloadSize),
      protocols: testConfig.protocols || ['grpc', 'http'],
      useGrpcStreaming: Boolean(testConfig.useGrpcStreaming),
      testName: testConfig.testName || `Test ${new Date().toISOString()}`,
      httpMaxSockets: Number.isFinite(testConfig.httpMaxSockets) ? Math.max(1, Math.min(200, parseInt(testConfig.httpMaxSockets))) : undefined
    };

    logger.info('Starting performance test with config:', validatedConfig);

    // Start test asynchronously
    const testPromise = orchestrator.runPerformanceComparison(validatedConfig);
    
    // Get initial test info
    const testInfo = await testPromise;
    
    // Create lightweight response to avoid JSON serialization issues
    const lightweightResponse = {
      message: 'Performance test completed',
      testId: testInfo.testId,
      results: {
        testId: testInfo.testId,
        testName: testInfo.testName,
        startTime: testInfo.startTime,
        endTime: testInfo.endTime,
        status: testInfo.status,
        config: testInfo.config,
        error: testInfo.error
      }
    };

    // Only include results summary, not full payloads
    if (testInfo.results) {
      lightweightResponse.results.results = {};
      for (const [protocol, result] of Object.entries(testInfo.results)) {
        lightweightResponse.results.results[protocol] = {
          protocol: result.protocol,
          totalRequests: result.totalRequests,
          successfulRequests: result.successfulRequests,
          failedRequests: result.failedRequests,
          averageLatency: result.averageLatency,
          throughput: result.throughput,
          totalDuration: result.totalDuration
        };
      }
    }

    res.status(201).json(lightweightResponse);

  } catch (error) {
    logger.error('Failed to start performance test:', error);
    res.status(500).json({
      error: 'Failed to start performance test',
      message: error.message
    });
  }
});

// Get test status
app.get('/api/tests/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const testStatus = await orchestrator.getTestStatus(testId);
    res.json(testStatus);
  } catch (error) {
    logger.error(`Failed to get test status for ${req.params.testId}:`, error);
    res.status(404).json({
      error: 'Test not found',
      message: error.message
    });
  }
});

// Get all tests (lightweight version)
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await orchestrator.getAllTests();
    res.json({
      tests,
      total: tests.length
    });
  } catch (error) {
    logger.error('Failed to get tests:', error);
    res.status(500).json({
      error: 'Failed to get tests',
      message: error.message
    });
  }
});

// Get individual test results (lightweight)
app.get('/api/tests/:testId/results', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await orchestrator.getTestStatus(testId);
    
    // Create lightweight version for API response
    const lightweightTest = {
      testId: test.testId,
      testName: test.testName,
      startTime: test.startTime,
      endTime: test.endTime,
      status: test.status,
      config: test.config,
      error: test.error
    };

    // Only include results summary, not full payloads
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
    logger.error(`Failed to get test results for ${req.params.testId}:`, error);
    res.status(404).json({
      error: 'Test not found',
      message: error.message
    });
  }
});

// Generate sample data
app.post('/api/sample-data', async (req, res) => {
  try {
    const { size = 1048576 } = req.body;
    const sampleData = await orchestrator.generateSampleData(size);
    res.json(sampleData);
  } catch (error) {
    logger.error('Failed to generate sample data:', error);
    res.status(500).json({
      error: 'Failed to generate sample data',
      message: error.message
    });
  }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    performance: config.performance,
    server: {
      grpc: config.grpc,
      http: config.http
    },
    version: '1.0.0'
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'gRPC Demo Client API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      tests: '/api/tests',
      config: '/api/config',
      metrics: '/metrics'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.client.nodeEnv === 'development' ? error.message : 'Something went wrong'
  });
});

// Global server reference for graceful shutdown
let server = null;

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await orchestrator.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  } else {
    try {
      await orchestrator.shutdown();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function start() {
  try {
    // Initialize orchestrator
    await orchestrator.initialize();
    
    // Start HTTP server with timeout settings
    server = app.listen(config.client.port, () => {
      logger.info(`gRPC Demo Client API server running on port ${config.client.port}`);
      logger.info(`Environment: ${config.client.nodeEnv}`);
      logger.info(`gRPC Server: ${config.grpc.host}:${config.grpc.port}`);
      logger.info(`HTTP Server: ${config.http.host}:${config.http.port}`);
    });

    // Set server timeouts for long-running requests
    server.timeout = 300000; // 5 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    // Export server for graceful shutdown
    module.exports = server;
    global.server = server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  start();
}

module.exports = app;