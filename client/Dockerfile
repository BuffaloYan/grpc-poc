# Multi-stage build for Node.js gRPC client
FROM node:20-alpine AS build

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ grpc-dev protobuf-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install all dependencies (including dev dependencies for proto generation)
RUN npm ci

# Copy source code and proto file
COPY client/src ./src
COPY server/src/main/proto ./proto

# Generate gRPC client code (adjust path)
RUN npx grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./src/generated --grpc_out=grpc_js:./src/generated --proto_path=./proto ./proto/demo.proto

# Production stage
FROM node:20-alpine

# Install dumb-init and curl for proper signal handling and health checks
RUN apk add --no-cache dumb-init curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/src ./src
COPY --chown=appuser:nodejs client/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown appuser:nodejs logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]