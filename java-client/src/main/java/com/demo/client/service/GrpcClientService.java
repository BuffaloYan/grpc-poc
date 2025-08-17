package com.demo.client.service;

import com.demo.grpc.generated.DataRequest;
import com.demo.grpc.generated.DataResponse;
import com.demo.grpc.generated.PerformanceTestServiceGrpc;
import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class GrpcClientService {

    private static final Logger logger = LoggerFactory.getLogger(GrpcClientService.class);

    @Value("${target.grpc.host}")
    private String grpcHost;

    @Value("${target.grpc.port}")
    private int grpcPort;

    private ManagedChannel channel;
    private PerformanceTestServiceGrpc.PerformanceTestServiceBlockingStub blockingStub;
    private PerformanceTestServiceGrpc.PerformanceTestServiceStub asyncStub;

    private final Timer grpcRequestTimer;
    private final Counter grpcRequestCounter;
    private final Counter grpcErrorCounter;

    public GrpcClientService(MeterRegistry meterRegistry) {
        this.grpcRequestTimer = Timer.builder("grpc_client_requests")
                .description("gRPC client request latency")
                .register(meterRegistry);
        this.grpcRequestCounter = Counter.builder("grpc_client_requests_total")
                .description("Total gRPC client requests")
                .register(meterRegistry);
        this.grpcErrorCounter = Counter.builder("grpc_client_errors_total")
                .description("Total gRPC client errors")
                .register(meterRegistry);
    }

    @PostConstruct
    public void init() {
        channel = ManagedChannelBuilder.forAddress(grpcHost, grpcPort)
                .usePlaintext()
                .maxInboundMessageSize(200 * 1024 * 1024) // 200MB
                .keepAliveTime(30, TimeUnit.SECONDS)
                .keepAliveTimeout(5, TimeUnit.SECONDS)
                .keepAliveWithoutCalls(true)
                .build();

        blockingStub = PerformanceTestServiceGrpc.newBlockingStub(channel);
        asyncStub = PerformanceTestServiceGrpc.newStub(channel);

        logger.info("gRPC client initialized for {}:{}", grpcHost, grpcPort);
    }

    @PreDestroy
    public void shutdown() {
        if (channel != null && !channel.isShutdown()) {
            try {
                channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                logger.warn("Interrupted while shutting down gRPC channel", e);
                Thread.currentThread().interrupt();
            }
        }
    }

    public DataResponse processDataBlocking(String id, byte[] payload, int expectedResponseSize) {
        Timer.Sample sample = Timer.start();
        grpcRequestCounter.increment();

        try {
            DataRequest.Builder requestBuilder = DataRequest.newBuilder()
                    .setId(id)
                    .setTimestamp(System.currentTimeMillis())
                    .setPayload(ByteString.copyFrom(payload));

            if (expectedResponseSize > 0) {
                requestBuilder.putMetadata("expectedResponseSize", String.valueOf(expectedResponseSize));
            }

            DataRequest request = requestBuilder.build();
            DataResponse response = blockingStub.processData(request);
            
            sample.stop(grpcRequestTimer);
            return response;

        } catch (Exception e) {
            grpcErrorCounter.increment();
            logger.error("gRPC blocking call failed for id: {}", id, e);
            throw e;
        }
    }

    public CompletableFuture<DataResponse> processDataAsync(String id, byte[] payload, int expectedResponseSize) {
        CompletableFuture<DataResponse> future = new CompletableFuture<>();
        Timer.Sample sample = Timer.start();
        grpcRequestCounter.increment();

        try {
            DataRequest.Builder requestBuilder = DataRequest.newBuilder()
                    .setId(id)
                    .setTimestamp(System.currentTimeMillis())
                    .setPayload(ByteString.copyFrom(payload));

            if (expectedResponseSize > 0) {
                requestBuilder.putMetadata("expectedResponseSize", String.valueOf(expectedResponseSize));
            }

            DataRequest request = requestBuilder.build();

            asyncStub.processData(request, new StreamObserver<DataResponse>() {
                @Override
                public void onNext(DataResponse response) {
                    sample.stop(grpcRequestTimer);
                    future.complete(response);
                }

                @Override
                public void onError(Throwable t) {
                    grpcErrorCounter.increment();
                    logger.error("gRPC async call failed for id: {}", id, t);
                    future.completeExceptionally(t);
                }

                @Override
                public void onCompleted() {
                    // Response already handled in onNext
                }
            });

        } catch (Exception e) {
            grpcErrorCounter.increment();
            future.completeExceptionally(e);
        }

        return future;
    }

    public PerformanceResult performanceTest(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        logger.info("Starting gRPC performance test: concurrency={}, requests={}, payloadSize={}, responseSize={}", 
                   concurrency, totalRequests, payloadSize, responseSize);

        byte[] payload = new byte[payloadSize];
        for (int i = 0; i < payloadSize; i++) {
            payload[i] = (byte) (i % 256);
        }

        CountDownLatch latch = new CountDownLatch(totalRequests);
        AtomicLong totalLatency = new AtomicLong(0);
        AtomicLong errorCount = new AtomicLong(0);
        long startTime = System.nanoTime();

        // Use a fixed thread pool for controlled concurrency
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(concurrency);

        for (int i = 0; i < totalRequests; i++) {
            final int requestId = i;
            executor.submit(() -> {
                try {
                    long requestStart = System.nanoTime();
                    processDataBlocking("perf-test-" + requestId, payload, responseSize);
                    long requestEnd = System.nanoTime();
                    totalLatency.addAndGet(requestEnd - requestStart);
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Performance test interrupted", e);
        } finally {
            executor.shutdown();
        }

        long endTime = System.nanoTime();
        long totalDurationMs = (endTime - startTime) / 1_000_000;
        double throughput = (double) totalRequests / totalDurationMs * 1000; // requests per second
        double avgLatencyMs = (double) totalLatency.get() / totalRequests / 1_000_000;

        PerformanceResult result = new PerformanceResult(
            "gRPC",
            totalRequests,
            (int) errorCount.get(),
            totalDurationMs,
            throughput,
            avgLatencyMs,
            concurrency,
            payloadSize,
            responseSize
        );

        logger.info("gRPC performance test completed: {}", result);
        return result;
    }

    public static class PerformanceResult {
        private final String protocol;
        private final int totalRequests;
        private final int errorCount;
        private final long durationMs;
        private final double throughput;
        private final double avgLatencyMs;
        private final int concurrency;
        private final int payloadSize;
        private final int responseSize;

        public PerformanceResult(String protocol, int totalRequests, int errorCount, long durationMs,
                               double throughput, double avgLatencyMs, int concurrency, int payloadSize, int responseSize) {
            this.protocol = protocol;
            this.totalRequests = totalRequests;
            this.errorCount = errorCount;
            this.durationMs = durationMs;
            this.throughput = throughput;
            this.avgLatencyMs = avgLatencyMs;
            this.concurrency = concurrency;
            this.payloadSize = payloadSize;
            this.responseSize = responseSize;
        }

        // Getters
        public String getProtocol() { return protocol; }
        public int getTotalRequests() { return totalRequests; }
        public int getErrorCount() { return errorCount; }
        public long getDurationMs() { return durationMs; }
        public double getThroughput() { return throughput; }
        public double getAvgLatencyMs() { return avgLatencyMs; }
        public int getConcurrency() { return concurrency; }
        public int getPayloadSize() { return payloadSize; }
        public int getResponseSize() { return responseSize; }
        public double getSuccessRate() { return (double) (totalRequests - errorCount) / totalRequests * 100; }

        @Override
        public String toString() {
            return String.format("%s: %.2f req/s, %.2fms avg latency, %.1f%% success (%d/%d requests)", 
                protocol, throughput, avgLatencyMs, getSuccessRate(), totalRequests - errorCount, totalRequests);
        }
    }
}
