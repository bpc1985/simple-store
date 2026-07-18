# Phase 8: Admin Dashboard Updates

**Priority:** P3
**Dependencies:** Phase 3 (order paymentIntentId), Phase 6 (subscription payment data)
**Estimated time:** 1-2 hours

## Overview

Update the admin dashboard to display Stripe payment information. Orders show Stripe PaymentIntent ID and payment status. Subscription details show payment method info and transaction IDs in cycle history.

## Requirements

- Functional: Admin can see Stripe payment details on orders and subscriptions
- Non-functional: No new API endpoints needed (existing data is sufficient); backward-compatible

## Architecture

```
Admin Order Detail (/orders/[id])
  └── Order Information card
        └── If order.paymentIntentId exists:
              └── Show "Paid"/"Processing" badge + Stripe PI ID (monospace, muted)

Admin Subscription Detail (/subscriptions/customers/[id])
  ├── Subscription Detail card
  │     └── If subscription.paymentMethodId exists:
  │           └── Show payment method reference
  └── Billing Cycle History table
        └── Add "Payment" column showing transaction ID or "—"
```

## Related Code Files

### Create
- `frontend/apps/admin/src/services/payment-service.ts`

### Modify
- `frontend/apps/admin/src/app/orders/[id]/page.tsx` — show Stripe payment status
- `frontend/apps/admin/src/app/subscriptions/customers/[id]/page.tsx` — show payment method, cycle transaction IDs
- `frontend/packages/shared/src/types/index.ts` — ensure Order type has `paymentIntentId`

## Implementation Steps

### 1. Admin payment service (services/payment-service.ts)

Minimal — re-exports type and adds transaction query:
```typescript
import api from "@/lib/api";

export type { PaymentTransaction } from "@simplestore/shared";

export async function getTransactions(page = 0, pageSize = 20) {
  return api.get(`/api/v1/payment/transactions?page=${page}&pageSize=${pageSize}`);
}
```

### 2. Order detail page (orders/[id]/page.tsx)

In the Order Information card, add after shipping address:
```tsx
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

Edge cases:
- Order placed in internal mode → no `paymentIntentId` → section not rendered
- order.status === "CONFIRMED" → "Paid" badge (green)
- All other statuses → "Processing" badge (gray)

### 3. Subscription detail page (subscriptions/customers/[id]/page.tsx)

In the Subscription Detail card, add after status:
```tsx
{subscription.paymentMethodId && (
  <div className="mt-2 pt-2 border-t">
    <span className="text-xs text-muted-foreground">
      Payment method: {subscription.paymentMethodId}
    </span>
  </div>
)}
```

In the Billing Cycle History table:
- Add `<TableHead>Payment</TableHead>` column
- Add cell per row: `cycle.paymentTransactionId ? monospace paymentTransactionId : "—"`

### 4. Shared types

Ensure `Order` type has `paymentIntentId?: string`:
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

## Success Criteria

- [ ] Order detail page shows "Paid" badge and Stripe PaymentIntent ID when paymentIntentId present
- [ ] Order detail page works normally for internal-mode orders (no payment section)
- [ ] Subscription detail shows payment method ID
- [ ] Cycle history table shows payment transaction IDs
- [ ] `npx turbo typecheck && npx turbo build` passes

## Verification

```bash
cd frontend && npx turbo typecheck && npx turbo build

# Manual test:
# 1. Place an order via storefront with Stripe
# 2. Admin http://localhost:9091 → Orders → click the order
#    → Should show "Paid" badge + "Stripe: pi_xxx"
# 3. Subscribe with payment method
# 4. Admin → Subscriptions → Customers → click customer
#    → Should show payment method ID
#    → Cycle history should have transaction IDs
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `order.paymentIntentId` undefined for internal-mode orders | Low | Conditional render — `{order.paymentIntentId && (...)}` — section hidden when field missing |
| Wrong Order type in shared package | Medium | Ensure both storefront and admin use the same type definition from `@simplestore/shared` |
| Subscription `paymentMethodId` is raw Stripe ID (not user-friendly) | Low | V1 shows raw ID — acceptable for admin. Future: fetch card details from payment-service. |
