const GrpcClient = require('./client/src/clients/grpcClient');

async function testGrpc() {
  try {
    const client = new GrpcClient();
    await client.initialize();
    
    console.log('gRPC client initialized');
    
    // Test with a small payload
    const testRequest = {
      id: 'test-1',
      timestamp: Date.now(),
      payload: Buffer.alloc(100),
      metadata: {
        test: 'debug'
      }
    };
    
    console.log('Sending test request...');
    const result = await client.processData(testRequest);
    console.log('Success:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGrpc(); 