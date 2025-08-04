const axios = require('axios');
const https = require('https');

// Create HTTPS agent that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testPerformance() {
  try {
    console.log('Testing performance endpoints...');

    // Test small request
    const smallRequest = {
      id: 'test-small',
      timestamp: Date.now(),
      payload: 'Hello World',
      metadata: {
        testType: 'small'
      }
    };

    console.log('Testing small request...');
    const smallResponse = await axios.post('https://localhost:8443/api/v1/performance/process', smallRequest, {
      httpsAgent
    });
    console.log('Small request response:', smallResponse.data);

    // Test large request with base64
    const largePayload = Buffer.alloc(1024 * 1024); // 1MB
    for (let i = 0; i < largePayload.length; i++) {
      largePayload[i] = i % 256;
    }

    const largeRequest = {
      id: 'test-large',
      timestamp: Date.now(),
      payload: largePayload.toString('base64'),
      metadata: {
        testType: 'large',
        size: largePayload.length
      }
    };

    console.log('Testing large request...');
    const largeResponse = await axios.post('https://localhost:8443/api/v1/performance/process-base64', largeRequest, {
      httpsAgent
    });
    console.log('Large request response:', smallResponse.data);

    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get('https://localhost:8443/api/v1/performance/health', {
      httpsAgent
    });
    console.log('Health response:', healthResponse.data);

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPerformance(); 