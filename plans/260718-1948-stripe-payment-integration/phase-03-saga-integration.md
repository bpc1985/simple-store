# Phase 3: Backend Saga Integration

**Priority:** P1
**Dependencies:** Phase 2
**Estimated time:** 2-3 hours

## Overview

Wire `paymentIntentId` through the entire checkout saga flow — from order creation to event publishing to payment verification. The saga orchestrator carries `paymentIntentId` from `OrderSubmittedEvent` through `ProcessPaymentRequestedEvent`. `PaymentService` branches on `payment.provider`: Stripe mode calls `PaymentIntent.retrieve()` to verify status; internal mode uses existing balance logic.

## Requirements

- Functional: Full saga flow with Stripe payment verification; backward compatible with internal mode
- Non-functional: No changes to saga state machine logic; events remain Java records (update all call sites); nullable fields for backward compatibility

## Architecture

```
Order (with paymentIntentId)
  → OrderSubmittedEvent { ..., paymentIntentId }
    → CheckoutSagaState stores paymentIntentId
      → ProcessPaymentRequestedEvent { ..., paymentIntentId }
        → PaymentService.processPayment()
          ┌─ "stripe" → PaymentIntent.retrieve(piId) → check status → publish outcome
          └─ "internal" → balance check → publish outcome (unchanged)
```

Events modified (all get nullable `String paymentIntentId`):
- `ProcessPaymentRequestedEvent` — new last parameter
- `PaymentSucceededEvent` — new last parameter `stripePaymentIntentId`
- `PaymentFailedEvent` — new last parameter `stripePaymentIntentId`
- `OrderSubmittedEvent` — new last parameter

New column on `Order` entity: `paymentIntentId`
New column on `CheckoutSagaState`: `paymentIntentId`
New field on `CreateOrderRequest`: `paymentIntentId`

## Related Code Files

### Modify
- `common/src/main/java/com/simplestore/common/event/ProcessPaymentRequestedEvent.java`
- `common/src/main/java/com/simplestore/common/event/PaymentSucceededEvent.java`
- `common/src/main/java/com/simplestore/common/event/PaymentFailedEvent.java`
- `common/src/main/java/com/simplestore/common/event/OrderSubmittedEvent.java`
- `order-service/src/main/java/com/simplestore/order/model/Order.java`
- `order-service/src/main/java/com/simplestore/order/dto/CreateOrderRequest.java`
- `order-service/src/main/java/com/simplestore/order/dto/OrderDto.java`
- `order-service/src/main/java/com/simplestore/order/service/OrderService.java`
- `checkout-service/src/main/java/com/simplestore/checkout/model/CheckoutSagaState.java`
- `checkout-service/src/main/java/com/simplestore/checkout/saga/CheckoutSagaOrchestrator.java`
- `payment-service/src/main/java/com/simplestore/payment/service/PaymentService.java`

## Implementation Steps

### 1. Event record changes (common module)

Add `String paymentIntentId` as the LAST parameter in each record:

**ProcessPaymentRequestedEvent:**
```java
public record ProcessPaymentRequestedEvent(
        UUID correlationId,
        String userId,
        BigDecimal amount,
        String paymentIntentId    // NEW — nullable
) implements Serializable {}
```

**PaymentSucceededEvent:**
```java
public record PaymentSucceededEvent(
        UUID correlationId,
        String userId,
        String stripePaymentIntentId    // NEW — nullable
) implements Serializable {}
```

**PaymentFailedEvent:**
```java
public record PaymentFailedEvent(
        UUID correlationId,
        String userId,
        String reason,
        String stripePaymentIntentId    // NEW — nullable
) implements Serializable {}
```

**OrderSubmittedEvent:**
```java
public record OrderSubmittedEvent(
        UUID correlationId,
        String userId,
        Instant orderDate,
        BigDecimal totalAmount,
        String shippingAddress,
        List<OrderItemDetail> items,
        String paymentIntentId    // NEW — nullable
) implements Serializable {
    public record OrderItemDetail(UUID productId, String productName,
            int quantity, BigDecimal unitPrice) implements Serializable {}
}
```

### 2. Order entity and DTO

Order.java — add field:
```java
@Column(length = 50)
private String paymentIntentId;
```

CreateOrderRequest.java — add field:
```java
public record CreateOrderRequest(
        String shippingAddress,
        List<OrderItemRequest> items,
        String paymentIntentId    // NEW — optional
) { ... }
```

OrderDto.java — add `String paymentIntentId` to record params.

### 3. OrderService.createOrder() changes

Store `paymentIntentId` from request on Order entity, pass it in OrderSubmittedEvent:
```java
Order order = Order.builder()
        .userId(userId)
        .totalAmount(total)
        .shippingAddress(request.shippingAddress())
        .paymentIntentId(request.paymentIntentId())  // NEW
        .status(OrderStatus.PENDING)
        .build();

// In afterCommit:
OrderSubmittedEvent event = new OrderSubmittedEvent(
        correlationId, orderUserId, orderDate, totalAmount,
        shippingAddr, itemDetails, order.getPaymentIntentId());  // NEW last param
```

### 4. CheckoutSagaState — add field
```java
@Column(length = 50)
private String paymentIntentId;
```

### 5. CheckoutSagaOrchestrator changes

In `handleOrderSubmitted()`:
```java
saga.setPaymentIntentId(event.paymentIntentId());
```

In `handleStockReserved()`:
```java
ProcessPaymentRequestedEvent paymentEvent = new ProcessPaymentRequestedEvent(
        event.correlationId(), saga.getUserId(), saga.getTotalAmount(),
        saga.getPaymentIntentId());  // NEW last param
```

In `handlePaymentSucceeded()` — pass through:
```java
new PaymentSucceededEvent(event.correlationId(), saga.getUserId(),
        event.stripePaymentIntentId())
```

In `handlePaymentFailed()` — pass through:
```java
new PaymentFailedEvent(event.correlationId(), saga.getUserId(),
        event.reason(), event.stripePaymentIntentId())
```

### 6. PaymentService — Stripe-aware processPayment()

Add `@Value("${payment.provider:internal}") private String paymentProvider;`

Branch in `processPayment()`:
```java
if ("stripe".equals(paymentProvider)) {
    processStripePayment(event);
    return;
}
processInternalPayment(event);  // extracted existing logic
```

`processStripePayment()`:
1. Idempotency: `existsByCorrelationId()` guard
2. Null check: `event.paymentIntentId()` must not be null in Stripe mode
3. `PaymentIntent.retrieve(event.paymentIntentId())` — Stripe API call
4. On `"succeeded"`: create `PaymentTransaction` (SUCCEEDED, provider=STRIPE) → afterCommit publish `PaymentSucceededEvent` with `paymentIntentId`
5. On other status: create `PaymentTransaction` (FAILED) with reason from `pi.getLastPaymentError()` → afterCommit publish `PaymentFailedEvent`

Extract `processInternalPayment()` — move ALL existing balance-check code here unchanged.

Add `publishPaymentFailed()` helper — creates FAILED `PaymentTransaction` with STRIPE provider, publishes `PaymentFailedEvent` via afterCommit.

Required imports: `PaymentProvider`, `StripeException`, `PaymentIntent` (from Stripe SDK), `Value`.

Also update `OrderService.toOrderDto()` to include `order.getPaymentIntentId()`.

## Success Criteria

- [ ] `ProcessPaymentRequestedEvent` carries `paymentIntentId` through entire saga path
- [ ] `PaymentService.processPayment()` calls Stripe API to verify PI status in Stripe mode
- [ ] `PaymentSucceededEvent`/`PaymentFailedEvent` include `stripePaymentIntentId`
- [ ] Internal mode (`PAYMENT_PROVIDER=internal`) unchanged and working
- [ ] All call sites updated for new record parameters (compile-time enforced by Java)
- [ ] `mvn clean install -DskipTests` passes

## Verification

```bash
# Build all modules
mvn clean install -DskipTests
# Expected: BUILD SUCCESS (Java records force all call sites to be updated)

# Internal mode regression
PAYMENT_PROVIDER=internal docker compose up -d payment-service
# Admin deposits funds → checkout → saga completes via balance check → order CONFIRMED

# Verify backward compat: old events without paymentIntentId (null)
# PaymentService falls through to processInternalPayment()
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Java record changes break 10+ modules | High | Records enforce compile-time correctness — all call sites must be updated. Run full `mvn clean install` from root. |
| Stripe API call latency blocks saga | Medium | `PaymentIntent.retrieve()` is a fast GET. 1-2 second timeout. If Stripe is down, saga records FAILED status and publishes `PaymentFailedEvent`. |
| Race between `processStripePayment` and webhook handler | Medium | Repository `existsByCorrelationId()` guard in both handlers prevents double-write. First to persist wins. |
