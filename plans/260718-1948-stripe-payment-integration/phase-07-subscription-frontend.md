# Phase 7: Subscription Payment Collection Frontend

**Priority:** P2
**Dependencies:** Phase 5 (shared payment components), Phase 6 (subscription backend)
**Estimated time:** 2-3 hours

## Overview

Add payment method collection to the subscription signup flow using Stripe SetupIntents. Users save a card before subscribing — the `paymentMethodId` is passed to the subscribe API and stored for recurring billing. Show saved payment methods on the account page with delete capability.

## Requirements

- Functional: Users can save a card during subscription signup; saved cards displayed on account page; delete removes from Stripe
- Non-functional: SetupIntent uses `usage=off_session`; confirmation via Stripe Elements; reuses StripeProvider from Phase 5

## Architecture

```
Subscription Plan Detail Page
  │
  ├── Click "Subscribe" → SubscribeDialog
  │     │
  │     ├── If user has saved payment methods:
  │     │     → Show list of saved cards, user picks one
  │     │     → OR "Add new card" option
  │     │
  │     └── If no saved methods / user chooses "Add new":
  │           ├── POST /api/v1/payment/create-setup-intent
  │           ├── Render <SetupForm> inside <StripeProvider>
  │           ├── User enters card → stripe.confirmSetup()
  │           ├── On success: get paymentMethodId
  │           └── Call subscribe API with { planId, paymentMethodId }
  │
  └── Account → Subscriptions page
        └── <SavedPaymentMethods> component
              ├── Card list with brand icon, last4, expiry
              └── Delete button with confirmation dialog
```

## Related Code Files

### Create
- `frontend/apps/storefront/src/components/payment/setup-form.tsx`
- `frontend/apps/storefront/src/components/payment/saved-payment-methods.tsx`

### Modify
- `frontend/apps/storefront/src/app/subscriptions/[id]/page.tsx` — add payment method collection to subscribe flow
- `frontend/apps/storefront/src/app/account/subscriptions/page.tsx` — show SavedPaymentMethods
- `frontend/packages/shared/src/types/index.ts` — add `SavedPaymentMethod` type

## Implementation Steps

### 1. SetupForm component (components/payment/setup-form.tsx)

Props: `clientSecret`, `onSuccess(paymentMethodId)`, `onError(message)`

States:
- **Ready** — PaymentElement for card collection, "Save Payment Method" button
- **Processing** — `stripe.confirmSetup()` in flight, button shows spinner
- **Error** — Alert with error message

On submit:
1. `stripe.confirmSetup({ elements, redirect: "if_required" })`
2. If `error` → set error state, call `onError`
3. If `setupIntent.payment_method` exists → call `onSuccess(pmId)`
   - Handle both string and object return types from Stripe

### 2. SavedPaymentMethods component (components/payment/saved-payment-methods.tsx)

States:
- **Loading** — 2 skeleton rows
- **Empty** — "No saved payment methods." text
- **Populated** — list of `PaymentMethodCard` components

`PaymentMethodCard`:
- Shows: brand name (Visa/Mastercard/Amex/Discover), `•••• {last4}`, expiry `MM/YY`
- CreditCard icon from lucide-react
- Delete button with `AlertDialog` confirmation
- Delete dialog warns: "Active subscriptions using this card may fail on next renewal."

Uses `usePaymentMethods()` query and `useDeletePaymentMethod()` mutation.

### 3. Subscribe flow changes (subscriptions/[id]/page.tsx)

Find the existing `SubscribeDialog` component. Modify the confirm flow:

Before calling subscribe:
1. Check if user has saved payment methods (`usePaymentMethods()`)
2. If saved methods exist → show radio/select for existing cards + "Add new card" option
3. If "Add new" or no saved methods:
   a. Call `createSetupIntent.mutateAsync()`
   b. Show `<StripeProvider clientSecret={setupClientSecret}><SetupForm onSuccess={handlePaymentMethodReady}/></StripeProvider>`
4. When `paymentMethodId` is available → call the subscribe API

### 4. Account subscriptions page (account/subscriptions/page.tsx)

Add a card section below the subscriptions list:
```tsx
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

### 5. Shared types

Add to `packages/shared/src/types/index.ts`:
```typescript
export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}
```

## Success Criteria

- [ ] SetupForm collects card and calls `stripe.confirmSetup()` successfully
- [ ] `paymentMethodId` returned from SetupFlow passed to subscribe API
- [ ] SavedPaymentMethods shows cards with brand, last4, expiry
- [ ] Delete payment method removes from Stripe Customer
- [ ] Existing saved card can be selected for new subscriptions
- [ ] `npx turbo typecheck` passes

## Verification

```bash
# Build
cd frontend && npx turbo typecheck

# Manual test:
# 1. Browse http://localhost:9090/subscriptions → select a plan
# 2. Click "Subscribe" → dialog opens
# 3. If no saved cards: shows SetupForm with PaymentElement
# 4. Enter 4242 4242 4242 4242 → Save Payment Method
# 5. Confirm subscription → calls subscribe API with paymentMethodId
# 6. Check http://localhost:9090/account/subscriptions → shows payment method card
# 7. Check Stripe Dashboard → Customers → saved payment method attached
# 8. Test delete: click trash icon → confirm → card removed from list and Stripe
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `confirmSetup` returns `payment_method` as object vs string | Medium | Handle both: `typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method.id` |
| User navigates away during SetupForm | Low | SetupIntent is ephemeral — Stripe auto-cancels unconfirmed intents. No cleanup needed. |
| `StripeProvider` nesting: already inside Elements from checkout? | Low | Each PaymentIntent/SetupIntent gets its own `Elements` instance. Multiple `Elements` providers are independent. Subscribe page has its own — no nesting issue. |
