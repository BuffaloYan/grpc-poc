const path = require('path');

const config = {
  // Server Configuration
  grpc: {
    host: process.env.GRPC_SERVER_HOST || 'localhost',
    port: process.env.GRPC_SERVER_PORT || 9090,
  },
  http: {
    host: process.env.HTTP_SERVER_HOST || 'localhost',
    port: process.env.HTTP_SERVER_PORT || 8080,
    protocol: process.env.HTTP_SERVER_PROTOCOL || 'http',
  },
  
  // Client Configuration
  client: {
    port: process.env.CLIENT_PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // TLS Configuration
  tls: {
    caCertPath: process.env.TLS_CA_CERT_PATH || path.join(__dirname, '../../../certs/ca-cert.pem'),
    clientCertPath: process.env.TLS_CLIENT_CERT_PATH || path.join(__dirname, '../../../certs/client-cert.pem'),
    clientKeyPath: process.env.TLS_CLIENT_KEY_PATH || path.join(__dirname, '../../../certs/client-key.pem'),
  },
  
  // Performance Testing Defaults
  performance: {
    defaultRequestSize: parseInt(process.env.DEFAULT_REQUEST_SIZE) || 1048576, // 1MB
    defaultResponseSize: parseInt(process.env.DEFAULT_RESPONSE_SIZE) || 10485760, // 10MB
    defaultConcurrentRequests: parseInt(process.env.DEFAULT_CONCURRENT_REQUESTS) || 10,
    defaultTestDuration: parseInt(process.env.DEFAULT_TEST_DURATION) || 30, // seconds
    maxPayloadSize: 104857600, // 100MB
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

module.exports = config;