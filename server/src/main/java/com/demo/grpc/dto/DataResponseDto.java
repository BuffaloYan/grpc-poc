package com.demo.grpc.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public class DataResponseDto {
    
    private String id;
    private Long timestamp;
    private byte[] payload;
    private Integer statusCode;
    private String message;
    private Map<String, String> metadata;
    private Long processingTimeNs;

    public DataResponseDto() {}

    public DataResponseDto(String id, Long timestamp, byte[] payload, 
                          Integer statusCode, String message, 
                          Map<String, String> metadata, Long processingTimeNs) {
        this.id = id;
        this.timestamp = timestamp;
        this.payload = payload;
        this.statusCode = statusCode;
        this.message = message;
        this.metadata = metadata;
        this.processingTimeNs = processingTimeNs;
    }

    @JsonProperty("id")
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    @JsonProperty("timestamp")
    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    @JsonProperty("payload")
    public byte[] getPayload() {
        return payload;
    }

    public void setPayload(byte[] payload) {
        this.payload = payload;
    }

    @JsonProperty("statusCode")
    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    @JsonProperty("message")
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @JsonProperty("metadata")
    public Map<String, String> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    @JsonProperty("processingTimeNs")
    public Long getProcessingTimeNs() {
        return processingTimeNs;
    }

    public void setProcessingTimeNs(Long processingTimeNs) {
        this.processingTimeNs = processingTimeNs;
    }
}