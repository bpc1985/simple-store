# Phase 5: Checkout Frontend Integration

**Priority:** P1
**Dependencies:** Phase 2 (create-payment-intent endpoint), Phase 3 (backend saga)
**Estimated time:** 3-4 hours

## Overview

Integrate Stripe Elements into the storefront checkout flow. Transform the existing 3-step wizard (Shipping → Review → Confirmation) into a 4-step wizard (Shipping → Payment → Review → Confirmation). The Payment step renders Stripe's `PaymentElement` inside the `Elements` provider, confirms the payment client-side, then passes `paymentIntentId` to the order creation call.

## Requirements

- Functional: Users can pay with Stripe Elements in checkout; 3D Secure handled; card decline shown inline; cart cleared after order
- Non-functional: Stripe Elements matches storefront design (Montserrat font, #2563EB primary); accessible; TypeScript compiles

## Architecture

```
Checkout Page (4-step wizard)
  │
  ├── Step 1: Shipping (unchanged — collect address)
  │
  ├── Step 2: Payment (NEW)
  │     ├── On mount: POST /api/v1/payment/create-payment-intent { amount }
  │     ├── Receive: { clientSecret, paymentIntentId }
  │     ├── Render: <Elements clientSecret={clientSecret}>
  │     │             <PaymentElement/>
  │     │             <Pay $XX.XX button>
  │     │           </Elements>
  │     └── On submit: stripe.confirmPayment({ redirect: "if_required" })
  │         ├── Success: store paymentIntentId → move to Review
  │         ├── Decline: show inline error, user can retry
  │         └── 3DS required: Stripe redirects → returns to /checkout?payment_intent=pi_xxx&redirect_status=succeeded
  │
  ├── Step 3: Review (show shipping + items + total)
  │     └── "Place Order" button → POST /api/v1/order/orders { shippingAddress, items, paymentIntentId }
  │
  └── Step 4: Confirmation (show "Order #X placed!")
```

3D Secure redirect detection: On page mount, check URL params for `?payment_intent=pi_xxx&redirect_status=succeeded`. If found, store `paymentIntentId`, clean URL, move to Review step.

## Related Code Files

### Create
- `frontend/apps/storefront/src/services/payment-service.ts`
- `frontend/apps/storefront/src/hooks/use-stripe-payment.ts`
- `frontend/apps/storefront/src/components/payment/stripe-provider.tsx`
- `frontend/apps/storefront/src/components/payment/payment-form.tsx`

### Modify
- `frontend/apps/storefront/src/app/checkout/page.tsx` — add payment step, paymentIntentId, 3DS redirect handling
- `frontend/packages/shared/src/types/index.ts` — add payment types, update CreateOrderRequest
- `frontend/apps/storefront/src/hooks/use-orders.ts` — accept paymentIntentId
- `frontend/apps/storefront/src/services/order-service.ts` — accept paymentIntentId

## Implementation Steps

### 1. Shared types (packages/shared/src/types/index.ts)
```typescript
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CreateSetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
}

export interface OrderItemRequest {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}
```

### 2. Payment service (services/payment-service.ts)

API functions calling the Phase 2 backend endpoints:
- `createPaymentIntent(amount)` → `POST /api/v1/payment/create-payment-intent`
- `createSetupIntent()` → `POST /api/v1/payment/create-setup-intent`
- `getPaymentMethods()` → `GET /api/v1/payment/payment-methods`
- `deletePaymentMethod(id)` → `DELETE /api/v1/payment/payment-methods/{id}`
- `getPaymentStatus(correlationId)` → `GET /api/v1/payment/payment-status/{correlationId}`

Also export `PaymentMethod` and `PaymentTransaction` interfaces.

### 3. Stripe hooks (hooks/use-stripe-payment.ts)

React Query mutations:
- `useCreatePaymentIntent()` — mutationFn: `(amount) => paymentService.createPaymentIntent(amount)`
- `useCreateSetupIntent()` — mutationFn: `() => paymentService.createSetupIntent()`
- `usePaymentMethods()` — queryKey: ["payment-methods"]
- `useDeletePaymentMethod()` — invalidates ["payment-methods"] on success

### 4. StripeProvider (components/payment/stripe-provider.tsx)

Client component wrapping `<Elements>` from `@stripe/react-stripe-js`:
- `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)` — call once at module level
- `StripeElementsOptions` with: `clientSecret`, `appearance.theme: "stripe"`, `variables.colorPrimary: "#2563EB"`, `variables.fontFamily: "Montserrat, system-ui, sans-serif"`
- No-op render (just children) when `clientSecret` is undefined

### 5. PaymentForm (components/payment/payment-form.tsx)

Props: `amount`, `onSuccess(paymentIntentId)`, `onError(message)`, `disabled?`

States:
- **Loading** — Stripe.js not yet loaded (stripe/elements null)
- **Processing** — `confirmPayment()` in flight, button shows spinner
- **Error** — `Alert variant="destructive"` with error message, user can retry
- **Ready** — PaymentElement rendered, Pay button active

On submit:
1. `stripe.confirmPayment({ elements, confirmParams: { return_url }, redirect: "if_required" })`
2. If `error` → set error state, call `onError`
3. If `paymentIntent.status === "succeeded"` → call `onSuccess(paymentIntent.id)`
4. If redirect required (3DS) → Stripe handles navigation, page remounts with URL params

UI: `<Lock>` icon + "Secured by Stripe" label, `<PaymentElement/>`, Pay button, test card hint

### 6. Checkout page refactor (app/checkout/page.tsx)

**Step changes:**
- `STEPS` array: `["Shipping", "Payment", "Review", "Confirmation"]`
- New state: `clientSecret`, `paymentIntentId`

**Payment step:**
```tsx
{step === "Payment" && (
  <>
    <h1>Payment</h1>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {!clientSecret ? (
          <Loading state: "Preparing payment..." with spinner />
        ) : (
          <StripeProvider clientSecret={clientSecret}>
            <PaymentForm
              amount={cartData!.total}
              onSuccess={(piId) => { setPaymentIntentId(piId); setStep("Review"); }}
              onError={(msg) => toast.error(msg)}
            />
          </StripeProvider>
        )}
      </div>
      <OrderSummary ... />
    </div>
  </>
)}
```

**Create PaymentIntent on Payment step mount:**
```typescript
useEffect(() => {
  if (step === "Payment" && !clientSecret && cartData?.total) {
    createPaymentIntent.mutate(cartData.total, {
      onSuccess: (data) => setClientSecret(data.clientSecret),
      onError: (err) => toast.error(`Failed to initialize payment: ${err.message}`),
    });
  }
}, [step, clientSecret, cartData?.total]);
```

**Review step — Place Order with paymentIntentId:**
Include `paymentIntentId` in the `createOrder.mutate()` call.

**3DS redirect handling — useEffect on mount:**
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const pi = params.get("payment_intent");
  const status = params.get("redirect_status");
  if (pi && status === "succeeded" && !paymentIntentId) {
    setPaymentIntentId(pi);
    setStep("Review");
    window.history.replaceState({}, "", "/checkout");
  } else if (status === "failed") {
    toast.error("Payment was not completed. Please try again.");
    window.history.replaceState({}, "", "/checkout");
  }
}, []);
```

### 7. Update use-orders and order-service

`useCreateOrder` mutationFn now accepts `{ shippingAddress, items, paymentIntentId }`.
`orderService.createOrder()` now sends `paymentIntentId` in request body.

## Success Criteria

- [ ] 4-step checkout wizard: Shipping → Payment → Review → Confirmation
- [ ] Test card `4242 4242 4242 4242` → payment succeeds → order placed → saga completes → order CONFIRMED
- [ ] Test card `4000 0000 0000 0002` → decline error shown inline, can retry
- [ ] Test card `4000 0000 0000 3220` → 3D Secure redirect → complete → return to Review → place order
- [ ] Cart cleared after successful order
- [ ] TypeScript: `npx turbo typecheck` passes

## Verification

Manual test with Stripe test mode:
1. Start all services with `STRIPE_SECRET_KEY` set
2. Go to `http://localhost:9090`
3. Register/login as `user1@store.com / User123!`
4. Add products to cart → go to checkout
5. Shipping: fill address → Continue
6. Payment: enter `4242 4242 4242 4242`, any future date, any CVC → Pay
7. Review: see order summary → Place Order
8. Confirmation: "Order #X placed!"
9. Check `http://localhost:9090/account/orders` → order should be CONFIRMED
10. Check Stripe Dashboard → Payments → PaymentIntent confirmed
11. Test decline: repeat with `4000 0000 0000 0002`
12. Test 3DS: repeat with `4000 0000 0000 3220`

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe Elements iframe sizing on mobile | Low | `PaymentElement` is responsive by default. Test on mobile viewport (375px). |
| `clientSecret` expires (24h window) | Low | PaymentIntent has 24h validity. If expired, `confirmPayment` returns error, frontend shows message, user can refresh. |
| 3DS redirect loses component state | Medium | Cart state is in React Query cache + localStorage cartId. PaymentIntentId recovered from URL params on remount. |
| `stripePromise` fails to load (no publishable key) | Medium | Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. `loadStripe()` returns null silently — PaymentForm shows "Stripe not loaded". |
