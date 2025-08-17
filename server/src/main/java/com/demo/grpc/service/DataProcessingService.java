package com.demo.grpc.service;

import com.demo.grpc.dto.DataRequestDto;
import com.demo.grpc.dto.DataResponseDto;
import com.demo.grpc.generated.DataRequest;
import com.demo.grpc.generated.DataResponse;
import com.google.protobuf.ByteString;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class DataProcessingService {
    
    private final SecureRandom random = new SecureRandom();
    
    @Value("${app.performance.default-response-size:10485760}")
    private int defaultResponseSize;
    
    @Value("${app.performance.max-response-size:104857600}")
    private int maxResponseSize;

    /**
     * Process a single data request and generate response with configurable payload size
     */
    public DataResponseDto processData(DataRequestDto request, int responseSize) {
        long startTime = System.nanoTime();
        
        // Simulate some processing time (1-10ms)
        try {
            Thread.sleep(ThreadLocalRandom.current().nextInt(1, 11));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Generate response payload
        int targetSize = responseSize > 0 ? responseSize : defaultResponseSize;
        byte[] responsePayload;
        boolean isJsonMode = request.getMetadata() != null && "application/json".equalsIgnoreCase(request.getMetadata().getOrDefault("contentType", ""));
        if (isJsonMode) {
            responsePayload = generateJsonPayload(targetSize, request);
        } else {
            responsePayload = generatePayload(targetSize);
        }
        
        // Create metadata
        Map<String, String> responseMetadata = new HashMap<>();
        responseMetadata.put("server", "grpc-demo-server");
        responseMetadata.put("version", "1.0.0");
        responseMetadata.put("protocol", "unknown"); // Will be set by calling service
        responseMetadata.put("request_size", String.valueOf(request.getPayload() != null ? request.getPayload().length : 0));
        responseMetadata.put("response_size", String.valueOf(responsePayload.length));
        
        if (request.getMetadata() != null) {
            responseMetadata.putAll(request.getMetadata());
        }
        
        long processingTime = System.nanoTime() - startTime;
        
        return new DataResponseDto(
            request.getId(),
            System.currentTimeMillis(),
            responsePayload,
            200,
            "Success",
            responseMetadata,
            processingTime
        );
    }

    /**
     * Process protobuf request directly to avoid DTO copies.
     */
    public DataResponse processDataProto(DataRequest request, int responseSize) {
        long startTime = System.nanoTime();

        try {
            Thread.sleep(ThreadLocalRandom.current().nextInt(1, 11));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Determine response mode
        int targetSize = responseSize > 0 ? responseSize : defaultResponseSize;
        boolean isJsonMode = request.getMetadataMap().containsKey("contentType")
            && "application/json".equalsIgnoreCase(request.getMetadataMap().get("contentType"));

        byte[] responsePayloadBytes = isJsonMode
            ? generateJsonPayload(targetSize, new DataRequestDto(request.getId(), request.getTimestamp(), new byte[0], new java.util.HashMap<>(request.getMetadataMap())))
            : generatePayload(targetSize);

        long processingTime = System.nanoTime() - startTime;

        DataResponse.Builder builder = DataResponse.newBuilder()
            .setId(request.getId())
            .setTimestamp(System.currentTimeMillis())
            .setPayload(ByteString.copyFrom(responsePayloadBytes))
            .setStatusCode(200)
            .setMessage("Success")
            .setProcessingTimeNs(processingTime);

        // Metadata
        java.util.Map<String, String> responseMetadata = new java.util.HashMap<>();
        responseMetadata.put("server", "grpc-demo-server");
        responseMetadata.put("version", "1.0.0");
        responseMetadata.put("protocol", "unknown");
        responseMetadata.put("request_size", String.valueOf(request.getPayload().size()))
        ;
        responseMetadata.put("response_size", String.valueOf(responsePayloadBytes.length));
        responseMetadata.putAll(request.getMetadataMap());
        builder.putAllMetadata(responseMetadata);

        return builder.build();
    }
    
    /**
     * Generate random payload of specified size
     */
    private byte[] generatePayload(int size) {
        // Ensure size doesn't exceed maximum
        int actualSize = Math.min(size, maxResponseSize);
        byte[] payload = new byte[actualSize];
        
        // Fill with pattern data for better compression testing
        for (int i = 0; i < actualSize; i++) {
            if (i % 1000 == 0) {
                // Add some randomness every 1000 bytes
                payload[i] = (byte) random.nextInt(256);
            } else {
                // Use pattern data
                payload[i] = (byte) (i % 256);
            }
        }
        
        return payload;
    }

    /**
     * Generate JSON response as UTF-8 bytes approximately of the requested size.
     */
    private byte[] generateJsonPayload(int size, DataRequestDto request) {
        int actualSize = Math.min(size, maxResponseSize);

        Map<String, Object> json = new HashMap<>();
        json.put("id", request.getId());
        json.put("timestamp", System.currentTimeMillis());
        json.put("status", 200);
        json.put("message", "Success");

        Map<String, Object> user = new HashMap<>();
        user.put("userId", "u-" + Math.abs(random.nextInt()));
        user.put("name", "Jane Doe");
        user.put("email", "jane.doe@example.com");
        user.put("roles", new String[]{"admin", "editor", "observer"});
        json.put("user", user);

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("cpu", random.nextDouble());
        metrics.put("mem", random.nextDouble());
        metrics.put("latencyMs", ThreadLocalRandom.current().nextInt(1, 20));
        json.put("metrics", metrics);

        // Items array with nested objects
        int itemsCount = 10;
        java.util.List<Map<String, Object>> items = new java.util.ArrayList<>(itemsCount);
        for (int i = 0; i < itemsCount; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("index", i);
            item.put("title", "Item " + i);
            item.put("active", (i % 2 == 0));
            item.put("value", random.nextInt(100000));
            items.add(item);
        }
        json.put("items", items);

        // First pass serialization
        String base = toJsonString(json);
        int baseLen = base.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
        if (baseLen >= actualSize) {
            // Truncate if necessary
            byte[] bytes = base.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (bytes.length > actualSize) {
                byte[] out = new byte[actualSize];
                System.arraycopy(bytes, 0, out, 0, actualSize);
                return out;
            }
            return bytes;
        }

        // Add padding string to reach target size approximately
        int paddingLen = actualSize - baseLen - 20; // leave some room for quotes and field name
        if (paddingLen < 0) paddingLen = 0;
        StringBuilder padding = new StringBuilder(paddingLen);
        for (int i = 0; i < paddingLen; i++) padding.append('X');
        json.put("padding", padding.toString());

        String withPadding = toJsonString(json);
        byte[] bytes = withPadding.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (bytes.length > actualSize) {
            byte[] out = new byte[actualSize];
            System.arraycopy(bytes, 0, out, 0, actualSize);
            return out;
        }
        return bytes;
    }

    private String toJsonString(Map<String, Object> map) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(map);
        } catch (Exception e) {
            // Fallback trivial JSON
            return "{}";
        }
    }
    
    /**
     * Get default response size
     */
    public int getDefaultResponseSize() {
        return defaultResponseSize;
    }
    
    /**
     * Get maximum allowed response size
     */
    public int getMaxResponseSize() {
        return maxResponseSize;
    }
}