---
phase: 8
title: "Stripe Phase 1 (SDK Config + Customer API)"
status: pending
priority: P1
dependencies: []
effort: "2-3h"
---

# Phase 8: Stripe Phase 1 (SDK Config + Customer API)

## Overview

First phase of the 9-phase Stripe plan (`plans/260718-1948-stripe-payment-integration/`). Add Stripe SDK dependency, `payment.provider` config flag, and Stripe Customer create/retrieve API. Internal wallet mode remains the default.

## Requirements

- Functional: `payment.provider=stripe` activates Stripe; `payment.provider=internal` keeps existing wallet
- Non-functional: Stripe SDK lazy-initialized; no Stripe API calls when provider is `internal`

## Related Code Files

- **Modify**: `payment-service/pom.xml` — add stripe-java dependency
- **Modify**: `payment-service/src/main/resources/application.yml` — add Stripe config
- **Modify**: `payment-service/.../model/PaymentAccount.java` — add `stripeCustomerId` field
- **Create**: `payment-service/.../config/StripeConfig.java` — Stripe client bean
- **Create**: `payment-service/.../service/StripeCustomerService.java` — create/retrieve Stripe Customer
- **Reference**: `plans/260718-1948-stripe-payment-integration/phase-01-stripe-sdk-and-config.md`

## Implementation Steps

### 1. Add Stripe SDK

```xml
<!-- payment-service/pom.xml -->
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>28.0.0</version>
</dependency>
```

### 2. Add config

```yaml
# payment-service/application.yml
payment:
  provider: ${PAYMENT_PROVIDER:internal}   # internal | stripe
  stripe:
    api-key: ${STRIPE_API_KEY:}
    webhook-secret: ${STRIPE_WEBHOOK_SECRET:}
```

### 3. Create StripeConfig

```java
@Configuration
@ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")
public class StripeConfig {
    @Value("${payment.stripe.api-key}")
    private String apiKey;

    @Bean
    public Stripe stripeClient() {
        Stripe.apiKey = apiKey;  // or return new Stripe(apiKey) for SDK v28+
        return new Stripe(apiKey);
    }
}
```

Use `@ConditionalOnProperty` so Stripe beans only exist when provider=stripe.

### 4. Add stripeCustomerId to PaymentAccount

```java
// PaymentAccount.java — add nullable column
@Column(nullable = true, unique = true)
private String stripeCustomerId;
```

### 5. Create StripeCustomerService

```java
@Service
@ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")
public class StripeCustomerService {
    // getOrCreateCustomer(userId, email) — creates Stripe Customer if no stripeCustomerId
    // retrieveCustomer(stripeCustomerId) — fetches from Stripe API
}
```

Customer creation lazy — only when first payment is attempted.

### 6. Wire provider selection

In `PaymentService`, add provider-conditional logic:
```java
@Value("${payment.provider}")
private String paymentProvider;

if ("stripe".equals(paymentProvider)) {
    // delegate to Stripe path (future phases)
} else {
    // existing internal wallet logic
}
```

## Success Criteria

- [ ] `stripe-java` dependency added without conflicts
- [ ] `payment.provider=internal` (default) — existing behavior unchanged
- [ ] `payment.provider=stripe` with valid `STRIPE_API_KEY` — Stripe Customer creation works
- [ ] `PaymentAccount.stripeCustomerId` column added (nullable, no migration needed per existing `ddl-auto: update`)
- [ ] `mvn -pl payment-service -am clean install -DskipTests` passes
- [ ] No Stripe API calls when provider is `internal`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `stripe-java` version conflicts with Spring Boot managed deps | stripe-java has no Spring dependencies; self-contained |
| `ddl-auto: update` adds column incorrectly | Single nullable String column — Hibernate handles fine |
| Hard to test without Stripe keys | Default provider=internal works without keys; conditional beans prevent startup errors |
