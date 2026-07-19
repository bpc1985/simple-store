---
phase: 11
title: "Add Admin Error States"
status: pending
priority: P2
dependencies: []
effort: "1h"
---

# Phase 11: Add Admin Error States

## Overview

6 admin pages destructure only `data` and `isLoading` from their TanStack Query hooks — never `isError`. When queries fail, the page silently renders empty or crashes. Add error state handling to all pages.

## Requirements

- Functional: Every admin page shows error UI when query fails, with retry button
- Non-functional: Consistent error presentation across all admin pages

## Related Code Files

- **Modify**: `frontend/apps/admin/src/app/users/page.tsx` — add `isError`
- **Modify**: `frontend/apps/admin/src/app/inventory/page.tsx` — add `isError`
- **Modify**: `frontend/apps/admin/src/app/categories/page.tsx` — add `isError`
- **Modify**: `frontend/apps/admin/src/app/orders/page.tsx` — add `isError`
- **Modify**: `frontend/apps/admin/src/app/subscriptions/plans/page.tsx` — add `isError`
- **Modify**: `frontend/apps/admin/src/app/subscriptions/customers/page.tsx` — add `isError`
- **Reference**: `frontend/apps/admin/src/app/page.tsx` (dashboard) — already checks `isError`

## Implementation Steps

### Pattern to apply to each page

```tsx
const { data, isLoading, isError, error, refetch } = useQuery(/* ... */);

if (isLoading) return <LoadingSkeleton />;
if (isError) return (
  <Alert variant="destructive">
    <AlertTitle>Failed to load data</AlertTitle>
    <AlertDescription>
      {error instanceof Error ? error.message : "An unexpected error occurred"}
    </AlertDescription>
    <Button variant="outline" onClick={() => refetch()}>Retry</Button>
  </Alert>
);
```

### Existing `Alert` component

Admin already has an `Alert` component at `frontend/apps/admin/src/components/ui/alert.tsx`. Use it directly or re-export from `@simplestore/ui` (see Phase 10).

### Pages to fix

1. **users/page.tsx** — add error handling to `useUsers()` result
2. **inventory/page.tsx** — add error handling to `useInventory()` result
3. **categories/page.tsx** — add error handling to `useCategories()` result
4. **orders/page.tsx** — add error handling to `useOrders()` result
5. **subscriptions/plans/page.tsx** — add error handling to plan queries
6. **subscriptions/customers/page.tsx** — add error handling to customer subscription queries

## Success Criteria

- [ ] All 6 pages destructure `isError` and `error` from query results
- [ ] All 6 pages show Alert component on error with retry button
- [ ] `npx turbo typecheck` passes
- [ ] `npx turbo build` passes
- [ ] Manual test: stop backend, visit each admin page — should show error with retry, not blank

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Different pages need different error messaging | Use generic "Failed to load [resource]" pattern. Customize per page if needed. |
| Alert component not imported in some pages | Phase 10 cleanup ensures consistent imports |
