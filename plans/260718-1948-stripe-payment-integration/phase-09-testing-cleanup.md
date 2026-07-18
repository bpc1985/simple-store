# Phase 9: Testing, Cleanup & Documentation

**Priority:** P2
**Dependencies:** All other phases
**Estimated time:** 2-3 hours

## Overview

End-to-end testing of all Stripe payment flows, failure scenarios, internal mode regression, and webhook idempotency. Clean up seed data, update documentation, verify no secrets committed.

## Requirements

- Functional: All happy paths work; all failure modes handled; internal mode still works
- Non-functional: Documentation updated; no secrets in git; build passes

## Related Code Files

### Modify
- `payment-service/src/main/java/com/simplestore/payment/PaymentSeeder.java` — add clarifying comment
- `README.md` — add Stripe setup section
- `docs/system-architecture.md` — update payment section
- `.gitignore` — verify `.env.local` is gitignored

## Implementation Steps

### 1. Full build & deploy
```bash
mvn clean install -DskipTests
docker compose down -v
docker compose up --build -d
docker compose ps  # Wait for all services healthy
cd frontend && npm install && npx turbo build
```

### 2. Configure Stripe

Get API keys from https://dashboard.stripe.com/test/apikeys:
```bash
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_PUBLISHABLE_KEY=pk_test_...
export PAYMENT_PROVIDER=stripe
docker compose up -d payment-service
```

### 3. Start Stripe CLI webhook forwarding
```bash
stripe login
stripe listen --forward-to localhost:8080/api/v1/payment/webhook
# Copy whsec_xxx → export STRIPE_WEBHOOK_SECRET=whsec_xxx
docker compose up -d payment-service  # restart with webhook secret
```

### 4. End-to-end checkout test

| Step | Action | Expected |
|------|--------|----------|
| 1 | Storefront `http://localhost:9090` | Home page loads |
| 2 | Register or login as `user1@store.com / User123!` | Logged in |
| 3 | Browse products, add to cart | Cart has items |
| 4 | Checkout → Shipping → fill address → Continue | Moves to Payment step |
| 5 | Payment → enter `4242 4242 4242 4242`, any future date, any CVC → Pay | Moves to Review |
| 6 | Review → Place Order | Confirmation: "Order #X placed!" |
| 7 | Wait 5-10s → `/account/orders` | Order status: CONFIRMED |
| 8 | Admin `http://localhost:9091` → Orders → click order | "Paid" badge + Stripe PI ID |
| 9 | Stripe Dashboard → Payments | PaymentIntent confirmed |

### 5. End-to-end subscription test

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/subscriptions` → select a plan | Plan detail page |
| 2 | Click Subscribe → enter card (`4242...`) → Save → Confirm | Subscription ACTIVE |
| 3 | `/account/subscriptions` | Shows subscription + saved card |
| 4 | Admin → Subscriptions → Customers → click customer | Payment method ID shown |
| 5 | Wait for scheduler OR manually trigger | Cycle advances |
| 6 | Stripe Dashboard → Payments | Off-session PaymentIntent |

### 6. Failure test matrix

| Test | Steps | Expected |
|------|-------|----------|
| **Card decline** | Checkout → enter `4000 0000 0000 0002` | Error message shown inline, can retry |
| **3D Secure** | Checkout → enter `4000 0000 0000 3220` | Redirect to 3DS page → complete → return to Review |
| **Insufficient funds (sub)** | Enter `4000 0000 0000 9995` → subscribe → trigger scheduler | Cycle FAILED, subscription PAYMENT_FAILED |
| **Webhook replay** | `stripe trigger payment_intent.succeeded` twice with same event ID | First: processed; second: "Duplicate ignored" |
| **Invalid webhook sig** | curl with bad signature | 400 Bad Request |
| **Internal mode** | Set `PAYMENT_PROVIDER=internal`, restart | Balance-based payment works |

### 7. Internal mode regression
```bash
export PAYMENT_PROVIDER=internal
docker compose up -d payment-service

# Admin deposit
curl -s -X POST http://localhost:8080/api/v1/payment/accounts/00000000-0000-0000-0000-000000000002/deposit \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}' | jq .

# Place order — saga verifies → balance deducted → order confirmed
```

### 8. Cleanup

**PaymentSeeder comment:**
```java
// Accounts are created with zero balance. In Stripe mode, users fund
// payments via Stripe. In internal mode, admins deposit via API.
```

**README.md — add section:**
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

**docs/system-architecture.md:**
- Update "Checkout Saga" section to mention Stripe mode
- Add note about `payment.provider` feature flag

**.gitignore:**
- Verify `.env.local` is already listed (Next.js default)

### 9. Final verification
```bash
# Compile check
mvn clean install -DskipTests                     # Backend
cd frontend && npx turbo typecheck && npx turbo build  # Frontend

# Secret scan
git diff --stat feature/stripe-integration main
git diff --cached | grep -E "sk_(live|test)_[a-zA-Z0-9]{20,}" && echo "SECRETS FOUND!" || echo "Clean"
```

## Success Criteria

- [ ] All end-to-end checkout flows work with Stripe test mode
- [ ] All end-to-end subscription flows work
- [ ] All failure modes handled gracefully (decline, 3DS, insufficient funds, expired card)
- [ ] Webhook idempotency verified
- [ ] Internal mode regression passes
- [ ] No secrets committed to git
- [ ] README includes Stripe setup instructions
- [ ] `docs/system-architecture.md` updated

## Stripe Test Cards Reference

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 3220` | 3D Secure 2 authentication required |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0127` | Incorrect CVC |
| `4000 0000 0000 0069` | Expired card |
| `5555 5555 5555 4444` | Mastercard success |
| `3782 822463 10005` | Amex success |
