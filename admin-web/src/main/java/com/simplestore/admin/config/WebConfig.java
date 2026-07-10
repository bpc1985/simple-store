package com.simplestore.admin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class WebConfig {

    @Value("${gateway.url}")
    private String gatewayUrl;

    @Bean
    public RestClient restClient(GatewayAuthInterceptor authInterceptor) {
        return RestClient.builder()
                .baseUrl(gatewayUrl)
                .requestInterceptor(authInterceptor)
                .build();
    }
}
