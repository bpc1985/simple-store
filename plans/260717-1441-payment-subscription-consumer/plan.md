---
title: "Payment-Service Subscription Recurring Charges"
description: "Add consumer in payment-service to handle recurring subscription charges"
status: completed
priority: P2
branch: "feature/subscription-box"
tags: ["subscription", "payment", "consumer", "events"]
blockedBy: []
blocks: []
created: "2026-07-17T07:43:39.494Z"
createdBy: "ck:plan"
source: skill
---

# Payment-Service Subscription Recurring Charges

## Overview

payment-service currently handles one-time checkout payments via `ProcessPaymentConsumer`. This plan adds a second consumer that listens for `SubscriptionCycleStartedEvent` and processes recurring subscription charges — the bridge between subscription-service's cycle scheduler and actual payment deduction.

## Architecture

```
subscription-service (scheduler/subscribe)
  │  StreamBridge.send("subscription-cycle-started", event)
  ▼
RabbitMQ (fanout exchange: subscription-cycle-started)
  │
  ▼
payment-service (NEW: SubscriptionCycleConsumer)
  │  PaymentService.processSubscriptionPayment(event)
  │  ├── findOrCreateAccount(userId)
  │  ├── balance check → deduct
  │  └── publish result event:
  │       Success → "subscription-payment-success"
  │       Failure → "subscription-payment-failure"
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Add consumer and service method](./phase-01-add-consumer-and-service-method.md) | Pending |
| 2 | [Add bindings and test end-to-end](./phase-02-add-bindings-and-test-end-to-end.md) | Pending |

## Files to Change

| Action | File |
|---|---|
| **Create** | `payment-service/.../consumer/SubscriptionCycleConsumer.java` |
| **Modify** | `payment-service/src/main/resources/application.yml` |
| **Modify** | `payment-service/.../service/PaymentService.java` |

## Acceptance Criteria

- [ ] `subscription-cycle-started` consumer binding active in payment-service
- [ ] Successful charge: balance deducted, transaction recorded, `SubscriptionPaymentSuccessEvent` published
- [ ] Insufficient funds: transaction failed, `SubscriptionPaymentFailedEvent` published
- [ ] End-to-end: subscribe → cycle event → charge → subscription-service cycle advances
- [ ] Build passes: `mvn clean install -DskipTests`

## Dependencies

None — subscription-service already publishes `SubscriptionCycleStartedEvent` to `"subscription-cycle-started"` exchange.
