# gRPC Performance Testing Demo

A comprehensive demonstration of gRPC vs HTTP performance comparison with large payloads, built with Java Spring Boot (server), Node.js (client), and React (UI).

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Node.js       │    │   Java Spring   │
│   (Port 80)     │◄───┤   Client API    │◄───┤   Boot Server   │
│                 │    │   (Port 3000)   │    │                 │
│   - Test Config │    │   - gRPC Client │    │   - gRPC Service│
│   - Results     │    │   - HTTP Client │    │   - HTTP API    │
│   - Charts      │    │   - Orchestrator│    │   - Large Payload│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                               │   HTTP:8080     │
                                               │   gRPC:9090     │
                                               └─────────────────┘
```

## 🚀 Features

- **Dual Protocol Support**: Compare gRPC vs HTTP performance side-by-side
- **Large Payload Testing**: Support for 1MB+ requests and 10MB+ responses
- **TLS Security**: Self-signed certificates for secure gRPC communication
- **Real-time Monitoring**: Performance metrics, throughput, and latency analysis
- **Docker Ready**: Complete containerization for easy deployment
- **Interactive UI**: React-based interface for configuring and running tests
- **Streaming Support**: gRPC streaming and HTTP batch processing
- **Comprehensive Metrics**: Detailed performance analysis and comparison

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

- **Web UI**: http://localhost (Main testing interface)
- **Client API**: http://localhost:3000 (REST API for orchestration)
- **Server HTTP**: http://localhost:8080 (Direct HTTP server access)
- **Server gRPC**: localhost:9090 (Direct gRPC server access)

### 3. Run Your First Test

1. Open http://localhost in your browser
2. Configure test parameters:
   - Number of requests: 100
   - Concurrency: 10
   - Request size: 1MB
   - Response size: 10MB
3. Select protocols: gRPC and HTTP
4. Click "Run Performance Test"
5. View real-time results and comparisons

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

#### 🔗 Client APIs (Node.js)
- **Base URL**: `http://localhost:3000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Client health check |
| `/api/tests` | POST | Start performance test |
| `/api/tests/{testId}` | GET | Get test results |
| `/api/tests` | GET | List all tests |
| `/api/config` | GET | Get client configuration |
| `/api/sample-data` | POST | Generate sample data |

#### ⚡ gRPC Services
- **ProcessData**: Unary RPC for single request processing
- **ProcessDataStream**: Bidirectional streaming for high-throughput testing

### Example Usage

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

# Check server health
curl http://localhost:8080/actuator/health

# Get client configuration
curl http://localhost:3000/api/config
```

## 🐳 Docker Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Start with monitoring (Prometheus + Grafana)
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

#### Client
- `GRPC_SERVER_HOST`: gRPC server hostname
- `HTTP_SERVER_HOST`: HTTP server hostname
- `LOG_LEVEL`: Logging level

#### UI
- `VITE_API_URL`: Backend API URL

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