package com.simplestore.gateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Re-attaches the JWT Bearer token from the gateway's authenticated
 * security context to downstream requests. Without this filter,
 * Spring Security's oauth2ResourceServer strips the Authorization
 * header after authenticating, so backend services never see it.
 */
@Component
public class JwtRelayFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> {
                    if (ctx.getAuthentication() instanceof JwtAuthenticationToken jwtAuth) {
                        String tokenValue = jwtAuth.getToken().getTokenValue();
                        ServerHttpRequest request = exchange.getRequest().mutate()
                                .header("Authorization", "Bearer " + tokenValue)
                                .build();
                        return exchange.mutate().request(request).build();
                    }
                    return exchange;
                })
                .defaultIfEmpty(exchange)
                .flatMap(chain::filter);
    }

    @Override
    public int getOrder() {
        // Run after Spring Security authentication (-100) but before route forwarding
        return Ordered.LOWEST_PRECEDENCE;
    }
}
