package com.demo.grpc.service;

import com.demo.grpc.dto.DataRequestDto;
import com.demo.grpc.dto.DataResponseDto;
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
        byte[] responsePayload = generatePayload(responseSize > 0 ? responseSize : defaultResponseSize);
        
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