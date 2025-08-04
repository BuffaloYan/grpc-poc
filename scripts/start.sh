#!/bin/bash

# Start script for gRPC Demo
set -e

echo "🚀 Starting gRPC Performance Demo..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if certificates exist
if [ ! -f "certs/server-cert.pem" ]; then
    echo "📜 Generating TLS certificates..."
    cd certs && ./generate_certs.sh && cd ..
fi

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
for service in server client ui; do
    echo -n "  ${service}: "
    if docker-compose ps | grep -q "${service}.*healthy"; then
        echo "✅ healthy"
    else
        echo "❌ not healthy"
    fi
done

echo ""
echo "🎉 gRPC Performance Demo is ready!"
echo ""
echo "📊 Access points:"
echo "  Web UI:        http://localhost"
echo "  Client API:    http://localhost:3000"
echo "  Server HTTP:   http://localhost:8080"
echo "  Server gRPC:   localhost:9090"
echo ""
echo "📈 Optional monitoring (add --profile monitoring to docker-compose):"
echo "  Prometheus:    http://localhost:9090"
echo "  Grafana:       http://localhost:3001 (admin/admin)"
echo ""
echo "🛠️  Useful commands:"
echo "  View logs:     docker-compose logs -f [service]"
echo "  Stop:          docker-compose down"
echo "  Restart:       docker-compose restart [service]"
echo ""