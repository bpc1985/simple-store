---
phase: 3
title: "Integration and Polish"
status: pending
priority: P2
dependencies: ["phase-01-subscription-discovery", "phase-02-subscription-management"]
---

# Phase 3: Integration and Polish

## Overview

Integrate subscription CTAs into existing storefront pages (homepage, navigation, footer) and apply finishing touches: loading skeletons, empty states, error handling consistency, responsive polish, and cross-page flow testing.

## Requirements

- **Functional:** Subscription box section on homepage. Navigation links in header dropdown and footer. Consistent loading/empty/error states across all subscription pages. Smooth auth-redirect flow.
- **Non-functional:** Follows existing design tokens. All subscription pages pass WCAG AA. No regressions on existing pages.

## Related Code Files

### Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/app/page.tsx` | Add subscription box CTA section |
| Modify | `src/components/layout/header.tsx` | Add "Subscriptions" link in user dropdown |
| Modify | `src/components/layout/footer.tsx` | Add "Subscriptions" link in footer |
| Modify | `src/app/account/page.tsx` | Already modified in Phase 2; verify consistency |

## Implementation Steps

### 1. Homepage subscription section (`src/app/page.tsx`)

Add a new section between existing sections (after featured products, before or replacing trust badges section):

```
- Named export or inline section: SubscriptionSection
- Fetch plans with useSubscriptionPlans() — show max 3 plans
- If plans are available (data.length > 0):
  - SectionHeader: "Subscription Boxes" with "View All" link to /subscriptions
  - Horizontal scrollable row or 3-column grid of PlanCards
  - Each card: image, name, price/cadence, "Subscribe" StyledLink
- If no plans or loading: silently render nothing (don't block the homepage)
- Match existing section spacing (space-y-16)
```

### 2. Navigation integration

**Header dropdown** (`src/components/layout/header.tsx`):
```
- In the authenticated user dropdown (alongside "My Account", "My Orders", "Logout"):
  - Add "Subscriptions" link with Package icon (lucide-react)
  - Route: /account/subscriptions
  - Position: between "My Orders" and "Logout"
```

**Footer** (`src/components/layout/footer.tsx`):
```
- In the "Shop" column, add "Subscriptions" link
  - Route: /subscriptions
  - Position: after "All Products" (or similar shop link)
  - If no shop column exists, add to the most relevant column
```

### 3. Cross-page flow verification

Ensure the full user journey works end-to-end:

```
Unauthenticated flow:
  Homepage → /subscriptions → /subscriptions/[id] → Subscribe → redirect to login
  → after login, redirect back to /subscriptions/[id] → subscribe → toast → /account/subscriptions

Authenticated flow:
  /subscriptions → pick plan → /subscriptions/[id] → Subscribe → confirmation dialog
  → success toast → auto-navigate to /account/subscriptions → see new subscription

Management flow:
  /account → Subscriptions link → /account/subscriptions → click subscription
  → /account/subscriptions/[id] → Pause → confirm dialog → toast → status changes to PAUSED
  → Resume → confirm dialog → toast → status changes to ACTIVE
  → Cancel → confirm dialog → toast → status changes to CANCELLED
```

### 4. State handling consistency audit

Verify every subscription page handles all states:

| Page | Loading | Error | Empty | Data |
|------|---------|-------|-------|------|
| `/subscriptions` | 3 skeleton cards | Error message + retry | "No plans available" EmptyState | Grid of PlanCards |
| `/subscriptions/[id]` | Skeleton (plan detail shape) | Error + retry | "Plan not found" 404 | Full plan detail |
| `/account/subscriptions` | 2-3 skeleton cards | Error + retry | "No subscriptions" + Browse Plans CTA | List of SubscriptionCards |
| `/account/subscriptions/[id]` | Skeleton | Error + retry | "Subscription not found" | Full detail + actions |

Use existing components: `Skeleton` from ui, `EmptyState`, `Alert` for errors.

### 5. Auth redirect flow

The login page at `/account/login` already supports `?returnUrl=` parameter. Subscription pages should:

```
- SubscribeDialog (unauthenticated):
  - Use Next.js router to redirect:
    router.push(`/account/login?returnUrl=${encodeURIComponent(window.location.pathname)}`)

- Account subscription pages (unauthenticated):
  - Use the existing pattern from checkout/orders:
    if (!isAuthenticated && !isLoading) {
      return <EmptyState title="Login Required" ... />
    }
  - Consistent with existing account gating pattern
```

### 6. Responsive and accessibility polish

- Plan cards grid: 1 col (mobile), 2 cols (tablet), 3 cols (desktop) — match product grid
- Subscription cards: stacked on mobile, potential horizontal on desktop — test both
- Action buttons on detail page: full-width on mobile, inline on desktop
- Dialog components: test on mobile (should be sheets/drawers on small screens per shadcn conventions)
- Tab navigation: test keyboard navigation through subscribe flow
- Focus management: focus trap in dialogs, focus return on close
- Color contrast: verify status badge colors pass 4.5:1 on light and dark backgrounds

## Success Criteria

- [ ] Homepage includes subscription box section with plans from API
- [ ] Header user dropdown includes "Subscriptions" link
- [ ] Footer includes "Subscriptions" link
- [ ] Full unauthenticated-to-subscribed journey works end-to-end
- [ ] Full lifecycle management journey (pause/resume/cancel) works end-to-end
- [ ] Login redirect preserves the intended destination page
- [ ] All subscription pages pass visual regression check (loading, empty, error, data states)
- [ ] All subscription pages are responsive (375px, 768px, 1024px, 1440px)
- [ ] No regressions on existing pages (home, account, header, footer)
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] All new pages pass WCAG AA (semantic HTML, focus rings, labels, alt text)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Homepage section blocks render if plans API is slow | Render section only when data arrives; no spinner on homepage — silent fallback |
| Header/footer changes could break existing layout | Follow existing link patterns exactly; test at all breakpoints |
| Auth redirect cycle if login is broken | Uses existing `returnUrl` pattern already tested in cart/checkout flow |
| Responsive issues with new card layouts | Test at all 4 breakpoints; use same grid classes as product-grid |
