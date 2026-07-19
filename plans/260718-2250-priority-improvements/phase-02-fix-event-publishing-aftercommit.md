---
phase: 2
title: "Fix Event Publishing (afterCommit)"
status: pending
priority: P0
dependencies: []
effort: "1-2h"
---

# Phase 2: Fix Event Publishing (afterCommit)

## Overview

Wrap 13 `streamBridge.send()` calls in `TransactionSynchronizationManager.registerSynchronization` + `afterCommit()` across 4 services. Currently events publish inside `@Transactional` — if the TX rolls back, the event is already in the broker. order-service and payment-service already follow the correct pattern; this phase brings the rest in line.

## Requirements

- Functional: All events publish after DB commit, not inside transaction
- Non-functional: Failed sends are logged at ERROR level (existing pattern from order-service)

## Correct Pattern (from order-service, payment-service)

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        boolean sent = streamBridge.send("binding-name", event);
        if (!sent) log.error("Failed to send event for ...");
    }
});
```

## Related Code Files

- **Modify**: `catalog-service/.../CatalogService.java` — 2 violations (lines ~53, ~70)
- **Modify**: `inventory-service/.../InventoryService.java` — 7 violations (lines ~67, ~105, ~114, ~135, ~149, ~182, ~191)
- **Modify**: `checkout-service/.../CheckoutSagaOrchestrator.java` — 6 violations (lines ~78, ~106, ~134, ~160, ~188, ~217)
- **Modify**: `subscription-service/.../SubscriptionScheduler.java` — 1 violation (line ~77)

## Implementation Steps

### catalog-service (2 fixes)

1. `createProduct()` — wrap `streamBridge.send("product-updated-out-0", event)` in afterCommit
2. `updateProduct()` — same pattern

### inventory-service (7 fixes)

3. `updateStockLevel()` — wrap `streamBridge.send("stock-level-changed-out-0", event)` in afterCommit
4. `processReserveStock()` — wrap both failure sends (lines ~105, ~114) + success paths (lines ~135, ~149) in afterCommit
5. `processCancelReservation()` — wrap both sends (lines ~182, ~191) in afterCommit

### checkout-service (6 fixes)

6. All 6 `handle*` methods in `CheckoutSagaOrchestrator` — each has one `streamBridge.send()` at end of method. Wrap in afterCommit.

### subscription-service (1 fix)

7. `SubscriptionScheduler.processDueSubscriptions()` — `streamBridge.send("subscription-cycle-started-out-0", event)` at line ~77. Special case: this method holds a PostgreSQL advisory lock. Move the send outside the lock+transaction scope entirely:
   - Collect events in a list during the transactional loop
   - After `@Transactional` method returns, in calling code, send all collected events

## Success Criteria

- [ ] All 13 violations wrapped in afterCommit
- [ ] `mvn clean install -DskipTests` passes
- [ ] Checkout saga smoke test: create order, verify saga transitions complete
- [ ] Subscription scheduler: verify cycle-started events publish after lock release
- [ ] No `streamBridge.send()` calls remain inside `@Transactional` methods without afterCommit

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Event ordering: afterCommit delays event by TX commit time (ms) | Negligible. Consumers already handle event ordering via saga status guards |
| subscription-service advisory lock held during send | Phase-specific fix: collect events during TX, send after method returns |
| Missed a send during manual audit | Grep `streamBridge.send` before/after to verify count = 13 → 0 |
