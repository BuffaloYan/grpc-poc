// Test setup file for Jest
// This file runs before each test

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CLIENT_PORT = '3001';
process.env.GRPC_SERVER_HOST = 'localhost';
process.env.GRPC_SERVER_PORT = '9090';
process.env.HTTP_SERVER_HOST = 'localhost';
process.env.HTTP_SERVER_PORT = '8080';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Generate test data
  generateTestPayload: (size = 1024) => {
    const payload = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      payload[i] = i % 256;
    }
    return payload;
  },

  // Generate test request
  generateTestRequest: (id = 'test', payloadSize = 1024) => ({
    id,
    timestamp: Date.now(),
    payload: global.testUtils.generateTestPayload(payloadSize),
    metadata: {
      test: 'integration-test',
      size: payloadSize.toString()
    }
  }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock logger to reduce noise
  mockLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}; 