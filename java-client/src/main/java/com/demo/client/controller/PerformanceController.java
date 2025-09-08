package com.demo.client.controller;

import com.demo.client.service.GrpcClientService;
import com.demo.client.service.HttpClientService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/performance")
@CrossOrigin(origins = "*")
public class PerformanceController {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceController.class);

    private final GrpcClientService grpcClientService;
    private final HttpClientService httpClientService;

    @Value("${performance.default-concurrency:10}")
    private int defaultConcurrency;

    @Value("${performance.max-concurrency:100}")
    private int maxConcurrency;

    @Value("${performance.default-payload-size:1048576}")
    private int defaultPayloadSize;

    @Value("${performance.max-payload-size:104857600}")
    private int maxPayloadSize;

    public PerformanceController(GrpcClientService grpcClientService, HttpClientService httpClientService) {
        this.grpcClientService = grpcClientService;
        this.httpClientService = httpClientService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("timestamp", System.currentTimeMillis());
        health.put("service", "grpc-demo-java-client");
        health.put("version", "1.0.0");

        // Test connectivity to both gRPC and HTTP endpoints
        Map<String, Object> connectivity = new HashMap<>();
        
        try {
            byte[] testPayload = "health-check".getBytes();
            grpcClientService.processDataBlocking("health-check", testPayload, 0);
            connectivity.put("grpc", "healthy");
        } catch (Exception e) {
            connectivity.put("grpc", "unhealthy: " + e.getMessage());
        }

        try {
            byte[] testPayload = "health-check".getBytes();
            httpClientService.processData("health-check", testPayload, 0);
            connectivity.put("http", "healthy");
        } catch (Exception e) {
            connectivity.put("http", "unhealthy: " + e.getMessage());
        }

        health.put("connectivity", connectivity);
        return ResponseEntity.ok(health);
    }

    @PostMapping("/test-grpc")
    public ResponseEntity<GrpcClientService.PerformanceResult> testGrpc(
            @RequestParam(value = "concurrency", defaultValue = "10") int concurrency,
            @RequestParam(value = "requests", defaultValue = "100") int requests,
            @RequestParam(value = "payloadSize", defaultValue = "1048576") int payloadSize,
            @RequestParam(value = "responseSize", defaultValue = "0") int responseSize) {

        // Validate parameters
        concurrency = Math.min(concurrency, maxConcurrency);
        payloadSize = Math.min(payloadSize, maxPayloadSize);
        responseSize = Math.min(responseSize, maxPayloadSize);

        logger.info("Starting gRPC performance test: concurrency={}, requests={}, payloadSize={}, responseSize={}", 
                   concurrency, requests, payloadSize, responseSize);

        GrpcClientService.PerformanceResult result = grpcClientService.performanceTest(concurrency, requests, payloadSize, responseSize);
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/test-http")
    public ResponseEntity<GrpcClientService.PerformanceResult> testHttp(
            @RequestParam(value = "concurrency", defaultValue = "10") int concurrency,
            @RequestParam(value = "requests", defaultValue = "100") int requests,
            @RequestParam(value = "payloadSize", defaultValue = "1048576") int payloadSize,
            @RequestParam(value = "responseSize", defaultValue = "0") int responseSize) {

        // Validate parameters
        concurrency = Math.min(concurrency, maxConcurrency);
        payloadSize = Math.min(payloadSize, maxPayloadSize);
        responseSize = Math.min(responseSize, maxPayloadSize);

        logger.info("Starting HTTP performance test: concurrency={}, requests={}, payloadSize={}, responseSize={}", 
                   concurrency, requests, payloadSize, responseSize);

        GrpcClientService.PerformanceResult result = httpClientService.performanceTest(concurrency, requests, payloadSize, responseSize);
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/test-comparison")
    public ResponseEntity<Map<String, Object>> testComparison(
            @RequestParam(value = "concurrency", defaultValue = "10") int concurrency,
            @RequestParam(value = "requests", defaultValue = "100") int requests,
            @RequestParam(value = "payloadSize", defaultValue = "1048576") int payloadSize,
            @RequestParam(value = "responseSize", defaultValue = "0") int responseSize) {

        // Validate parameters
        final int finalConcurrency = Math.min(concurrency, maxConcurrency);
        final int finalPayloadSize = Math.min(payloadSize, maxPayloadSize);
        final int finalResponseSize = Math.min(responseSize, maxPayloadSize);

        logger.info("Starting comparison test: concurrency={}, requests={}, payloadSize={}, responseSize={}", 
                   finalConcurrency, requests, finalPayloadSize, finalResponseSize);

        try {
            // Run gRPC test first (synchronously)
            logger.info("Starting gRPC performance test (sequential mode)...");
            GrpcClientService.PerformanceResult grpcResult = grpcClientService.performanceTest(finalConcurrency, requests, finalPayloadSize, finalResponseSize);
            logger.info("gRPC performance test completed successfully");

            // Add a small delay to ensure cleanup is complete
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.warn("Interrupted while waiting between tests", e);
            }

            // Run HTTP test after gRPC (synchronously)
            logger.info("Starting HTTP performance test (sequential mode)...");
            GrpcClientService.PerformanceResult httpResult = httpClientService.performanceTest(finalConcurrency, requests, finalPayloadSize, finalResponseSize);
            logger.info("HTTP performance test completed successfully");

            Map<String, Object> comparison = new HashMap<>();
            comparison.put("grpc", grpcResult);
            comparison.put("http", httpResult);
            
            // Calculate comparison metrics
            Map<String, Object> summary = new HashMap<>();
            summary.put("grpc_faster", grpcResult.getThroughput() > httpResult.getThroughput());
            summary.put("throughput_ratio", grpcResult.getThroughput() / httpResult.getThroughput());
            summary.put("latency_ratio", httpResult.getAvgLatencyMs() / grpcResult.getAvgLatencyMs());
            summary.put("grpc_throughput_advantage", 
                ((grpcResult.getThroughput() - httpResult.getThroughput()) / httpResult.getThroughput()) * 100);
            
            comparison.put("summary", summary);
            comparison.put("testParameters", Map.of(
                "concurrency", finalConcurrency,
                "requests", requests,
                "payloadSize", finalPayloadSize,
                "responseSize", finalResponseSize
            ));

            return ResponseEntity.ok(comparison);

        } catch (Exception e) {
            logger.error("Comparison test failed", e);
            return ResponseEntity.internalServerError().body(
                Map.of("error", "Comparison test failed: " + e.getMessage())
            );
        }
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("defaultConcurrency", defaultConcurrency);
        config.put("maxConcurrency", maxConcurrency);
        config.put("defaultPayloadSize", defaultPayloadSize);
        config.put("maxPayloadSize", maxPayloadSize);
        config.put("protocols", new String[]{"grpc", "http"});
        
        // Add HTTP client strategy info
        config.put("httpClientStrategy", httpClientService.getCurrentStrategy());
        config.put("availableHttpStrategies", httpClientService.getAvailableStrategies());
        
        return ResponseEntity.ok(config);
    }

    @GetMapping("/strategy")
    public ResponseEntity<Map<String, Object>> getCurrentStrategy() {
        Map<String, Object> response = new HashMap<>();
        response.put("currentStrategy", httpClientService.getCurrentStrategy());
        response.put("availableStrategies", httpClientService.getAvailableStrategies());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/strategy")
    public ResponseEntity<Map<String, Object>> setStrategy(@RequestBody Map<String, String> request) {
        try {
            String strategy = request.get("strategy");
            if (strategy == null || strategy.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Strategy is required");
                error.put("availableStrategies", httpClientService.getAvailableStrategies());
                return ResponseEntity.badRequest().body(error);
            }

            httpClientService.setStrategy(strategy.trim());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Strategy changed successfully");
            response.put("currentStrategy", httpClientService.getCurrentStrategy());
            response.put("availableStrategies", httpClientService.getAvailableStrategies());
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("currentStrategy", httpClientService.getCurrentStrategy());
            error.put("availableStrategies", httpClientService.getAvailableStrategies());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to change strategy: " + e.getMessage());
            error.put("currentStrategy", httpClientService.getCurrentStrategy());
            return ResponseEntity.status(500).body(error);
        }
    }
}
