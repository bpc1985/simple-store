# Phase 1: Stripe SDK, Configuration & Entity Changes

**Priority:** P1 (blocks all other phases)
**Dependencies:** None
**Estimated time:** 1-2 hours

## Overview

Add Stripe Java SDK to payment-service, configure Stripe properties via environment variables, add Stripe-related columns to existing entities, install frontend Stripe dependencies.

## Requirements

- Functional: Stripe SDK initializes correctly; entities have new columns; frontend deps installed
- Non-functional: No secrets committed to git; `ddl-auto: update` handles schema changes

## Architecture

No architectural changes — this phase adds dependencies and configuration only. Stripe-specific logic stays in payment-service. Common module remains framework-agnostic.

## Related Code Files

### Create
- `payment-service/src/main/java/com/simplestore/payment/config/StripeConfig.java`
- `payment-service/src/main/java/com/simplestore/payment/model/WebhookEvent.java`
- `payment-service/src/main/java/com/simplestore/payment/repository/WebhookEventRepository.java`
- `payment-service/src/main/java/com/simplestore/payment/model/PaymentProvider.java`

### Modify
- `payment-service/pom.xml` — add stripe-java dependency
- `payment-service/src/main/resources/application.yml` — add stripe config properties
- `payment-service/src/main/java/com/simplestore/payment/model/PaymentAccount.java` — add `stripeCustomerId`
- `payment-service/src/main/java/com/simplestore/payment/model/PaymentTransaction.java` — add `stripePaymentIntentId` and `provider`
- `payment-service/src/main/java/com/simplestore/payment/model/TransactionStatus.java` — add `REQUIRES_ACTION`
- `payment-service/src/main/java/com/simplestore/payment/repository/PaymentAccountRepository.java` — add `findByStripeCustomerId`
- `payment-service/src/main/java/com/simplestore/payment/repository/PaymentTransactionRepository.java` — add `findByStripePaymentIntentId`
- `docker-compose.yml` — add Stripe env vars to payment-service
- `payment-service/src/main/java/com/simplestore/payment/PaymentSeeder.java` — zero out fake balances
- `frontend/apps/storefront/package.json` — add @stripe/stripe-js, @stripe/react-stripe-js
- `frontend/apps/admin/package.json` — add @stripe/stripe-js, @stripe/react-stripe-js
- `frontend/apps/storefront/.env.local` — add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

## Implementation Steps

### 1. StripeConfig.java
```java
package com.simplestore.payment.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class StripeConfig {

    @Value("${stripe.secret-key:}")
    private String secretKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${stripe.publishable-key:}")
    private String publishableKey;

    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isBlank()
                && !secretKey.startsWith("sk_test_placeholder")) {
            Stripe.apiKey = secretKey;
            log.info("Stripe SDK initialized");
        } else {
            log.info("Stripe SDK not initialized — no valid secret key configured");
        }
    }

    public String getWebhookSecret() { return webhookSecret; }
    public String getPublishableKey() { return publishableKey; }
}
```

### 2. WebhookEvent entity
```java
package com.simplestore.payment.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "webhook_events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class WebhookEvent {

    @Id
    private String id;  // Stripe event ID (e.g., "evt_xxx")

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
```

### 3. WebhookEventRepository
```java
package com.simplestore.payment.repository;

import com.simplestore.payment.model.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookEventRepository extends JpaRepository<WebhookEvent, String> {
}
```

### 4. PaymentProvider enum
```java
package com.simplestore.payment.model;

public enum PaymentProvider {
    INTERNAL,
    STRIPE
}
```

### 5. Add stripe-java dependency to payment-service/pom.xml
```xml
<!-- Stripe Java SDK -->
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>28.1.0</version>
</dependency>
```

### 6. application.yml additions
```yaml
stripe:
  secret-key: ${STRIPE_SECRET_KEY:sk_test_placeholder}
  publishable-key: ${STRIPE_PUBLISHABLE_KEY:pk_test_placeholder}
  webhook-secret: ${STRIPE_WEBHOOK_SECRET:whsec_placeholder}

payment.provider: ${PAYMENT_PROVIDER:internal}
```

### 7. PaymentAccount.java — add field
```java
@Column(length = 50, unique = true)
private String stripeCustomerId;
```

### 8. PaymentTransaction.java — add fields
```java
@Column(length = 50)
private String stripePaymentIntentId;

@Enumerated(EnumType.STRING)
@Column(length = 10)
@Builder.Default
private PaymentProvider provider = PaymentProvider.INTERNAL;
```

### 9. TransactionStatus.java — add REQUIRES_ACTION
```java
public enum TransactionStatus {
    PENDING,
    REQUIRES_ACTION,
    SUCCEEDED,
    FAILED
}
```

### 10. Repository additions
- `PaymentAccountRepository`: add `Optional<PaymentAccount> findByStripeCustomerId(String stripeCustomerId);`
- `PaymentTransactionRepository`: add `Optional<PaymentTransaction> findByStripePaymentIntentId(String stripePaymentIntentId);`

### 11. docker-compose.yml
Under `payment-service` → `environment`, add:
```yaml
STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-sk_test_placeholder}
STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}
PAYMENT_PROVIDER: ${PAYMENT_PROVIDER:-internal}
```

### 12. PaymentSeeder — zero out balances
Change `new BigDecimal("10000.00")` → `BigDecimal.ZERO` (same for 5000.00 and 3000.00)

### 13. Frontend dependencies
```bash
cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js --workspace=storefront
cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js --workspace=admin
```

### 14. .env.local
Add to storefront: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder`

## Success Criteria

- [ ] `mvn -pl payment-service -am clean install -DskipTests` passes
- [ ] `StripeConfig` bean initialized in Spring context (check startup logs)
- [ ] `PaymentAccount` has `stripeCustomerId` column in DB
- [ ] `PaymentTransaction` has `stripePaymentIntentId` and `provider` columns
- [ ] `webhook_events` table created
- [ ] `cd frontend && npx turbo build` succeeds
- [ ] Docker Compose starts payment-service without errors (defaults to internal mode)
- [ ] `git diff --cached | grep -E "sk_live|sk_test_?[a-zA-Z0-9]"` returns nothing — no secrets committed

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `ddl-auto: update` doesn't add columns correctly | Medium | Verify with `\d payment_accounts` and `\d payment_transactions` in PostgreSQL after first boot |
| Secret key exposure | Critical | Use env var defaults with placeholder values; never commit real keys; `.env.local` already gitignored |
| Stripe SDK version conflict with transitive deps | Low | `stripe-java` has minimal transitive deps; test compile |
