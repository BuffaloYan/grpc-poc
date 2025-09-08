# gRPC Performance Testing Demo

A comprehensive demonstration of gRPC vs HTTP performance comparison with large payloads, featuring dual client implementations (Node.js & Java) with reactive and blocking HTTP strategies, built with Java Spring Boot (server) and modern React UI.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Node.js       │    │   Java Spring   │
│   (Port 80)     │◄───┤   Client API    │◄───┤   Boot Server   │
│                 │    │   (Port 3000)   │    │                 │
│   - Client      │    │   - gRPC Client │    │   - gRPC Service│
│     Selector    │    │   - HTTP Client │    │   - HTTP API    │
│   - Strategy    │    │   - Orchestrator│    │   - Large Payload│
│     Switching   │    └─────────────────┘    │   Processing    │
│   - Test Config │                           │                 │
│   - Results     │    ┌─────────────────┐    │   HTTP:8080     │
│   - Charts      │    │   Java Client   │◄───┤   gRPC:9090     │
└─────────────────┘    │   (Port 3002)   │    └─────────────────┘
                       │                 │
                       │   - Blocking    │
                       │     Strategy    │
                       │   - Reactive    │
                       │     Strategy    │
                       │   - gRPC Client │
                       │   - Performance │
                       │     Testing     │
                       └─────────────────┘
```

## 🚀 Features

### Core Performance Testing
- **Dual Protocol Support**: Compare gRPC vs HTTP performance side-by-side
- **Large Payload Testing**: Support for 1MB+ requests and 100MB+ responses
- **TLS Security**: Self-signed certificates for secure gRPC communication
- **Real-time Monitoring**: Performance metrics, throughput, and latency analysis
- **Streaming Support**: gRPC streaming and HTTP batch processing
- **Comprehensive Metrics**: Detailed performance analysis and comparison

### Dual Client Architecture
- **Node.js Client** (Port 3000): Original client with orchestration capabilities
- **Java Client** (Port 3002): High-performance client with strategy pattern implementation
- **Client Switching**: Dynamic switching between client implementations via UI
- **Performance Comparison**: Side-by-side comparison of client implementations

### HTTP Client Strategies (Java Client)
- **Blocking Strategy**: Traditional Apache HttpClient 5 with connection pooling
- **Reactive Strategy**: True reactive WebClient with Project Reactor (no blocking calls)
- **Runtime Strategy Switching**: Change HTTP client strategy without restart
- **Strategy-specific Metrics**: Separate performance tracking for each approach

### Modern React UI
- **Client Selector**: Switch between Node.js and Java clients seamlessly
- **Strategy Switching**: Control Java client HTTP strategy in real-time
- **Enhanced Visualization**: Modern gradient design with improved UX
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Real-time Health Status**: Live monitoring of all services
- **Performance Charts**: Interactive visualizations using Recharts
- **Test History Management**: View and compare previous test results
- **Dynamic Configuration**: Real-time updates based on selected client/strategy

### Deployment & Monitoring
- **Docker Ready**: Complete containerization for easy deployment
- **Prometheus Integration**: Detailed metrics collection and monitoring
- **Health Checks**: Comprehensive service health monitoring
- **Development Mode**: Hot reloading and debug support

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for development)
- Java 17+ (for development)
- 8GB+ RAM (for performance testing)

## 🏃‍♂️ Quick Start

### 1. Clone and Start

```bash
git clone <repository-url>
cd grpc-performance-demo

# Start all services
./scripts/start.sh
```

### 2. Access the Application

- **Web UI**: http://localhost (Main testing interface with client selector)
- **Node.js Client API**: http://localhost:3000 (Original orchestration client)
- **Java Client API**: http://localhost:3002 (High-performance Java client)
- **Server HTTP**: http://localhost:8080 (Direct HTTP server access)
- **Server gRPC**: localhost:9090 (Direct gRPC server access)

### 3. Run Your First Test

1. Open http://localhost in your browser
2. **Choose Client Implementation**:
   - **Node.js Client**: Original orchestration client
   - **Java Client**: High-performance client with strategy options
3. **Configure HTTP Strategy** (Java Client only):
   - **Blocking**: Traditional Apache HttpClient approach
   - **Reactive**: True reactive WebClient approach
4. Configure test parameters:
   - Number of requests: 100
   - Concurrency: 10
   - Request size: 1MB
   - Response size: 10MB
5. Select protocols: gRPC and HTTP
6. Click "Run Performance Test"
7. View real-time results and client/strategy comparisons

## 🎨 UI Features & User Experience

### Client Selector Component
The UI features a **dynamic client selector** that allows you to switch between different backend implementations:

- **Node.js Client**: Original orchestration-based client with comprehensive test management
- **Java Client**: High-performance client with strategy pattern implementation
- **Real-time Status**: Live health monitoring of each client
- **Seamless Switching**: Change clients without page refresh

### HTTP Strategy Management (Java Client)
When using the Java client, you can control the HTTP implementation strategy:

- **Strategy Selector**: Choose between blocking and reactive implementations
- **Real-time Switching**: Change strategies without service restart
- **Strategy Indicators**: Visual indicators showing current strategy
- **Performance Impact**: See how strategy changes affect test results

### Enhanced Test Configuration
- **Intelligent Presets**: Quick configurations for different testing scenarios
- **Size Input Parsing**: Smart parsing of size inputs (1KB, 1MB, 1GB)
- **Protocol Selection**: Easy checkbox selection for gRPC and/or HTTP testing
- **Parameter Validation**: Real-time validation with helpful error messages
- **Client-specific Options**: Different options based on selected client

### Modern Visual Design
- **Gradient Backgrounds**: Beautiful gradient designs with glassmorphism effects
- **Responsive Layout**: Optimized for desktop, tablet, and mobile viewing
- **Interactive Elements**: Hover effects and smooth transitions
- **Status Indicators**: Color-coded health status with animated indicators
- **Progress Feedback**: Loading states and progress indicators during tests

### Test Results & History
- **Rich Visualizations**: Interactive charts using Recharts library
- **Performance Comparison**: Side-by-side comparison of protocols and strategies
- **Test History**: Browse and compare previous test results
- **Export Capabilities**: Download test results for further analysis
- **Real-time Updates**: Live updates during test execution

### Accessibility & UX
- **Keyboard Navigation**: Full keyboard accessibility support
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Error Handling**: User-friendly error messages and recovery suggestions
- **Help Text**: Contextual help and tooltips throughout the interface

## 📚 API Documentation

**🔗 Complete API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
**🧪 API Testing Guide**: [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)

### Quick API Reference

#### 🖥️ Server APIs (Java Spring Boot)
- **Base URL**: `http://localhost:8080`
- **gRPC Port**: `localhost:9090`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/actuator/health` | GET | Application health check |
| `/api/v1/performance/process` | POST | Process single request |
| `/api/v1/performance/process-batch` | POST | Process batch requests |
| `/api/v1/performance/config` | GET | Get service configuration |
| `/api/v1/performance/generate-test-data` | POST | Generate sample data |

#### 🔗 Client APIs

##### Node.js Client (Port 3000)
- **Base URL**: `http://localhost:3000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Client health check |
| `/api/tests` | POST | Start performance test |
| `/api/tests/{testId}` | GET | Get test results |
| `/api/tests` | GET | List all tests |
| `/api/config` | GET | Get client configuration |
| `/api/sample-data` | POST | Generate sample data |

##### Java Client (Port 3002)
- **Base URL**: `http://localhost:3002`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/performance/health` | GET | Health check with connectivity tests |
| `/api/v1/performance/test-grpc` | POST | gRPC-only performance test |
| `/api/v1/performance/test-http` | POST | HTTP-only performance test |
| `/api/v1/performance/test-comparison` | POST | Compare gRPC vs HTTP |
| `/api/v1/performance/config` | GET | Get configuration and strategy info |
| `/api/v1/performance/strategy` | GET | Get current HTTP client strategy |
| `/api/v1/performance/strategy` | POST | Change HTTP client strategy |

#### ⚡ gRPC Services
- **ProcessData**: Unary RPC for single request processing
- **ProcessDataStream**: Bidirectional streaming for high-throughput testing

### Example Usage

#### Node.js Client
```bash
# Start a performance test
curl -X POST http://localhost:3000/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "numRequests": 100,
    "concurrency": 10,
    "requestSize": 1048576,
    "responseSize": 10485760,
    "protocols": ["grpc", "http"]
  }'

# Get client configuration
curl http://localhost:3000/api/config
```

#### Java Client
```bash
# Check health and connectivity
curl http://localhost:3002/api/v1/performance/health

# Run gRPC performance test
curl -X POST "http://localhost:3002/api/v1/performance/test-grpc?concurrency=10&requests=100&payloadSize=1048576&responseSize=10485760"

# Run comparison test
curl -X POST "http://localhost:3002/api/v1/performance/test-comparison?concurrency=10&requests=100&payloadSize=1048576"

# Get current HTTP strategy
curl http://localhost:3002/api/v1/performance/strategy

# Change HTTP strategy to reactive
curl -X POST http://localhost:3002/api/v1/performance/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "reactive"}'
```

#### Server Health Check
```bash
# Check server health
curl http://localhost:8080/actuator/health
```

## 🐳 Docker Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Start with monitoring (Prometheus + Grafana) and Java client
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f [service]

# Stop all services
docker-compose down

# Clean up everything
docker-compose down -v
docker system prune -f
```

### Development Mode
```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# This enables:
# - Hot reloading
# - Debug ports
# - Volume mounts for live editing
```

## 🛠️ Development Setup

### Server (Java Spring Boot)
```bash
cd server
mvn clean compile
mvn spring-boot:run
```

### Client (Node.js)
```bash
cd client
npm install
npm run proto:generate
npm start
```

### UI (React)
```bash
cd ui
npm install
npm run dev
```

### Java Client (Spring Boot)
```bash
cd java-client
mvn clean compile
mvn spring-boot:run

# Or build and run JAR
mvn clean package
java -jar target/grpc-demo-java-client-1.0.0.jar
```

## 📊 Performance Testing Guide

### Test Configuration Options

| Parameter | Description | Range | Default |
|-----------|-------------|-------|---------|
| Requests | Total number of requests | 1-10,000 | 100 |
| Concurrency | Parallel requests | 1-100 | 10 |
| Request Size | Payload size (supports KB, MB) | 1B-100MB | 1MB |
| Response Size | Expected response size | 1B-100MB | 10MB |
| Protocols | gRPC, HTTP, or both | - | Both |

### Sample Test Scenarios

#### 1. Quick Validation
- Requests: 10
- Concurrency: 2
- Request: 1KB
- Response: 10KB

#### 2. Typical Web Traffic
- Requests: 100
- Concurrency: 10
- Request: 100KB
- Response: 1MB

#### 3. Large File Transfer
- Requests: 50
- Concurrency: 5
- Request: 5MB
- Response: 50MB

#### 4. High Throughput
- Requests: 1000
- Concurrency: 50
- Request: 1MB
- Response: 10MB

### Understanding Results

- **Throughput**: Requests per second (higher is better)
- **Latency**: Average response time in milliseconds (lower is better)
- **Success Rate**: Percentage of successful requests
- **Protocol Comparison**: Relative performance improvements

## 🔐 Security

### TLS Certificates

The system uses self-signed certificates for gRPC TLS:
- CA Certificate: `certs/ca-cert.pem`
- Server Certificate: `certs/server-cert.pem`
- Client Certificate: `certs/client-cert.pem`

Certificates are automatically generated on first run.

### Production Considerations

For production use:
1. Replace self-signed certificates with proper CA-signed certificates
2. Configure proper authentication and authorization
3. Set up monitoring and logging
4. Use environment-specific configurations

## 📈 Monitoring (Optional)

Enable monitoring with the `monitoring` profile:

```bash
docker-compose --profile monitoring up -d
```

Access:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## 🔧 Configuration

### Environment Variables

#### Server
- `SPRING_PROFILES_ACTIVE`: Active Spring profile
- `JAVA_OPTS`: JVM options

#### Node.js Client
- `GRPC_SERVER_HOST`: gRPC server hostname
- `HTTP_SERVER_HOST`: HTTP server hostname
- `LOG_LEVEL`: Logging level

#### Java Client
- `GRPC_SERVER_HOST`: gRPC server hostname (default: localhost)
- `GRPC_SERVER_PORT`: gRPC server port (default: 9090)
- `HTTP_SERVER_HOST`: HTTP server hostname (default: localhost)
- `HTTP_SERVER_PORT`: HTTP server port (default: 8080)
- `HTTP_CLIENT_STRATEGY`: Initial HTTP strategy (blocking/reactive, default: blocking)
- `JAVA_OPTS`: JVM options for performance tuning

#### UI
- `VITE_API_URL`: Backend API URL (supports dynamic client switching)

### Performance Tuning

#### For Higher Loads
1. Increase Docker memory limits
2. Tune JVM heap sizes
3. Adjust connection pool sizes
4. Configure appropriate timeouts

#### JVM Options (Server)
```bash
JAVA_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

## 🧪 API Reference

### Client API Endpoints

#### Health Check
```http
GET /api/health
```

#### Run Performance Test
```http
POST /api/tests
Content-Type: application/json

{
  "numRequests": 100,
  "concurrency": 10,
  "requestSize": 1048576,
  "responseSize": 10485760,
  "protocols": ["grpc", "http"],
  "testName": "My Test"
}
```

#### Get Test Results
```http
GET /api/tests/{testId}
```

#### List All Tests
```http
GET /api/tests
```

## 🔍 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check Docker status
docker ps

# View service logs
docker-compose logs server
docker-compose logs client
docker-compose logs ui
```

#### Connection Errors
- Verify all services are healthy: `docker-compose ps`
- Check certificate generation: `ls -la certs/`
- Ensure ports are not in use: `netstat -tulpn | grep :8080`

#### Performance Issues
- Increase Docker memory allocation
- Tune JVM settings
- Check system resources: `docker stats`

#### Certificate Issues
```bash
# Regenerate certificates
cd certs
./generate_certs.sh
```

### Debug Mode

#### Java Debug (Port 5005)
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up server
```

#### Node.js Debug (Port 9229)
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up client
```

## 📝 License

This project is for demonstration purposes. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📚 Additional Resources

- [gRPC Documentation](https://grpc.io/docs/)
- [Spring Boot gRPC](https://github.com/LogNet/grpc-spring-boot-starter)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [React Performance](https://react.dev/learn/render-and-commit)

---

**Happy Testing! 🚀**