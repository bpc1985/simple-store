# Phase 2: Stripe Customer & Payment Method API

**Priority:** P1
**Dependencies:** Phase 1
**Estimated time:** 2-3 hours

## Overview

Create the core Stripe integration services and REST API endpoints. `StripeCustomerService` manages Stripe Customer lifecycle (lazy creation, payment method attach/detach). `StripePaymentService` creates PaymentIntents and SetupIntents. PaymentController gains authenticated endpoints for customers.

## Requirements

- Functional: Customers can create PaymentIntents and SetupIntents; payment methods can be saved/listed/removed
- Non-functional: Stripe Customer lazily created on first payment; admin endpoints still require ADMIN role; authenticated endpoints use JWT

## Architecture

```
POST /api/v1/payment/create-payment-intent [authenticated]
  → StripePaymentService.createPaymentIntent()
    → StripeCustomerService.findOrCreateStripeCustomerId()  // lazy create
    → Stripe: PaymentIntent.create(amount, currency=usd, customer, automatic_payment_methods)
    → returns { clientSecret, paymentIntentId }

POST /api/v1/payment/create-setup-intent [authenticated]
  → StripePaymentService.createSetupIntent()
    → StripeCustomerService.findOrCreateStripeCustomerId()
    → Stripe: SetupIntent.create(customer, usage=off_session)
    → returns { clientSecret, setupIntentId }

GET /api/v1/payment/payment-methods [authenticated]
  → StripeCustomerService.listPaymentMethods(userId)
    → Stripe: PaymentMethod.list(customer, type=card)
    → returns [{ id, brand, last4, expMonth, expYear }]

DELETE /api/v1/payment/payment-methods/{id} [authenticated]
  → StripeCustomerService.detachPaymentMethod(id)
    → Stripe: PaymentMethod.retrieve().detach()
```

**Critical change:** Remove class-level `@PreAuthorize("hasRole('ADMIN')")` from PaymentController. Add method-level security instead.

## Related Code Files

### Create
- `payment-service/src/main/java/com/simplestore/payment/service/StripeCustomerService.java`
- `payment-service/src/main/java/com/simplestore/payment/service/StripePaymentService.java`
- `payment-service/src/main/java/com/simplestore/payment/dto/CreatePaymentIntentRequest.java`
- `payment-service/src/main/java/com/simplestore/payment/dto/CreatePaymentIntentResponse.java`
- `payment-service/src/main/java/com/simplestore/payment/dto/CreateSetupIntentResponse.java`
- `payment-service/src/main/java/com/simplestore/payment/dto/PaymentMethodDto.java`

### Modify
- `payment-service/src/main/java/com/simplestore/payment/controller/PaymentController.java` — remove class-level auth, add new endpoints, add method-level auth
- `payment-service/src/main/java/com/simplestore/payment/config/SecurityConfig.java` — ensure authenticated paths

## Implementation Steps

### 1. StripeCustomerService

Package: `com.simplestore.payment.service`

Methods:
- `findOrCreateStripeCustomerId(String userId, String email, String name)`: Returns existing `stripeCustomerId` from PaymentAccount or creates a Stripe Customer via `Customer.create()` and saves the ID back. Throws on StripeException.
- `findByStripeCustomerId(String stripeCustomerId)`: Reverse lookup — find PaymentAccount by Stripe customer ID (used by webhook handler).
- `attachPaymentMethod(String userId, String paymentMethodId)`: Retrieves PaymentMethod, attaches to Stripe Customer, sets as default payment method via `Customer.update()`.
- `listPaymentMethods(String userId)`: Lists card payment methods for the user's Stripe Customer via `PaymentMethod.list()`.
- `detachPaymentMethod(String paymentMethodId)`: Detaches a payment method from Stripe.

Dependencies: `PaymentAccountRepository`

Edge cases:
- PaymentAccount not found → `RuntimeException`
- Stripe customer not yet created → throw informative error (for attach/list operations where customer must exist)
- StripeException on API calls → wrap in RuntimeException with meaningful message

### 2. StripePaymentService

Package: `com.simplestore.payment.service`

Methods:
- `createPaymentIntent(userId, email, name, request)`: Creates a PaymentIntent with amount in cents, USD currency, automatic payment methods enabled, `setup_future_usage=on_session`. Returns `{ clientSecret, paymentIntentId }`.
- `createSetupIntent(userId, email, name)`: Creates a SetupIntent for the customer with `usage=off_session`. Returns `{ clientSecret, setupIntentId }`.

Dependencies: `StripeCustomerService`, `PaymentAccountRepository`

Edge cases:
- Amount must be positive (validated by `@DecimalMin("0.01")`)
- `movePointRight(2).longValueExact()` may throw on fractional cents
- StripeException → wrap in RuntimeException

### 3. DTOs

All records, package `com.simplestore.payment.dto`:
- `CreatePaymentIntentRequest(@NotNull @DecimalMin("0.01") BigDecimal amount)`
- `CreatePaymentIntentResponse(String clientSecret, String paymentIntentId)`
- `CreateSetupIntentResponse(String clientSecret, String setupIntentId)`
- `PaymentMethodDto(String id, String brand, String last4, int expMonth, int expYear)`

### 4. PaymentController changes

**Remove** the class-level `@PreAuthorize("hasRole('ADMIN')")`.

Add new endpoints:
- `POST /create-payment-intent` → `@PreAuthorize("isAuthenticated()")` → extracts userId/email/name from JWT → calls `stripePaymentService.createPaymentIntent()`
- `POST /create-setup-intent` → `@PreAuthorize("isAuthenticated()")` → extracts userId/email/name from JWT → calls `stripePaymentService.createSetupIntent()`
- `GET /payment-methods` → `@PreAuthorize("isAuthenticated()")` → lists payment methods for current user
- `DELETE /payment-methods/{id}` → `@PreAuthorize("isAuthenticated()")` → detaches payment method

Existing admin endpoints (getAccount, deposit, getTransactions) get `@PreAuthorize("hasRole('ADMIN')")` at method level.

### 5. SecurityConfig

Ensure these paths require authentication (not admin):
```java
.requestMatchers(
    "/api/v1/payment/create-payment-intent",
    "/api/v1/payment/create-setup-intent",
    "/api/v1/payment/payment-methods/**"
).authenticated()
```

## Success Criteria

- [ ] `POST /api/v1/payment/create-payment-intent` with valid JWT returns `{ clientSecret, paymentIntentId }`
- [ ] `POST /api/v1/payment/create-setup-intent` returns valid setup intent `clientSecret`
- [ ] `GET /api/v1/payment/payment-methods` returns empty list for new users
- [ ] Stripe Dashboard (test mode) shows created PaymentIntents, SetupIntents, and Customers
- [ ] `StripeCustomerService` lazily creates Customer on first call, reuses on subsequent calls
- [ ] Admin-only endpoints (`/accounts/**`, `/transactions`) still require ADMIN role
- [ ] `mvn -pl payment-service -am clean install -DskipTests` passes

## Verification

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@store.com","password":"User123!"}' | jq -r '.data.token')

# Create payment intent
curl -s -X POST http://localhost:8080/api/v1/payment/create-payment-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 29.99}' | jq .
# Expected: {"success":true,"data":{"clientSecret":"pi_xxx_secret_xxx","paymentIntentId":"pi_xxx"}}

# Check Stripe Dashboard → Payments → should see PaymentIntent
# Check Stripe Dashboard → Customers → should see new customer

# Create setup intent
curl -s -X POST http://localhost:8080/api/v1/payment/create-setup-intent \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: {"success":true,"data":{"clientSecret":"seti_xxx_secret_xxx","setupIntentId":"seti_xxx"}}

# Verify admin endpoints still require ADMIN
curl -s http://localhost:8080/api/v1/payment/accounts/user1 \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 403 Forbidden (user1 is not admin)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Removing class-level `@PreAuthorize` accidentally exposes admin endpoints | High | Verify all 3 admin endpoints have `@PreAuthorize("hasRole('ADMIN')")` at method level; test with non-admin token |
| JWT claim `email` or `name` missing | Medium | `getClaimAsString()` returns null for missing claims — pass null to Stripe Customer creation (both optional) |
| Stripe API rate limits | Low | Stripe test mode has generous limits; production uses idempotency keys |
