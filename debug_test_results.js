const { OrchestratorService } = require('./client/src/services/orchestratorService');

async function debugTestResults() {
  console.log('Debugging test results structure...');
  
  // Create a mock test result with HTTP/2
  const mockTestResult = {
    testId: 'test-debug',
    testName: 'Debug Test',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    status: 'completed',
    config: {
      numRequests: 10,
      concurrency: 5,
      requestSize: 1024,
      responseSize: 2048,
      protocols: ['grpc', 'http']
    },
    results: {
      grpc: {
        protocol: 'grpc',
        totalRequests: 10,
        successfulRequests: 10,
        failedRequests: 0,
        averageLatency: 15.5,
        throughput: 645.2,
        totalDuration: 15000
      },
      http: {
        protocol: 'http',
        totalRequests: 10,
        successfulRequests: 10,
        failedRequests: 0,
        averageLatency: 18.2,
        throughput: 549.5,
        totalDuration: 18000
      },

    }
  };

  console.log('Mock test result structure:');
  console.log(JSON.stringify(mockTestResult, null, 2));
  
  console.log('\nProtocols in results:');
  console.log(Object.keys(mockTestResult.results));
  
  console.log('\nResults as array:');
  const resultsArray = Object.values(mockTestResult.results);
  console.log(resultsArray.map(r => ({ protocol: r.protocol, throughput: r.throughput })));
  
  // Test the UI processing logic
  console.log('\nTesting UI processing:');
  const throughputData = resultsArray.map(result => ({
    protocol: result.protocol.toUpperCase(),
    throughput: result.throughput,
  }));
  
  console.log('Throughput data for charts:');
  console.log(throughputData);
}

debugTestResults().catch(console.error); 