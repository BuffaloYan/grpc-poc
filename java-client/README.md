# gRPC Demo Java Client

High-performance Java client for gRPC/HTTP benchmarking and performance testing.

## Features

- **High-performance gRPC client** with connection pooling and proper resource management
- **HTTP client** with Apache HttpClient 5 for fair comparison
- **Built-in performance testing** with configurable concurrency and payload sizes
- **Prometheus metrics** integration for monitoring
- **Spring Boot** framework for robust configuration and dependency injection
- **Optimized JVM settings** for performance testing workloads

## Architecture

### gRPC Client (`GrpcClientService`)
- Uses managed channels with keep-alive configuration
- Supports both blocking and async calls
- Automatic retry and connection management
- Metrics collection for latency and throughput

### HTTP Client (`HttpClientService`)
- Apache HttpClient 5 with connection pooling
- Base64 encoding for binary payload compatibility
- Proper timeout and error handling
- Comparable metrics collection

### Performance Testing
- Configurable concurrency levels (1-100 threads)
- Variable payload sizes (up to 100MB)
- Response size control
- Comprehensive metrics: throughput, latency, success rate
- Side-by-side protocol comparison

## API Endpoints

### Health Check
```
GET /api/v1/performance/health
```
Tests connectivity to both gRPC and HTTP servers.

### gRPC Performance Test
```
POST /api/v1/performance/test-grpc?concurrency=10&requests=100&payloadSize=1048576&responseSize=0
```

### HTTP Performance Test
```
POST /api/v1/performance/test-http?concurrency=10&requests=100&payloadSize=1048576&responseSize=0
```

### Comparison Test
```
POST /api/v1/performance/test-comparison?concurrency=10&requests=100&payloadSize=1048576&responseSize=0
```
Runs both gRPC and HTTP tests concurrently and provides comparison metrics.

### Configuration
```
GET /api/v1/performance/config
```
Returns current client configuration and limits.

## Performance Optimizations

### JVM Settings
- **G1 Garbage Collector** for low-latency performance
- **4GB heap** with 1GB initial allocation
- **100ms GC pause target** for consistent performance

### Connection Management
- **HTTP connection pooling** (200 total, 50 per route)
- **gRPC channel management** with keep-alive
- **Proper resource cleanup** on shutdown

### Threading
- **Cached thread pool** for optimal concurrency
- **CountDownLatch** for precise test coordination
- **Atomic counters** for thread-safe metrics

## Usage

### Docker Deployment
The Java client is included in the main docker-compose setup:

```bash
# Start with Java client
docker-compose up java-client

# Or start everything including monitoring
docker-compose --profile monitoring up
```

**Available on:** http://localhost:3002

### Development
```bash
cd java-client
mvn clean compile
mvn spring-boot:run
```

### Building
```bash
mvn clean package
java -jar target/grpc-demo-java-client-1.0.0.jar
```

## Configuration

### Environment Variables
- `GRPC_SERVER_HOST`: gRPC server hostname (default: localhost)
- `GRPC_SERVER_PORT`: gRPC server port (default: 9090)
- `HTTP_SERVER_HOST`: HTTP server hostname (default: localhost)
- `HTTP_SERVER_PORT`: HTTP server port (default: 8080)
- `JAVA_OPTS`: JVM options for performance tuning

### Application Properties
See `src/main/resources/application.yml` for detailed configuration options.

## Monitoring

The Java client exposes Prometheus metrics at `/actuator/prometheus`:

- **gRPC client metrics**: `grpc_client_requests_*`
- **HTTP client metrics**: `http_client_requests_*`
- **JVM metrics**: Memory, GC, threads
- **Spring Boot metrics**: Application health and performance

## Expected Performance Improvements

The Java client should provide more consistent and higher throughput compared to the Node.js client due to:

1. **Better connection management**
2. **More efficient binary handling**
3. **Lower GC overhead with G1**
4. **Optimized gRPC channel reuse**
5. **Proper HTTP connection pooling**
6. **Native protobuf serialization**

Test with various concurrency levels and payload sizes to find optimal performance characteristics for your workload.
