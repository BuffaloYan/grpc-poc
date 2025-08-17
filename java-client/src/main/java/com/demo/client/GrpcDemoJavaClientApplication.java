package com.demo.client;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class GrpcDemoJavaClientApplication {

    public static void main(String[] args) {
        SpringApplication.run(GrpcDemoJavaClientApplication.class, args);
    }
}
