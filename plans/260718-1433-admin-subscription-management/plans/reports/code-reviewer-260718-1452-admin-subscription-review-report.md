# Code Review: Admin Subscription Management

## Summary

Builds pass (confirmed by tester). No showstoppers found. 1 critical performance issue (N+1), 2 high-precision/monetary display bugs, 2 medium consistency concerns, 1 minor layout item. Pattern compliance is good.

---

## Critical

### N+1: batch query missing on admin subscription listing

`AdminSubscriptionController.toCustomerSubscriptionDto()` (controller L101) hits `cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc()` per subscription row. For N subscriptions this fires N extra queries. The same issue exists in the non-admin `getUserSubscriptions()` (service L106), so not a regression from this commit, but the admin listing is where the pain shows first.

**Fix:** add a repository method that selects the latest cycle per subscription in one query (e.g., `@Query` with a window/subquery or a bulk fetch).

---

## High

### 1. formatCurrency rounds to 0 decimals in subscription pages

Three subscription pages (`plans/page.tsx`, `customers/page.tsx`, `customers/[id]/page.tsx`) use `maximumFractionDigits: 0`. Plan prices like $29.99 display as `$30`. Admin UIs should show exact cents.

**Fix:** change to `minimumFractionDigits: 2, maximumFractionDigits: 2` in formatCurrency for these pages.

### 2. MRR computed client-side from all subscriptions

`useSubscriptionStats()` (hooks L85-103) calls `getSubscriptions()` with no filter (loads every row), then filters/folds in JavaScript. The `/ 3` for quarterly MRR introduces IEEE 754 precision drift. Should be a backend aggregation endpoint.

**Fix:** add a backend endpoint that returns `{ activeCount, mrr }` computed in SQL/Java with `BigDecimal` arithmetic.

---

## Medium

### 3. SubscriptionStatus.valueOf() throws 500 on bad input

`SubscriptionService.getAllSubscriptions()` calls `SubscriptionStatus.valueOf(status.toUpperCase())` without a catch. Invalid status strings produce `IllegalArgumentException` mapped to HTTP 500 with stack trace leak. Should be 400.

**Fix:** catch `IllegalArgumentException` in the controller and return `ResponseEntity.badRequest()`.

### 4. Frontend createPlan calls non-admin endpoint path

Frontend `subscription-service.ts:22` POSTs to `/api/v1/subscription/plans` (public path, protected by `@PreAuthorize` on the controller method). All other admin operations go through `/api/v1/subscription/admin/*`. Inconsistent path and fragile if public controller security changes.

**Fix:** add `@PostMapping("/admin/plans")` to `AdminSubscriptionController` and update the frontend path.

### 5. Sidebar Subscriptions nav not active on customer pages

Sidebar Subscriptions item points to `/subscriptions/plans`. Navigating to `/subscriptions/customers/*` does not match `pathname.startsWith("/subscriptions/plans")`, so the nav item shows as inactive.

**Fix:** make the subscription nav item active for any `/subscriptions/*` path, or add a top-level `/subscriptions` redirect page.

---

## Low

### 6. Dashboard stat grid merges subscription cards with order/revenue cards

`page.tsx` places `<SubscriptionStatCards />` inside the same CSS grid as the 4 order/revenue stat cards, making 6 items in a 3-column grid. Subscription KPIs share visual weight with primary metrics. Consider a separate row with a subtle label.

### 7. Duplicated formatCurrency across 4 files

Existing pattern in the codebase; not blocking.

---

## Verified (no issues found)

- Gateway route `Path=/api/v1/subscription/**` covers all admin paths -- correct.
- `@PreAuthorize("hasRole('ADMIN')")` on class-level -- matches project convention.
- `scanBasePackages` includes `com.simplestore.common` -- required for shared config.
- All endpoints return `ApiResponse.ok()` -- correct unwrapping via interceptor.
- Dockerfile, pom.xml, docker-compose.yml -- follow existing patterns.
- Sidebar, header, dashboard -- modifications are additive; existing items unchanged.
- All 4 subscription pages handle loading/empty states with skeletons.

---

## Unresolved Questions

- Are 0-decimal prices intended for a "subscription-style" display? If so, ignore finding #1.
- Is the subscription list expected to grow beyond ~100 rows? If yes, finding #2 (client-side MRR) and finding #0 (N+1) become blocking.
- Should `cadence` validation (`@Pattern`) be added to `CreatePlanRequest`? Not urgent but closes a defensive hole.
