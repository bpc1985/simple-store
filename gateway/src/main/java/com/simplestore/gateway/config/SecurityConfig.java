package com.simplestore.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
            .authorizeExchange(exchanges -> exchanges
                // Swagger / OpenAPI docs - public
                .pathMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .pathMatchers("/webjars/**").permitAll()
                .pathMatchers("/api/v1/*/swagger-ui.html", "/api/v1/*/swagger-ui/**").permitAll()
                .pathMatchers("/api/v1/*/api-docs", "/api/v1/*/api-docs/**").permitAll()
                // Public endpoints - no authentication required
                .pathMatchers("/api/v1/identity/register").permitAll()
                .pathMatchers("/api/v1/identity/login").permitAll()
                .pathMatchers("/api/v1/identity/refresh").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/v1/catalog/products/**").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/v1/catalog/categories/**").permitAll()
                .pathMatchers("/api/v1/cart/**").permitAll()
                // All other endpoints require authentication
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> {})
            );

        return http.build();
    }
}