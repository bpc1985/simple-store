# Code Review — Subscription Box Feature (3 Phases)

**Branch:** `feature/subscription-box`  
**Scope:** 10 review angles × independent agents → verified via 3 rounds → 1 sweep (8 additional bugs)  
**Date:** 2026-07-17

## Summary

| Severity | Count | Category |
|----------|-------|----------|
| **CRITICAL** | 7 | Double-charge, phantom payments, stuck cycles, lost updates, status resurrection |
| **HIGH** | 7 | Silent event loss, wrong HTTP codes, inactive plans, state-machine violations, negative prices |
| **MEDIUM** | 3 | Exchange mismatch, duplicate subscriptions, billing gap |
| **FRONTEND** | 3 | Auth state race, timezone bug, missing auth guard |

---

## CRITICAL Findings

### 1. No idempotency — double charge on event re-delivery
**File:** `payment-service/.../PaymentService.java:94`  
**Status:** CONFIRMED

`processSubscriptionPayment` creates a new `PaymentTransaction` on every call. No correlationId dedup check. `PaymentTransaction.correlationId` has no `unique=true`. Broker redelivery → duplicate deduction + duplicate `SubscriptionPaymentSuccessEvent`.

**Fix:** Add `existsByCorrelationId` check before processing, or add `UNIQUE(correlation_id)` constraint + catch `DataIntegrityViolationException`.

### 2. Scheduler TOCTOU + no cluster locking → duplicate cycle events
**File:** `subscription-service/.../scheduler/SubscriptionScheduler.java:39-54`  
**Status:** CONFIRMED

`@Scheduled(cron = "0 0 2 * * ?")` with no ShedLock/Quartz/distributed lock. PENDING check (line 54) is check-then-act — two instances both see no PENDING cycle and both publish events. Cycle creation is async (downstream consumer), so the check offers no cross-instance protection.

**Fix:** Add ShedLock (`@SchedulerLock`), or use DB advisory lock, or make the scheduler single-instance with a leader election.

### 3. createCycle not atomic + no DB unique constraint → duplicate PENDING cycles
**File:** `subscription-service/.../service/SubscriptionService.java:194-207`  
**Status:** CONFIRMED

Check-then-act without `@Lock(PESSIMISTIC_WRITE)`. `SubscriptionCycle` `@Table` has no `uniqueConstraints`. No `@Lock` on repository queries. Two concurrent invocations both insert PENDING cycles.

**Fix:** Add `UNIQUE(subscription_id, cycle_number)` constraint to `subscription_cycles`, or add `@Lock(PESSIMISTIC_WRITE)` on `findBySubscriptionIdAndStatus`.

### 4. Event published inside @Transactional → phantom payments
**File:** `payment-service/.../PaymentService.java:93-141`  
**Status:** CONFIRMED

`streamBridge.send()` at line 120 runs inside the `@Transactional` boundary. If broker accepts the message but DB commit fails → consumer sees phantom payment. If broker unreachable → exception rollbacks valid payment data.

**Fix:** Use `TransactionSynchronization.afterCommit()` or `@TransactionalEventListener(phase = AFTER_COMMIT)` to defer event publication.

### 5. Race: payment success arrives before PENDING cycle created → stuck cycle forever
**File:** `subscription-service/.../consumer/SubscriptionConsumer.java:49-54` + `SubscriptionService.java:148-167`  
**Status:** CONFIRMED

`SubscriptionCycleStartedEvent` consumed in parallel by subscription-service (creates PENDING cycle) and payment-service (charges). If payment finishes first, `advanceCycle()` finds no PENDING cycle, logs warning, does nothing. No retry. Scheduler skips subscriptions with existing PENDING cycles, so no recovery.

**Fix:** Add retry with backoff on `paymentSuccessConsumer` binding, or add a DLQ with a recovery handler, or sequence the consumers so cycle creation always precedes payment.

---

## HIGH Findings

### 6. StreamBridge.send return value ignored at all 6 call sites
**File:** `PaymentService.java:77,88,120,134`; `SubscriptionService.java:81`; `SubscriptionScheduler.java:67`  
**Status:** CONFIRMED

`send()` returns `boolean` — `false` = message not sent. All 6 callers discard it. No AOP advice, no global error handler, no publisher-confirm configured. Silent failures are invisible.

**Fix:** Log and throw on `false`, or configure RabbitMQ publisher-confirms and handle `ConfirmCallback`.

### 7. SecurityException → HTTP 500 instead of 403
**File:** `subscription-service/.../service/SubscriptionService.java:110,122,134,215`  
**Status:** CONFIRMED

Four methods throw `new SecurityException("Not your subscription")`. Spring maps unchecked `RuntimeException` → HTTP 500. No `@ControllerAdvice` or `@ExceptionHandler` anywhere in the project. Client can't distinguish "not found" from "server error."

**Fix:** Use `AccessDeniedException` (Spring Security) or add `@ExceptionHandler(SecurityException.class)` → `@ResponseStatus(HttpStatus.FORBIDDEN)`.

### 8. Missing plan.isActive() check — subscribe to inactive plans
**File:** `subscription-service/.../service/SubscriptionService.java:53-93`  
**Status:** CONFIRMED

`subscribe()` fetches plan by ID but never checks `plan.isActive()`. Admin deactivates a plan (`active=false`) → listing endpoint hides it (`getActivePlans()` filters `active=true`) → but `POST /subscribe` still accepts it.

**Fix:** Add `if (!plan.isActive()) throw ...` after line 55.

---

## MEDIUM Findings

### 9. No output bindings for subscription-payment-success/failure
**File:** `payment-service/.../PaymentService.java:120,134`  
**Status:** PLAUSIBLE

StreamBridge auto-creates exchanges. If created as `topic` before consumer declares `fanout` → `PRECONDITION_FAILED`. Same pattern exists for `payment-succeeded`/`payment-failed` and works currently because consumer starts first. Risk is conditional.

---

## FRONTEND Findings

### 10. useMySubscriptions reads localStorage instead of AuthContext
**File:** `storefront/src/hooks/use-subscriptions.ts:28-30`  
`enabled: !!localStorage.getItem("token")` — non-reactive. AuthContext provides `isAuthenticated`. Logout in another tab → token cleared → query still enabled until re-render.

### 11. formatInstant converts UTC Instant to local timezone
**File:** `storefront/src/components/subscriptions/cycle-list.tsx:9-20`  
`new Date(iso).toLocaleDateString()` shifts UTC Instant to browser timezone. A cycle at `2024-01-16T02:00:00Z` → displays as `Jan 15` for US West Coast users.

### 12. useCycles lacks auth guard
**File:** `storefront/src/hooks/use-subscriptions.ts:63-68`  
`enabled: !!subscriptionId` — no auth check. On detail page, called before `isAuthenticated` early return. Unauthenticated direct navigation → 401 API call + console error.

---

---

## SWEEP Findings (Phase 3 — previously undiscovered)

### 13. Concurrent balance modifications — lost updates (no @Version)
**File:** `payment-service/.../PaymentService.java:110`  
**Status:** CONFIRMED (sweep)

Two concurrent subscription charges for the same user both read the same balance, both modify, both save → last write wins. `PaymentAccount` has no `@Version` field for optimistic locking. One charge is silently lost. Also affects `processPayment` at line 65.

**Fix:** Add `@Version private Long version;` to `PaymentAccount` entity.

### 14. advanceCycle overwrites concurrent status change — resurrects cancelled subscriptions
**File:** `subscription-service/.../service/SubscriptionService.java:149`  
**Status:** CONFIRMED (sweep)

`advanceCycle` loads subscription entity, updates billing dates, saves → but doesn't check if status is still ACTIVE. Delayed payment-success event for a since-cancelled subscription: Hibernate's full UPDATE overwrites status back to ACTIVE, resuming billing.

**Fix:** Add status guard: `if (sub.getStatus() != ACTIVE) return;`

### 15. pause/resume/cancel have no state-machine guard — invalid transitions allowed
**File:** `subscription-service/.../service/SubscriptionService.java:106-139`  
**Status:** CONFIRMED (sweep)

`pauseSubscription`, `resumeSubscription`, `cancelSubscription` unconditionally set the new status. A PAUSED→CANCEL, CANCELLED→PAUSE, or CANCELLED→RESUME all succeed. Resurrects terminated subscriptions.

**Fix:** Add allowed-transition checks (e.g., only ACTIVE can pause/cancel, only PAUSED/PAYMENT_FAILED can resume).

### 16. failCycle unconditionally sets PAYMENT_FAILED — overwrites cancellations
**File:** `subscription-service/.../service/SubscriptionService.java:183`  
**Status:** CONFIRMED (sweep)

`failCycle` always does `sub.setStatus(PAYMENT_FAILED)` without checking current status. Delayed failure event after user cancelled → status overwritten back to PAYMENT_FAILED.

**Fix:** Only set PAYMENT_FAILED if current status is ACTIVE.

### 17. CreatePlanRequest.price lacks @Positive/@NotNull — negative prices allowed
**File:** `subscription-service/.../dto/CreatePlanRequest.java:6`  
**Status:** CONFIRMED (sweep)

No `@Positive` or `@NotNull` validation on `price`. Admin can create a plan with `price=-10`. Subscribe → balance check passes for negative amounts → `balance = balance - (-10) = balance + 10` → user credited instead of debited.

**Fix:** Add `@NotNull @Positive BigDecimal price` with Jakarta validation.

### 18. Scheduler uses current plan price — not locked-at-subscription price
**File:** `subscription-service/.../scheduler/SubscriptionScheduler.java:73`  
**Status:** CONFIRMED (sweep)

Recurring cycle amount is read from `sub.getPlan().getPrice()` at billing time. Admin raises price → all existing subscribers charged the new amount for next cycle, despite agreeing to the old price at signup.

**Fix:** Store `lockedPrice` on `CustomerSubscription` at subscribe time, bill from that field.

### 19. subscribe only guards ACTIVE — allows duplicate subscription with PAYMENT_FAILED
**File:** `subscription-service/.../service/SubscriptionService.java:58`  
**Status:** CONFIRMED (sweep)

Duplicate check scans `findByUserIdAndPlanIdAndStatus(userId, planId, ACTIVE)`. User with PAYMENT_FAILED subscription subscribes again → second subscription created for same plan → orphaned first subscription.

**Fix:** Broaden check to exclude CANCELLED only, or check for any non-terminal status.

### 20. Resuming from PAYMENT_FAILED skips the failed cycle — revenue loss
**File:** `subscription-service/.../service/SubscriptionService.java:130`  
**Status:** CONFIRMED (sweep)

`resumeSubscription` sets `nextBillingDate=today` without retrying the failed cycle. The FAILED cycle is never collected, user received that period's service for free.

**Fix:** On resume from PAYMENT_FAILED, retry the failed cycle charge or mark it as waived explicitly.

---

## Notable Cleanup Observations

- **Duplicate date formatting** — `formatDate`/`formatInstant` copied 3× across cycle-list, subscription-card, and detail page
- **Duplicate cadence mappings** — `cadenceMeta` in plan-card + plan detail, `cadenceLabel` in subscribe-dialog (3 copies)
- **Duplicate plan.isActive() pattern** — `plan-card.tsx` renders `active` prop but never uses it
- **Raw HTML table** — cycle-list desktop view uses raw `<table>` instead of existing `Table` UI components

---

## Verification Method

- **Phase 1:** 10 independent finder agents (correctness, cleanup, altitude, conventions)  
- **Phase 2:** 3 verification agents cross-referencing code, repos, configs, and project patterns  
- **Phase 3:** Sweep for gaps (1 agent)

All bug findings are backed by specific line references and concrete failure scenarios. Pre-existing issues (e.g., storefront-web DTOs lacking Lombok, checkout-service yml) excluded from this report as they are not introduced by this branch.
