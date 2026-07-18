# Max-Effort Code Review — Other Services

**Date**: 2026-07-18
**Scope**: 80 Java files across 7 services + common module
**Effort**: Max (4 finder agents + self-review)

---

## Findings (15, ranked most-severe first)

### CRITICAL

| # | File | Line | Summary |
|---|------|------|---------|
| 1 | `checkout-service/.../CheckoutSagaOrchestrator.java` | 38 | `handleOrderSubmitted` not idempotent + no `@Transactional`. Two separate `save()` calls commit independently. If `streamBridge.send` fails after both, saga stuck at RESERVING_STOCK. Redelivery throws `DataIntegrityViolationException` (PK collision). |
| 2 | `identity-service/.../JwtAuthenticationFilter.java` | 58 | JWT filter never checks `isEnabled()` or `isAccountNonLocked()`. Admin-locked accounts continue to use existing JWT tokens until expiry. Filter validates token + loads UserDetails but never calls account status checks before setting SecurityContext. |
| 3 | `identity-service/src/main/resources/application.yml` | 22 | Different default JWT secret from all other services. Locally (`spring-boot:run`), tokens signed by identity-service are rejected everywhere. Works in Docker only because `JWT_SECRET` env var overrides both defaults. |
| 4 | `inventory-service/.../InventoryService.java` | 87 | `processReserveStock` TOCTOU race: stock check loop and deduct loop not atomic. No `@Version` on `StockEntry`. Concurrent orders both pass check → negative stock. |

### HIGH

| # | File | Line | Summary |
|---|------|------|---------|
| 5 | `order-service/.../OrderService.java` | 31 | `createOrder` accepts `unitPrice` from untrusted client input. No server-side price validation or catalog lookup. Client sets `unitPrice=0.01` → near-zero order total. |
| 6 | `checkout-service/.../CheckoutSagaOrchestrator.java` | 38 | No `@Transactional` on any saga handler. Each `save()` + `send()` runs independently. If `send` fails after DB commit, state is persisted but event never published — sagas stuck permanently. |
| 7 | `checkout-service/.../CheckoutSagaOrchestrator.java` | 100 | 4 of 6 handlers lack status-guard idempotency (only `handleStockReserved` has it). Duplicate event redelivery re-publishes downstream events and overwrites saga state silently. |
| 8 | `inventory-service/.../InventoryService.java` | 127 | `StockLevelChangedEvent` not published from saga-driven stock mutations (`processReserveStock`, `processCancelReservation`). Only admin `updateStockLevel` publishes it. Catalog's cached stock diverges from inventory on every order. |
| 9 | `cart-service/.../CartController.java` | 24 | `resolveOwner` receives `principalName` but every caller passes `null`. Authenticated users never identified — carts always `anon:*`. Login doesn't preserve cart. |
| 10 | `cart-service/.../CartController.java` | 51 | `addItem` accepts raw `Map<String,Object>` with no validation. Missing `productId` → NPE → HTTP 500. Price defaults to 0. Quantity unbounded. |
| 11 | `cart-service/.../RedisCartService.java` | 56 | `addItem` non-atomic get-then-put. Concurrent adds for same product lose data — both read same quantity, last write wins. |

### MEDIUM

| # | File | Line | Summary |
|---|------|------|---------|
| 12 | `identity-service/.../IdentityService.java` | 67 | Business exceptions (`IllegalArgumentException`, `UsernameNotFoundException`) not mapped to HTTP status. Duplicate registration → 500 (should be 409). Expired token → 500 (should be 401). No `@ControllerAdvice`. |
| 13 | `order-service/.../OrderService.java` | 73 | `streamBridge.send("order-submitted")` inside `@Transactional` without `afterCommit` — ghost event on rollback. |
| 14 | `order-service/.../model/OrderItem.java` | 10 | `@Data` on `OrderItem` with `@ManyToOne(fetch=LAZY) Order` generates circular `equals()`/`hashCode()`. `OrderItem.equals()` → `Order.equals()` → `items.equals()` → recursion → `StackOverflowError`. |
| 15 | `order-service/.../OrderService.java` | 143 | `getStats()` calls `findAll()` loading all orders into memory to compute 4 aggregates. Replace with `@Query` group-by aggregation. |

---

## Efficiency & Cleanup Notes

- **InventoryService** N+1: per-item `findByProductId()` + per-item `save()` in both reserve and cancel paths. Batch with `findByProductIdIn()` and `saveAll()`.
- **InventoryService.getInventoryStats**: `findAll().stream().filter().count()` loads all StockEntry rows in memory.
- **CartService getCartCount/getCartTotal**: reads + deserializes entire cart hash for a single int. Use Redis `HLEN` or stored total.
- **Cart no Redis TTL**: abandoned carts leak memory indefinitely.
- **5 duplicate JwtAuthConverter** files across services (should move to `common`).
- **PagedResult boilerplate**: 5 identical constructions across CatalogService/OrderService. Add `PagedResult.from(Page, mapper)` factory.
- **All 16 event binding names match** between publishers and consumers — no orphan events or consumers.
- **IdentityService `@Lazy PasswordEncoder`** unnecessary — only `@Lazy AuthenticationManager` needed for circular dep.
- **`@EnableMethodSecurity` commented out** in identity-service SecurityConfig with note: "causes 403 on authenticated JWT requests" — known issue.
