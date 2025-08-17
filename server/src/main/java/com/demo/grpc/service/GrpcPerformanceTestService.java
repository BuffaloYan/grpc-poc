package com.demo.grpc.service;

import com.demo.grpc.generated.PerformanceTestServiceGrpc;
import com.demo.grpc.generated.DataRequest;
import com.demo.grpc.generated.DataResponse;
import com.google.protobuf.ByteString;
import io.grpc.stub.StreamObserver;
import org.lognet.springboot.grpc.GRpcService;
import org.springframework.beans.factory.annotation.Autowired;


@GRpcService
public class GrpcPerformanceTestService extends PerformanceTestServiceGrpc.PerformanceTestServiceImplBase {
    
    @Autowired
    private DataProcessingService dataProcessingService;
    
    @Override
    public void processData(DataRequest request, StreamObserver<DataResponse> responseObserver) {
        try {
            // Determine desired response size from metadata if provided
            int responseSize = 0;
            if (request.getMetadataMap().containsKey("expectedResponseSize")) {
                try {
                    responseSize = Integer.parseInt(request.getMetadataMap().get("expectedResponseSize"));
                } catch (NumberFormatException ignored) { }
            }
            
            // Process directly with protobuf to avoid copies
            DataResponse response = dataProcessingService.processDataProto(request, responseSize);
            
            // Optionally omit payload for fairness with HTTP lite mode
            if (request.getMetadataMap().containsKey("omitPayload") &&
                "true".equalsIgnoreCase(request.getMetadataMap().get("omitPayload"))) {
                response = response.toBuilder().setPayload(ByteString.EMPTY).putMetadata("payload_omitted", "true").build();
            }
            
            // Add protocol metadata
            response = response.toBuilder().putMetadata("protocol", "grpc").build();
            
            // Send response
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }
    
    @Override
    public StreamObserver<DataRequest> processDataStream(StreamObserver<DataResponse> responseObserver) {
        return new StreamObserver<DataRequest>() {
            @Override
            public void onNext(DataRequest request) {
                try {
                    // Determine desired response size from metadata if provided
                    int responseSize = 0;
                    if (request.getMetadataMap().containsKey("expectedResponseSize")) {
                        try {
                            responseSize = Integer.parseInt(request.getMetadataMap().get("expectedResponseSize"));
                        } catch (NumberFormatException ignored) { }
                    }
                    
                    // Process directly with protobuf to avoid copies
                    DataResponse response = dataProcessingService.processDataProto(request, responseSize);
                    
                    // Optionally omit payload for fairness with HTTP lite mode
                    if (request.getMetadataMap().containsKey("omitPayload") &&
                        "true".equalsIgnoreCase(request.getMetadataMap().get("omitPayload"))) {
                        response = response.toBuilder().setPayload(ByteString.EMPTY).putMetadata("payload_omitted", "true").build();
                    }
                    
                    // Add protocol metadata
                    response = response.toBuilder().putMetadata("protocol", "grpc-stream").build();
                    
                    // Send response
                    responseObserver.onNext(response);
                    
                } catch (Exception e) {
                    responseObserver.onError(e);
                }
            }
            
            @Override
            public void onError(Throwable t) {
                responseObserver.onError(t);
            }
            
            @Override
            public void onCompleted() {
                responseObserver.onCompleted();
            }
        };
    }
    
    // DTO converters removed to reduce copying
}