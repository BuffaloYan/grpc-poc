package com.demo.grpc.config;

import org.lognet.springboot.grpc.GRpcServerBuilderConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.grpc.ServerBuilder;

@Configuration
public class GrpcConfig {

    /**
     * Configure gRPC server with custom settings
     */
    @Bean
    public GRpcServerBuilderConfigurer grpcServerBuilderConfigurer() {
        return new GRpcServerBuilderConfigurer() {
            @Override
            public void configure(ServerBuilder<?> serverBuilder) {
                serverBuilder
                    .maxInboundMessageSize(200 * 1024 * 1024) // 200MB
                    .maxInboundMetadataSize(16 * 1024 * 1024) // 16MB
                    .keepAliveTime(60, java.util.concurrent.TimeUnit.SECONDS)
                    .keepAliveTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                    .permitKeepAliveWithoutCalls(true)
                    .permitKeepAliveTime(30, java.util.concurrent.TimeUnit.SECONDS)
                    .maxConnectionIdle(300, java.util.concurrent.TimeUnit.SECONDS)
                    .maxConnectionAge(600, java.util.concurrent.TimeUnit.SECONDS)
                    .maxConnectionAgeGrace(60, java.util.concurrent.TimeUnit.SECONDS);
            }
        };
    }
}