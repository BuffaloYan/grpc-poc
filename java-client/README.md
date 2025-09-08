# gRPC Demo Java Client

High-performance Java client for gRPC/HTTP benchmarking and performance testing with switchable HTTP client strategies (blocking vs reactive).

## Features

- **High-performance gRPC client** with connection pooling and proper resource management
- **Dual HTTP client strategies** with runtime switching capability:
  - **Blocking Strategy**: Apache HttpClient 5 with traditional connection pooling
  - **Reactive Strategy**: True reactive WebClient with Project Reactor (no blocking calls)
- **Strategy Pattern Implementation** for clean architecture and easy extension
- **Runtime Strategy Switching** via REST API without service restart
- **Built-in performance testing** with configurable concurrency and payload sizes
- **Strategy-specific metrics** for detailed performance analysis
- **Prometheus metrics** integration for monitoring
- **Spring Boot** framework for robust configuration and dependency injection
- **Optimized JVM settings** for performance testing workloads

## Architecture

### gRPC Client (`GrpcClientService`)
- Uses managed channels with keep-alive configuration
- Supports both blocking and async calls
- Automatic retry and connection management
- Metrics collection for latency and throughput

### HTTP Client Strategies (`HttpClientService`)

The HTTP client uses a **Strategy Pattern** to support multiple implementations:

#### Blocking Strategy (`BlockingHttpClientStrategy`)
- **Apache HttpClient 5** with traditional connection pooling
- **Synchronous I/O** with thread-per-request model
- **Connection pooling**: 200 total connections, 50 per route
- **Base64 encoding** for binary payload compatibility
- **Proper timeout handling** and error management
- **Thread-safe metrics** collection

#### Reactive Strategy (`ReactiveHttpClientStrategy`) 
- **Spring WebClient** with Project Reactor
- **True reactive I/O** - no blocking calls in the reactive chain
- **Netty-based HTTP client** with optimized buffer management
- **Backpressure handling** for high-throughput scenarios
- **20MB buffer sizes** for large payload support
- **10-minute response timeout** for large response processing
- **Reactive metrics** with proper resource cleanup

#### Strategy Switching
- **Runtime switching** between strategies via REST API
- **Environment-based initialization** with `HTTP_CLIENT_STRATEGY`
- **Thread-safe strategy management** with concurrent access
- **Independent metrics** for each strategy
- **Zero-downtime switching** without service restart

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

### Performance Testing

#### gRPC Performance Test
```
POST /api/v1/performance/test-grpc?concurrency=10&requests=100&payloadSize=1048576&responseSize=0
```

#### HTTP Performance Test
```
POST /api/v1/performance/test-http?concurrency=10&requests=100&payloadSize=1048576&responseSize=0
```
Uses the currently selected HTTP client strategy (blocking or reactive).

#### Comparison Test
```
POST /api/v1/performance/test-comparison?concurrency=10&requests=100&payloadSize=1048576&responseSize=0
```
Runs both gRPC and HTTP tests sequentially and provides comparison metrics.

### Configuration Management

#### Get Configuration
```
GET /api/v1/performance/config
```
Returns current client configuration, limits, and HTTP strategy information.

#### Get Current HTTP Strategy
```
GET /api/v1/performance/strategy
```
Returns the current HTTP client strategy and available options.

**Response:**
```json
{
  "currentStrategy": "blocking",
  "availableStrategies": ["blocking", "reactive"]
}
```

#### Change HTTP Strategy
```
POST /api/v1/performance/strategy
Content-Type: application/json

{
  "strategy": "reactive"
}
```

**Supported strategies:**
- `"blocking"`: Apache HttpClient 5 with traditional connection pooling
- `"reactive"`: True reactive WebClient with Project Reactor

**Response:**
```json
{
  "message": "Strategy changed successfully",
  "currentStrategy": "reactive",
  "availableStrategies": ["blocking", "reactive"]
}
```

## Performance Optimizations

### JVM Settings
- **G1 Garbage Collector** for low-latency performance
- **4GB heap** with 1GB initial allocation
- **100ms GC pause target** for consistent performance

### Connection Management

#### Blocking Strategy
- **HTTP connection pooling** (200 total, 50 per route)
- **Thread-per-request model** with proper timeout handling
- **Connection reuse** for improved performance

#### Reactive Strategy  
- **Netty connection pooling** with WebClient
- **Non-blocking I/O** with event-loop threads
- **Backpressure handling** for high-throughput scenarios
- **Large buffer management** (20MB send/receive buffers)

#### gRPC (Both Strategies)
- **Managed channel** with keep-alive configuration
- **Connection sharing** across requests
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

## Strategy Performance Characteristics

### Blocking Strategy vs Reactive Strategy

#### When to Use Blocking Strategy
- **CPU-bound workloads** with heavy processing
- **Lower concurrency scenarios** (< 50 concurrent requests)
- **Traditional Spring applications** with existing blocking code
- **Simpler debugging** and troubleshooting requirements
- **Predictable memory usage** patterns

#### When to Use Reactive Strategy  
- **I/O-bound workloads** with network latency
- **High concurrency scenarios** (> 100 concurrent requests)
- **Large payload processing** with backpressure
- **Non-blocking application architectures** 
- **Memory-efficient processing** of streaming data

### Expected Performance Improvements

The Java client provides several advantages over Node.js client:

1. **Better connection management** with both blocking and reactive strategies
2. **More efficient binary handling** with native protobuf support
3. **Lower GC overhead** with G1 garbage collector optimization
4. **Optimized gRPC channel reuse** across requests
5. **Strategy-specific optimizations**:
   - **Blocking**: Connection pooling and thread management
   - **Reactive**: Non-blocking I/O and backpressure handling
6. **Native protobuf serialization** without JavaScript overhead

### Performance Testing Recommendations

1. **Start with blocking strategy** for baseline measurements
2. **Switch to reactive strategy** for high-concurrency tests
3. **Test with various payload sizes** (1KB to 100MB)
4. **Monitor strategy-specific metrics** in Prometheus
5. **Compare both strategies** under your specific workload patterns
6. **Use comparison API** for side-by-side analysis

Test with various concurrency levels and payload sizes to find optimal performance characteristics for your workload and choose the best strategy.
