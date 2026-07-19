---
phase: 1
title: "Fix Global Exception Handlers"
status: pending
priority: P0
dependencies: []
effort: "1-2h"
---

# Phase 1: Fix Global Exception Handlers

## Overview

Add `@RestControllerAdvice` global exception handlers to 7 services that currently throw raw exceptions to clients. Only identity-service has one today. Raw stack traces leak internals and produce 500s for domain errors (e.g., "Product not found" should be 404, not 500).

## Requirements

- Functional: All services return structured JSON errors with status, message, timestamp
- Non-functional: No stack traces in responses; consistent error format across services

## Error Format (match identity-service pattern)

```json
{
  "status": 404,
  "message": "Product not found: abc-123",
  "timestamp": "2026-07-18T22:00:00Z"
}
```

## Related Code Files

- Create: `*/src/main/java/com/simplestore/*/config/GlobalExceptionHandler.java` in each of 7 services
- Reference: `identity-service/src/main/java/com/simplestore/identity/config/GlobalExceptionHandler.java`

### Services needing handlers + their exception types

| Service | Current throw types | HTTP mapping |
|---------|--------------------|--------------|
| **catalog-service** | `RuntimeException("Product not found")`, `RuntimeException("Category not found")` | 404 for "not found", 500 for unexpected |
| **order-service** | `RuntimeException("Order not found")`, `RuntimeException("Cannot cancel order")`, `RuntimeException("Cannot confirm order")` | 404 for not-found, 409 for state conflicts |
| **inventory-service** | `RuntimeException("Stock entry not found")`, `RuntimeException("Not enough stock")` | 404 for not-found, 409 for stock conflicts |
| **payment-service** | `RuntimeException("Payment account not found")`, `RuntimeException("Insufficient funds")` | 404 for not-found, 422 for business rule violations |
| **subscription-service** | `IllegalArgumentException`, `AccessDeniedException`, `IllegalStateException` | 400, 403, 409 respectively |
| **checkout-service** | No controllers (event-only), but `CheckoutSagaOrchestrator` may throw during saga | 500 fallback — minimal risk |
| **cart-service** | No explicit throws found | Add handler anyway for consistency + future-proofing |

## Implementation Steps

1. Create `GlobalExceptionHandler.java` in each service's `config/` package
2. Map existing `RuntimeException` messages to proper HTTP statuses:
   - "not found" substring → 404
   - "cannot cancel" / "cannot confirm" / "insufficient" → 409 or 422
   - Default → 500 (no stack trace)
3. For subscription-service: map `IllegalArgumentException` → 400, `AccessDeniedException` → 403, `IllegalStateException` → 409
4. Add Timestamp field to error response DTO
5. For checkout-service: add handler even though no HTTP controllers (future-proofing, Jackson serialization errors, etc.)
6. Keep identity-service handler as-is (already correct)

## Success Criteria

- [ ] All 7 services have `GlobalExceptionHandler` in `config/` package
- [ ] `mvn clean install -DskipTests` passes for all modules
- [ ] Manual test: `curl http://localhost:8082/api/v1/catalog/products/nonexistent` returns `{"status": 404, "message": "Product not found: nonexistent"}`
- [ ] Stack traces excluded from `application.yml` via `server.error.include-stacktrace: never`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Message-based matching fragile for dynamic messages | Acceptable for v1. Later: create domain-specific exception classes (ProductNotFoundException, etc.) |
| Exception hierarchy differences across services | Match the pattern each service already uses; don't force uniform exception class hierarchy in this phase |
