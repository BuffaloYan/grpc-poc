package com.demo.client.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.http.io.support.ClassicRequestBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class HttpClientService {

    private static final Logger logger = LoggerFactory.getLogger(HttpClientService.class);

    @Value("${target.http.base-url}")
    private String baseUrl;

    private final CloseableHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Timer httpRequestTimer;
    private final Counter httpRequestCounter;
    private final Counter httpErrorCounter;

    public HttpClientService(CloseableHttpClient httpClient, MeterRegistry meterRegistry) {
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
        this.httpRequestTimer = Timer.builder("http_client_requests")
                .description("HTTP client request latency")
                .register(meterRegistry);
        this.httpRequestCounter = Counter.builder("http_client_requests_total")
                .description("Total HTTP client requests")
                .register(meterRegistry);
        this.httpErrorCounter = Counter.builder("http_client_errors_total")
                .description("Total HTTP client errors")
                .register(meterRegistry);
    }

    public HttpDataResponse processData(String id, byte[] payload, int expectedResponseSize) {
        Timer.Sample sample = Timer.start();
        httpRequestCounter.increment();

        try {
            // Create request payload
            HttpDataRequest request = new HttpDataRequest();
            request.setId(id);
            request.setTimestamp(System.currentTimeMillis());
            request.setPayload(Base64.getEncoder().encode(payload)); // Base64 encode for JSON
            
            Map<String, String> metadata = new HashMap<>();
            if (expectedResponseSize > 0) {
                metadata.put("expectedResponseSize", String.valueOf(expectedResponseSize));
            }
            request.setMetadata(metadata);

            String jsonPayload = objectMapper.writeValueAsString(request);

            // Build HTTP request
            String url = baseUrl + "/api/v1/performance/process-base64";
            if (expectedResponseSize > 0) {
                url += "?responseSize=" + expectedResponseSize + "&lite=false";
            }

            ClassicHttpRequest httpRequest = ClassicRequestBuilder.post(url)
                    .setEntity(new StringEntity(jsonPayload, ContentType.APPLICATION_JSON))
                    .build();

            // Execute request
            try (ClassicHttpResponse response = httpClient.execute(httpRequest)) {
                sample.stop(httpRequestTimer);
                
                if (response.getCode() >= 200 && response.getCode() < 300) {
                    String responseBody = new String(response.getEntity().getContent().readAllBytes());
                    return objectMapper.readValue(responseBody, HttpDataResponse.class);
                } else {
                    httpErrorCounter.increment();
                    throw new RuntimeException("HTTP request failed with status: " + response.getCode());
                }
            }

        } catch (Exception e) {
            httpErrorCounter.increment();
            logger.error("HTTP request failed for id: {}", id, e);
            throw new RuntimeException("HTTP request failed", e);
        }
    }

    public GrpcClientService.PerformanceResult performanceTest(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        logger.info("Starting HTTP performance test: concurrency={}, requests={}, payloadSize={}, responseSize={}", 
                   concurrency, totalRequests, payloadSize, responseSize);

        byte[] payload = new byte[payloadSize];
        for (int i = 0; i < payloadSize; i++) {
            payload[i] = (byte) (i % 256);
        }

        CountDownLatch latch = new CountDownLatch(totalRequests);
        AtomicLong totalLatency = new AtomicLong(0);
        AtomicLong totalServerProcessingTime = new AtomicLong(0);
        AtomicLong errorCount = new AtomicLong(0);
        long startTime = System.nanoTime();

        // Use a fixed thread pool for controlled concurrency
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);

        for (int i = 0; i < totalRequests; i++) {
            final int requestId = i;
            executor.submit(() -> {
                try {
                    long requestStart = System.nanoTime();
                    HttpDataResponse response = processData("perf-test-" + requestId, payload, responseSize);
                    long requestEnd = System.nanoTime();
                    
                    // Use total request time for latency
                    totalLatency.addAndGet(requestEnd - requestStart);
                    
                    // Also track server processing time if available
                    if (response.getProcessingTimeNs() > 0) {
                        totalServerProcessingTime.addAndGet(response.getProcessingTimeNs());
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                    logger.debug("HTTP request failed for perf-test-{}: {}", requestId, e.getMessage());
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
        int successfulRequests = totalRequests - (int) errorCount.get();
        double throughput = (double) totalRequests / totalDurationMs * 1000; // requests per second
        double avgLatencyMs = successfulRequests > 0 ? (double) totalLatency.get() / totalRequests / 1_000_000 : 0.0;

        GrpcClientService.PerformanceResult result = new GrpcClientService.PerformanceResult(
            "HTTP",
            totalRequests,
            (int) errorCount.get(),
            totalDurationMs,
            throughput,
            avgLatencyMs,
            concurrency,
            payloadSize,
            responseSize
        );

        logger.info("HTTP performance test completed: {}", result);
        return result;
    }

    // DTOs for HTTP communication
    public static class HttpDataRequest {
        private String id;
        private long timestamp;
        private byte[] payload;
        private Map<String, String> metadata;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        public byte[] getPayload() { return payload; }
        public void setPayload(byte[] payload) { this.payload = payload; }
        public Map<String, String> getMetadata() { return metadata; }
        public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
    }

    public static class HttpDataResponse {
        private String id;
        private long timestamp;
        private byte[] payload;
        private Map<String, String> metadata;
        private int statusCode;
        private String message;
        private long processingTimeNs;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        public byte[] getPayload() { return payload; }
        public void setPayload(byte[] payload) { this.payload = payload; }
        public Map<String, String> getMetadata() { return metadata; }
        public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
        public int getStatusCode() { return statusCode; }
        public void setStatusCode(int statusCode) { this.statusCode = statusCode; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public long getProcessingTimeNs() { return processingTimeNs; }
        public void setProcessingTimeNs(long processingTimeNs) { this.processingTimeNs = processingTimeNs; }
    }
}
