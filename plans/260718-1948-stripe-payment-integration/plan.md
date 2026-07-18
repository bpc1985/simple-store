# Stripe Payment Integration — Implementation Plan

**Branch:** `feature/stripe-integration`
**Created:** 2026-07-18
**Status:** draft

## Context

SimpleStore uses an internal wallet/pseudo-payment system. `PaymentAccount` entities hold a `balance` (BigDecimal). `PaymentService.processPayment()` checks `account.balance >= event.amount()` — if sufficient it deducts and publishes `PaymentSucceededEvent`; otherwise `PaymentFailedEvent`. Same pattern for subscription recurring billing. No external payment processor exists anywhere.

This plan replaces the mock system with Stripe for one-time checkout and recurring subscription billing, preserving the event-driven saga architecture. Internal mode remains available behind `payment.provider=internal` for local dev without Stripe keys.

---

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

### Complete Payment Flow (order-to-confirmation)

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

### Subscription Recurring Flow

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
                amount: event.amount() * 100,  // dollars→cents
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

---

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

---

## Phase 1: Stripe SDK, Configuration & Entity Changes

**Priority:** P1 (blocks all other phases)
**Dependencies:** None
**Estimated time:** 1-2 hours

### Files to Create

1. **`payment-service/src/main/java/com/simplestore/payment/config/StripeConfig.java`**
   - Purpose: Initialize Stripe SDK with API key from environment
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

2. **`payment-service/src/main/java/com/simplestore/payment/model/WebhookEvent.java`**
   - Purpose: Idempotency store for processed Stripe webhook events
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

3. **`payment-service/src/main/java/com/simplestore/payment/repository/WebhookEventRepository.java`**
   ```java
   package com.simplestore.payment.repository;

   import com.simplestore.payment.model.WebhookEvent;
   import org.springframework.data.jpa.repository.JpaRepository;

   public interface WebhookEventRepository extends JpaRepository<WebhookEvent, String> {
   }
   ```

### Files to Modify

4. **`payment-service/pom.xml`**
   - Add after the last `</dependency>` (before `</dependencies>`):
   ```xml
   <!-- Stripe Java SDK -->
   <dependency>
       <groupId>com.stripe</groupId>
       <artifactId>stripe-java</artifactId>
       <version>28.1.0</version>
   </dependency>
   ```

5. **`payment-service/src/main/resources/application.yml`**
   - Add before `jwt.secret`:
   ```yaml
   stripe:
     secret-key: ${STRIPE_SECRET_KEY:sk_test_placeholder}
     publishable-key: ${STRIPE_PUBLISHABLE_KEY:pk_test_placeholder}
     webhook-secret: ${STRIPE_WEBHOOK_SECRET:whsec_placeholder}

   payment.provider: ${PAYMENT_PROVIDER:internal}
   ```

6. **`payment-service/src/main/java/com/simplestore/payment/model/PaymentAccount.java`**
   - Add field after `private BigDecimal balance`:
   ```java
   @Column(length = 50, unique = true)
   private String stripeCustomerId;
   ```
   - Add to `@Builder` via Lombok (auto-included)

7. **`payment-service/src/main/java/com/simplestore/payment/model/PaymentTransaction.java`**
   - Add fields after `private TransactionType type`:
   ```java
   @Column(length = 50)
   private String stripePaymentIntentId;

   @Enumerated(EnumType.STRING)
   @Column(length = 10)
   @Builder.Default
   private PaymentProvider provider = PaymentProvider.INTERNAL;
   ```

8. **`payment-service/src/main/java/com/simplestore/payment/model/PaymentProvider.java`** (NEW enum)
   ```java
   package com.simplestore.payment.model;

   public enum PaymentProvider {
       INTERNAL,
       STRIPE
   }
   ```

9. **`payment-service/src/main/java/com/simplestore/payment/model/TransactionStatus.java`**
   - Add `REQUIRES_ACTION`:
   ```java
   public enum TransactionStatus {
       PENDING,
       REQUIRES_ACTION,
       SUCCEEDED,
       FAILED
   }
   ```

10. **`payment-service/src/main/java/com/simplestore/payment/repository/PaymentAccountRepository.java`**
    - Add method:
    ```java
    Optional<PaymentAccount> findByStripeCustomerId(String stripeCustomerId);
    ```

11. **`payment-service/src/main/java/com/simplestore/payment/repository/PaymentTransactionRepository.java`**
    - Add method:
    ```java
    Optional<PaymentTransaction> findByStripePaymentIntentId(String stripePaymentIntentId);
    ```

12. **`docker-compose.yml`**
    - Under `payment-service` → `environment`, add after `JWT_SECRET`:
    ```yaml
    STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-sk_test_placeholder}
    STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
    STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}
    PAYMENT_PROVIDER: ${PAYMENT_PROVIDER:-internal}
    ```

13. **`payment-service/src/main/java/com/simplestore/payment/PaymentSeeder.java`**
    - Replace balance values with `BigDecimal.ZERO`:
    ```java
    // Change line ~35: .balance(new BigDecimal("10000.00"))  →  .balance(BigDecimal.ZERO)
    // Change line ~40: .balance(new BigDecimal("5000.00"))   →  .balance(BigDecimal.ZERO)
    // Change line ~45: .balance(new BigDecimal("3000.00"))   →  .balance(BigDecimal.ZERO)
    ```

14. **`frontend/apps/storefront/package.json`**
    - Run: `cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js --workspace=storefront`

15. **`frontend/apps/storefront/.env.local`** (or create if missing)
    ```
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
    ```

16. **`frontend/apps/admin/package.json`**
    - Run: `cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js --workspace=admin`

### Verification

```bash
# Build backend
mvn -pl payment-service -am clean install -DskipTests
# Expected: BUILD SUCCESS, no compile errors

# Build frontend
cd frontend && npx turbo build
# Expected: both apps build successfully

# Verify no secrets committed
git diff --cached | grep -E "sk_live|sk_test_?[a-zA-Z0-9]" && echo "WARNING: secrets found!" || echo "OK"
```

### Success Criteria
- [ ] `StripeConfig` bean initialized in Spring context (check startup logs)
- [ ] `PaymentAccount` has `stripeCustomerId` column in DB
- [ ] `PaymentTransaction` has `stripePaymentIntentId` and `provider` columns
- [ ] `webhook_events` table created
- [ ] Frontend builds with `@stripe/react-stripe-js` on classpath
- [ ] Docker Compose starts payment-service without errors (defaults to internal mode)
- [ ] No real API keys committed to git

---

## Phase 2: Stripe Customer & Payment Method Management (Backend)

**Priority:** P1
**Dependencies:** Phase 1
**Estimated time:** 2-3 hours

### Files to Create

1. **`payment-service/src/main/java/com/simplestore/payment/service/StripeCustomerService.java`**
   ```java
   package com.simplestore.payment.service;

   import com.simplestore.payment.model.PaymentAccount;
   import com.simplestore.payment.repository.PaymentAccountRepository;
   import com.stripe.exception.StripeException;
   import com.stripe.model.Customer;
   import com.stripe.model.PaymentMethod;
   import com.stripe.param.CustomerCreateParams;
   import com.stripe.param.CustomerUpdateParams;
   import com.stripe.param.PaymentMethodAttachParams;
   import lombok.RequiredArgsConstructor;
   import lombok.extern.slf4j.Slf4j;
   import org.springframework.stereotype.Service;
   import org.springframework.transaction.annotation.Transactional;

   import java.time.Instant;
   import java.util.List;
   import java.util.Optional;

   @Service
   @RequiredArgsConstructor
   @Slf4j
   public class StripeCustomerService {

       private final PaymentAccountRepository paymentAccountRepository;

       @Transactional
       public String findOrCreateStripeCustomerId(String userId, String email, String name) {
           PaymentAccount account = paymentAccountRepository.findByUserId(userId)
                   .orElseThrow(() -> new RuntimeException(
                           "Payment account not found for user: " + userId));

           if (account.getStripeCustomerId() != null) {
               log.debug("Stripe customer already exists: userId={}, customerId={}",
                       userId, account.getStripeCustomerId());
               return account.getStripeCustomerId();
           }

           CustomerCreateParams params = CustomerCreateParams.builder()
                   .setEmail(email)
                   .setName(name)
                   .putMetadata("user_id", userId)
                   .build();

           try {
               Customer customer = Customer.create(params);
               account.setStripeCustomerId(customer.getId());
               account.setUpdatedAt(Instant.now());
               paymentAccountRepository.save(account);
               log.info("Created Stripe customer {} for userId={}", customer.getId(), userId);
               return customer.getId();
           } catch (StripeException e) {
               log.error("Failed to create Stripe customer for userId={}: {}", userId, e.getMessage());
               throw new RuntimeException("Failed to create Stripe customer: " + e.getMessage(), e);
           }
       }

       public Optional<PaymentAccount> findByStripeCustomerId(String stripeCustomerId) {
           return paymentAccountRepository.findByStripeCustomerId(stripeCustomerId);
       }

       @Transactional
       public String attachPaymentMethod(String userId, String paymentMethodId) {
           PaymentAccount account = paymentAccountRepository.findByUserId(userId)
                   .orElseThrow(() -> new RuntimeException("No payment account"));

           String customerId = account.getStripeCustomerId();
           if (customerId == null) {
               throw new RuntimeException("No Stripe customer for userId: " + userId);
           }

           try {
               PaymentMethod pm = PaymentMethod.retrieve(paymentMethodId);
               PaymentMethodAttachParams attachParams = PaymentMethodAttachParams.builder()
                       .setCustomer(customerId)
                       .build();
               pm.attach(attachParams);

               // Set as default payment method
               CustomerUpdateParams updateParams = CustomerUpdateParams.builder()
                       .setInvoiceSettings(
                           CustomerUpdateParams.InvoiceSettings.builder()
                               .setDefaultPaymentMethod(paymentMethodId)
                               .build()
                       )
                       .build();
               Customer.update(customerId, updateParams);

               log.info("Attached payment method {} to customer {}", paymentMethodId, customerId);
               return paymentMethodId;
           } catch (StripeException e) {
               log.error("Failed to attach payment method for userId={}: {}", userId, e.getMessage());
               throw new RuntimeException("Failed to save payment method: " + e.getMessage(), e);
           }
       }

       public List<PaymentMethod> listPaymentMethods(String userId) {
           PaymentAccount account = paymentAccountRepository.findByUserId(userId)
                   .orElseThrow(() -> new RuntimeException("No payment account"));
           if (account.getStripeCustomerId() == null) return List.of();

           try {
               return PaymentMethod.list(
                   com.stripe.param.PaymentMethodListParams.builder()
                       .setCustomer(account.getStripeCustomerId())
                       .setType(com.stripe.param.PaymentMethodListParams.Type.CARD)
                       .build()
               ).getData();
           } catch (StripeException e) {
               log.error("Failed to list payment methods: {}", e.getMessage());
               return List.of();
           }
       }

       public void detachPaymentMethod(String paymentMethodId) {
           try {
               PaymentMethod pm = PaymentMethod.retrieve(paymentMethodId);
               pm.detach();
               log.info("Detached payment method {}", paymentMethodId);
           } catch (StripeException e) {
               log.error("Failed to detach payment method {}: {}", paymentMethodId, e.getMessage());
               throw new RuntimeException("Failed to remove payment method", e);
           }
       }
   }
   ```

2. **`payment-service/src/main/java/com/simplestore/payment/service/StripePaymentService.java`**
   ```java
   package com.simplestore.payment.service;

   import com.simplestore.payment.dto.CreatePaymentIntentRequest;
   import com.simplestore.payment.dto.CreatePaymentIntentResponse;
   import com.simplestore.payment.dto.CreateSetupIntentResponse;
   import com.simplestore.payment.model.PaymentAccount;
   import com.simplestore.payment.repository.PaymentAccountRepository;
   import com.stripe.exception.StripeException;
   import com.stripe.model.PaymentIntent;
   import com.stripe.model.SetupIntent;
   import com.stripe.param.PaymentIntentCreateParams;
   import com.stripe.param.SetupIntentCreateParams;
   import lombok.RequiredArgsConstructor;
   import lombok.extern.slf4j.Slf4j;
   import org.springframework.stereotype.Service;

   import java.math.BigDecimal;
   import java.util.UUID;

   @Service
   @RequiredArgsConstructor
   @Slf4j
   public class StripePaymentService {

       private final StripeCustomerService stripeCustomerService;
       private final PaymentAccountRepository paymentAccountRepository;

       public CreatePaymentIntentResponse createPaymentIntent(
               String userId, String userEmail, String userName,
               CreatePaymentIntentRequest request) {

           String customerId = stripeCustomerService.findOrCreateStripeCustomerId(
                   userId, userEmail, userName);

           long amountInCents = request.amount().movePointRight(2).longValueExact();

           PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                   .setAmount(amountInCents)
                   .setCurrency("usd")
                   .setCustomer(customerId)
                   .putMetadata("user_id", userId)
                   .setAutomaticPaymentMethods(
                       PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                           .setEnabled(true)
                           .build()
                   )
                   .setSetupFutureUsage(
                       PaymentIntentCreateParams.SetupFutureUsage.ON_SESSION)
                   .build();

           try {
               PaymentIntent intent = PaymentIntent.create(params);
               log.info("Created PaymentIntent {} for userId={}, amount={}",
                       intent.getId(), userId, request.amount());
               return new CreatePaymentIntentResponse(
                       intent.getClientSecret(), intent.getId());
           } catch (StripeException e) {
               log.error("Failed to create PaymentIntent for userId={}: {}",
                       userId, e.getMessage());
               throw new RuntimeException(
                       "Payment processing failed: " + e.getMessage(), e);
           }
       }

       public CreateSetupIntentResponse createSetupIntent(
               String userId, String email, String name) {

           String customerId = stripeCustomerService.findOrCreateStripeCustomerId(
                   userId, email, name);

           SetupIntentCreateParams params = SetupIntentCreateParams.builder()
                   .setCustomer(customerId)
                   .putMetadata("user_id", userId)
                   .setUsage(SetupIntentCreateParams.Usage.OFF_SESSION)
                   .build();

           try {
               SetupIntent intent = SetupIntent.create(params);
               return new CreateSetupIntentResponse(
                       intent.getClientSecret(), intent.getId());
           } catch (StripeException e) {
               log.error("Failed to create SetupIntent for userId={}: {}", userId, e.getMessage());
               throw new RuntimeException("Failed to create setup intent", e);
           }
       }
   }
   ```

3. **`payment-service/src/main/java/com/simplestore/payment/dto/CreatePaymentIntentRequest.java`**
   ```java
   package com.simplestore.payment.dto;

   import jakarta.validation.constraints.DecimalMin;
   import jakarta.validation.constraints.NotNull;
   import java.math.BigDecimal;

   public record CreatePaymentIntentRequest(
           @NotNull @DecimalMin("0.01") BigDecimal amount
   ) {}
   ```

4. **`payment-service/src/main/java/com/simplestore/payment/dto/CreatePaymentIntentResponse.java`**
   ```java
   package com.simplestore.payment.dto;

   public record CreatePaymentIntentResponse(
           String clientSecret,
           String paymentIntentId
   ) {}
   ```

5. **`payment-service/src/main/java/com/simplestore/payment/dto/CreateSetupIntentResponse.java`**
   ```java
   package com.simplestore.payment.dto;

   public record CreateSetupIntentResponse(
           String clientSecret,
           String setupIntentId
   ) {}
   ```

6. **`payment-service/src/main/java/com/simplestore/payment/dto/PaymentMethodDto.java`**
   ```java
   package com.simplestore.payment.dto;

   public record PaymentMethodDto(
           String id,
           String brand,
           String last4,
           int expMonth,
           int expYear
   ) {}
   ```

### Files to Modify

7. **`payment-service/src/main/java/com/simplestore/payment/controller/PaymentController.java`**
   - **CRITICAL**: Remove class-level `@PreAuthorize("hasRole('ADMIN')")`. Add method-level security instead.
   - Add these new endpoints:
   ```java
   @Operation(summary = "Create payment intent for checkout")
   @PostMapping("/create-payment-intent")
   @PreAuthorize("isAuthenticated()")
   public ApiResponse<CreatePaymentIntentResponse> createPaymentIntent(
           @AuthenticationPrincipal Jwt jwt,
           @Valid @RequestBody CreatePaymentIntentRequest request) {
       String userId = jwt.getSubject();
       String email = jwt.getClaimAsString("email");
       String name = jwt.getClaimAsString("name");
       CreatePaymentIntentResponse response = stripePaymentService
               .createPaymentIntent(userId, email, name, request);
       return ApiResponse.ok(response);
   }

   @Operation(summary = "Create setup intent for saving payment method")
   @PostMapping("/create-setup-intent")
   @PreAuthorize("isAuthenticated()")
   public ApiResponse<CreateSetupIntentResponse> createSetupIntent(
           @AuthenticationPrincipal Jwt jwt) {
       String userId = jwt.getSubject();
       String email = jwt.getClaimAsString("email");
       String name = jwt.getClaimAsString("name");
       CreateSetupIntentResponse response = stripePaymentService
               .createSetupIntent(userId, email, name);
       return ApiResponse.ok(response);
   }

   @Operation(summary = "List saved payment methods")
   @GetMapping("/payment-methods")
   @PreAuthorize("isAuthenticated()")
   public ApiResponse<List<PaymentMethodDto>> listPaymentMethods(
           @AuthenticationPrincipal Jwt jwt) {
       String userId = jwt.getSubject();
       List<PaymentMethod> methods = stripeCustomerService.listPaymentMethods(userId);
       List<PaymentMethodDto> dtos = methods.stream().map(pm -> {
           var card = pm.getCard();
           return new PaymentMethodDto(pm.getId(), card.getBrand(),
                   card.getLast4(), card.getExpMonth().intValue(),
                   card.getExpYear().intValue());
       }).toList();
       return ApiResponse.ok(dtos);
   }

   @Operation(summary = "Remove saved payment method")
   @DeleteMapping("/payment-methods/{id}")
   @PreAuthorize("isAuthenticated()")
   public ApiResponse<Void> detachPaymentMethod(@PathVariable String id) {
       stripeCustomerService.detachPaymentMethod(id);
       return ApiResponse.ok(null);
   }
   ```
   - Keep existing admin endpoints with `@PreAuthorize("hasRole('ADMIN')")` at method level.

8. **`payment-service/src/main/java/com/simplestore/payment/config/SecurityConfig.java`**
   - Ensure these paths don't require ADMIN role:
   ```java
   .requestMatchers(
       "/api/v1/payment/create-payment-intent",
       "/api/v1/payment/create-setup-intent",
       "/api/v1/payment/payment-methods/**",
       "/api/v1/payment/webhook"           // added in Phase 4 but permit now
   ).authenticated()  // most need auth; webhook needs permitAll — handle in Phase 4
   ```

### Verification

```bash
# Test create-payment-intent (replace TOKEN with actual JWT)
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@store.com","password":"User123!"}' | jq -r '.data.token')

curl -s -X POST http://localhost:8080/api/v1/payment/create-payment-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 29.99}' | jq .
# Expected: {"success":true,"data":{"clientSecret":"pi_xxx_secret_xxx","paymentIntentId":"pi_xxx"}}

# Check Stripe Dashboard → Payments → should see the PaymentIntent in test mode
# Check Stripe Dashboard → Customers → should see a new customer created
```

### Success Criteria
- [ ] `POST /api/v1/payment/create-payment-intent` returns valid clientSecret
- [ ] `POST /api/v1/payment/create-setup-intent` returns valid setup intent clientSecret
- [ ] `GET /api/v1/payment/payment-methods` returns saved cards (empty initially)
- [ ] Stripe Dashboard (test mode) shows PaymentIntents and Customers
- [ ] `StripeCustomerService` lazily creates Customer on first call, reuses on subsequent calls
- [ ] Admin-only endpoints still require ADMIN role

---

## Phase 3: One-Time Payment — Backend Saga Integration

**Priority:** P1
**Dependencies:** Phase 2
**Estimated time:** 2-3 hours

### Files to Modify

1. **`common/src/main/java/com/simplestore/common/event/ProcessPaymentRequestedEvent.java`**
   - Add field (Java record — add to parameter list):
   ```java
   public record ProcessPaymentRequestedEvent(
           UUID correlationId,
           String userId,
           BigDecimal amount,
           String paymentIntentId    // NEW — nullable, null for internal mode
   ) implements Serializable {}
   ```

2. **`common/src/main/java/com/simplestore/common/event/PaymentSucceededEvent.java`**
   ```java
   public record PaymentSucceededEvent(
           UUID correlationId,
           String userId,
           String stripePaymentIntentId    // NEW — nullable
   ) implements Serializable {}
   ```

3. **`common/src/main/java/com/simplestore/common/event/PaymentFailedEvent.java`**
   ```java
   public record PaymentFailedEvent(
           UUID correlationId,
           String userId,
           String reason,
           String stripePaymentIntentId    // NEW — nullable
   ) implements Serializable {}
   ```

4. **`common/src/main/java/com/simplestore/common/event/OrderSubmittedEvent.java`**
   - Add `String paymentIntentId` as the LAST parameter:
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

5. **`order-service/src/main/java/com/simplestore/order/model/Order.java`**
   - Add field:
   ```java
   @Column(length = 50)
   private String paymentIntentId;
   ```

6. **`order-service/src/main/java/com/simplestore/order/dto/CreateOrderRequest.java`**
   - Add field:
   ```java
   public record CreateOrderRequest(
           String shippingAddress,
           List<OrderItemRequest> items,
           String paymentIntentId    // NEW — optional
   ) {
       public record OrderItemRequest(UUID productId, String productName,
               int quantity, BigDecimal unitPrice) {}
   }
   ```

7. **`order-service/src/main/java/com/simplestore/order/service/OrderService.java`**
   - Store `paymentIntentId` on Order entity:
   ```java
   // In createOrder(), after building Order:
   Order order = Order.builder()
           .userId(userId)
           .totalAmount(total)
           .shippingAddress(request.shippingAddress())
           .paymentIntentId(request.paymentIntentId())  // NEW
           .status(OrderStatus.PENDING)
           .build();
   ```
   - Include paymentIntentId in OrderSubmittedEvent (add as last parameter):
   ```java
   OrderSubmittedEvent event = new OrderSubmittedEvent(
           correlationId, orderUserId, orderDate, totalAmount,
           shippingAddr, itemDetails, order.getPaymentIntentId());  // NEW parameter
   ```

8. **`checkout-service/src/main/java/com/simplestore/checkout/model/CheckoutSagaState.java`**
   - Add field:
   ```java
   @Column(length = 50)
   private String paymentIntentId;
   ```

9. **`checkout-service/src/main/java/com/simplestore/checkout/saga/CheckoutSagaOrchestrator.java`**
   - In `handleOrderSubmitted()`: store paymentIntentId from event into saga state:
   ```java
   saga.setPaymentIntentId(event.paymentIntentId());
   ```
   - In `handleStockReserved()`: include paymentIntentId when publishing ProcessPaymentRequestedEvent:
   ```java
   ProcessPaymentRequestedEvent paymentEvent = new ProcessPaymentRequestedEvent(
           event.correlationId(), saga.getUserId(), saga.getTotalAmount(),
           saga.getPaymentIntentId());  // NEW parameter
   ```
   - In `handlePaymentSucceeded()`: pass stripePaymentIntentId to event:
   ```java
   // Replace: new PaymentSucceededEvent(event.correlationId(), saga.getUserId())
   // With:
   new PaymentSucceededEvent(event.correlationId(), saga.getUserId(),
           event.stripePaymentIntentId())
   ```
   - In `handlePaymentFailed()`: pass stripePaymentIntentId to event:
   ```java
   new PaymentFailedEvent(event.correlationId(), saga.getUserId(),
           event.reason(), event.stripePaymentIntentId())
   ```

10. **`payment-service/src/main/java/com/simplestore/payment/service/PaymentService.java`**
    - Add `@Value("${payment.provider:internal}") private String paymentProvider;`
    - Modify `processPayment()` to branch:
    ```java
    @Transactional
    public void processPayment(ProcessPaymentRequestedEvent event) {
        log.info("Processing payment for correlationId={}, userId={}, amount={}, provider={}",
                event.correlationId(), event.userId(), event.amount(), paymentProvider);

        if ("stripe".equals(paymentProvider)) {
            processStripePayment(event);
            return;
        }
        processInternalPayment(event);  // existing logic, extracted method
    }

    private void processStripePayment(ProcessPaymentRequestedEvent event) {
        // Idempotency guard
        if (paymentTransactionRepository.existsByCorrelationId(event.correlationId())) {
            log.warn("Duplicate payment event ignored: correlationId={}", event.correlationId());
            return;
        }

        if (event.paymentIntentId() == null) {
            log.error("Stripe mode but no paymentIntentId in event: correlationId={}",
                    event.correlationId());
            publishPaymentFailed(event, "Missing paymentIntentId in Stripe mode", null);
            return;
        }

        // Verify PaymentIntent status via Stripe API
        PaymentIntent pi;
        try {
            pi = PaymentIntent.retrieve(event.paymentIntentId());
        } catch (StripeException e) {
            log.error("Failed to retrieve PaymentIntent {}: {}",
                    event.paymentIntentId(), e.getMessage());
            publishPaymentFailed(event, "Failed to verify payment: " + e.getMessage(),
                    event.paymentIntentId());
            return;
        }

        PaymentTransaction transaction = PaymentTransaction.builder()
                .correlationId(event.correlationId())
                .userId(event.userId())
                .amount(event.amount())
                .type(TransactionType.CHARGE)
                .provider(PaymentProvider.STRIPE)
                .stripePaymentIntentId(event.paymentIntentId())
                .createdAt(Instant.now())
                .build();

        if ("succeeded".equals(pi.getStatus())) {
            transaction.setStatus(TransactionStatus.SUCCEEDED);
            paymentTransactionRepository.save(transaction);
            log.info("Stripe payment verified: correlationId={}, pi={}, amount={}",
                    event.correlationId(), event.paymentIntentId(), event.amount());

            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        boolean sent = streamBridge.send("payment-succeeded",
                                new PaymentSucceededEvent(event.correlationId(),
                                        event.userId(), event.paymentIntentId()));
                        if (!sent) log.error("Failed to send payment-succeeded for correlationId={}",
                                event.correlationId());
                    }
                });
        } else {
            String reason = "Stripe payment status: " + pi.getStatus();
            if (pi.getLastPaymentError() != null) {
                reason = pi.getLastPaymentError().getMessage();
            }
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setReason(reason);
            paymentTransactionRepository.save(transaction);
            log.warn("Stripe payment not succeeded: correlationId={}, pi={}, status={}",
                    event.correlationId(), event.paymentIntentId(), pi.getStatus());

            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        boolean sent = streamBridge.send("payment-failed",
                                new PaymentFailedEvent(event.correlationId(),
                                        event.userId(), reason, event.paymentIntentId()));
                        if (!sent) log.error("Failed to send payment-failed for correlationId={}",
                                event.correlationId());
                    }
                });
        }
    }

    private void processInternalPayment(ProcessPaymentRequestedEvent event) {
        // EXISTING code from current processPayment() — extract the balance-check
        // logic here. No changes needed.
        PaymentAccount account = findOrCreateAccount(event.userId());
        // ... existing balance-check, transaction creation, event publishing ...
    }

    private void publishPaymentFailed(ProcessPaymentRequestedEvent event,
                                       String reason, String paymentIntentId) {
        PaymentTransaction transaction = PaymentTransaction.builder()
                .correlationId(event.correlationId())
                .userId(event.userId())
                .amount(event.amount())
                .type(TransactionType.CHARGE)
                .status(TransactionStatus.FAILED)
                .reason(reason)
                .provider(PaymentProvider.STRIPE)
                .stripePaymentIntentId(paymentIntentId)
                .createdAt(Instant.now())
                .build();
        paymentTransactionRepository.save(transaction);

        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    streamBridge.send("payment-failed",
                            new PaymentFailedEvent(event.correlationId(),
                                    event.userId(), reason, paymentIntentId));
                }
            });
    }
    ```
    - Also add these imports:
    ```java
    import com.simplestore.payment.model.PaymentProvider;
    import com.stripe.exception.StripeException;
    import com.stripe.model.PaymentIntent;
    import org.springframework.beans.factory.annotation.Value;
    ```

11. **`order-service/src/main/java/com/simplestore/order/dto/OrderDto.java`**
    - Add field:
    ```java
    String paymentIntentId   // in the record parameters
    ```
    - In `OrderService.toOrderDto()`:
    ```java
    order.getPaymentIntentId()  // as last argument
    ```

### Verification

```bash
# Build all affected modules
mvn clean install -DskipTests
# Expected: BUILD SUCCESS across all 10 modules

# Test internal mode still works
PAYMENT_PROVIDER=internal docker compose up -d payment-service
# Admin deposits funds → checkout → saga completes via balance check

# Test internal mode backward compat (old events without paymentIntentId)
# → PaymentService falls through to processInternalPayment
```

### Success Criteria
- [ ] `ProcessPaymentRequestedEvent` carries `paymentIntentId` through entire saga path
- [ ] `PaymentService.processPayment()` calls Stripe API to verify PI status
- [ ] `PaymentSucceededEvent`/`PaymentFailedEvent` include `stripePaymentIntentId`
- [ ] Internal mode (`PAYMENT_PROVIDER=internal`) unchanged and working
- [ ] Build passes with new fields on all event records (Java record — must update all call sites)

---

## Phase 4: Stripe Webhook Endpoint

**Priority:** P2 (safety net — primary flow works via API verification in Phase 3)
**Dependencies:** Phase 3
**Estimated time:** 1-2 hours

### Files to Create

1. **`payment-service/src/main/java/com/simplestore/payment/controller/WebhookController.java`**
   ```java
   package com.simplestore.payment.controller;

   import com.simplestore.payment.config.StripeConfig;
   import com.simplestore.payment.service.WebhookService;
   import com.stripe.exception.SignatureVerificationException;
   import com.stripe.net.Webhook;
   import lombok.RequiredArgsConstructor;
   import lombok.extern.slf4j.Slf4j;
   import org.springframework.http.HttpStatus;
   import org.springframework.http.ResponseEntity;
   import org.springframework.web.bind.annotation.*;
   import org.springframework.web.server.ResponseStatusException;

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
               throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                       "Invalid signature");
           } catch (Exception e) {
               log.error("Webhook processing error: {}", e.getMessage(), e);
               return ResponseEntity.status(500).body(
                       "{\"error\":\"internal_error\"}");
           }
       }
   }
   ```

2. **`payment-service/src/main/java/com/simplestore/payment/service/WebhookService.java`**
   ```java
   package com.simplestore.payment.service;

   import com.simplestore.common.event.PaymentFailedEvent;
   import com.simplestore.common.event.PaymentSucceededEvent;
   import com.simplestore.payment.model.*;
   import com.simplestore.payment.repository.PaymentTransactionRepository;
   import com.simplestore.payment.repository.WebhookEventRepository;
   import com.stripe.exception.SignatureVerificationException;
   import com.stripe.model.Event;
   import com.stripe.model.EventDataObjectDeserializer;
   import com.stripe.model.PaymentIntent;
   import com.stripe.net.Webhook;
   import lombok.RequiredArgsConstructor;
   import lombok.extern.slf4j.Slf4j;
   import org.springframework.cloud.stream.function.StreamBridge;
   import org.springframework.stereotype.Service;
   import org.springframework.transaction.annotation.Transactional;
   import org.springframework.transaction.support.TransactionSynchronization;
   import org.springframework.transaction.support.TransactionSynchronizationManager;

   import java.math.BigDecimal;
   import java.time.Instant;
   import java.util.UUID;

   @Service
   @RequiredArgsConstructor
   @Slf4j
   public class WebhookService {

       private final WebhookEventRepository webhookEventRepository;
       private final PaymentTransactionRepository paymentTransactionRepository;
       private final StreamBridge streamBridge;

       @Transactional
       public void processWebhook(String payload, String sigHeader,
                                   String webhookSecret)
               throws SignatureVerificationException {

           Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

           // Idempotency — Stripe may redeliver events
           if (webhookEventRepository.existsById(event.getId())) {
               log.info("Duplicate webhook event {} ignored", event.getId());
               return;
           }

           // Persist event first
           WebhookEntity webhookEntity = WebhookEntity.builder()
                   .id(event.getId())
                   .type(event.getType())
                   .payload(truncate(payload, 4000))
                   .createdAt(Instant.now())
                   .build();
           webhookEventRepository.save(webhookEntity);

           // Dispatch by event type
           switch (event.getType()) {
               case "payment_intent.succeeded":
                   handlePaymentIntentSucceeded(event);
                   break;
               case "payment_intent.payment_failed":
                   handlePaymentIntentFailed(event);
                   break;
               default:
                   log.debug("Unhandled webhook event type: {}", event.getType());
           }
       }

       private void handlePaymentIntentSucceeded(Event event) {
           PaymentIntent pi = deserialize(event, PaymentIntent.class);
           if (pi == null) return;

           String correlationIdStr = pi.getMetadata().get("correlation_id");
           String userId = pi.getMetadata().get("user_id");
           String subscriptionId = pi.getMetadata().get("subscription_id");

           if (correlationIdStr == null || userId == null) {
               log.warn("Missing metadata in PaymentIntent {}: correlation_id={}, user_id={}",
                       pi.getId(), correlationIdStr, userId);
               return;
           }

           UUID correlationId = UUID.fromString(correlationIdStr);

           if (paymentTransactionRepository.existsByCorrelationId(correlationId)) {
               log.info("Transaction already exists for correlationId={} (race with saga check)",
                       correlationId);
               return;
           }

           BigDecimal amount = BigDecimal.valueOf(pi.getAmount()).movePointLeft(2);
           PaymentTransaction tx = PaymentTransaction.builder()
                   .correlationId(correlationId)
                   .userId(userId)
                   .amount(amount)
                   .type(TransactionType.CHARGE)
                   .status(TransactionStatus.SUCCEEDED)
                   .provider(PaymentProvider.STRIPE)
                   .stripePaymentIntentId(pi.getId())
                   .createdAt(Instant.now())
                   .build();
           paymentTransactionRepository.save(tx);

           // Publish based on whether this is a subscription or one-time payment
           TransactionSynchronizationManager.registerSynchronization(
               new TransactionSynchronization() {
                   @Override
                   public void afterCommit() {
                       if (subscriptionId != null) {
                           // Subscription payment
                           String cycleStr = pi.getMetadata().get("cycle_number");
                           int cycleNumber = cycleStr != null ? Integer.parseInt(cycleStr) : 0;
                           streamBridge.send("subscription-payment-success",
                               new com.simplestore.common.event.SubscriptionPaymentSuccessEvent(
                                   correlationId, UUID.fromString(subscriptionId),
                                   pi.getId(), cycleNumber));
                       } else {
                           // One-time checkout payment
                           streamBridge.send("payment-succeeded",
                               new PaymentSucceededEvent(correlationId, userId, pi.getId()));
                       }
                   }
               });
       }

       private void handlePaymentIntentFailed(Event event) {
           PaymentIntent pi = deserialize(event, PaymentIntent.class);
           if (pi == null) return;

           String correlationIdStr = pi.getMetadata().get("correlation_id");
           String userId = pi.getMetadata().get("user_id");
           String subscriptionId = pi.getMetadata().get("subscription_id");

           if (correlationIdStr == null || userId == null) return;

           UUID correlationId = UUID.fromString(correlationIdStr);

           if (paymentTransactionRepository.existsByCorrelationId(correlationId)) return;

           String reason = pi.getLastPaymentError() != null
                   ? pi.getLastPaymentError().getMessage()
                   : "Payment failed";

           BigDecimal amount = BigDecimal.valueOf(pi.getAmount()).movePointLeft(2);
           PaymentTransaction tx = PaymentTransaction.builder()
                   .correlationId(correlationId)
                   .userId(userId)
                   .amount(amount)
                   .type(TransactionType.CHARGE)
                   .status(TransactionStatus.FAILED)
                   .reason(reason)
                   .provider(PaymentProvider.STRIPE)
                   .stripePaymentIntentId(pi.getId())
                   .createdAt(Instant.now())
                   .build();
           paymentTransactionRepository.save(tx);

           TransactionSynchronizationManager.registerSynchronization(
               new TransactionSynchronization() {
                   @Override
                   public void afterCommit() {
                       if (subscriptionId != null) {
                           String cycleStr = pi.getMetadata().get("cycle_number");
                           int cycleNumber = cycleStr != null ? Integer.parseInt(cycleStr) : 0;
                           streamBridge.send("subscription-payment-failure",
                               new com.simplestore.common.event.SubscriptionPaymentFailedEvent(
                                   correlationId, UUID.fromString(subscriptionId),
                                   cycleNumber, reason));
                       } else {
                           streamBridge.send("payment-failed",
                               new PaymentFailedEvent(correlationId, userId, reason, pi.getId()));
                       }
                   }
               });
       }

       @SuppressWarnings("unchecked")
       private <T> T deserialize(Event event, Class<T> clazz) {
           EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
           return (T) deserializer.getObject().orElse(null);
       }

       private static String truncate(String s, int maxLen) {
           return s.length() <= maxLen ? s : s.substring(0, maxLen);
       }
   }
   ```

### Files to Modify

3. **`payment-service/src/main/java/com/simplestore/payment/config/SecurityConfig.java`**
   - **CRITICAL**: Webhook must be public — no JWT validation:
   ```java
   .requestMatchers("/api/v1/payment/webhook").permitAll()
   ```

4. **`gateway/src/main/resources/application.yml`**
   - Add webhook route BEFORE the catch-all payment route. In the `spring.cloud.gateway.routes` section, add:
   ```yaml
   - id: payment-webhook
     uri: http://payment-service:8080
     predicates:
       - Path=/api/v1/payment/webhook
     filters:
       # No JWT filter — Stripe sends request directly
       - RemoveRequestHeader=Authorization
   ```
   - The existing payment route catches `/api/v1/payment/**` — ensure the webhook route is listed **before** it (Spring Cloud Gateway uses first-match).

5. **`gateway/src/main/java/com/simplestore/gateway/config/SecurityConfig.java`**
   - Add webhook path to public paths:
   ```java
   .pathMatchers("/api/v1/payment/webhook").permitAll()
   ```

### Verification

```bash
# 1. Start Stripe CLI webhook forwarding
stripe listen --forward-to localhost:8080/api/v1/payment/webhook
# Expected: "Ready! Your webhook signing secret is whsec_xxx"

# 2. Copy the whsec_xxx value and set it as STRIPE_WEBHOOK_SECRET in docker-compose
# 3. Restart payment-service with the webhook secret

# 4. Trigger a test event
stripe trigger payment_intent.succeeded
# Expected: 200 OK, webhook_events table has a new row with this event ID

# 5. Trigger same event again (test idempotency)
stripe trigger payment_intent.succeeded
# Expected: 200 OK, "Duplicate webhook event ignored" in logs

# 6. Test invalid signature
curl -X POST http://localhost:8080/api/v1/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}' \
  -H "Stripe-Signature: invalid"
# Expected: 400 Bad Request, "Invalid signature"
```

### Success Criteria
- [ ] Webhook endpoint accessible at `POST /api/v1/payment/webhook` without JWT
- [ ] Stripe signature verification works (valid = 200, invalid = 400)
- [ ] Duplicate events rejected (idempotent by Stripe event ID)
- [ ] `payment_intent.succeeded` → PaymentTransaction created + PaymentSucceededEvent published
- [ ] `payment_intent.payment_failed` → PaymentTransaction created + PaymentFailedEvent published
- [ ] Subscription webhooks publish `subscription-payment-success`/`subscription-payment-failure`

---

## Phase 5: Frontend — Checkout Stripe Integration

**Priority:** P1
**Dependencies:** Phase 3 (backend saga integration), Phase 2 (create-payment-intent endpoint)
**Estimated time:** 3-4 hours

### Files to Create

1. **`frontend/apps/storefront/src/services/payment-service.ts`**
   ```typescript
   import api from "@/lib/api";
   import type { CreatePaymentIntentResponse, CreateSetupIntentResponse } from "@simplestore/shared";

   export const paymentService = {
     createPaymentIntent: (amount: number) =>
       api.post<CreatePaymentIntentResponse>("/api/v1/payment/create-payment-intent", {
         amount,
       }),

     createSetupIntent: () =>
       api.post<CreateSetupIntentResponse>("/api/v1/payment/create-setup-intent"),

     getPaymentMethods: () =>
       api.get<PaymentMethod[]>("/api/v1/payment/payment-methods"),

     deletePaymentMethod: (id: string) =>
       api.delete(`/api/v1/payment/payment-methods/${id}`),

     getPaymentStatus: (correlationId: string) =>
       api.get<PaymentTransaction>(`/api/v1/payment/payment-status/${correlationId}`),
   };

   export interface PaymentMethod {
     id: string;
     brand: string;
     last4: string;
     expMonth: number;
     expYear: number;
   }

   export interface PaymentTransaction {
     id: string;
     correlationId: string;
     status: "PENDING" | "SUCCEEDED" | "FAILED" | "REQUIRES_ACTION";
     provider: "INTERNAL" | "STRIPE";
     stripePaymentIntentId: string | null;
   }
   ```

2. **`frontend/apps/storefront/src/hooks/use-stripe-payment.ts`**
   ```typescript
   import { useMutation } from "@tanstack/react-query";
   import { paymentService } from "@/services/payment-service";

   export function useCreatePaymentIntent() {
     return useMutation({
       mutationFn: (amount: number) => paymentService.createPaymentIntent(amount),
     });
   }

   export function useCreateSetupIntent() {
     return useMutation({
       mutationFn: () => paymentService.createSetupIntent(),
     });
   }

   export function usePaymentMethods() {
     return useQuery({
       queryKey: ["payment-methods"],
       queryFn: () => paymentService.getPaymentMethods(),
     });
   }

   export function useDeletePaymentMethod() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: (id: string) => paymentService.deletePaymentMethod(id),
       onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
     });
   }
   ```

3. **`frontend/apps/storefront/src/components/payment/stripe-provider.tsx`**
   ```tsx
   "use client";

   import { Elements } from "@stripe/react-stripe-js";
   import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
   import { useMemo } from "react";

   const stripePromise = loadStripe(
     process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
   );

   interface StripeProviderProps {
     clientSecret?: string;
     children: React.ReactNode;
   }

   export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
     const options = useMemo<StripeElementsOptions | undefined>(() => {
       if (!clientSecret) return undefined;
       return {
         clientSecret,
         appearance: {
           theme: "stripe",
           variables: {
             colorPrimary: "#2563EB",
             fontFamily: "Montserrat, system-ui, sans-serif",
             borderRadius: "8px",
           },
         },
       };
     }, [clientSecret]);

     if (!clientSecret) return <>{children}</>;

     return (
       <Elements stripe={stripePromise} options={options}>
         {children}
       </Elements>
     );
   }
   ```

4. **`frontend/apps/storefront/src/components/payment/payment-form.tsx`**
   ```tsx
   "use client";

   import {
     PaymentElement,
     useStripe,
     useElements,
   } from "@stripe/react-stripe-js";
   import { useState } from "react";
   import { Button } from "@simplestore/ui";
   import { Alert, AlertDescription } from "@simplestore/ui";
   import { Loader2, Lock } from "lucide-react";

   interface PaymentFormProps {
     amount: number;
     onSuccess: (paymentIntentId: string) => void;
     onError: (message: string) => void;
     disabled?: boolean;
   }

   export default function PaymentForm({
     amount,
     onSuccess,
     onError,
     disabled,
   }: PaymentFormProps) {
     const stripe = useStripe();
     const elements = useElements();
     const [processing, setProcessing] = useState(false);
     const [errorMsg, setErrorMsg] = useState<string | null>(null);

     const handleSubmit = async () => {
       if (!stripe || !elements) return;
       setProcessing(true);
       setErrorMsg(null);

       const { error, paymentIntent } = await stripe.confirmPayment({
         elements,
         confirmParams: {
           // Return URL for redirect-based payment methods (3DS, etc.)
           return_url: `${window.location.origin}/checkout`,
         },
         redirect: "if_required",
       });

       if (error) {
         setErrorMsg(error.message || "Payment failed. Please try again.");
         onError(error.message || "Payment failed");
         setProcessing(false);
         return;
       }

       // No redirect needed — payment confirmed synchronously
       if (paymentIntent && paymentIntent.status === "succeeded") {
         onSuccess(paymentIntent.id);
         setProcessing(false);
         return;
       }

       // Payment requires redirect (3D Secure) — Stripe handles the redirect
       // and returns to `return_url`. The page will re-mount and check URL params.
       setProcessing(false);
     };

     return (
       <div className="space-y-4">
         <div className="rounded-lg border bg-card p-4">
           <div className="flex items-center gap-2 mb-3">
             <Lock className="size-4 text-muted-foreground" />
             <span className="text-sm text-muted-foreground">
               Secured by Stripe
             </span>
           </div>
           <PaymentElement />
         </div>

         {errorMsg && (
           <Alert variant="destructive">
             <AlertDescription>{errorMsg}</AlertDescription>
           </Alert>
         )}

         <Button
           className="w-full h-12"
           size="lg"
           onClick={handleSubmit}
           disabled={!stripe || processing || disabled}
         >
           {processing ? (
             <>
               <Loader2 className="size-4 mr-2 animate-spin" />
               Processing...
             </>
           ) : (
             `Pay $${amount.toFixed(2)}`
           )}
         </Button>

         <p className="text-xs text-muted-foreground text-center">
           Test card: 4242 4242 4242 4242 · Any future date · Any CVC
         </p>
       </div>
     );
   }
   ```

### Files to Modify

5. **`frontend/apps/storefront/src/app/layout.tsx`** — Already wrapped in QueryClient/Auth/Cart providers. StripeProvider wraps selectively (only when clientSecret exists). Since the `Elements` provider needs a clientSecret which is per-PaymentIntent, we wrap checkout page itself, not the root layout. **No layout change needed** — wrap in the checkout page component instead.

6. **`frontend/apps/storefront/src/app/checkout/page.tsx`** — Major refactor:
   - Change `STEPS` from `["Shipping", "Review", "Confirmation"]` to `["Shipping", "Payment", "Review", "Confirmation"]`
   - Add new state:
   ```typescript
   const [clientSecret, setClientSecret] = useState<string | null>(null);
   const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
   const createPaymentIntent = useCreatePaymentIntent();
   ```

   - **Shipping step** (unchanged): collect address
   - **Payment step**: Fetch PaymentIntent on mount, render payment form
   ```tsx
   // Inside the Payment step:
   {step === "Payment" && (
     <>
       <h1 className="text-3xl font-semibold mb-6">Payment</h1>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
           {!clientSecret ? (
             <div className="flex items-center justify-center p-12">
               <Loader2 className="size-6 animate-spin text-muted-foreground" />
               <span className="ml-2 text-muted-foreground">Preparing payment...</span>
             </div>
           ) : (
             <StripeProvider clientSecret={clientSecret}>
               <PaymentForm
                 amount={cartData!.total}
                 onSuccess={(piId) => {
                   setPaymentIntentId(piId);
                   setStep("Review");
                 }}
                 onError={(msg) => toast.error(msg)}
               />
             </StripeProvider>
           )}
         </div>
         <OrderSummary items={cartData!.items} total={cartData!.total} itemCount={itemCount} />
       </div>
     </>
   )}
   ```
   - Add `useEffect` to create PaymentIntent when entering Payment step:
   ```typescript
   useEffect(() => {
     if (step === "Payment" && !clientSecret && cartData?.total) {
       createPaymentIntent.mutate(cartData.total, {
         onSuccess: (data) => setClientSecret(data.clientSecret),
         onError: (err) => toast.error(`Failed to initialize payment: ${err.message}`),
       });
     }
   }, [step, clientSecret, cartData?.total]);
   // Note: add createPaymentIntent to deps — or use ref
   ```

   - **Review step**: "Place Order" now includes paymentIntentId:
   ```typescript
   const onPlaceOrder = () => {
     // ... existing items/shipping logic ...
     createOrder.mutate(
       {
         shippingAddress,
         items,
         paymentIntentId: paymentIntentId!,  // NEW
       },
       {
         onSuccess: (data) => {
           clearCart.mutate();
           setConfirmedOrderId(data.id ?? null);
           setStep("Confirmation");
           toast.success("Order placed successfully!");
         },
         onError: (err) => toast.error(err.message),
       }
     );
   };
   ```

   - **Handle 3DS redirect return**: When Stripe redirects back for 3D Secure, the URL will have `?payment_intent=pi_xxx&redirect_status=succeeded`. Detect this on mount:
   ```typescript
   useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     const pi = params.get("payment_intent");
     const status = params.get("redirect_status");
     if (pi && status === "succeeded" && !paymentIntentId) {
       setPaymentIntentId(pi);
       setStep("Review");
       // Clean URL
       window.history.replaceState({}, "", "/checkout");
     } else if (status === "failed") {
       toast.error("Payment was not completed. Please try again.");
       window.history.replaceState({}, "", "/checkout");
     }
   }, []);
   ```

7. **`frontend/packages/shared/src/types/index.ts`** — Add:
   ```typescript
   export interface CreatePaymentIntentResponse {
     clientSecret: string;
     paymentIntentId: string;
   }

   export interface CreateSetupIntentResponse {
     clientSecret: string;
     setupIntentId: string;
   }

   export interface CreateOrderRequest {
     shippingAddress: string;
     items: OrderItemRequest[];
     paymentIntentId?: string;
   }

   export interface OrderItemRequest {
     productId: string;
     productName: string;
     quantity: number;
     unitPrice: number;
   }
   ```

8. **`frontend/apps/storefront/src/hooks/use-orders.ts`** — Update createOrder mutation type:
   ```typescript
   // Update the mutationFn to accept paymentIntentId
   export function useCreateOrder() {
     return useMutation({
       mutationFn: (data: {
         shippingAddress: string;
         items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
         paymentIntentId?: string;
       }) => orderService.createOrder(data),
       // ... existing onSuccess/onError
     });
   }
   ```

9. **`frontend/apps/storefront/src/services/order-service.ts`** — Update createOrder:
   ```typescript
   export async function createOrder(data: {
     shippingAddress: string;
     items: OrderItemRequest[];
     paymentIntentId?: string;
   }): Promise<{ id: number }> {
     return api.post("/api/v1/order/orders", data);
   }
   ```

### Verification

```bash
# Build frontend
cd frontend && npx turbo typecheck
# Expected: no type errors

# Manual test with Stripe test mode:
# 1. Start all services with STRIPE_SECRET_KEY set
# 2. Go to http://localhost:9090
# 3. Register/login as user1@store.com
# 4. Add products to cart
# 5. Go to checkout
# 6. Shipping step: fill address → Continue
# 7. Payment step: enter 4242 4242 4242 4242, any future date, any CVC → Pay
# 8. Review step: see order summary → Place Order
# 9. Confirmation: "Order #X placed!"
# 10. Check Stripe Dashboard → Payments → PaymentIntent confirmed

# Test decline:
# 7. Payment step: enter 4000 0000 0000 0002 → Pay
# Expected: error message shown inline, can retry

# Test 3D Secure:
# 7. Payment step: enter 4000 0000 0000 3220 → Pay
# Expected: redirect to Stripe 3DS page → complete → return to checkout Review step
```

### Success Criteria
- [ ] 4-step checkout wizard: Shipping → Payment → Review → Confirmation
- [ ] `4242 4242 4242 4242` → payment succeeds, order placed, saga completes
- [ ] `4000 0000 0000 0002` → decline error shown inline, can retry
- [ ] `4000 0000 0000 3220` → 3D Secure flow works (redirect → back → place order)
- [ ] Cart cleared after successful order
- [ ] TypeScript: `npx turbo typecheck` passes

---

## Phase 6: Backend — Subscription Payment via Stripe

**Priority:** P1
**Dependencies:** Phase 2 (StripeCustomerService), Phase 4 (webhook for subscription events)
**Estimated time:** 2-3 hours

### Files to Modify

1. **`payment-service/src/main/java/com/simplestore/payment/service/StripeCustomerService.java`**
   - Add off-session charge method:
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
               .putMetadata("user_id", "") // filled by caller context
               .build();

       return PaymentIntent.create(params);
   }
   ```

2. **`payment-service/src/main/java/com/simplestore/payment/service/PaymentService.java`**
   - Add Stripe-aware subscription payment method:
   ```java
   @Transactional
   public void processSubscriptionPayment(SubscriptionCycleStartedEvent event) {
       // Idempotency via correlationId
       if (paymentTransactionRepository.existsByCorrelationId(event.correlationId())) {
           log.warn("Duplicate subscription payment event ignored: correlationId={}",
                   event.correlationId());
           return;
       }

       if ("stripe".equals(paymentProvider)) {
           processStripeSubscriptionPayment(event);
           return;
       }
       processInternalSubscriptionPayment(event);  // existing logic, extracted
   }

   private void processStripeSubscriptionPayment(SubscriptionCycleStartedEvent event) {
       PaymentAccount account = findOrCreateAccount(event.userId());

       if (account.getStripeCustomerId() == null) {
           log.error("No Stripe customer for userId={}, cannot charge subscription={}",
                   event.userId(), event.subscriptionId());
           publishSubscriptionFailed(event, "No Stripe customer configured");
           return;
       }

       String paymentMethodId = event.paymentMethodId();
       if (paymentMethodId == null || paymentMethodId.isBlank()) {
           log.error("No payment method for subscription={}, userId={}",
                   event.subscriptionId(), event.userId());
           publishSubscriptionFailed(event, "No payment method on subscription");
           return;
       }

       try {
           PaymentIntent pi = stripeCustomerService.chargeOffSession(
                   account.getStripeCustomerId(),
                   paymentMethodId,
                   event.amount(),
                   event.correlationId(),
                   UUID.fromString(event.subscriptionId()),
                   event.cycleNumber());

           PaymentTransaction transaction = PaymentTransaction.builder()
                   .correlationId(event.correlationId())
                   .userId(event.userId())
                   .amount(event.amount())
                   .type(TransactionType.CHARGE)
                   .provider(PaymentProvider.STRIPE)
                   .stripePaymentIntentId(pi.getId())
                   .createdAt(Instant.now())
                   .build();

           if ("succeeded".equals(pi.getStatus())) {
               transaction.setStatus(TransactionStatus.SUCCEEDED);
               paymentTransactionRepository.save(transaction);
               log.info("Subscription charge succeeded: sub={}, cycle={}, pi={}",
                       event.subscriptionId(), event.cycleNumber(), pi.getId());

               TransactionSynchronizationManager.registerSynchronization(
                   new TransactionSynchronization() {
                       @Override
                       public void afterCommit() {
                           streamBridge.send("subscription-payment-success",
                               new SubscriptionPaymentSuccessEvent(
                                   event.correlationId(),
                                   UUID.fromString(event.subscriptionId()),
                                   pi.getId(),
                                   event.cycleNumber()));
                       }
                   });
           } else if ("requires_action".equals(pi.getStatus())) {
               // Off-session SCA: shouldn't happen with valid saved cards.
               // Mark as failed but log prominently.
               transaction.setStatus(TransactionStatus.REQUIRES_ACTION);
               transaction.setReason("Off-session payment requires customer action");
               paymentTransactionRepository.save(transaction);
               log.error("SCA required for off-session charge: sub={}, cycle={}, pi={}",
                       event.subscriptionId(), event.cycleNumber(), pi.getId());

               TransactionSynchronizationManager.registerSynchronization(
                   new TransactionSynchronization() {
                       @Override
                       public void afterCommit() {
                           streamBridge.send("subscription-payment-failure",
                               new SubscriptionPaymentFailedEvent(
                                   event.correlationId(),
                                   UUID.fromString(event.subscriptionId()),
                                   event.cycleNumber(),
                                   "Off-session payment requires customer action"));
                       }
                   });
           } else {
               transaction.setStatus(TransactionStatus.FAILED);
               String reason = pi.getLastPaymentError() != null
                       ? pi.getLastPaymentError().getMessage()
                       : "Payment status: " + pi.getStatus();
               transaction.setReason(reason);
               paymentTransactionRepository.save(transaction);

               TransactionSynchronizationManager.registerSynchronization(
                   new TransactionSynchronization() {
                       @Override
                       public void afterCommit() {
                           streamBridge.send("subscription-payment-failure",
                               new SubscriptionPaymentFailedEvent(
                                   event.correlationId(),
                                   UUID.fromString(event.subscriptionId()),
                                   event.cycleNumber(), reason));
                       }
                   });
           }
       } catch (StripeException e) {
           log.error("Stripe API error charging subscription={}, cycle={}: {}",
                   event.subscriptionId(), event.cycleNumber(), e.getMessage());
           publishSubscriptionFailed(event, "Stripe error: " + e.getMessage());
       }
   }

   private void processInternalSubscriptionPayment(SubscriptionCycleStartedEvent event) {
       // EXISTING code from the current processSubscriptionPayment() —
       // balance check + deduction logic. No changes.
       PaymentAccount account = findOrCreateAccount(event.userId());
       // ... existing logic ...
   }

   private void publishSubscriptionFailed(SubscriptionCycleStartedEvent event,
                                            String reason) {
       PaymentTransaction transaction = PaymentTransaction.builder()
               .correlationId(event.correlationId())
               .userId(event.userId())
               .amount(event.amount())
               .type(TransactionType.CHARGE)
               .status(TransactionStatus.FAILED)
               .reason(reason)
               .provider(PaymentProvider.STRIPE)
               .createdAt(Instant.now())
               .build();
       paymentTransactionRepository.save(transaction);

       TransactionSynchronizationManager.registerSynchronization(
           new TransactionSynchronization() {
               @Override
               public void afterCommit() {
                   streamBridge.send("subscription-payment-failure",
                       new SubscriptionPaymentFailedEvent(
                           event.correlationId(),
                           UUID.fromString(event.subscriptionId()),
                           event.cycleNumber(), reason));
               }
           });
   }
   ```

3. **`subscription-service/src/main/java/com/simplestore/subscription/service/SubscriptionService.java`**
   - In `subscribe()`: ensure `paymentMethodId` from request is stored on `CustomerSubscription`:
   ```java
   // In the subscribe method, when building CustomerSubscription:
   CustomerSubscription subscription = CustomerSubscription.builder()
           .id(UUID.randomUUID().toString())
           .userId(userId)
           .plan(plan)
           .status(SubscriptionStatus.ACTIVE)
           .startDate(LocalDate.now())
           .nextBillingDate(computeNextBillingDate(plan.getCadence(), LocalDate.now()))
           .lockedPrice(plan.getPrice())
           .paymentMethodId(request.paymentMethodId())  // <-- Ensure this is saved
           .build();
   ```

### Verification

```bash
# 1. Ensure subscription plans exist (seeded or create via admin)
# 2. Subscribe via storefront (Phase 7 provides UI, test via API for now):
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@store.com","password":"User123!"}' | jq -r '.data.token')

# 3. Create SetupIntent → get paymentMethodId
curl -s -X POST http://localhost:8080/api/v1/payment/create-setup-intent \
  -H "Authorization: Bearer $TOKEN" | jq .
# Note: In real test, confirm SetupIntent client-side to get pm_xxx

# 4. Subscribe with paymentMethodId
curl -s -X POST http://localhost:8080/api/v1/subscription/subscribe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": 1, "paymentMethodId": "pm_test_xxx"}' | jq .

# 5. Manual trigger scheduler (for testing — or wait for 2 AM)
# Check logs for "Subscription charge succeeded"
# Check Stripe Dashboard → Payments → off-session PaymentIntent

# 6. Verify cycle advanced
curl -s http://localhost:8080/api/v1/subscription/my \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0].currentCycle'
```

### Success Criteria
- [ ] Subscription charge via Stripe off-session PaymentIntent succeeds
- [ ] PaymentTransaction created with `provider=STRIPE`
- [ ] `SubscriptionPaymentSuccessEvent` published, cycle advances
- [ ] `SubscriptionPaymentFailedEvent` published on failure (declined/expired card), cycle FAILED
- [ ] Duplicate correlationId ignored (idempotent)
- [ ] Missing payment method → subscription marked PAYMENT_FAILED with clear reason

---

## Phase 7: Frontend — Subscription Payment Collection

**Priority:** P2
**Dependencies:** Phase 5 (shared payment components), Phase 6 (subscription backend)
**Estimated time:** 2-3 hours

### Files to Create

1. **`frontend/apps/storefront/src/components/payment/setup-form.tsx`**
   ```tsx
   "use client";

   import {
     PaymentElement,
     useStripe,
     useElements,
   } from "@stripe/react-stripe-js";
   import { useState } from "react";
   import { Button } from "@simplestore/ui";
   import { Alert, AlertDescription } from "@simplestore/ui";
   import { Loader2 } from "lucide-react";

   interface SetupFormProps {
     clientSecret: string;
     onSuccess: (paymentMethodId: string) => void;
     onError: (message: string) => void;
   }

   export default function SetupForm({
     clientSecret,
     onSuccess,
     onError,
   }: SetupFormProps) {
     const stripe = useStripe();
     const elements = useElements();
     const [processing, setProcessing] = useState(false);
     const [errorMsg, setErrorMsg] = useState<string | null>(null);

     const handleSetup = async () => {
       if (!stripe || !elements) return;
       setProcessing(true);
       setErrorMsg(null);

       const { error, setupIntent } = await stripe.confirmSetup({
         elements,
         redirect: "if_required",
       });

       if (error) {
         setErrorMsg(error.message || "Setup failed");
         onError(error.message || "Setup failed");
         setProcessing(false);
         return;
       }

       if (setupIntent?.payment_method) {
         const pmId = typeof setupIntent.payment_method === "string"
           ? setupIntent.payment_method
           : setupIntent.payment_method.id;
         onSuccess(pmId);
       }
       setProcessing(false);
     };

     return (
       <div className="space-y-4">
         <PaymentElement />
         {errorMsg && (
           <Alert variant="destructive">
             <AlertDescription>{errorMsg}</AlertDescription>
           </Alert>
         )}
         <Button
           className="w-full"
           onClick={handleSetup}
           disabled={!stripe || processing}
         >
           {processing && <Loader2 className="size-4 mr-2 animate-spin" />}
           {processing ? "Saving..." : "Save Payment Method"}
         </Button>
       </div>
     );
   }
   ```

2. **`frontend/apps/storefront/src/components/payment/saved-payment-methods.tsx`**
   ```tsx
   "use client";

   import { usePaymentMethods, useDeletePaymentMethod } from "@/hooks/use-stripe-payment";
   import { Button } from "@simplestore/ui";
   import { CreditCard, Trash2 } from "lucide-react";
   import { Skeleton } from "@simplestore/ui";
   import type { PaymentMethod } from "@/services/payment-service";
   import {
     AlertDialog,
     AlertDialogAction,
     AlertDialogCancel,
     AlertDialogContent,
     AlertDialogDescription,
     AlertDialogFooter,
     AlertDialogHeader,
     AlertDialogTitle,
     AlertDialogTrigger,
   } from "@simplestore/ui";

   const BRAND_NAMES: Record<string, string> = {
     visa: "Visa",
     mastercard: "Mastercard",
     amex: "American Express",
     discover: "Discover",
   };

   function PaymentMethodCard({ method }: { method: PaymentMethod }) {
     const deleteMutation = useDeletePaymentMethod();

     return (
       <div className="flex items-center justify-between rounded-lg border p-3">
         <div className="flex items-center gap-3">
           <CreditCard className="size-5 text-muted-foreground" />
           <div>
             <p className="text-sm font-medium">
               {BRAND_NAMES[method.brand] || method.brand} •••• {method.last4}
             </p>
             <p className="text-xs text-muted-foreground">
               Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}
             </p>
           </div>
         </div>
         <AlertDialog>
           <AlertDialogTrigger asChild>
             <Button variant="ghost" size="icon" disabled={deleteMutation.isPending}>
               <Trash2 className="size-4 text-muted-foreground" />
             </Button>
           </AlertDialogTrigger>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
               <AlertDialogDescription>
                 This will remove the {BRAND_NAMES[method.brand]} ending in {method.last4}.
                 Active subscriptions using this card may fail on next renewal.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel>Cancel</AlertDialogCancel>
               <AlertDialogAction
                 onClick={() => deleteMutation.mutate(method.id)}
               >
                 Remove
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
       </div>
     );
   }

   export default function SavedPaymentMethods() {
     const { data: methods, isLoading } = usePaymentMethods();

     if (isLoading) {
       return (
         <div className="space-y-2">
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
         </div>
       );
     }

     if (!methods?.length) {
       return (
         <p className="text-sm text-muted-foreground">
           No saved payment methods.
         </p>
       );
     }

     return (
       <div className="space-y-2">
         {methods.map((method) => (
           <PaymentMethodCard key={method.id} method={method} />
         ))}
       </div>
     );
   }
   ```

### Files to Modify

3. **`frontend/apps/storefront/src/app/subscriptions/[id]/page.tsx`** — Find the subscribe flow (likely `SubscribeDialog`). Add payment method collection before subscribe:
   - After user clicks "Confirm Subscription", if no saved payment method exists:
     1. Create SetupIntent → get clientSecret
     2. Show `<StripeProvider clientSecret={clientSecret}><SetupForm .../></StripeProvider>`
     3. On setup success, call subscribe with `paymentMethodId`
   - If user has saved payment methods, offer to use existing or add new

4. **`frontend/apps/storefront/src/app/account/subscriptions/page.tsx`** — Add `SavedPaymentMethods` component in a card:
   ```tsx
   import SavedPaymentMethods from "@/components/payment/saved-payment-methods";

   // Inside the page, add:
   <Card>
     <CardHeader>
       <CardTitle>Payment Methods</CardTitle>
       <CardDescription>Cards used for subscription billing</CardDescription>
     </CardHeader>
     <CardContent>
       <SavedPaymentMethods />
     </CardContent>
   </Card>
   ```

5. **`frontend/packages/shared/src/types/index.ts`** — Add `SavedPaymentMethod`:
   ```typescript
   export interface SavedPaymentMethod {
     id: string;
     brand: string;
     last4: string;
     expMonth: number;
     expYear: number;
   }
   ```

### Verification

```bash
# Build
cd frontend && npx turbo typecheck

# Manual test:
# 1. Browse /subscriptions → select a plan
# 2. Click "Subscribe" → dialog shows payment method form
# 3. Enter 4242 4242 4242 4242 → Save Payment Method
# 4. Confirm subscription → calls subscribe API with paymentMethodId
# 5. Check /account/subscriptions → shows payment method card
# 6. Check Stripe Dashboard → Customer → saved payment method
```

### Success Criteria
- [ ] SetupForm collects card and saves via SetupIntent
- [ ] `paymentMethodId` passed to subscribe API
- [ ] SavedPaymentMethods shows saved cards with brand, last4, expiry
- [ ] Delete payment method removes from Stripe Customer
- [ ] Re-subscribing uses existing saved payment method

---

## Phase 8: Admin Dashboard Updates

**Priority:** P3
**Dependencies:** Phase 3 (order fields), Phase 6 (subscription payment data)
**Estimated time:** 1-2 hours

### Files to Create

1. **`frontend/apps/admin/src/services/payment-service.ts`**
   ```typescript
   import api from "@/lib/api";

   export type { PaymentTransaction } from "@simplestore/shared";

   export async function getTransactions(page = 0, pageSize = 20) {
     return api.get(`/api/v1/payment/transactions?page=${page}&pageSize=${pageSize}`);
   }
   ```

### Files to Modify

2. **`frontend/apps/admin/src/app/orders/[id]/page.tsx`** — In the Order Information card, add after shipping address:
   ```tsx
   // After the shipping address paragraph:
   {order.paymentIntentId && (
     <div className="mt-2 pt-2 border-t">
       <span className="text-sm font-medium">Payment:</span>
       <div className="flex items-center gap-2 mt-1">
         <Badge variant={order.status === "CONFIRMED" ? "success" : "secondary"}>
           {order.status === "CONFIRMED" ? "Paid" : "Processing"}
         </Badge>
         <span className="text-xs text-muted-foreground font-mono">
           Stripe: {order.paymentIntentId}
         </span>
       </div>
     </div>
   )}
   ```

3. **`frontend/apps/admin/src/app/subscriptions/customers/[id]/page.tsx`** — In the Subscription Detail card, add after status:
   ```tsx
   {subscription.paymentMethodId && (
     <div className="mt-2 pt-2 border-t">
       <span className="text-xs text-muted-foreground">
         Payment method: {subscription.paymentMethodId}
       </span>
     </div>
   )}
   ```
   - In the Billing Cycle History table, add a column for payment status:
   ```tsx
   // Add column header:
   <TableHead>Payment</TableHead>

   // In each row, add cell:
   <TableCell>
     {cycle.paymentTransactionId ? (
       <span className="font-mono text-xs text-muted-foreground">
         {cycle.paymentTransactionId}
       </span>
     ) : (
       <span className="text-xs text-muted-foreground">—</span>
     )}
   </TableCell>
   ```

4. **`frontend/packages/shared/src/types/index.ts`** — Ensure `Order` type has `paymentIntentId`:
   ```typescript
   export interface Order {
     id: number;
     correlationId: string;
     userId: string;
     orderDate: string;
     totalAmount: number;
     status: string;
     shippingAddress: string;
     paymentIntentId?: string;  // NEW
     items: OrderItem[];
   }
   ```

### Verification

```bash
cd frontend && npx turbo typecheck && npx turbo build
# Navigate to admin → Orders → click an order placed with Stripe
# Should show "Paid" badge and Stripe PaymentIntent ID
# Navigate to Subscriptions → Customers → click a customer
# Should show payment method info and transaction IDs in cycle history
```

### Success Criteria
- [ ] Order detail page shows Stripe PaymentIntent ID and payment status
- [ ] Subscription detail shows payment method ID
- [ ] Cycle history table shows payment transaction IDs
- [ ] All builds pass

---

## Phase 9: Testing, Cleanup & Documentation

**Priority:** P2
**Dependencies:** All other phases
**Estimated time:** 2-3 hours

### Commands & Steps

1. **Full build:**
   ```bash
   mvn clean install -DskipTests
   docker compose down -v
   docker compose up --build -d
   docker compose ps
   # Wait for all services healthy
   cd frontend && npm install && npx turbo build
   ```

2. **Set Stripe keys (get from https://dashboard.stripe.com/test/apikeys):**
   ```bash
   export STRIPE_SECRET_KEY=sk_test_...
   export STRIPE_PUBLISHABLE_KEY=pk_test_...
   export PAYMENT_PROVIDER=stripe
   docker compose up -d payment-service  # restart with keys
   ```

3. **Start Stripe CLI:**
   ```bash
   stripe login
   stripe listen --forward-to localhost:8080/api/v1/payment/webhook
   # Copy the webhook signing secret (whsec_xxx)
   export STRIPE_WEBHOOK_SECRET=whsec_xxx
   docker compose up -d payment-service  # restart with webhook secret
   ```

4. **End-to-end checkout test:**
   ```
   a. Storefront: http://localhost:9090
   b. Register new user (or login as user1@store.com / User123!)
   c. Browse products → add to cart
   d. Checkout → Shipping (fill address) → Continue
   e. Payment → enter 4242 4242 4242 4242, any future date, any CVC → Pay
   f. Review → Place Order → Confirmation "Order #X placed!"
   g. Wait 5-10 seconds → Check /account/orders → order should be CONFIRMED
   h. Admin http://localhost:9091 → Orders → see the order with "Paid" badge
   ```

5. **End-to-end subscription test:**
   ```
   a. Storefront → /subscriptions → select a plan
   b. Click Subscribe → enter card (4242...) → Save → Confirm
   c. Check /account/subscriptions → subscription ACTIVE with saved card
   d. Admin → Subscriptions → Customers → see the subscription
   e. To test recurring: wait for 2AM scheduler OR manually trigger via API:
      - Find the subscription ID
      - Use Swagger UI at /api/v1/subscription/swagger-ui.html
      - Manually trigger the scheduler endpoint (if one exists for testing)
   ```

6. **Failure tests:**
   | Test | Steps | Expected |
   |------|-------|----------|
   | Card decline | Checkout → enter 4000 0000 0000 0002 | Error message shown inline |
   | 3D Secure | Checkout → enter 4000 0000 0000 3220 | Redirect to 3DS page → complete → return → place order |
   | Expired card (sub) | Subscribe → manually set card as expired in Stripe Dashboard → trigger scheduler | Cycle FAILED, subscription PAYMENT_FAILED |
   | Webhook replay | `stripe trigger payment_intent.succeeded` twice with same event ID | First: processed. Second: "Duplicate ignored" |
   | Internal mode | Set `PAYMENT_PROVIDER=internal`, restart, checkout via admin-deposited balance | Balance deducted, order confirmed |

7. **Internal mode regression:**
   ```bash
   export PAYMENT_PROVIDER=internal
   docker compose up -d payment-service
   # Admin deposit: POST /api/v1/payment/accounts/{userId}/deposit { amount: 500 }
   # Checkout → saga verifies → balance deducted → order confirmed
   ```

### Cleanup

8. **`payment-service/src/main/java/com/simplestore/payment/PaymentSeeder.java`** — Balance values already zeroed in Phase 1. Add comment:
   ```java
   // Accounts are created with zero balance. In Stripe mode, users fund
   // payments via Stripe. In internal mode, admins deposit via API.
   ```

9. **`README.md`** — Add Stripe section after the frontend section:
   ```markdown
   ## Stripe Payment Integration

   Set these env vars before starting:
   ```bash
   export STRIPE_SECRET_KEY=sk_test_...
   export STRIPE_PUBLISHABLE_KEY=pk_test_...
   export STRIPE_WEBHOOK_SECRET=whsec_...
   export PAYMENT_PROVIDER=stripe
   ```

   For local webhooks:
   ```bash
   stripe listen --forward-to localhost:8080/api/v1/payment/webhook
   ```

   Use `PAYMENT_PROVIDER=internal` for dev without Stripe keys.
   ```

10. **`docs/system-architecture.md`** — Update "Checkout Saga" section to note Stripe integration. Add payment flow diagram from this plan.

11. **`.gitignore`** — Ensure `.env.local` is gitignored (already should be for Next.js projects)

### Verification

```bash
# Final check
mvn clean install -DskipTests                     # Backend compiles
cd frontend && npx turbo typecheck && npx turbo build  # Frontend compiles
git diff --stat feature/stripe-integration main     # Review all changes
git diff --cached | grep -E "sk_(live|test)_[a-zA-Z0-9]{20,}" && echo "SECRETS FOUND!" || echo "Clean"
```

### Success Criteria
- [ ] All end-to-end flows work with Stripe test mode
- [ ] All failure modes handled gracefully
- [ ] Internal mode regression passes
- [ ] No secrets committed to git
- [ ] README includes Stripe setup instructions
- [ ] `docs/system-architecture.md` updated

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Event ordering: webhook fires PaymentSucceeded before saga reaches PROCESSING_PAYMENT | Medium | High | Saga's `handlePaymentSucceeded` status-guard skips if not in PROCESSING_PAYMENT. Webhook handler creates PaymentTransaction anyway. Saga's `processPayment` also checks Stripe API directly — if the PI already succeeded, saga publishes PaymentSucceeded immediately. **Double-gate protection.** |
| `PaymentElement` iframe sizing issues on mobile | Medium | Low | Stripe's PaymentElement is responsive. Test on mobile viewport. |
| Off-session SCA causes subscription payment failure | Low | High | If `requires_action`, mark cycle FAILED and subscription PAYMENT_FAILED. In production, notify customer to update payment method. Acceptable for v1. |
| `ddl-auto: update` adds columns but doesn't migrate data | High | Low | New columns are nullable. Existing data works unchanged. No data migration needed. |
| Frontend `clientSecret` expires before user completes payment | Low | Medium | PaymentIntent has a 24h window. If it expires, frontend shows error and re-fetches. |
| Concurrent events: subscription cycle and webhook race | Medium | Medium | `PaymentTransaction.correlationId` unique constraint prevents duplicate; webhook `WebhookEvent` idempotency prevents double-publish. |
| Gateway routing: webhook path conflicts with existing payment route | Medium | High | Add specific webhook route BEFORE catch-all payment route in gateway config. Verified in Phase 4. |

## Open Questions

1. **Currency** — Hardcoded `usd` for v1. OK?
2. **Stripe Tax** — Automatic sales tax via Stripe Tax API. No for v1 (YAGNI).
3. **Refunds** — Admin-initiated refunds via Stripe API. Out of scope for v1.
4. **Multiple saved cards** — Yes, Stripe Customer supports multiple. Plan already handles this.
5. **Webhook in production** — Gateway must route `/api/v1/payment/webhook` without JWT validation. In production, additionally restrict to Stripe's IP ranges.
