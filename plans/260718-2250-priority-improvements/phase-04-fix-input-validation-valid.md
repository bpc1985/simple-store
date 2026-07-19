---
phase: 4
title: "Fix Input Validation (@Valid)"
status: pending
priority: P1
dependencies: []
effort: "1h"
---

# Phase 4: Fix Input Validation (@Valid)

## Overview

Add `@Valid` annotations to mutation endpoint request bodies and add Jakarta Validation annotations to DTO classes that lack them. Several controllers accept raw JSON without validation — negative quantities, null lists, and missing fields reach the database.

## Requirements

- Functional: All mutation endpoints validate request bodies before processing
- Non-functional: Consistent validation error format across services

## Related Code Files

- **Modify**: `catalog-service/.../controller/CatalogController.java` — add `@Valid` to `updateProduct`, `createCategory`, `updateCategory`
- **Modify**: `cart-service/.../controller/CartController.java` — replace `Map<String, Object>` with typed DTO + validation
- **Modify**: `order-service/.../dto/CreateOrderRequest.java` — add `@NotNull`, `@NotEmpty`, `@Positive` annotations
- **Modify**: `inventory-service/.../controller/InventoryController.java` — add `@Valid` to `updateStockLevel`
- **Create**: `cart-service/.../dto/UpdateCartItemRequest.java` — typed DTO with `@NotNull productId`, `@Positive quantity`

### Validation annotations to add

| File | Field | Annotation |
|------|-------|-----------|
| `CreateOrderRequest` | `items` | `@NotEmpty` |
| `CreateOrderRequest.OrderItem` | `productId` | `@NotBlank` |
| `CreateOrderRequest.OrderItem` | `quantity` | `@Positive` |
| `UpdateStockRequest` | `stockLevel` | `@PositiveOrZero` |
| `UpdateProductRequest` (check existing) | name, price | `@NotBlank`, `@PositiveOrZero` if missing |
| `CategoryDto` (check existing) | name | `@NotBlank` if missing |

### cart-service: from Map to DTO

Replace:
```java
@PostMapping
public ResponseEntity<Map<String, Object>> addItem(
    @RequestBody Map<String, Object> body) {
    String productId = (String) body.get("productId");  // NPE risk
    int quantity = ((Number) body.get("quantity")).intValue();  // ClassCast risk
```

With:
```java
public record AddCartItemRequest(@NotBlank String productId, @Positive int quantity) {}

@PostMapping
public ResponseEntity<Map<String, Object>> addItem(
    @Valid @RequestBody AddCartItemRequest request) {
```

### Global validation handler

Add `MethodArgumentNotValidException` handler to each `GlobalExceptionHandler` (created in Phase 1):
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(new ErrorResponse(400, message, Instant.now()));
}
```

## Success Criteria

- [ ] All mutation endpoints have `@Valid` on `@RequestBody` parameters
- [ ] DTO classes have appropriate `@NotNull`/`@NotBlank`/`@Positive`/`@PositiveOrZero`
- [ ] `cart-service` uses typed DTOs instead of `Map<String, Object>`
- [ ] Validation errors return 400 with field-level messages
- [ ] `mvn clean install -DskipTests` passes
- [ ] `cd frontend && npx turbo typecheck` passes (DTO shapes unchanged)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| cart-service Map→DTO breaks frontend | Frontend already sends `{ productId, quantity }` — DTO matches existing payload shape |
| Stricter validation rejects valid requests | Defaults match current behavior. `@PositiveOrZero` for stock (allow zero stock) |
