# Max-Effort Code Review — SimpleStore Full Project

**Date**: 2026-07-18
**Scope**: All code in project (146 Java files, 10 Maven modules)
**Effort**: Max (10 finder angles, 10 verification agents)
**Review target**: Recent 5 commits adding subscription-service, modifying payment-service, removing storefront-web/admin-web BFFs

## Methodology

10 independent finder agents (angles A–J) + controller self-review + 1 gap-sweep agent → dedup → 18 findings ranked by severity. Each finding verified by at least one agent reading the actual file contents.

## Findings (18, ranked most-severe first)

### CRITICAL — correctness bugs

| # | File | Line | Summary |
|---|------|------|---------|
| 1 | `subscription-service/.../SubscriptionService.java` | 165 | `resumeSubscription` retries failed cycle with same cycleNumber, violating `UNIQUE(subscriptionId, cycleNumber)` → `DataIntegrityViolationException` |
| 2 | `subscription-service/.../SubscriptionService.java` | 80 | Double billing: `nextBillingDate=today` + async consumer race allows scheduler to publish second cycle-started for cycle 1 |
| 3 | `subscription-service/.../SubscriptionService.java` | 89 | `streamBridge.send()` inside `@Transactional` without `afterCommit` → ghost events on rollback (also at line 168, and in `PaymentService.processPayment` lines 79/93) |
| 4 | `subscription-service/.../SubscriptionService.java` | 218 | `Thread.sleep(500)` inside `@Transactional` retry loop → DB connection held for 1.5s, pool exhaustion under load |

### HIGH — real bugs with specific triggers

| # | File | Line | Summary |
|---|------|------|---------|
| 5 | `subscription-service/.../SubscriptionService.java` | 238 | `failCycle` ignores `cycleNumber` parameter, queries any PENDING cycle — failed payment silently lost if cycle already promoted |
| 6 | `subscription-service/.../domain/CustomerSubscription.java` | 14 | No `@Version` on `CustomerSubscription` or `SubscriptionCycle` — lost updates from concurrent event consumers (cf. `PaymentAccount` has `@Version`) |
| 7 | `subscription-service/.../dto/CreatePlanRequest.java` | 11 | `cadence` field has no `@NotBlank` validation → `NullPointerException` surfaces as HTTP 500 instead of 400 |
| 8 | `common/.../event/BoxAssemblyRequestedEvent.java` | 11 | Event defined but never published — fulfillment pipeline is dead, boxes never assembled/shipped after payment |
| 9 | `subscription-service/.../SubscriptionService.java` | 89 | `streamBridge.send()` return unchecked — event loss silently swallowed if RabbitMQ unavailable |
| 10 | `inventory-service/.../InventoryService.java` | 106 | Stock check-then-act race: two concurrent orders can both pass the availability check → negative stock (no `@Version` on `StockEntry`) |
| 11 | `storefront/src/lib/api.ts` | 12 | JWT in `localStorage` (XSS-exfiltratable), no 401 redirect, no auto-refresh — security regression from removed BFF's httpOnly sessions |

### MEDIUM

| # | File | Line | Summary |
|---|------|------|---------|
| 12 | `subscription-service/.../SubscriptionScheduler.java` | 41 | Scheduler lacks `@Transactional` — mid-loop crash leaves partial processing, lock released, unprocessed subscriptions delayed 24h |
| 13 | `admin/src/hooks/use-auth.ts` | 40 | Admin logout only clears `localStorage`, never calls `POST /api/v1/identity/logout` → refresh token hash remains valid in DB |
| 14 | `subscription-service/.../SubscriptionService.java` | 103 | N+1 cycle queries: `getUserSubscriptions` fetches cycles one-per-subscription (same in `AdminSubscriptionController.toCustomerSubscriptionDto` line 113) |
| 15 | `payment-service/.../PaymentService.java` | 52 | `processSubscriptionPayment` duplicates ~35 lines of charge logic from `processPayment` — bug fix divergence risk |

### Phase 3 Sweep — additional findings

| # | File | Line | Summary |
|---|------|------|---------|
| 16 | `subscription-service/.../SubscriptionService.java` | 200 | Orphaned PENDING cycle: payment succeeds before cycle creation persists → `advanceCycle` retries exhaust → cycle created but never advanced (charge deducted, subscription stuck) |
| 17 | `subscription-service/.../SubscriptionService.java` | 204 | `completedDate` never set on cycle transition to CHARGED or FAILED — API always returns `null` for every cycle's completion timestamp |
| 18 | `subscription-service/.../controller/AdminSubscriptionController.java` | 113 | Separate N+1 query site: `toCustomerSubscriptionDto` calls `cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc` per subscription — fixing #14 in the service layer won't fix this distinct call site |

## Additional Notes

- **Conventions (CLAUDE.md)**: Subscription entities use `@Getter @Setter` instead of `@Data` (CLAUDE.md says entities should use `@Data`). This is actually a better practice for JPA entities but diverges from the written convention.
- **Altitude**: JwtAuthConverter is duplicated identically across 5 services (~275 lines total); SecurityConfig boilerplate duplicated across 6 services; SubscriptionPlan-to-DTO mapping duplicated at 6 call sites.
- **Cleanup**: `PaymentController.getTransactions()` exposes raw JPA entity via API response; `AdminSubscriptionController` directly injects repository bypassing service layer; checkout-service `stockReservationCancelledConsumer` missing `exchangeType: fanout` config.
- **Event sync**: `PaymentService.processPayment()` publishes events synchronously (no `afterCommit`) while `processSubscriptionPayment` correctly uses `afterCommit` — inconsistency within the same class.
