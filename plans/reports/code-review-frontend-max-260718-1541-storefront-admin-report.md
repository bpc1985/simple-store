# Max-Effort Code Review — Storefront & Admin Frontend Apps

**Date**: 2026-07-18
**Scope**: storefront/ + admin/ Next.js apps (106 TypeScript files)
**Effort**: Max (4 finder agents + controller self-review)
**Agent themes**: Correctness (auth/API), Subscription UI, Page flows, Reuse/cleanup

## Methodology

4 parallel finder agents + controller self-review → dedup → 15 findings ranked by severity. Each finding verified by reading actual file contents.

---

## Findings (15, ranked most-severe first)

### CRITICAL — correctness bugs

| # | File | Line | Summary |
|---|------|------|---------|
| 1 | `storefront/src/app/checkout/page.tsx` | 73 | `clearCart.mutate()` fires in create-order `onSuccess` with no error handling. If clearCart fails, order is confirmed but cart retains all items — no user feedback. |
| 2 | `storefront/src/hooks/use-cart.ts` | 57 | Cart quantity mutations have no serialization — rapid clicks fire concurrent PUT requests. Out-of-order responses leave the cart at a stale quantity. |
| 3 | `storefront/src/lib/api.ts` | 21 | No 401 handler in response interceptor. Expired JWT causes all API calls to silently fail with generic "An error occurred" — user appears authenticated but nothing works. Admin handles this (redirect to `/login`). |

### HIGH — real bugs with specific triggers

| # | File | Line | Summary |
|---|------|------|---------|
| 4 | `storefront/src/components/layout/cart-drawer.tsx` | 107 | Cart-drawer quantity input fires `onChange` on every keystroke — typing "10" fires 2 API mutations behind the race condition of #2. No debounce. |
| 5 | `storefront/src/app/cart/page.tsx` | 73 | Cart query error state masquerades as empty cart. `isError` from useQuery is never checked — network/backend failure renders "Your cart is empty" with no retry option. Also affects `cart-drawer.tsx:64` and `checkout/page.tsx:115`. |
| 6 | `admin/src/hooks/use-auth.ts` | 16 | Admin `useLogin()` only stores `accessToken` in localStorage — discards `refreshToken` from the login response. Admin tokens cannot be refreshed; users must re-login on expiry. |
| 7 | `admin/src/hooks/use-auth.ts` | 24 | Admin `useMe()` returns `{ token }` stub — never calls `identityService.getMe()` to fetch actual user data. Admin app has no access to user name, email, or roles. |
| 8 | `storefront/src/lib/auth-context.tsx` | 43 | `AuthProvider.login()` stores only `"token"` in localStorage, NOT `"refreshToken"`. `useLogin` hook stores both. Callers using `useAuth().login()` directly lose the refresh token. |

### MEDIUM

| # | File | Line | Summary |
|---|------|------|---------|
| 9 | `storefront/src/components/products/filter-panel.tsx` | 86 | `parseFloat(localMin)` returns NaN for whitespace input. Truthy check doesn't catch NaN → `minPrice: NaN` sent as query param to backend. |
| 10 | `storefront/src/app/account/subscriptions/[id]/page.tsx` | 57 | Subscription detail page fetches ALL user subscriptions to display one — no dedicated `useSubscription(id)` hook. Same pattern at `subscriptions/[id]/page.tsx:31` fetching all plans. |
| 11 | `storefront/src/components/subscriptions/subscription-card.tsx` | 12 | Date formatting missing `timeZone: "UTC"` — browser local timezone shifts UTC dates by offset. `cycle-list.tsx` correctly uses UTC; subscription-card and detail pages don't. |
| 12 | `admin/src/hooks/use-subscriptions.ts` | 88 | `useSubscriptionStats` fetches ALL subscriptions (no pagination) to compute 2 dashboard numbers. O(n) client-side for 50k subscriptions. |
| 13 | `admin/src/app/subscriptions/customers/page.tsx` | 100 | User ID filter fires API call on every keystroke — 20 characters = 20 requests with no debounce or cancellation. |

### LOW

| # | File | Line | Summary |
|---|------|------|---------|
| 14 | `admin/src/app/subscriptions/customers/[id]/page.tsx` | 88 | Admin cycles query fires even when subscription fetch returns 404 — parallel queries with no dependency. Wasteful backend call for invalid subscription IDs. |
| 15 | `storefront/src/hooks/use-products.ts` | 3 | Uses deprecated `keepPreviousData` import from @tanstack/react-query v5. Will break on v6 upgrade. Should use `placeholderData: (prev) => prev`. |
| 16 | `storefront/src/lib/api.ts` | 22 | Response success interceptor unconditionally unwraps `response.data.data` without checking wrapper shape. Non-ApiResponse 2xx responses (raw strings, direct arrays) silently resolve as `undefined`. Admin interceptor correctly checks `typeof response.data.success === 'boolean'` before unwrapping. |
| 17 | `admin/src/hooks/use-orders.ts` | 8 | Query key collision: `useOrders(page)` and `useOrder(id)` both use `["orders", <number>]`. Page 0 and order id 0 (or 1) share the same React Query cache slot, corrupting displayed data. Same collision in `admin/src/hooks/use-products.ts`.

---

## Cleanup & Architecture Notes

- **8 UI components duplicated** between `storefront/src/components/ui/` and `admin/src/components/ui/`: badge, card, dialog, dropdown-menu, select, separator, sheet, skeleton. Identical copies.
- **~80% type duplication** between `storefront/src/types/index.ts` and `admin/src/types/index.ts` (~160 lines each). Cadence types differ: storefront uses `string`, admin uses `'MONTHLY' | 'QUARTERLY'`.
- **`cn()` utility** duplicated in both `storefront/src/lib/utils.ts` and `admin/src/lib/utils.ts` (identical 7-line function).
- **Auth implementation divergence**: storefront uses dual-token (access+refresh) with user data fetch; admin uses single-token with no user data. Inconsistent localStorage keys (`"token"` vs `"admin-token"`).
- **Items with missing error states**: cart empty-state (3 locations), cycles lists (2 locations), subscription detail (2 locations).
- **Admin `useDashboardStats`** computes revenue aggregation from page-0 orders only (first 20) — silently incomplete for stores with >20 orders.

## Positive Observations

- All forms have zod client-side validation before API calls
- All mutations have `toast.error()` handlers — no swallowed errors in mutation paths
- Skeleton loading states present for every data-dependent page
- Checkout "Place Order" button disabled during `isPending` (prevents double-submit)
- Auth gating correctly uses `enabled: isAuthenticated` in React Query hooks
