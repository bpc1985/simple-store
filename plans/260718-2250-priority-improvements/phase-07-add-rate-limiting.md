---
phase: 7
title: "Add Rate Limiting"
status: pending
priority: P1
dependencies: []
effort: "1h"
---

# Phase 7: Add Rate Limiting

## Overview

No rate limiting exists anywhere — login, register, and all API endpoints accept unlimited requests. Add Redis-backed rate limiting to auth endpoints (login, register, token refresh) at the gateway level.

## Requirements

- Functional: Login endpoint limited to 5 req/min per IP; register limited to 3 req/min per IP
- Non-functional: Redis-backed storage survives gateway restart; configurable thresholds via env

## Architecture Decision

Use a Spring Cloud Gateway `RequestRateLimiter` filter with Redis backend. Gateway is the single entry point — rate limiting at the gateway protects all backends from brute-force attacks. Redis ensures rate limit state persists across gateway restarts.

## Related Code Files

- **Modify**: `gateway/pom.xml` — add spring-boot-starter-data-redis-reactive dependency
- **Create**: `gateway/src/main/java/com/simplestore/gateway/config/RateLimiterConfig.java` — KeyResolver + RedisRateLimiter bean
- **Modify**: `gateway/src/main/resources/application.yml` — add Redis connection + rate limit filter on auth routes

## Implementation Steps

1. Add Redis reactive dependency to gateway `pom.xml`:
   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
   </dependency>
   ```

2. Create `RateLimiterConfig.java`:
   ```java
   @Configuration
   public class RateLimiterConfig {
       @Bean
       public KeyResolver ipKeyResolver() {
           return exchange -> Mono.just(
               exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
           );
       }
   }
   ```

3. Configure in gateway `application.yml`:
   ```yaml
   spring:
     data:
       redis:
         host: ${REDIS_HOST:localhost}
         port: ${REDIS_PORT:6379}
     cloud:
       gateway:
         routes:
           - id: identity-auth
             uri: http://identity-service:8080
             predicates:
               - Path=/api/v1/identity/register,/api/v1/identity/login,/api/v1/identity/refresh
             filters:
               - name: RequestRateLimiter
                 args:
                   redis-rate-limiter.replenishRate: 5
                   redis-rate-limiter.burstCapacity: 10
                   redis-rate-limiter.requestedTokens: 1
                   key-resolver: "#{@ipKeyResolver}"
   ```

   Separate routes for login (higher burst) vs register (lower):
   ```yaml
           - id: identity-register
             uri: http://identity-service:8080
             predicates:
               - Path=/api/v1/identity/register
             filters:
               - name: RequestRateLimiter
                 args:
                   redis-rate-limiter.replenishRate: 3
                   redis-rate-limiter.burstCapacity: 5
                   key-resolver: "#{@ipKeyResolver}"
   ```

4. Add `X-RateLimit-Remaining` and `X-RateLimit-Retry-After-Seconds` headers (built into Spring Cloud Gateway's RequestRateLimiter)

## Success Criteria

- [ ] Login endpoint rate-limited to 5 req/min replenish, 10 burst
- [ ] Register endpoint rate-limited to 3 req/min replenish, 5 burst
- [ ] `429 Too Many Requests` returned on exceeding limit with retry-after headers
- [ ] Redis connection configured in gateway `application.yml`
- [ ] Rate limits survive gateway restart (persisted in Redis)
- [ ] `mvn -pl gateway -am clean install -DskipTests` passes

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Redis unavailable — rate limiter fails closed | Configure fallback: if Redis down, skip rate limiting (fail-open for dev) or use in-memory fallback |
| IP-based limiting breaks behind proxy/load balancer | Use `X-Forwarded-For` header in `KeyResolver` if behind proxy |
| Adding Redis dependency to gateway | Gateway already connects to Redis indirectly via cart-service; minimal overhead |
