package com.demo.grpc.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public class DataRequestDto {
    
    @NotBlank
    private String id;
    
    @NotNull
    private Long timestamp;
    
    private byte[] payload;
    
    private Map<String, String> metadata;

    public DataRequestDto() {}

    public DataRequestDto(String id, Long timestamp, byte[] payload, Map<String, String> metadata) {
        this.id = id;
        this.timestamp = timestamp;
        this.payload = payload;
        this.metadata = metadata;
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

    @JsonProperty("metadata")
    public Map<String, String> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }
}