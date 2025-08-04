package com.demo.grpc.service;

import com.demo.grpc.dto.DataRequestDto;
import com.demo.grpc.dto.DataResponseDto;
import com.demo.grpc.generated.PerformanceTestServiceGrpc;
import com.demo.grpc.generated.DataRequest;
import com.demo.grpc.generated.DataResponse;
import com.google.protobuf.ByteString;
import io.grpc.stub.StreamObserver;
import org.lognet.springboot.grpc.GRpcService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.HashMap;
import java.util.Map;

@GRpcService
public class GrpcPerformanceTestService extends PerformanceTestServiceGrpc.PerformanceTestServiceImplBase {
    
    @Autowired
    private DataProcessingService dataProcessingService;
    
    @Override
    public void processData(DataRequest request, StreamObserver<DataResponse> responseObserver) {
        try {
            // Convert gRPC request to DTO
            DataRequestDto requestDto = convertToDto(request);
            
            // Process the request
            DataResponseDto responseDto = dataProcessingService.processData(requestDto, 0);
            
            // Add protocol metadata
            responseDto.getMetadata().put("protocol", "grpc");
            
            // Convert DTO to gRPC response
            DataResponse response = convertToGrpcResponse(responseDto);
            
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
                    // Convert gRPC request to DTO
                    DataRequestDto requestDto = convertToDto(request);
                    
                    // Process the request
                    DataResponseDto responseDto = dataProcessingService.processData(requestDto, 0);
                    
                    // Add protocol metadata
                    responseDto.getMetadata().put("protocol", "grpc-stream");
                    
                    // Convert DTO to gRPC response
                    DataResponse response = convertToGrpcResponse(responseDto);
                    
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
    
    private DataRequestDto convertToDto(DataRequest request) {
        Map<String, String> metadata = new HashMap<>(request.getMetadataMap());
        
        return new DataRequestDto(
            request.getId(),
            request.getTimestamp(),
            request.getPayload().toByteArray(),
            metadata
        );
    }
    
    private DataResponse convertToGrpcResponse(DataResponseDto dto) {
        DataResponse.Builder builder = DataResponse.newBuilder()
            .setId(dto.getId())
            .setTimestamp(dto.getTimestamp())
            .setPayload(ByteString.copyFrom(dto.getPayload()))
            .setStatusCode(dto.getStatusCode())
            .setMessage(dto.getMessage())
            .setProcessingTimeNs(dto.getProcessingTimeNs());
            
        if (dto.getMetadata() != null) {
            builder.putAllMetadata(dto.getMetadata());
        }
        
        return builder.build();
    }
}