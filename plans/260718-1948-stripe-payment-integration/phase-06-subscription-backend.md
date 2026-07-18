# Phase 6: Subscription Payment Backend

**Priority:** P1
**Dependencies:** Phase 2 (StripeCustomerService), Phase 4 (webhook for subscription events)
**Estimated time:** 2-3 hours

## Overview

Enable Stripe-based subscription recurring billing. When the scheduler publishes `SubscriptionCycleStartedEvent`, `PaymentService.processSubscriptionPayment()` creates an off-session Stripe PaymentIntent using the saved payment method. The existing event chain and cycle management remain unchanged — only the payment processing method changes.

## Requirements

- Functional: Off-session Stripe charges for subscription cycles; payment success advances cycle; payment failure marks cycle FAILED
- Non-functional: Existing internal mode for subscriptions preserved; idempotent via correlationId; SCA `requires_action` handled gracefully

## Architecture

```
processSubscriptionPayment(SubscriptionCycleStartedEvent)
  │
  ├── Idempotency: existsByCorrelationId() → skip
  │
  ├── IF payment.provider == "stripe":
  │     ├── Get PaymentAccount → get stripeCustomerId
  │     ├── Get paymentMethodId from event (stored on CustomerSubscription)
  │     ├── Stripe: PaymentIntent.create({
  │     │     amount, currency=usd, customer, payment_method,
  │     │     off_session=true, confirm=true,
  │     │     metadata: { correlationId, subscriptionId, cycleNumber }
  │     │   })
  │     ├── IF status == "succeeded":
  │     │     Create PaymentTransaction (SUCCEEDED, STRIPE)
  │     │     afterCommit → subscription-payment-success
  │     ├── IF status == "requires_action":
  │     │     Create PaymentTransaction (REQUIRES_ACTION, STRIPE)
  │     │     Log error — off-session SCA shouldn't happen
  │     │     afterCommit → subscription-payment-failure
  │     └── ELSE (failed):
  │           Create PaymentTransaction (FAILED, STRIPE)
  │           afterCommit → subscription-payment-failure
  │
  └── IF payment.provider == "internal":
        Existing balance-check logic (unchanged)
```

## Related Code Files

### Modify
- `payment-service/src/main/java/com/simplestore/payment/service/StripeCustomerService.java` — add `chargeOffSession()` method
- `payment-service/src/main/java/com/simplestore/payment/service/PaymentService.java` — add Stripe-aware `processSubscriptionPayment()`
- `subscription-service/src/main/java/com/simplestore/subscription/service/SubscriptionService.java` — ensure `paymentMethodId` saved on `CustomerSubscription`

## Implementation Steps

### 1. StripeCustomerService — chargeOffSession()

Add method:
```java
/**
 * Charge a customer's saved payment method off-session.
 * Used for subscription recurring billing — no customer present.
 */
public PaymentIntent chargeOffSession(
        String stripeCustomerId,
        String paymentMethodId,
        BigDecimal amount,
        UUID correlationId,
        UUID subscriptionId,
        int cycleNumber) throws StripeException {

    long amountInCents = amount.movePointRight(2).longValueExact();

    PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(amountInCents)
            .setCurrency("usd")
            .setCustomer(stripeCustomerId)
            .setPaymentMethod(paymentMethodId)
            .setOffSession(true)
            .setConfirm(true)  // Charge immediately
            .putMetadata("correlation_id", correlationId.toString())
            .putMetadata("subscription_id", subscriptionId.toString())
            .putMetadata("cycle_number", String.valueOf(cycleNumber))
            .putMetadata("user_id", "")
            .build();

    return PaymentIntent.create(params);
}
```

### 2. PaymentService — Stripe-aware subscription payments

Extract existing logic into `processInternalSubscriptionPayment()` (no changes).

Add `processStripeSubscriptionPayment()`:
1. Find PaymentAccount, verify `stripeCustomerId` exists
2. Verify `event.paymentMethodId()` is not null/blank
3. Call `stripeCustomerService.chargeOffSession()`
4. Handle three outcomes:
   - `"succeeded"` — create SUCCEEDED transaction, publish `subscription-payment-success`
   - `"requires_action"` — create REQUIRES_ACTION transaction, log error, publish `subscription-payment-failure`
   - else — create FAILED transaction with reason from `getLastPaymentError()`, publish `subscription-payment-failure`
5. All event publishes use `afterCommit()`

Add `publishSubscriptionFailed()` helper for consistent failure handling.

Modify `processSubscriptionPayment()` entry point:
```java
@Transactional
public void processSubscriptionPayment(SubscriptionCycleStartedEvent event) {
    if (paymentTransactionRepository.existsByCorrelationId(event.correlationId())) {
        log.warn("Duplicate subscription payment event ignored: correlationId={}",
                event.correlationId());
        return;
    }
    if ("stripe".equals(paymentProvider)) {
        processStripeSubscriptionPayment(event);
        return;
    }
    processInternalSubscriptionPayment(event);
}
```

### 3. SubscriptionService — ensure paymentMethodId saved

In `subscribe()` method, verify `paymentMethodId` from request is stored on `CustomerSubscription`:
```java
CustomerSubscription subscription = CustomerSubscription.builder()
        .id(UUID.randomUUID().toString())
        .userId(userId)
        .plan(plan)
        .status(SubscriptionStatus.ACTIVE)
        .startDate(LocalDate.now())
        .nextBillingDate(computeNextBillingDate(plan.getCadence(), LocalDate.now()))
        .lockedPrice(plan.getPrice())
        .paymentMethodId(request.paymentMethodId())  // <-- Ensure saved
        .build();
```

The `paymentMethodId` field already exists on `CustomerSubscription` entity per the schema. Verify it flows from subscribe API → entity → `SubscriptionCycleStartedEvent.paymentMethodId()` → payment consumer.

## Success Criteria

- [ ] Off-session PaymentIntent created via Stripe API with `confirm=true`
- [ ] Successful charge: PaymentTransaction (SUCCEEDED, STRIPE), `subscription-payment-success` published, cycle advances
- [ ] Failed charge (declined/expired card): PaymentTransaction (FAILED, STRIPE), `subscription-payment-failure` published, cycle FAILED
- [ ] `requires_action`: PaymentTransaction (REQUIRES_ACTION, STRIPE), `subscription-payment-failure` published
- [ ] Duplicate correlationId ignored (idempotent)
- [ ] Missing Stripe customer or payment method → `subscription-payment-failure` with clear reason
- [ ] Internal mode subscription payments unchanged

## Verification

```bash
# Prerequisites: subscription plans seeded, user has Stripe customer + saved payment method

# 1. Login as user with saved payment method
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@store.com","password":"User123!"}' | jq -r '.data.token')

# 2. Subscribe (after Phase 7 provides UI for payment method collection)
curl -s -X POST http://localhost:8080/api/v1/subscription/subscribe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": 1, "paymentMethodId": "pm_test_xxx"}' | jq .

# 3. Wait for 2AM scheduler or manually trigger cycle
# Check logs for "Subscription charge succeeded"

# 4. Verify cycle advanced
curl -s http://localhost:8080/api/v1/subscription/my \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0].currentCycle'
# Should show incremented cycle number

# 5. Check Stripe Dashboard → Payments → off-session PaymentIntent
# 6. Test failure: set card as expired in Stripe Dashboard → trigger scheduler
# Expected: subscription PAYMENT_FAILED, cycle FAILED
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Off-session SCA (`requires_action`) | High | Mark as REQUIRES_ACTION → publish failure. In production, notify customer to update payment method. Acceptable for v1 MVP. |
| Stripe API rate limits on scheduler | Low | Scheduler processes subscriptions serially with advisory lock. At most N subscriptions per day. Well within Stripe limits. |
| `paymentMethodId` not saved on `CustomerSubscription` | High | Verify field exists on entity, flows through subscribe() → event → consumer. Test end-to-end. |
| Race: scheduler publishes cycle event but payment method detached | Low | `PaymentIntent.create()` fails → catch StripeException → publish failure. Cycle marked FAILED. |
