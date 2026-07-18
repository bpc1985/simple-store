---
phase: 2
title: "Add bindings and test end-to-end"
status: completed
effort: "small"
---

# Phase 2: Add bindings and test end-to-end

## Overview

Register the new consumer binding in `application.yml`, rebuild and deploy, then test the full end-to-end flow: subscribe → cycle event → charge → cycle advancement.

## Related Code Files

- **Modify:** `payment-service/src/main/resources/application.yml`

## Implementation Steps

### 1. Add consumer binding to application.yml

Update `payment-service/src/main/resources/application.yml` to register the new consumer alongside the existing one:

```yaml
spring.cloud.stream:
    function.definition: processPaymentConsumer;subscriptionCycleConsumer
    bindings:
      processPaymentConsumer-in-0:
        destination: process-payment-requested
        group: payment-service
      subscriptionCycleConsumer-in-0:
        destination: subscription-cycle-started
        group: payment-service
    rabbit.bindings:
      processPaymentConsumer-in-0.consumer:
        exchangeType: fanout
      subscriptionCycleConsumer-in-0.consumer:
        exchangeType: fanout
```

### 2. Rebuild and deploy

```bash
mvn clean install -DskipTests
docker compose build --no-cache payment-service subscription-service
docker compose up -d --force-recreate payment-service subscription-service
```

### 3. Test end-to-end

**Test user must have sufficient balance**: The `PaymentSeeder` gives `user1` (userId `00000000-0000-0000-0000-000000000002`) a balance of **$5000.00**. Coffee Box is $29.99 — sufficient.

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:8080/api/v1/identity/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@store.com","password":"User123!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# 2. Subscribe to Coffee Box
curl -s -X POST "http://localhost:8080/api/v1/subscription/subscribe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": 1}' | python3 -m json.tool

# 3. Check payment account balance (should be 5000 - 29.99 = 4970.01)
# Requires admin token:
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/api/v1/identity/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@store.com","password":"Admin123!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
curl -s "http://localhost:8080/api/v1/payment/accounts/00000000-0000-0000-0000-000000000002" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 4. Check subscription — should show cycle=1, status=ACTIVE
curl -s "http://localhost:8080/api/v1/subscription/my" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### 4. Verify event flow via logs

```bash
docker compose logs subscription-service | grep -i "payment\|cycle\|PaymentSuccess\|PaymentFailure"
docker compose logs payment-service | grep -i "subscription\|SubscriptionCycle\|processSubscription"
```

Expected log sequence:
```
subscription-service: Cycle created: id=..., status=PENDING
payment-service: Received subscription cycle: subscriptionId=..., cycle=1
payment-service: Subscription payment succeeded: userId=..., amount=29.99
subscription-service: Payment success: subscriptionId=..., cycle=1
subscription-service: Cycle advanced: subscriptionId=..., nextBilling=...
```

## Success Criteria

- [ ] `function.definition` in application.yml includes `subscriptionCycleConsumer`
- [ ] Consumer binding uses destination `subscription-cycle-started`, group `payment-service`, fanout exchange
- [ ] Subscribe → payment charged → subscription-service cycle advances
- [ ] Balance correctly deducted by plan price
- [ ] Payment transaction visible via payment-service admin endpoint
- [ ] Gateway route `/api/v1/payment/accounts/{userId}` works with admin JWT
- [ ] Build passes: `mvn clean install -DskipTests`

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Existing `processPaymentConsumer` breaks due to yml change | `function.definition` uses semicolon separator; both consumers run independently |
| `subscription-cycle-started` exchange already exists from subscription-service | Fanout exchange is idempotent; if it exists, RabbitMQ provider just binds to it |
| Duplicate event processing during deploy restart | Consumer group `payment-service` ensures durable subscription — events queued during downtime are delivered on reconnect |