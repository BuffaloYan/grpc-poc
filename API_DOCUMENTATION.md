# gRPC Performance Demo - API Documentation

## Overview
This document provides comprehensive documentation for all available APIs in the gRPC Performance Demo application.

## Server APIs (Java Spring Boot)

### Base URL
- **HTTP**: `http://localhost:8080`
- **gRPC**: `localhost:9090`

---

## HTTP REST APIs

### 1. Performance Test Endpoints

#### Single Request Processing
```http
POST /api/v1/performance/process
```

**Description**: Process a single data request via HTTP

**Request Body**:
```json
{
  "id": "string (required)",
  "timestamp": "number (required)",
  "payload": "base64-encoded bytes",
  "metadata": {
    "key": "value"
  }
}
```

**Query Parameters**:
- `responseSize` (optional, default: 0): Size of response payload in bytes

**Response**:
```json
{
  "id": "string",
  "timestamp": "number",
  "payload": "base64-encoded bytes",
  "statusCode": "number",
  "message": "string",
  "metadata": {
    "protocol": "http",
    "key": "value"
  },
  "processingTimeNs": "number"
}
```

#### Batch Request Processing
```http
POST /api/v1/performance/process-batch
```

**Description**: Process multiple data requests in a single HTTP call

**Request Body**:
```json
[
  {
    "id": "string (required)",
    "timestamp": "number (required)", 
    "payload": "base64-encoded bytes",
    "metadata": {
      "key": "value"
    }
  }
]
```

**Query Parameters**:
- `responseSize` (optional, default: 0): Size of response payload in bytes

**Response**:
```json
[
  {
    "id": "string",
    "timestamp": "number",
    "payload": "base64-encoded bytes",
    "statusCode": "number",
    "message": "string",
    "metadata": {
      "protocol": "http-batch",
      "key": "value"
    },
    "processingTimeNs": "number"
  }
]
```

### 2. Service Management Endpoints

#### Health Check
```http
GET /api/v1/performance/health
```

**Description**: Check service health status

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "number",
  "service": "performance-test",
  "version": "1.0.0"
}
```

#### Service Configuration
```http
GET /api/v1/performance/config
```

**Description**: Get service configuration and limits

**Response**:
```json
{
  "defaultResponseSize": "number",
  "maxResponseSize": "number",
  "protocols": ["http", "grpc"]
}
```

#### Generate Test Data
```http
POST /api/v1/performance/generate-test-data
```

**Description**: Generate test data for performance testing

**Query Parameters**:
- `payloadSize` (optional, default: 1048576): Size of payload in bytes
- `id` (optional, default: "test"): Request ID

**Response**:
```json
{
  "id": "string",
  "timestamp": "number",
  "payload": "base64-encoded bytes",
  "metadata": {
    "generated": "true",
    "size": "string",
    "pattern": "sequential"
  }
}
```

### 3. Spring Boot Actuator Endpoints

#### Application Health
```http
GET /actuator/health
```

**Description**: Comprehensive application health check

**Response**:
```json
{
  "status": "UP",
  "components": {
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": "number",
        "free": "number",
        "threshold": "number",
        "path": "string"
      }
    },
    "grpc": {
      "status": "UP",
      "components": {
        "demo.PerformanceTestService": {
          "status": "UP"
        }
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

---

## gRPC APIs

### Service: PerformanceTestService

#### 1. ProcessData (Unary)
```protobuf
rpc ProcessData(DataRequest) returns (DataResponse);
```

**Description**: Process a single data request via gRPC

**Request Message (DataRequest)**:
```protobuf
message DataRequest {
  string id = 1;                    // Required: Request identifier
  int64 timestamp = 2;              // Required: Request timestamp
  bytes payload = 3;                // Optional: Variable size payload
  map<string, string> metadata = 4; // Optional: Additional metadata
}
```

**Response Message (DataResponse)**:
```protobuf
message DataResponse {
  string id = 1;                    // Request identifier
  int64 timestamp = 2;              // Response timestamp
  bytes payload = 3;                // Variable size payload
  int32 status_code = 4;            // Response status code
  string message = 5;               // Response message
  map<string, string> metadata = 6; // Response metadata (includes "protocol": "grpc")
  int64 processing_time_ns = 7;     // Server processing time in nanoseconds
}
```

#### 2. ProcessDataStream (Bidirectional Streaming)
```protobuf
rpc ProcessDataStream(stream DataRequest) returns (stream DataResponse);
```

**Description**: Process multiple data requests via bidirectional streaming

**Request**: Stream of `DataRequest` messages
**Response**: Stream of `DataResponse` messages

---

## Client APIs (Node.js Express)

### Base URL
- **HTTP**: `http://localhost:3000`

---

## Client REST APIs

### 1. Performance Testing Endpoints

#### Start Performance Test
```http
POST /api/tests
```

**Description**: Start a comprehensive performance test comparing gRPC and HTTP

**Request Body**:
```json
{
  "numRequests": "number (max: 10000, default: 100)",
  "concurrency": "number (max: 100, default: 10)",
  "requestSize": "number (bytes, default: 1048576)",
  "responseSize": "number (bytes, default: 10485760)",
  "protocols": ["grpc", "http"],
  "testName": "string (optional)"
}
```

**Response**:
```json
{
  "message": "Performance test completed",
  "testId": "string",
  "results": {
    "testId": "string",
    "testName": "string",
    "startTime": "ISO8601 string",
    "endTime": "ISO8601 string",
    "status": "completed",
    "config": {
      "numRequests": "number",
      "concurrency": "number",
      "requestSize": "number",
      "responseSize": "number",
      "protocols": ["string"]
    },
    "results": {
      "grpc": {
        "protocol": "grpc",
        "totalRequests": "number",
        "successfulRequests": "number",
        "failedRequests": "number",
        "averageLatency": "number (ms)",
        "throughput": "number (req/s)",
        "totalDuration": "number (ms)",
        "errors": []
      },
      "http": {
        "protocol": "http",
        "totalRequests": "number",
        "successfulRequests": "number", 
        "failedRequests": "number",
        "averageLatency": "number (ms)",
        "throughput": "number (req/s)",
        "totalDuration": "number (ms)",
        "errors": []
      }
    },
    "comparison": {
      "fastestProtocol": "string",
      "throughputDifference": "number (%)",
      "latencyDifference": "number (%)"
    }
  }
}
```

#### Get Test Status
```http
GET /api/tests/{testId}
```

**Description**: Get the status and results of a specific test

**Response**: Same as test completion response above

#### Get All Tests
```http
GET /api/tests
```

**Description**: Get all test results

**Response**:
```json
{
  "tests": [
    {
      "testId": "string",
      "testName": "string",
      "status": "string",
      "startTime": "ISO8601 string",
      "endTime": "ISO8601 string"
    }
  ],
  "total": "number"
}
```

### 2. Utility Endpoints

#### Generate Sample Data
```http
POST /api/sample-data
```

**Description**: Generate sample data for testing

**Request Body**:
```json
{
  "size": "number (default: 1048576)"
}
```

**Response**:
```json
{
  "id": "string",
  "size": "number",
  "data": "base64-encoded bytes",
  "generated": "ISO8601 string"
}
```

#### Client Health Check
```http
GET /api/health
```

**Description**: Check client service health and connectivity to server

**Response**:
```json
{
  "status": "healthy|unhealthy",
  "timestamp": "ISO8601 string",
  "service": "grpc-demo-client",
  "version": "1.0.0",
  "details": {
    "overall": "healthy|unhealthy",
    "grpc": {
      "status": "connected|disconnected",
      "latency": "number (ms)"
    },
    "http": {
      "status": "connected|disconnected", 
      "latency": "number (ms)"
    }
  }
}
```

#### Client Configuration
```http
GET /api/config
```

**Description**: Get client configuration

**Response**:
```json
{
  "performance": {
    "maxPayloadSize": "number",
    "defaultRequestSize": "number",
    "defaultResponseSize": "number"
  },
  "server": {
    "grpc": {
      "host": "string",
      "port": "number"
    },
    "http": {
      "host": "string", 
      "port": "number"
    }
  },
  "version": "1.0.0"
}
```

### 3. Service Discovery Endpoint

#### API Information
```http
GET /
```

**Description**: Get available API endpoints

**Response**:
```json
{
  "name": "gRPC Demo Client API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/api/health",
    "tests": "/api/tests",
    "config": "/api/config",
    "metrics": "/metrics"
  }
}
```

### 4. Monitoring Endpoint

#### Prometheus Metrics
```http
GET /metrics
```

**Description**: Prometheus-compatible metrics for monitoring

**Response**: Prometheus metrics format

---

## Java Client APIs (Spring Boot)

### Base URL
- **HTTP**: `http://localhost:3002`

---

## Java Client REST APIs

### 1. Performance Testing Endpoints

#### gRPC Performance Test
```http
POST /api/v1/performance/test-grpc
```

**Description**: Run a performance test using only gRPC protocol

**Query Parameters**:
- `concurrency` (optional, default: 10, max: 100): Number of concurrent requests
- `requests` (optional, default: 100): Total number of requests
- `payloadSize` (optional, default: 1048576): Request payload size in bytes
- `responseSize` (optional, default: 0): Expected response size in bytes

**Response**:
```json
{
  "protocol": "grpc",
  "totalRequests": "number",
  "successfulRequests": "number",
  "failedRequests": "number",
  "averageLatency": "number (ms)",
  "minLatency": "number (ms)",
  "maxLatency": "number (ms)",
  "throughput": "number (req/s)",
  "totalDuration": "number (ms)",
  "startTime": "ISO8601 string",
  "endTime": "ISO8601 string",
  "errorMessages": ["string"]
}
```

#### HTTP Performance Test
```http
POST /api/v1/performance/test-http
```

**Description**: Run a performance test using only HTTP protocol with the current strategy

**Query Parameters**: Same as gRPC test

**Response**: Same format as gRPC test with `"protocol": "http"`

#### Comparison Test
```http
POST /api/v1/performance/test-comparison
```

**Description**: Run both gRPC and HTTP tests sequentially and provide comparison metrics

**Query Parameters**: Same as individual tests

**Response**:
```json
{
  "grpc": {
    "protocol": "grpc",
    "totalRequests": "number",
    "successfulRequests": "number",
    "failedRequests": "number",
    "averageLatency": "number (ms)",
    "throughput": "number (req/s)",
    "totalDuration": "number (ms)"
  },
  "http": {
    "protocol": "http",
    "totalRequests": "number",
    "successfulRequests": "number",
    "failedRequests": "number",
    "averageLatency": "number (ms)",
    "throughput": "number (req/s)",
    "totalDuration": "number (ms)"
  },
  "summary": {
    "grpc_faster": "boolean",
    "throughput_ratio": "number",
    "latency_ratio": "number",
    "grpc_throughput_advantage": "number (%)"
  },
  "testParameters": {
    "concurrency": "number",
    "requests": "number",
    "payloadSize": "number",
    "responseSize": "number"
  }
}
```

### 2. Configuration Management Endpoints

#### Get Configuration
```http
GET /api/v1/performance/config
```

**Description**: Get client configuration, limits, and HTTP strategy information

**Response**:
```json
{
  "defaultConcurrency": "number",
  "maxConcurrency": "number",
  "defaultPayloadSize": "number",
  "maxPayloadSize": "number",
  "protocols": ["grpc", "http"],
  "httpClientStrategy": "blocking|reactive",
  "availableHttpStrategies": ["blocking", "reactive"]
}
```

#### Get Current HTTP Strategy
```http
GET /api/v1/performance/strategy
```

**Description**: Get the current HTTP client strategy and available options

**Response**:
```json
{
  "currentStrategy": "blocking|reactive",
  "availableStrategies": ["blocking", "reactive"]
}
```

#### Change HTTP Strategy
```http
POST /api/v1/performance/strategy
```

**Description**: Change the HTTP client strategy at runtime without restart

**Request Body**:
```json
{
  "strategy": "blocking|reactive"
}
```

**Supported strategies**:
- `"blocking"`: Apache HttpClient 5 with traditional connection pooling
- `"reactive"`: True reactive WebClient with Project Reactor

**Response**:
```json
{
  "message": "Strategy changed successfully",
  "currentStrategy": "reactive",
  "availableStrategies": ["blocking", "reactive"]
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Unknown strategy: invalid. Available: [blocking, reactive]",
  "currentStrategy": "blocking",
  "availableStrategies": ["blocking", "reactive"]
}
```

### 3. Health Check Endpoint

#### Health Check with Connectivity Tests
```http
GET /api/v1/performance/health
```

**Description**: Check service health and test connectivity to both gRPC and HTTP servers

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "number",
  "service": "grpc-demo-java-client",
  "version": "1.0.0",
  "connectivity": {
    "grpc": "healthy|unhealthy: error message",
    "http": "healthy|unhealthy: error message"
  }
}
```

### 4. Monitoring Endpoints

#### Prometheus Metrics
```http
GET /actuator/prometheus
```

**Description**: Prometheus-compatible metrics including strategy-specific metrics

**Available Metrics**:
- `grpc_client_requests_*`: gRPC client performance metrics
- `http_client_blocking_requests_*`: Blocking HTTP strategy metrics  
- `http_client_reactive_requests_*`: Reactive HTTP strategy metrics
- `jvm_*`: JVM performance metrics
- `spring_*`: Spring Boot application metrics

---

## HTTP Client Strategy Details

### Blocking Strategy (`BlockingHttpClientStrategy`)
- **Implementation**: Apache HttpClient 5
- **Threading Model**: Thread-per-request
- **Connection Pooling**: 200 total connections, 50 per route
- **Metrics Prefix**: `http_client_blocking_*`
- **Best For**: CPU-bound workloads, lower concurrency (< 50 requests)

### Reactive Strategy (`ReactiveHttpClientStrategy`)
- **Implementation**: Spring WebClient with Project Reactor
- **Threading Model**: Event-loop based, non-blocking I/O
- **Connection Management**: Netty HTTP client with 20MB buffers
- **Metrics Prefix**: `http_client_reactive_*`
- **Best For**: I/O-bound workloads, high concurrency (> 100 requests)

---

## Java Client Usage Examples

### Example 1: Basic Health Check
```bash
curl http://localhost:3002/api/v1/performance/health
```

### Example 2: Run gRPC Test
```bash
curl -X POST "http://localhost:3002/api/v1/performance/test-grpc?concurrency=10&requests=100&payloadSize=1048576&responseSize=10485760"
```

### Example 3: Switch to Reactive Strategy
```bash
curl -X POST http://localhost:3002/api/v1/performance/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "reactive"}'
```

### Example 4: Run HTTP Test with Current Strategy
```bash
curl -X POST "http://localhost:3002/api/v1/performance/test-http?concurrency=20&requests=200&payloadSize=2097152"
```

### Example 5: Run Comparison Test
```bash
curl -X POST "http://localhost:3002/api/v1/performance/test-comparison?concurrency=10&requests=100&payloadSize=1048576"
```

### Example 6: Get Current Configuration
```bash
curl http://localhost:3002/api/v1/performance/config
```

---

## Error Responses

### Standard Error Format
All APIs return errors in the following format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "ISO8601 string (optional)"
}
```

### Common HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service unhealthy

### gRPC Status Codes
- `OK`: Success
- `INVALID_ARGUMENT`: Invalid request parameters
- `UNAVAILABLE`: Service unavailable
- `INTERNAL`: Internal server error

---

## Usage Examples

### Example 1: Basic Performance Test
```bash
# Start a simple performance test
curl -X POST http://localhost:3000/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "numRequests": 100,
    "concurrency": 10,
    "protocols": ["grpc", "http"]
  }'
```

### Example 2: Large Payload Test  
```bash
# Test with 1MB request, 10MB response
curl -X POST http://localhost:3000/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "numRequests": 50,
    "concurrency": 5,
    "requestSize": 1048576,
    "responseSize": 10485760,
    "protocols": ["grpc", "http"],
    "testName": "Large Payload Comparison"
  }'
```

### Example 3: Direct Server API Test
```bash
# Generate test data from server
curl -X POST "http://localhost:8080/api/v1/performance/generate-test-data?payloadSize=1024&id=test1"

# Process data directly on server
curl -X POST http://localhost:8080/api/v1/performance/process \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test1",
    "timestamp": 1699123456789,
    "payload": "dGVzdCBkYXRh",
    "metadata": {"source": "api-test"}
  }'
```

---

## Performance Characteristics

### Supported Payload Sizes
- **Minimum**: 1 byte
- **Maximum**: 100MB (configurable)
- **Default Request**: 1MB
- **Default Response**: 10MB

### Concurrency Limits
- **Maximum Concurrent Requests**: 100
- **Default Concurrency**: 10

### Rate Limits
- **Maximum Requests per Test**: 10,000
- **No rate limiting on individual requests**

---

## Authentication & Security

Currently, the APIs are designed for demonstration purposes and do not require authentication. In a production environment, consider implementing:

- API key authentication
- JWT tokens
- TLS/SSL encryption
- Rate limiting
- Input validation and sanitization

---

## Monitoring & Observability

The application provides several monitoring capabilities:

1. **Health Checks**: Both services expose health endpoints
2. **Prometheus Metrics**: Available at `/metrics` on the client
3. **Spring Boot Actuator**: Comprehensive monitoring for the server
4. **Structured Logging**: JSON formatted logs for both services
5. **Performance Metrics**: Built-in performance measurement and comparison