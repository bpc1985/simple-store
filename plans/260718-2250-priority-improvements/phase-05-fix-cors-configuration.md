---
phase: 5
title: "Fix CORS Configuration"
status: pending
priority: P1
dependencies: []
effort: "15m"
---

# Phase 5: Fix CORS Configuration

## Overview

Gateway has two overlapping CORS configs, both setting `allowCredentials(true)` with wildcard origin `*` — explicitly disallowed by the CORS spec. Browsers reject all credentialed cross-origin requests. Fix: remove duplicate, use explicit origin patterns.

## Requirements

- Functional: CORS preflight succeeds for frontend origins (localhost:9090, localhost:9091)
- Non-functional: No wildcard origin when credentials are enabled

## Related Code Files

- **Modify**: `gateway/src/main/java/com/simplestore/gateway/config/SecurityConfig.java` — lines 37-41
- **Modify**: `gateway/src/main/resources/application.yml` — `spring.cloud.gateway.globalcors` section

## Implementation Steps

1. Keep the programmatic filter in `SecurityConfig.java` (more control); remove the YAML `globalcors` section
2. Replace wildcard with explicit allowed origin patterns:
   ```java
   config.setAllowedOriginPatterns(List.of(
       "http://localhost:9090",
       "http://localhost:9091",
       "http://localhost:3000"     // common dev port
   ));
   ```
3. Optionally make origins configurable via env:
   ```java
   @Value("${app.cors.allowed-origins:http://localhost:9090,http://localhost:9091}")
   private List<String> allowedOrigins;
   ```
4. Keep `allowedMethods: "*"`, `allowedHeaders: "*"`, `allowCredentials: true` — those are fine with explicit origins
5. Verify with curl:
   ```bash
   curl -X OPTIONS http://localhost:8080/api/v1/catalog/products \
     -H "Origin: http://localhost:9090" \
     -H "Access-Control-Request-Method: GET" \
     -v
   ```
   Expected: `Access-Control-Allow-Origin: http://localhost:9090`, `Access-Control-Allow-Credentials: true`

## Success Criteria

- [ ] Only one CORS config in gateway (programmatic filter)
- [ ] Wildcard origin removed
- [ ] `Access-Control-Allow-Credentials: true` with explicit origin in response
- [ ] OPTIONS preflight returns 200
- [ ] Frontend apps can make authenticated requests without CORS errors

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Hardcoded origins break new frontend deploys | Make origins configurable via env `APP_CORS_ALLOWED_ORIGINS` |
| Forgot development/production origins | Add `http://localhost:*` for local dev; tighten in production |
