# Makefile for gRPC Performance Demo

.PHONY: help install build test start stop clean dev

help: ## Show this help message
	@echo "gRPC Performance Demo - Available Commands:"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo

install: ## Install dependencies and generate certificates
	@echo "🔧 Installing dependencies..."
	@if [ ! -f "certs/server-cert.pem" ]; then \
		echo "📜 Generating TLS certificates..."; \
		cd certs && ./generate_certs.sh; \
	fi
	@echo "✅ Installation complete"

build: install ## Build all Docker images
	@echo "🏗️  Building Docker images..."
	docker-compose build

test: ## Run basic connectivity tests
	@echo "🧪 Running connectivity tests..."
	@echo "Testing server compilation..."
	cd server && mvn clean compile
	@echo "Testing client dependencies..."
	cd client && npm install && npm run proto:generate
	@echo "Testing UI dependencies..."
	cd ui && npm install
	@echo "✅ All tests passed"

start: build ## Start all services
	@echo "🚀 Starting gRPC Performance Demo..."
	docker-compose up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 10
	@echo "🎉 Demo is ready!"
	@echo
	@echo "📊 Access points:"
	@echo "  Web UI:        http://localhost"
	@echo "  Client API:    http://localhost:3000"
	@echo "  Server HTTP:   http://localhost:8080"
	@echo

start-dev: ## Start in development mode
	@echo "🛠️  Starting in development mode..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

stop: ## Stop all services
	@echo "🛑 Stopping services..."
	docker-compose down

clean: stop ## Clean up containers, images, and volumes
	@echo "🧹 Cleaning up..."
	docker-compose down -v --rmi all
	docker system prune -f

dev-server: ## Run server in development mode
	@echo "🏃‍♂️ Starting Java server..."
	cd server && mvn spring-boot:run

dev-client: ## Run client in development mode
	@echo "🏃‍♂️ Starting Node.js client..."
	cd client && npm run dev

dev-ui: ## Run UI in development mode
	@echo "🏃‍♂️ Starting React UI..."
	cd ui && npm run dev

logs: ## View logs from all services
	docker-compose logs -f

status: ## Check service status
	@echo "📊 Service Status:"
	@docker-compose ps

quick-test: ## Run a quick performance test
	@echo "⚡ Running quick test..."
	curl -X POST http://localhost:3000/api/tests \
		-H "Content-Type: application/json" \
		-d '{"numRequests": 10, "concurrency": 2, "requestSize": 1024, "responseSize": 10240, "protocols": ["grpc", "http"], "testName": "Quick Test"}'