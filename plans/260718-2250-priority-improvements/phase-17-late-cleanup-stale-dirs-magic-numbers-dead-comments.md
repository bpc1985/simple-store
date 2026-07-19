---
phase: 17
title: "Late Cleanup — stale dirs, magic numbers, dead comments"
status: pending
priority: P3
dependencies: []
effort: "30m"
---

# Phase 17: Late Cleanup

## Overview

Final polish: remove stale repo-root dirs, externalize magic numbers, delete dead comments. Lowest priority but quick wins.

## Related Code Files

- **Delete/ignore**: `admin/`, `storefront/` at repo root (stale pre-monorepo build artifacts)
- **Modify**: `inventory-service/.../service/InventoryService.java` — externalize low-stock threshold
- **Modify**: `subscription-service/.../scheduler/SubscriptionScheduler.java` — externalize cron
- **Modify**: `subscription-service/.../service/SubscriptionService.java` — externalize retry config
- **Modify**: `cart-service/.../service/RedisCartService.java` — externalize TTL
- **Modify**: `identity-service/.../config/SecurityConfig.java` — remove dead `@EnableMethodSecurity` comment

## Implementation Steps

### 1. Clean up stale root-level dirs

```bash
# Add to .gitignore or remove
echo "admin/" >> .gitignore
echo "storefront/" >> .gitignore
```

These are pre-monorepo build artifacts (`.next/`, `node_modules/`, `.env.local`). Real apps are in `frontend/apps/`.

### 2. Externalize magic numbers

Add `@Value` annotations with sensible defaults:

| File | Constant | Config Key | Default |
|------|----------|-----------|---------|
| `InventoryService.java:81` | Low-stock threshold (10) | `inventory.low-stock-threshold` | 10 |
| `SubscriptionScheduler.java:41` | Scheduler cron (`0 0 2 * * ?`) | `subscription.billing.cron` | `0 0 2 * * ?` |
| `SubscriptionService.java:245,251` | Retry count (3), sleep (500ms) | `subscription.payment.retry-count`, `subscription.payment.retry-delay-ms` | 3, 500 |
| `RedisCartService.java:24` | Cart TTL (30 days) | `cart.ttl-days` | 30 |

Add to each service's `application.yml`:
```yaml
app:
  inventory:
    low-stock-threshold: ${INVENTORY_LOW_STOCK_THRESHOLD:10}
  subscription:
    billing:
      cron: ${SUBSCRIPTION_BILLING_CRON:0 0 2 * * ?}
    payment:
      retry-count: ${SUBSCRIPTION_PAYMENT_RETRY_COUNT:3}
      retry-delay-ms: ${SUBSCRIPTION_PAYMENT_RETRY_DELAY_MS:500}
  cart:
    ttl-days: ${CART_TTL_DAYS:30}
```

### 3. Remove dead `@EnableMethodSecurity` comment

`identity-service/.../config/SecurityConfig.java` line 21:
```java
// @EnableMethodSecurity — removed; causes 403 on authenticated JWT requests
// despite correct SecurityContext
```

Delete the comment. If the bug still exists, track it in an issue. Don't leave dead workaround comments.

### 4. Fix `orderId = 0` hardcode

`inventory-service/.../service/InventoryService.java` line 122:
```java
StockReservation.builder().orderId(0)
```

If `orderId` is intentionally unset (saga-driven, not HTTP), document why. If it should receive the real order ID from the event, fix it.

## Success Criteria

- [ ] `admin/` and `storefront/` added to root `.gitignore`
- [ ] Magic numbers replaced with `@Value` config properties
- [ ] Dead `@EnableMethodSecurity` comment removed
- [ ] `orderId = 0` either fixed or documented with comment
- [ ] `mvn clean install -DskipTests` passes
- [ ] `git status` shows clean repo (no stale untracked dirs)
- [ ] `docker compose up --build -d` — all services start

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Config key name conflicts | Use `app.` prefix to namespace custom config |
| Changing cron default could affect scheduling | Keep existing default (`0 0 2 * * ?`); only make overridable |
| `orderId = 0` fixing may break saga | Investigate first. If saga doesn't use orderId from reservation, documenting the zero is fine. |
