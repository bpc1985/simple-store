# Phase 4: Stripe Webhook Endpoint

**Priority:** P2 (safety net — primary flow works via API verification in Phase 3)
**Dependencies:** Phase 3
**Estimated time:** 1-2 hours

## Overview

Create a public webhook endpoint that receives Stripe events, verifies signatures, processes `payment_intent.succeeded` and `payment_intent.payment_failed` events, and publishes corresponding internal events. Configure gateway to route webhook traffic without JWT validation.

## Requirements

- Functional: Webhook endpoint accessible without JWT; Stripe signature verification; idempotent processing; publishes `payment-succeeded`/`payment-failed`/`subscription-payment-success`/`subscription-payment-failure`
- Non-functional: Gateway route added BEFORE catch-all payment route; security via Stripe signature only

## Architecture

```
Stripe Servers
  │  POST /api/v1/payment/webhook
  │  Header: Stripe-Signature: t=...,v1=...
  ▼
Gateway (:8080)
  │  Route: /api/v1/payment/webhook → payment-service:8080
  │  Filter: RemoveRequestHeader=Authorization (strips JWT)
  │  Security: permitAll() for this path
  ▼
payment-service: WebhookController
  │  @PostMapping("/webhook")
  │  Signature verification via Webhook.constructEvent()
  ▼
WebhookService
  │  Idempotency: webhookEventRepository.existsById(event.getId())
  │  Persist WebhookEvent
  │  Dispatch by event type
  ▼
  ├── payment_intent.succeeded
  │     → Create PaymentTransaction (SUCCEEDED, STRIPE)
  │     → Read metadata: correlation_id, user_id, subscription_id
  │     → afterCommit: publish payment-succeeded OR subscription-payment-success
  │
  └── payment_intent.payment_failed
        → Create PaymentTransaction (FAILED, STRIPE)
        → Read metadata: correlation_id, user_id, subscription_id
        → afterCommit: publish payment-failed OR subscription-payment-failure
```

## Related Code Files

### Create
- `payment-service/src/main/java/com/simplestore/payment/controller/WebhookController.java`
- `payment-service/src/main/java/com/simplestore/payment/service/WebhookService.java`

### Modify
- `payment-service/src/main/java/com/simplestore/payment/config/SecurityConfig.java` — `.requestMatchers("/api/v1/payment/webhook").permitAll()`
- `gateway/src/main/resources/application.yml` — add webhook route before catch-all payment route
- `gateway/src/main/java/com/simplestore/gateway/config/SecurityConfig.java` — `.pathMatchers("/api/v1/payment/webhook").permitAll()`

## Implementation Steps

### 1. WebhookController
```java
@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final WebhookService webhookService;
    private final StripeConfig stripeConfig;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        try {
            webhookService.processWebhook(payload, sigHeader,
                    stripeConfig.getWebhookSecret());
            return ResponseEntity.ok("{}");
        } catch (SignatureVerificationException e) {
            log.warn("Invalid webhook signature received");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid signature");
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("{\"error\":\"internal_error\"}");
        }
    }
}
```

### 2. WebhookService

Key behavior:
1. `Webhook.constructEvent(payload, sigHeader, webhookSecret)` — verify signature
2. `webhookEventRepository.existsById(event.getId())` — idempotency guard
3. Persist `WebhookEvent` entity first
4. Switch on `event.getType()`:
   - `payment_intent.succeeded` → extract PI, read metadata, build PaymentTransaction (SUCCEEDED), publish event
   - `payment_intent.payment_failed` → extract PI, read metadata, build PaymentTransaction (FAILED), publish event
5. Detect subscription vs one-time by checking metadata for `subscription_id`:
   - Subscription exists → publish to `subscription-payment-success`/`subscription-payment-failure`
   - No subscription → publish to `payment-succeeded`/`payment-failed`
6. All event publishes use `TransactionSynchronizationManager.registerSynchronization()` with `afterCommit()`

### 3. Gateway route (CRITICAL)

In `gateway/src/main/resources/application.yml`, add BEFORE the catch-all payment route:
```yaml
- id: payment-webhook
  uri: http://payment-service:8080
  predicates:
    - Path=/api/v1/payment/webhook
  filters:
    - RemoveRequestHeader=Authorization
```

Spring Cloud Gateway uses first-match — the webhook route MUST be listed before the existing `/api/v1/payment/**` route.

### 4. Gateway SecurityConfig
```java
.pathMatchers("/api/v1/payment/webhook").permitAll()
```

### 5. Payment-service SecurityConfig
```java
.requestMatchers("/api/v1/payment/webhook").permitAll()
```

Note: The webhook path should be listed in both `.permitAll()` sections (gateway and payment-service). Gateway strips the Authorization header; payment-service's permitAll is defense-in-depth.

## Success Criteria

- [ ] `POST /api/v1/payment/webhook` returns 200 for valid Stripe signature
- [ ] `POST /api/v1/payment/webhook` returns 400 for invalid/missing signature
- [ ] `payment_intent.succeeded` webhook → PaymentTransaction created + PaymentSucceededEvent published
- [ ] `payment_intent.payment_failed` webhook → PaymentTransaction created + PaymentFailedEvent published
- [ ] Subscription webhooks publish `subscription-payment-success`/`subscription-payment-failure`
- [ ] Duplicate event IDs → 200 OK, "Duplicate webhook event ignored" in logs
- [ ] Gateway routes webhook path without JWT validation

## Verification

```bash
# 1. Start Stripe CLI webhook forwarding
stripe listen --forward-to localhost:8080/api/v1/payment/webhook
# Expected: "Ready! Your webhook signing secret is whsec_xxx"

# 2. Set STRIPE_WEBHOOK_SECRET to the whsec_xxx value in docker-compose
# 3. Restart payment-service

# 4. Trigger test event
stripe trigger payment_intent.succeeded
# Expected: 200 OK, webhook_events table has a new row

# 5. Test idempotency
stripe trigger payment_intent.succeeded  # same event ID from step 4
# Expected: 200 OK, "Duplicate webhook event ignored" in logs

# 6. Test invalid signature
curl -X POST http://localhost:8080/api/v1/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}' \
  -H "Stripe-Signature: invalid"
# Expected: 400 Bad Request
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook arrives before saga creates PaymentTransaction in Phase 3 | Low | Webhook handler creates its own PaymentTransaction and publishes event. Saga's `processStripePayment` checks `existsByCorrelationId` — if transaction already exists from webhook, saga skips. |
| Gateway route order wrong | High | Explicitly place webhook route BEFORE catch-all `/api/v1/payment/**` route. Verify with `docker compose logs gateway`. |
| Stripe webhook secret misconfigured | High | All webhooks fail with 400. Check `STRIPE_WEBHOOK_SECRET` matches stripe CLI output. |
| Large payload causes DB column overflow | Low | `payload` column is TEXT (up to 1GB in PostgreSQL). Truncate to 4000 chars for safety. |
