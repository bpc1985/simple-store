---
phase: 16
title: "Wire BoxAssemblyRequestedEvent"
status: pending
priority: P3
dependencies: ["Phase 2"]
effort: "2-3h"
---

# Phase 16: Wire BoxAssemblyRequestedEvent

## Overview

`BoxAssemblyRequestedEvent` is defined in `common/event/` but has zero publishers and zero consumers. Successful subscription payments have no path to box assembly or shipping. Wire the event into the subscription fulfillment pipeline.

## Requirements

- Functional: After a subscription payment succeeds, `BoxAssemblyRequestedEvent` is published
- Functional: order-service and inventory-service consume the event to trigger fulfillment
- Non-functional: Event publishing follows afterCommit pattern (fixed in Phase 2)

## Architecture

```
SubscriptionPaymentSuccess
  → SubscriptionConsumer.advanceCycle() [existing]
  → NEW: publish BoxAssemblyRequestedEvent (afterCommit)
    → order-service: create fulfillment order
    → inventory-service: allocate stock for box
```

The event fields (verified from `common/event/BoxAssemblyRequestedEvent.java`):
```java
public record BoxAssemblyRequestedEvent(
    UUID correlationId,
    String subscriptionId,  // UUID as String
    String userId,          // UUID as String
    String planName,
    int cycleNumber
) implements Serializable {}
```

Note: `subscriptionId` and `userId` are `String` type, not `UUID`. No `planId` or `paymentTransactionId` field exists.

## Related Code Files

- **Read**: `common/src/main/java/com/simplestore/common/event/BoxAssemblyRequestedEvent.java`
- **Modify**: `subscription-service/.../consumer/SubscriptionConsumer.java` — publish event after payment success
- **Modify**: `subscription-service/src/main/resources/application.yml` — add binding for box-assembly-requested
- **Create**: `order-service/.../consumer/BoxAssemblyRequestedConsumer.java` — consume + create fulfillment order
- **Create**: `inventory-service/.../consumer/BoxAssemblyRequestedConsumer.java` — consume + allocate stock
- **Modify**: `order-service/src/main/resources/application.yml` — add binding
- **Modify**: `inventory-service/src/main/resources/application.yml` — add binding

## Implementation Steps

### 1. Event definition

Verified at `common/src/main/java/com/simplestore/common/event/BoxAssemblyRequestedEvent.java`:
```java
public record BoxAssemblyRequestedEvent(
    UUID correlationId,
    String subscriptionId,
    String userId,
    String planName,
    int cycleNumber
) implements Serializable {}
```

Fields available: `correlationId` (for tracing), `subscriptionId`, `userId`, `planName`, `cycleNumber`.

### 2. subscription-service: publish event on successful payment

In `SubscriptionConsumer.paymentSuccessConsumer()`:

```java
// After advanceCycle() succeeds
BoxAssemblyRequestedEvent boxEvent = new BoxAssemblyRequestedEvent(
    UUID.randomUUID(),                             // correlationId
    event.subscriptionId(),                        // from SubscriptionPaymentSuccessEvent
    subscription.getUserId(),                      // from CustomerSubscription entity
    cycle.getPlanName(),                           // from SubscriptionCycle
    cycle.getCycleNumber()                         // current billing cycle
);
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        boolean sent = streamBridge.send("box-assembly-requested-out-0", boxEvent);
        if (!sent) log.error("Failed to send BoxAssemblyRequestedEvent for subscription={}", subscription.getId());
    }
});
```

Requires reading `SubscriptionPaymentSuccessEvent` and `SubscriptionConsumer.paymentSuccessConsumer()` to confirm available field names.

### 3. subscription-service application.yml

```yaml
spring:
  cloud:
    stream:
      bindings:
        box-assembly-requested-out-0:
          destination: BoxAssemblyRequested
          producer:
            required-groups: order-service, inventory-service
```

### 4. order-service: create BoxAssembly consumer

```java
@Component
public class BoxAssemblyRequestedConsumer implements Consumer<BoxAssemblyRequestedEvent> {
    @Override
    public void accept(BoxAssemblyRequestedEvent event) {
        // Create a fulfillment order for the subscription box
        log.info("Box assembly requested: subscriptionId={}, userId={}, plan={}, cycle={}",
            event.subscriptionId(), event.userId(), event.planName(), event.cycleNumber());
        // Future: create Order entity with type=FULFILLMENT
    }
}
```

### 5. inventory-service: create BoxAssembly consumer

```java
@Component
public class BoxAssemblyRequestedConsumer implements Consumer<BoxAssemblyRequestedEvent> {
    @Override
    public void accept(BoxAssemblyRequestedEvent event) {
        // Allocate stock for the subscription box contents
        log.info("Stock allocation for box assembly: subscription={}, plan={}, cycle={}",
            event.subscriptionId(), event.planName(), event.cycleNumber());
        // Future: deduct stock for plan-defined box items
    }
}
```

### 6. Add bindings in order-service + inventory-service application.yml

```yaml
spring:
  cloud:
    stream:
      function:
        definition: boxAssemblyRequestedConsumer
      bindings:
        boxAssemblyRequestedConsumer-in-0:
          destination: BoxAssemblyRequested
          group: order-service  # or inventory-service
```

## Success Criteria

- [ ] `BoxAssemblyRequestedEvent` has a publisher in subscription-service
- [ ] Event published in `afterCommit` after successful subscription payment
- [ ] order-service has consumer for `BoxAssemblyRequestedEvent`
- [ ] inventory-service has consumer for `BoxAssemblyRequestedEvent`
- [ ] Binding configs consistent across publisher + 2 consumers
- [ ] `mvn clean install -DskipTests` passes
- [ ] Docker test: create subscription, verify event flows through RabbitMQ

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Fulfillment logic undefined — what does "box assembly" actually mean? | For v1, log and create placeholder fulfillment order. Business rules TBD. |
| Dead letter on missing plan items | Consumer is idempotent — can retry. DLQ setup out of scope for this phase. |
| Stock allocation without box contents defined | Plan entity needs `items` or `boxContents` — may not exist yet. Consumer logs intent for v1. |
