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
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;
import io.netty.channel.ChannelOption;
import reactor.netty.http.client.HttpClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import java.time.Duration;


// Strategy Interface
interface HttpClientStrategy {
    HttpDataResponse processData(String id, byte[] payload, int expectedResponseSize);
    GrpcClientService.PerformanceResult performanceTest(int concurrency, int totalRequests, int payloadSize, int responseSize);
    
    // Reactive methods (default implementations for backward compatibility)
    default Mono<HttpDataResponse> processDataReactive(String id, byte[] payload, int expectedResponseSize) {
        return Mono.fromCallable(() -> processData(id, payload, expectedResponseSize));
    }
    
    default Mono<GrpcClientService.PerformanceResult> performanceTestReactive(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        return Mono.fromCallable(() -> performanceTest(concurrency, totalRequests, payloadSize, responseSize));
    }
}

@Service
public class HttpClientService {

    private static final Logger logger = LoggerFactory.getLogger(HttpClientService.class);

    @Value("${target.http.base-url}")
    private String baseUrl;

    private volatile String currentStrategy = "blocking";
    private final CloseableHttpClient httpClient;
    private final MeterRegistry meterRegistry;
    private final Map<String, HttpClientStrategy> strategies = new ConcurrentHashMap<>();

    public HttpClientService(CloseableHttpClient httpClient, MeterRegistry meterRegistry, Environment environment) {
        this.httpClient = httpClient;
        this.meterRegistry = meterRegistry;
        
        // Get initial strategy from environment or default to blocking
        String initialStrategy = environment.getProperty("HTTP_CLIENT_STRATEGY", "blocking");
        logger.info("Initializing HttpClientService with initial strategy: {}", initialStrategy);
        
        // Initialize all strategies
        initializeStrategies();
        
        // Set current strategy
        setStrategy(initialStrategy);
    }

    private void initializeStrategies() {
        strategies.put("blocking", new BlockingHttpClientStrategy(httpClient, meterRegistry));
        strategies.put("reactive", new ReactiveHttpClientStrategy(baseUrl, meterRegistry));
        logger.info("Initialized all HTTP client strategies: {}", strategies.keySet());
    }

    public void setStrategy(String strategy) {
        if (!strategies.containsKey(strategy)) {
            throw new IllegalArgumentException("Unknown strategy: " + strategy + ". Available: " + strategies.keySet());
        }
        this.currentStrategy = strategy;
        logger.info("Switched HTTP client strategy to: {}", strategy);
    }

    public String getCurrentStrategy() {
        return currentStrategy;
    }

    public Set<String> getAvailableStrategies() {
        return strategies.keySet();
    }

    private HttpClientStrategy getStrategy() {
        return strategies.get(currentStrategy);
    }

    public HttpDataResponse processData(String id, byte[] payload, int expectedResponseSize) {
        return getStrategy().processData(id, payload, expectedResponseSize);
    }

    public GrpcClientService.PerformanceResult performanceTest(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        return getStrategy().performanceTest(concurrency, totalRequests, payloadSize, responseSize);
    }

}

// Blocking Strategy Implementation
class BlockingHttpClientStrategy implements HttpClientStrategy {
    private static final Logger logger = LoggerFactory.getLogger(BlockingHttpClientStrategy.class);

    private final CloseableHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Timer httpRequestTimer;
    private final Counter httpRequestCounter;
    private final Counter httpErrorCounter;

    public BlockingHttpClientStrategy(CloseableHttpClient httpClient, MeterRegistry meterRegistry) {
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
        logger.info("BlockingHttpClientStrategy initialized with support for large payloads");
        this.httpRequestTimer = Timer.builder("http_client_blocking_requests")
                .description("Blocking HTTP client request latency")
                .register(meterRegistry);
        this.httpRequestCounter = Counter.builder("http_client_blocking_requests_total")
                .description("Total blocking HTTP client requests")
                .register(meterRegistry);
        this.httpErrorCounter = Counter.builder("http_client_blocking_errors_total")
                .description("Total blocking HTTP client errors")
                .register(meterRegistry);
    }

    @Override
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
            String url = "http://grpc-server:8080/api/v1/performance/process-base64";
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
            logger.error("HTTP blocking request failed for id: {}", id, e);
            throw new RuntimeException("HTTP request failed", e);
        }
    }

    @Override
    public GrpcClientService.PerformanceResult performanceTest(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        logger.info("Starting Blocking HTTP performance test: concurrency={}, requests={}, payloadSize={}, responseSize={}",
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
                    logger.debug("HTTP blocking request failed for perf-test-{}: {}", requestId, e.getMessage());
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
            "HTTP-Blocking",
            totalRequests,
            (int) errorCount.get(),
            totalDurationMs,
            throughput,
            avgLatencyMs,
            concurrency,
            payloadSize,
            responseSize
        );

        logger.info("Blocking HTTP performance test completed: {}", result);
        return result;
    }
}

// TRUE Reactive Strategy Implementation using WebClient
class ReactiveHttpClientStrategy implements HttpClientStrategy {
    private static final Logger logger = LoggerFactory.getLogger(ReactiveHttpClientStrategy.class);

    private final WebClient webClient;
    private final Timer httpRequestTimer;
    private final Counter httpRequestCounter;
    private final Counter httpErrorCounter;

    public ReactiveHttpClientStrategy(String baseUrl, MeterRegistry meterRegistry) {
        logger.info("Initializing TRUE ReactiveHttpClientStrategy with baseUrl: {}", baseUrl);

        // Configure HttpClient with increased buffer sizes for large payloads
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.SO_RCVBUF, 20 * 1024 * 1024) // 20MB receive buffer
                .option(ChannelOption.SO_SNDBUF, 20 * 1024 * 1024) // 20MB send buffer
                .responseTimeout(Duration.ofMinutes(10)) // 10 minute timeout for large responses
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 30000); // 30 second connect timeout

        this.webClient = WebClient.builder()
                .baseUrl("http://grpc-server:8080") // Explicitly set the base URL
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer
                    .defaultCodecs()
                    .maxInMemorySize(100 * 1024 * 1024)) // 100MB max in-memory buffer
                .build();
        
        logger.info("TRUE ReactiveHttpClientStrategy initialized - NO BLOCKING CALLS!");
        this.httpRequestTimer = Timer.builder("http_client_reactive_requests")
                .description("Reactive HTTP client request latency")
                .register(meterRegistry);
        this.httpRequestCounter = Counter.builder("http_client_reactive_requests_total")
                .description("Total reactive HTTP client requests")
                .register(meterRegistry);
        this.httpErrorCounter = Counter.builder("http_client_reactive_errors_total")
                .description("Total reactive HTTP client errors")
                .register(meterRegistry);
    }

    // BLOCKING method for backward compatibility
    @Override
    public HttpDataResponse processData(String id, byte[] payload, int expectedResponseSize) {
        // For backward compatibility, we still need to block here
        return processDataReactive(id, payload, expectedResponseSize).block();
    }

    // TRUE REACTIVE method - No blocking!
    @Override
    public Mono<HttpDataResponse> processDataReactive(String id, byte[] payload, int expectedResponseSize) {
        return Mono.fromCallable(() -> {
            httpRequestCounter.increment();
            
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
            return request;
        })
        .flatMap(request -> {
            // Build URL
            String url = "/api/v1/performance/process-base64";
            if (expectedResponseSize > 0) {
                url += "?responseSize=" + expectedResponseSize + "&lite=false";
            }

            logger.debug("TRUE Reactive HTTP request to: {} with payload size: {}", url, payload.length);

            // TRUE REACTIVE - NO .block() calls!
            return webClient.post()
                    .uri(url)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(HttpDataResponse.class)
                    .doOnSuccess(response -> logger.debug("Reactive request completed for id: {}", id))
                    .doOnError(error -> {
                        httpErrorCounter.increment();
                        logger.error("Reactive request failed for id: {}", id, error);
                    });
        });
    }

    // OLD BLOCKING performance test (for backward compatibility)
    @Override
    public GrpcClientService.PerformanceResult performanceTest(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        // For backward compatibility, block the reactive version
        return performanceTestReactive(concurrency, totalRequests, payloadSize, responseSize).block();
    }

    // TRUE REACTIVE performance test - The magic happens here!
    @Override
    public Mono<GrpcClientService.PerformanceResult> performanceTestReactive(int concurrency, int totalRequests, int payloadSize, int responseSize) {
        logger.info("Starting TRUE REACTIVE HTTP performance test: concurrency={}, requests={}, payloadSize={}, responseSize={}",
                   concurrency, totalRequests, payloadSize, responseSize);

        byte[] payload = new byte[payloadSize];
        for (int i = 0; i < payloadSize; i++) {
            payload[i] = (byte) (i % 256);
        }

        long startTime = System.nanoTime();

        // TRUE REACTIVE MAGIC - No thread pools, no blocking!
        return Flux.range(0, totalRequests)
                .flatMap(i -> 
                    processDataReactive("perf-test-" + i, payload, responseSize)
                        .elapsed() // Capture timing
                        .onErrorResume(error -> {
                            logger.debug("Reactive request failed for perf-test-{}: {}", i, error.getMessage());
                            return Mono.just(reactor.util.function.Tuples.of(0L, (HttpDataResponse) null));
                        }),
                    concurrency) // Control concurrency reactively!
                .collectList()
                .map(results -> {
                    long endTime = System.nanoTime();
                    long totalDurationMs = (endTime - startTime) / 1_000_000;
                    
                    // Calculate metrics
                    long totalLatencyNs = results.stream()
                            .filter(result -> result.getT2() != null)
                            .mapToLong(result -> result.getT1() * 1_000_000) // Convert ms to ns
                            .sum();
                    
                    int successfulRequests = (int) results.stream()
                            .filter(result -> result.getT2() != null)
                            .count();
                    
                    int errorCount = totalRequests - successfulRequests;
                    double throughput = (double) totalRequests / totalDurationMs * 1000; // requests per second
                    double avgLatencyMs = successfulRequests > 0 ? (double) totalLatencyNs / successfulRequests / 1_000_000 : 0.0;

                    GrpcClientService.PerformanceResult result = new GrpcClientService.PerformanceResult(
                        "HTTP-TrueReactive",
                        totalRequests,
                        errorCount,
                        totalDurationMs,
                        throughput,
                        avgLatencyMs,
                        concurrency,
                        payloadSize,
                        responseSize
                    );

                    logger.info("TRUE REACTIVE HTTP performance test completed: {}", result);
                    return result;
                });
    }
}
