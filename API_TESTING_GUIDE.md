# API Testing Guide

## Quick Testing Commands

### 1. Test Server Health (Working ✅)

```bash
# Check overall application health
curl http://localhost:8080/actuator/health

# Check performance service health
curl http://localhost:8080/api/v1/performance/health

# Expected Response:
# {"status":"healthy","timestamp":1699123456789,"service":"performance-test","version":"1.0.0"}
```

### 2. Test Data Generation (Working ✅)

```bash
# Generate 1KB test data
curl -X POST "http://localhost:8080/api/v1/performance/generate-test-data?payloadSize=1024&id=test1"

# Generate 1MB test data
curl -X POST "http://localhost:8080/api/v1/performance/generate-test-data?payloadSize=1048576&id=large-test"
```

### 3. Test Single Request Processing (Working ✅)

```bash
# Simple request
curl -X POST http://localhost:8080/api/v1/performance/process \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "timestamp": 1699123456789,
    "payload": "VGVzdCBwYXlsb2FkIGRhdGE=",
    "metadata": {
      "source": "api-test",
      "type": "manual"
    }
  }'

# Request with custom response size (10KB)
curl -X POST "http://localhost:8080/api/v1/performance/process?responseSize=10240" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-002",
    "timestamp": 1699123456789,
    "payload": "VGVzdCBwYXlsb2FkIGRhdGE=",
    "metadata": {"responseSize": "10KB"}
  }'
```

### 4. Test Batch Processing (Working ✅)

```bash
# Batch request with multiple items
curl -X POST http://localhost:8080/api/v1/performance/process-batch \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "batch-001",
      "timestamp": 1699123456789,
      "payload": "Rmlyc3QgaXRlbQ==",
      "metadata": {"index": "1"}
    },
    {
      "id": "batch-002", 
      "timestamp": 1699123456790,
      "payload": "U2Vjb25kIGl0ZW0=",
      "metadata": {"index": "2"}
    },
    {
      "id": "batch-003",
      "timestamp": 1699123456791,
      "payload": "VGhpcmQgaXRlbQ==",
      "metadata": {"index": "3"}
    }
  ]'
```

### 5. Test Service Configuration (Working ✅)

```bash
# Get service configuration
curl http://localhost:8080/api/v1/performance/config

# Expected Response:
# {
#   "defaultResponseSize": 0,
#   "maxResponseSize": 104857600,
#   "protocols": ["http", "grpc"]
# }
```

## Testing with Different Payload Sizes

### Small Payload Test (1KB)
```bash
curl -X POST "http://localhost:8080/api/v1/performance/process?responseSize=1024" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "small-test",
    "timestamp": 1699123456789,
    "payload": "'$(echo "Small test data" | base64)'",
    "metadata": {"size": "small"}
  }'
```

### Medium Payload Test (100KB)
```bash
curl -X POST "http://localhost:8080/api/v1/performance/process?responseSize=102400" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "medium-test",
    "timestamp": 1699123456789,
    "payload": "'$(head -c 1024 /dev/urandom | base64 | tr -d '\n')'",
    "metadata": {"size": "medium"}
  }'
```

### Large Payload Test (1MB)
```bash
# First generate test data
TEST_DATA=$(curl -s -X POST "http://localhost:8080/api/v1/performance/generate-test-data?payloadSize=1048576&id=large-payload")

# Then process it with 1MB response
curl -X POST "http://localhost:8080/api/v1/performance/process?responseSize=1048576" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA"
```

## Performance Testing

### Measure Response Time
```bash
# Test response time
time curl -X POST http://localhost:8080/api/v1/performance/process \
  -H "Content-Type: application/json" \
  -d '{
    "id": "perf-test",
    "timestamp": 1699123456789,
    "payload": "UGVyZm9ybWFuY2UgdGVzdA==",
    "metadata": {"test": "performance"}
  }'
```

### Concurrent Requests Test
```bash
# Run 5 concurrent requests
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/v1/performance/process \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"concurrent-$i\",
      \"timestamp\": $(date +%s%3N),
      \"payload\": \"$(echo "Concurrent test $i" | base64)\",
      \"metadata\": {\"concurrent\": \"true\", \"index\": \"$i\"}
    }" &
done
wait
```

## gRPC Testing (Requires grpcurl)

### Install grpcurl
```bash
# macOS
brew install grpcurl

# Linux
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

### Test gRPC Service
```bash
# List available services
grpcurl -plaintext localhost:9090 list

# Describe the service
grpcurl -plaintext localhost:9090 describe demo.PerformanceTestService

# Test ProcessData method
grpcurl -plaintext -d '{
  "id": "grpc-test-001",
  "timestamp": 1699123456789,
  "payload": "VGVzdCBncnBjIHBheWxvYWQ=",
  "metadata": {"protocol": "grpc", "test": "manual"}
}' localhost:9090 demo.PerformanceTestService/ProcessData
```

## Client API Testing (When Available)

### Test Client Health
```bash
curl http://localhost:3000/api/health
```

### Start Performance Test
```bash
curl -X POST http://localhost:3000/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "numRequests": 10,
    "concurrency": 2,
    "requestSize": 1024,
    "responseSize": 2048,
    "protocols": ["http"],
    "testName": "Quick API Test"
  }'
```

### Get Client Configuration
```bash
curl http://localhost:3000/api/config
```

## Expected Response Formats

### Successful Response
```json
{
  "id": "test-001",
  "timestamp": 1699123456789,
  "payload": "UmVzcG9uc2UgcGF5bG9hZA==",
  "statusCode": 200,
  "message": "Request processed successfully",
  "metadata": {
    "protocol": "http",
    "source": "api-test",
    "processed": "true"
  },
  "processingTimeNs": 1234567
}
```

### Error Response
```json
{
  "timestamp": "2023-11-05T10:30:45.123Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed: id is required",
  "path": "/api/v1/performance/process"
}
```

## Troubleshooting

### Common Issues

1. **Server not responding**: Check if server is running
   ```bash
   docker-compose ps
   curl http://localhost:8080/actuator/health
   ```

2. **Large payload fails**: Check payload size limits
   ```bash
   curl http://localhost:8080/api/v1/performance/config
   ```

3. **Client connection issues**: Check server availability
   ```bash
   curl http://localhost:8080/actuator/health
   ```

### Verify Services
```bash
# Check all container status
docker-compose ps

# Check server logs
docker-compose logs server

# Check client logs (if running)
docker-compose logs client

# Check network connectivity
docker-compose exec client curl http://grpc-server:8080/actuator/health
```