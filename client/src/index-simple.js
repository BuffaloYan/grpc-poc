const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

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

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'gRPC Demo Client API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health'
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
    
    // Start HTTP server
    server = app.listen(config.client.port, () => {
      logger.info(`gRPC Demo Client API server running on port ${config.client.port}`);
      logger.info(`Environment: ${config.client.nodeEnv}`);
      logger.info(`gRPC Server: ${config.grpc.host}:${config.grpc.port}`);
      logger.info(`HTTP Server: ${config.http.host}:${config.http.port}`);
    });

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