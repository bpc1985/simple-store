# Stripe Payment Integration — Implementation Plan

**Branch:** `feature/stripe-integration`
**Created:** 2026-07-18
**Status:** draft

## Context

SimpleStore uses an internal wallet/pseudo-payment system. `PaymentAccount` entities hold a `balance` (BigDecimal). `PaymentService.processPayment()` checks `account.balance >= event.amount()` — if sufficient it deducts and publishes `PaymentSucceededEvent`; otherwise `PaymentFailedEvent`. Same pattern for subscription recurring billing. No external payment processor exists anywhere.

This plan replaces the mock system with Stripe for one-time checkout and recurring subscription billing, preserving the event-driven saga architecture. Internal mode remains available behind `payment.provider=internal` for local dev without Stripe keys.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend UI** | Stripe Elements (embedded PaymentElement) | Keeps checkout in our wizard; no off-site redirect; PCI scope handled by Stripe.js iframe |
| **Subscription billing** | Manual PaymentIntent per cycle using SetupIntent-saved payment methods | Subscription service stays source of truth; Stripe is stateless payment processor |
| **Customer mapping** | Add `stripeCustomerId` (String) to `PaymentAccount` entity | One Stripe Customer per user; lazy-created on first payment attempt |
| **Payment flow** | Payment collected upfront → PaymentIntent confirmed client-side → `paymentIntentId` passed to createOrder → saga verifies PI status via Stripe API | Keeps saga unchanged except payment verification step |
| **Webhook** | Signature-verified endpoint; secondary safety net | Primary flow verifies via Stripe API directly; webhook catches async edge cases |
| **Backward compat** | `payment.provider: stripe \| internal` (env var `PAYMENT_PROVIDER`) | Devs without Stripe keys use existing balance system |
| **Idempotency** | `correlationId` as Stripe idempotency key + `PaymentTransaction.correlationId` unique constraint | Double protection: Stripe API level + DB level |
| **Idempotency (webhook)** | `WebhookEvent` entity keyed by Stripe event ID | Prevents webhook replay across restarts |
| **Event additions** | Add optional `String paymentIntentId` to 5 existing event records | Backward-compatible; null-safe; no new event types needed |
| **Currency** | USD hardcoded for v1 | YAGNI — no multi-currency requirement |

## Complete Payment Flow (order-to-confirmation)

```
┌─ FRONTEND (storefront, Next.js 15) ─────────────────────────────────────────┐
│                                                                             │
│  STEP 1: Shipping                                                           │
│    address, city, state, zip (react-hook-form + zod)                        │
│                                                                             │
│  STEP 2: Payment                                                            │
│    a. POST /api/v1/payment/create-payment-intent { amount }                │
│       ← { clientSecret: "pi_xxx_secret_xxx", paymentIntentId: "pi_xxx" }   │
│    b. Render <PaymentElement/> from @stripe/react-stripe-js                 │
│    c. User enters card details (4242...) in Stripe's iframe                 │
│    d. stripe.confirmPayment({ elements, redirect: "if_required" })          │
│       - 3DS: Stripe handles redirect, returns to our page                   │
│       - Decline: error shown inline, user can retry                         │
│    e. On success: store paymentIntentId in component state                  │
│                                                                             │
│  STEP 3: Review                                                             │
│    Show shipping, items, total. "Place Order" button.                       │
│                                                                             │
│  STEP 4: Place Order                                                        │
│    POST /api/v1/order/orders {                                              │
│      shippingAddress, items[], paymentIntentId                              │
│    }                                                                        │
│    → saga starts → order eventually CONFIRMED or CANCELLED                  │
│                                                                             │
│  STEP 5: Confirmation                                                       │
│    Show "Order #X placed!" with link to orders page                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─ BACKEND ───────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. order-service: OrderController.createOrder()                            │
│     → OrderService.createOrder()                                            │
│     → Create Order entity (PENDING), save paymentIntentId                   │
│     → afterCommit: streamBridge.send("order-submitted", OrderSubmittedEvent)│
│                                                                             │
│  2. checkout-service: CheckoutConsumer.orderSubmittedConsumer()             │
│     → CheckoutSagaOrchestrator.handleOrderSubmitted()                       │
│     → Create CheckoutSagaState (STARTED)                                    │
│     → Publish ReserveStockRequestedEvent → "reserve-stock-requested"        │
│     → Saga: STARTED → RESERVING_STOCK                                       │
│                                                                             │
│  3. inventory-service: Consumer<ReserveStockRequestedEvent>                 │
│     → Reserve stock, decrement available                                    │
│     → Publish StockReservedEvent → "stock-reserved"                         │
│                                                                             │
│  4. checkout-service: CheckoutConsumer.stockReservedConsumer()              │
│     → Saga: RESERVING_STOCK → PROCESSING_PAYMENT                            │
│     → Publish ProcessPaymentRequestedEvent → "process-payment-requested"    │
│       (includes paymentIntentId from saga state)                            │
│                                                                             │
│  5. payment-service: ProcessPaymentConsumer                                 │
│     → PaymentService.processPayment(event)                                  │
│     → IF payment.provider == "stripe":                                      │
│       a. PaymentIntent.retrieve(event.paymentIntentId())  ← Stripe API call │
│       b. Create PaymentTransaction (SUCCEEDED or FAILED based on PI status) │
│       c. afterCommit: streamBridge.send("payment-succeeded" OR "payment-failed")│
│     → IF payment.provider == "internal":                                    │
│       existing balance-check logic (unchanged)                              │
│                                                                             │
│  6. checkout-service: paymentSucceededConsumer / paymentFailedConsumer      │
│     → Saga: PROCESSING_PAYMENT → CONFIRMED or COMPENSATING → CANCELLED      │
│     → Publish OrderConfirmedEvent or OrderCancelledEvent                    │
│                                                                             │
│  7. order-service: OrderConfirmedConsumer / OrderCancelledConsumer          │
│     → Update Order.status to CONFIRMED or CANCELLED                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Subscription Recurring Flow

```
Scheduler (daily 2 AM, subscription-service)
  │
  ├─ Find ACTIVE subscriptions where nextBillingDate <= today+1
  │  (protected by PostgreSQL advisory lock)
  │
  ├─ Publish SubscriptionCycleStartedEvent → "subscription-cycle-started" (fanout)
  │
  ├──► subscription-service: SubscriptionConsumer.cycleStartedConsumer()
  │      → Create SubscriptionCycle (PENDING) — idempotent via unique (subscriptionId, cycleNumber)
  │
  └──► payment-service: SubscriptionCycleChargeConsumer
         → PaymentService.processSubscriptionPayment(event)
         → IF payment.provider == "stripe":
           a. Find PaymentAccount → get stripeCustomerId
           b. Get paymentMethodId from CustomerSubscription
           c. Stripe: PaymentIntent.create({
                amount: event.amount() * 100,
                currency: "usd",
                customer: stripeCustomerId,
                payment_method: paymentMethodId,
                off_session: true,
                confirm: true,
                metadata: { correlationId, subscriptionId, cycleNumber }
              })
           d. IF "succeeded": create PaymentTransaction (SUCCEEDED)
              afterCommit → streamBridge.send("subscription-payment-success", ...)
           e. IF "requires_action": create PaymentTransaction (REQUIRES_ACTION)
              log error — off-session SCA shouldn't happen with valid card
              afterCommit → streamBridge.send("subscription-payment-failure", ...)
           f. IF failed: create PaymentTransaction (FAILED)
              afterCommit → streamBridge.send("subscription-payment-failure", ...)
         → IF payment.provider == "internal":
           existing balance-check logic (unchanged)

    subscription-service consumers:
      → SubscriptionConsumer.paymentSuccessConsumer()
        → advanceCycle(subscriptionId, cycleNumber) — 3-retry loop, @Transactional
        → nextBillingDate += 1mo (MONTHLY) or 3mo (QUARTERLY)
      → SubscriptionConsumer.paymentFailureConsumer()
        → failCycle(subscriptionId, cycleNumber) — cycle → FAILED, subscription → PAYMENT_FAILED
```

## Phase Dependencies

```
Phase 1 (SDK + Config) ──┬──► Phase 2 (Customer + API)
                          │         │
                          │         ├──► Phase 3 (Saga Integration)
                          │         │         │
                          │         │         ├──► Phase 4 (Webhook)
                          │         │         │         │
                          │         │         │         └──► Phase 6 (Subscription Backend)
                          │         │         │                   │
                          │         └─────────┼──► Phase 5 (Checkout Frontend)
                          │                   │         │
                          │                   │         └──► Phase 7 (Subscription Frontend)
                          │                   │                   │
                          │                   └──► Phase 8 (Admin) ◄┘
                          │
                          └──► Phase 9 (Testing) — runs after ALL other phases
```

## Phases

| # | Phase | Priority | Depends On | Estimated |
|---|-------|----------|------------|-----------|
| 1 | [SDK, Configuration & Entity Changes](./phase-01-sdk-config-entity-changes.md) | P1 | — | 1-2h |
| 2 | [Stripe Customer & Payment Method API](./phase-02-stripe-customer-payment-api.md) | P1 | Phase 1 | 2-3h |
| 3 | [Backend Saga Integration](./phase-03-saga-integration.md) | P1 | Phase 2 | 2-3h |
| 4 | [Stripe Webhook Endpoint](./phase-04-webhook-endpoint.md) | P2 | Phase 3 | 1-2h |
| 5 | [Checkout Frontend Integration](./phase-05-checkout-frontend.md) | P1 | Phase 2, 3 | 3-4h |
| 6 | [Subscription Payment Backend](./phase-06-subscription-backend.md) | P1 | Phase 2, 4 | 2-3h |
| 7 | [Subscription Payment Frontend](./phase-07-subscription-frontend.md) | P2 | Phase 5, 6 | 2-3h |
| 8 | [Admin Dashboard Updates](./phase-08-admin-updates.md) | P3 | Phase 3, 6 | 1-2h |
| 9 | [Testing, Cleanup & Documentation](./phase-09-testing-cleanup.md) | P2 | All | 2-3h |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Event ordering: webhook fires PaymentSucceeded before saga reaches PROCESSING_PAYMENT | Medium | High | Saga's `handlePaymentSucceeded` status-guard skips if not in PROCESSING_PAYMENT. Webhook handler creates PaymentTransaction anyway. Saga's `processPayment` also checks Stripe API directly — **double-gate protection.** |
| `PaymentElement` iframe sizing issues on mobile | Medium | Low | Stripe's PaymentElement is responsive. Test on mobile viewport. |
| Off-session SCA causes subscription payment failure | Low | High | If `requires_action`, mark cycle FAILED and subscription PAYMENT_FAILED. Acceptable for v1. |
| `ddl-auto: update` adds columns but doesn't migrate data | High | Low | New columns are nullable. Existing data works unchanged. No data migration needed. |
| Frontend `clientSecret` expires before user completes payment | Low | Medium | PaymentIntent has a 24h window. If expired, frontend shows error and re-fetches. |
| Concurrent events: subscription cycle and webhook race | Medium | Medium | `PaymentTransaction.correlationId` unique constraint prevents duplicate; webhook `WebhookEvent` idempotency prevents double-publish. |
| Gateway routing: webhook path conflicts with existing payment route | Medium | High | Add specific webhook route BEFORE catch-all payment route in gateway config. |

## Open Questions

1. **Currency** — Hardcoded `usd` for v1.
2. **Stripe Tax** — Automatic sales tax via Stripe Tax API. No for v1 (YAGNI).
3. **Refunds** — Admin-initiated refunds via Stripe API. Out of scope for v1.
4. **Multiple saved cards** — Yes, Stripe Customer supports multiple.
5. **Webhook in production** — Gateway must route `/api/v1/payment/webhook` without JWT validation. In production, additionally restrict to Stripe's IP ranges.
