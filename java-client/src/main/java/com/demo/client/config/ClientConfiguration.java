package com.demo.client.config;

import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class ClientConfiguration {

    @Value("${connection.pool.max-total:200}")
    private int maxTotal;

    @Value("${connection.pool.max-per-route:50}")
    private int maxPerRoute;

    @Value("${connection.pool.connection-timeout-ms:5000}")
    private int connectionTimeoutMs;

    @Value("${connection.pool.socket-timeout-ms:30000}")
    private int socketTimeoutMs;

    @Bean
    public CloseableHttpClient httpClient() {
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(maxTotal);
        connectionManager.setDefaultMaxPerRoute(maxPerRoute);

        return HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(
                        org.apache.hc.client5.http.config.RequestConfig.custom()
                                .setConnectionRequestTimeout(Timeout.ofMilliseconds(connectionTimeoutMs))
                                .setResponseTimeout(Timeout.ofMilliseconds(socketTimeoutMs))
                                .build()
                )
                .build();
    }

    @Bean
    public ExecutorService executorService() {
        return Executors.newCachedThreadPool();
    }
}
