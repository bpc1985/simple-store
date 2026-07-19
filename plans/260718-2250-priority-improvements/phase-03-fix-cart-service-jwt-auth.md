---
phase: 3
title: "Fix cart-service JWT Auth"
status: pending
priority: P0
dependencies: []
effort: "30m"
---

# Phase 3: Fix cart-service JWT Auth

## Overview

Wire `JwtAuthConverter` into cart-service's `SecurityConfig` so role-based authorization works. Currently cart-service has no `JwtAuthenticationConverter` bean and permits all requests unauthenticated — inconsistent with every other backend service.

## Requirements

- Functional: cart-service re-validates JWT and extracts roles, matching other services' defense-in-depth pattern
- Non-functional: Cart routes remain accessible to authenticated users (not public for write operations)

## Current State

`cart-service/.../config/SecurityConfig.java`:
```java
// lines 29-44: no JwtAuthConverter injection
// line 37: .requestMatchers("/api/v1/cart/**").permitAll()
// Result: no role extraction, everything wide open
```

## Related Code Files

- **Modify**: `cart-service/src/main/java/com/simplestore/cart/config/SecurityConfig.java`
- **Reference**: `catalog-service/src/main/java/com/simplestore/catalog/config/SecurityConfig.java` (correct pattern)

## Implementation Steps

1. Inject `JwtAuthConverter` into cart-service `SecurityConfig`
2. Configure `JwtAuthenticationConverter` bean (copy from catalog-service pattern):
   ```java
   @Bean
   public JwtAuthenticationConverter jwtAuthenticationConverter() {
       JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
       converter.setJwtConverter(jwtAuthConverter);
       return converter;
   }
   ```
3. Wire into `.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))`
4. Tighten security: `GET /api/v1/cart/**` public (or authenticated — cart is already accessible via gateway which permits `cart/**`) — keep `permitAll()` for now since gateway already allows it, but add the converter so future admin cart operations work
5. Add `.anyRequest().authenticated()` below the cart matcher (already present, just verify)

## Success Criteria

- [ ] cart-service `SecurityConfig` has `JwtAuthConverter` wired
- [ ] `mvn -pl cart-service -am clean install -DskipTests` passes
- [ ] Authenticated request to `/api/v1/cart` passes JWT validation and role extraction
- [ ] JWT roles visible in `SecurityContextHolder` after request

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking anonymous cart access | Keep `permitAll()` on `/api/v1/cart/**` — the gateway already handles public access. Cart service just needs to be ready for auth |
| `JwtAuthConverter` not in classpath | Already in `common` dependency, imported by cart-service via parent POM |
