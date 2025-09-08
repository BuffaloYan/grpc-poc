package com.demo.client.service;

import java.util.Map;

public class HttpDataResponse {
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
