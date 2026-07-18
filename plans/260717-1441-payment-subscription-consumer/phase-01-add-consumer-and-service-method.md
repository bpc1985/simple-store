---
phase: 1
title: "Add consumer and service method"
status: completed
effort: "small"
---

# Phase 1: Add consumer and service method

## Overview

Create `SubscriptionCycleConsumer` (following existing `@Component implements Consumer<T>` pattern) and add `processSubscriptionPayment` method to `PaymentService`. The logic mirrors `processPayment` but publishes subscription-specific events on different destinations.

## Related Code Files

- **Create:** `payment-service/src/main/java/com/simplestore/payment/consumer/SubscriptionCycleConsumer.java`
- **Modify:** `payment-service/src/main/java/com/simplestore/payment/service/PaymentService.java`

## Implementation Steps

### 1. Create `SubscriptionCycleConsumer.java`

New file at `payment-service/src/main/java/com/simplestore/payment/consumer/SubscriptionCycleConsumer.java`:

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionCycleConsumer implements Consumer<SubscriptionCycleStartedEvent> {

    private final PaymentService paymentService;

    @Override
    public void accept(SubscriptionCycleStartedEvent event) {
        log.info("Received subscription cycle: subscriptionId={}, cycle={}",
                event.subscriptionId(), event.cycleNumber());
        paymentService.processSubscriptionPayment(event);
    }
}
```

Mirrors `ProcessPaymentConsumer` pattern exactly — `@Component`, implements `Consumer<T>`, delegates to service.

### 2. Add `processSubscriptionPayment` to `PaymentService`

Inject `StreamBridge` (already exists). Add method:

```java
@Transactional
public void processSubscriptionPayment(SubscriptionCycleStartedEvent event) {
    PaymentAccount account = findOrCreateAccount(event.userId());
    PaymentTransaction transaction = PaymentTransaction.builder()
            .correlationId(event.correlationId())
            .userId(event.userId())
            .amount(event.amount())
            .type(TransactionType.CHARGE)
            .status(TransactionStatus.PENDING)
            .build();
    transactionRepository.save(transaction);

    if (account.getBalance().compareTo(event.amount()) >= 0) {
        account.setBalance(account.getBalance().subtract(event.amount()));
        accountRepository.save(account);
        transaction.setStatus(TransactionStatus.SUCCEEDED);
        transactionRepository.save(transaction);

        streamBridge.send("subscription-payment-success",
                new SubscriptionPaymentSuccessEvent(
                        event.correlationId(),
                        event.subscriptionId(),
                        transaction.getId().toString(),
                        event.cycleNumber()));
        log.info("Subscription payment succeeded: userId={}, amount={}, subscriptionId={}",
                event.userId(), event.amount(), event.subscriptionId());
    } else {
        transaction.setStatus(TransactionStatus.FAILED);
        transaction.setReason("Insufficient funds");
        transactionRepository.save(transaction);

        streamBridge.send("subscription-payment-failure",
                new SubscriptionPaymentFailedEvent(
                        event.correlationId(),
                        event.subscriptionId(),
                        event.cycleNumber(),
                        "Insufficient funds"));
        log.warn("Subscription payment failed: userId={}, amount={}, balance={}",
                event.userId(), event.amount(), account.getBalance());
    }
}
```

### 3. Add imports to PaymentService

```java
import com.simplestore.common.event.SubscriptionCycleStartedEvent;
import com.simplestore.common.event.SubscriptionPaymentSuccessEvent;
import com.simplestore.common.event.SubscriptionPaymentFailedEvent;
```

## Success Criteria

- [ ] `SubscriptionCycleConsumer` compiles and is auto-detected by Spring
- [ ] `PaymentService.processSubscriptionPayment` is `@Transactional`
- [ ] On success: balance deducted, transaction SUCCEEDED, `SubscriptionPaymentSuccessEvent` published
- [ ] On failure: transaction FAILED, balance unchanged, `SubscriptionPaymentFailedEvent` published
- [ ] Uses same `findOrCreateAccount` and `TransactionType.CHARGE` as existing `processPayment`

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Transactional boundary — account balance and transaction saved atomically | `@Transactional` on method (same as `processPayment`) |
| Duplicate processing of same cycle | `correlationId` on transaction identifies each cycle; payment-service doesn't yet enforce idempotency, but subscription-service cycle status guards handle it |
| Event published but transaction not persisted | Publish after both saves succeed; if streamBridge fails, transaction still committed |