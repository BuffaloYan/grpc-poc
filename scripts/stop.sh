#!/bin/bash

# Stop script for gRPC Demo
set -e

echo "🛑 Stopping gRPC Performance Demo..."

# Stop and remove containers
docker-compose down

echo "✅ All services stopped successfully."
echo ""
echo "🧹 To clean up everything (including volumes):"
echo "  docker-compose down -v"
echo "  docker system prune -f"