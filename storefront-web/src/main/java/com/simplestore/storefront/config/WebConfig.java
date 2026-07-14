package com.simplestore.storefront.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthStatusInterceptor authStatusInterceptor;

    public WebConfig(AuthStatusInterceptor authStatusInterceptor) {
        this.authStatusInterceptor = authStatusInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authStatusInterceptor);
    }

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
