package com.demo.grpc.controller;

import com.demo.grpc.dto.DataRequestDto;
import com.demo.grpc.dto.DataResponseDto;
import com.demo.grpc.service.DataProcessingService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/performance")
@CrossOrigin(origins = "*") // Allow CORS for testing UI
public class PerformanceTestController {
    
    private static final Logger logger = LoggerFactory.getLogger(PerformanceTestController.class);
    
    @Autowired
    private DataProcessingService dataProcessingService;
    

    
    /**
     * Single HTTP request processing endpoint
     */
    @PostMapping("/process")
    public ResponseEntity<DataResponseDto> processData(
            @Valid @RequestBody DataRequestDto request,
            @RequestParam(value = "responseSize", required = false, defaultValue = "0") int responseSize) {
        
        // Process the request
        DataResponseDto response = dataProcessingService.processData(request, responseSize);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Batch HTTP request processing endpoint
     */
    @PostMapping("/process-batch")
    public ResponseEntity<List<DataResponseDto>> processBatch(
            @Valid @RequestBody List<DataRequestDto> requests,
            @RequestParam(value = "responseSize", required = false, defaultValue = "0") int responseSize) {
        
        List<DataResponseDto> responses = new ArrayList<>();
        
        for (DataRequestDto request : requests) {
            DataResponseDto response = dataProcessingService.processData(request, responseSize);
            responses.add(response);
        }
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Process batch data with base64 payload support
     */
    @PostMapping("/process-batch-base64")
    public ResponseEntity<List<DataResponseDto>> processBatchBase64(
            @Valid @RequestBody List<DataRequestDto> requests,
            @RequestParam(value = "responseSize", required = false, defaultValue = "0") int responseSize,
            @RequestParam(value = "lite", required = false, defaultValue = "true") boolean lite) {
        
        List<DataResponseDto> responses = new ArrayList<>();
        
        for (DataRequestDto request : requests) {
            // Handle base64 encoded payload if present
            if (request.getPayload() != null && request.getPayload().length > 0) {
                // Check if payload might be base64 encoded (first few bytes are printable ASCII)
                boolean isBase64 = true;
                for (int i = 0; i < Math.min(10, request.getPayload().length); i++) {
                    if (request.getPayload()[i] < 32 || request.getPayload()[i] > 126) {
                        isBase64 = false;
                        break;
                    }
                }
                
                if (isBase64) {
                    try {
                        String base64String = new String(request.getPayload(), "UTF-8");
                        byte[] decodedPayload = java.util.Base64.getDecoder().decode(base64String);
                        request.setPayload(decodedPayload);
                    } catch (Exception e) {
                        // If base64 decoding fails, use original payload
                        logger.warn("Failed to decode base64 payload in batch, using original");
                    }
                }
            }
            
            DataResponseDto response = dataProcessingService.processData(request, responseSize);
            if (lite) {
                response.setPayload(new byte[0]);
                response.getMetadata().put("payload_omitted", "true");
            }
            responses.add(response);
        }
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "timestamp", System.currentTimeMillis(),
            "service", "performance-test",
            "version", "1.0.0",
            "protocols", Map.of(
                "http", "enabled",
                "https", "enabled",
                "grpc", "enabled"
            )
        ));
    }
    
    /**
     * Get service configuration
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of(
            "defaultResponseSize", dataProcessingService.getDefaultResponseSize(),
            "maxResponseSize", dataProcessingService.getMaxResponseSize(),
            "protocols", List.of("http", "https", "grpc")
        ));
    }
    

    
    /**
     * Generate test data endpoint for client convenience
     */
    @PostMapping("/generate-test-data")
    public ResponseEntity<DataRequestDto> generateTestData(
            @RequestParam(value = "payloadSize", required = false, defaultValue = "1048576") int payloadSize,
            @RequestParam(value = "id", required = false, defaultValue = "test") String id) {
        
        // Generate test payload
        byte[] payload = new byte[payloadSize];
        for (int i = 0; i < payloadSize; i++) {
            payload[i] = (byte) (i % 256);
        }
        
        DataRequestDto testData = new DataRequestDto(
            id,
            System.currentTimeMillis(),
            payload,
            Map.of(
                "generated", "true",
                "size", String.valueOf(payloadSize),
                "pattern", "sequential"
            )
        );
        
        return ResponseEntity.ok(testData);
    }
    
    /**
     * Process data with base64 payload support
     */
    @PostMapping("/process-base64")
    public ResponseEntity<DataResponseDto> processDataBase64(
            @Valid @RequestBody DataRequestDto request,
            @RequestParam(value = "responseSize", required = false, defaultValue = "0") int responseSize,
            @RequestParam(value = "lite", required = false, defaultValue = "true") boolean lite) {
        
        // Handle base64 encoded payload if present
        if (request.getPayload() != null && request.getPayload().length > 0) {
            // Check if payload might be base64 encoded (first few bytes are printable ASCII)
            boolean isBase64 = true;
            for (int i = 0; i < Math.min(10, request.getPayload().length); i++) {
                if (request.getPayload()[i] < 32 || request.getPayload()[i] > 126) {
                    isBase64 = false;
                    break;
                }
            }
            
            if (isBase64) {
                try {
                    String base64String = new String(request.getPayload(), "UTF-8");
                    byte[] decodedPayload = java.util.Base64.getDecoder().decode(base64String);
                    request.setPayload(decodedPayload);
                } catch (Exception e) {
                    // If base64 decoding fails, use original payload
                    logger.warn("Failed to decode base64 payload, using original");
                }
            }
        }
        
        // Process the request
        DataResponseDto response = dataProcessingService.processData(request, responseSize);
        if (lite) {
            response.setPayload(new byte[0]);
            response.getMetadata().put("payload_omitted", "true");
        }
        
        return ResponseEntity.ok(response);
    }
}