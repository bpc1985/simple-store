---
phase: 1
title: Subscription Discovery
status: in-progress
priority: P1
dependencies: []
---

# Phase 1: Subscription Discovery

## Overview

Give customers the ability to browse available subscription plans, view plan details, and subscribe. All data comes from the existing `GET /api/v1/subscription/plans` (public) and `POST /api/v1/subscription/subscribe` (authenticated) endpoints.

## Requirements

- **Functional:** Public plan listing and plan detail pages. Authenticated subscribe flow with confirmation dialog. Toast notification on success/failure.
- **Non-functional:** Follows existing storefront patterns (TanStack Query hooks, axios service layer, shadcn/ui components). Handles loading, empty, and error states. Responsive across 375px–1440px. WCAG AA.

## Architecture

```
Storefront UI                    Gateway (8080)              subscription-service
─────────────────────────────────────────────────────────────────────────────────
/subscriptions page
  → useSubscriptionPlans() ────→ GET /api/v1/subscription/plans (public)
  ← List<SubscriptionPlanDto>

/subscriptions/[id] page
  → useSubscriptionPlan(id) ───→ GET /api/v1/subscription/plans (client-filter)
  → useSubscribe() mutation ───→ POST /api/v1/subscription/subscribe (authed)
  ← CustomerSubscriptionDto
```

Plans endpoint returns a flat list (no single-plan endpoint). Client-side filter by ID for the detail page is acceptable since plan count is small (<20). If the plan doesn't exist in the list, show 404.

## Related Code Files

### Create
| Action | File | Purpose |
|--------|------|---------|
| Create | `src/services/subscription-service.ts` | API client for subscription endpoints |
| Create | `src/hooks/use-subscriptions.ts` | TanStack Query hooks |
| Create | `src/app/subscriptions/page.tsx` | Public plan listing page |
| Create | `src/app/subscriptions/[id]/page.tsx` | Plan detail page with subscribe |
| Create | `src/components/subscriptions/plan-card.tsx` | Reusable plan card |
| Create | `src/components/subscriptions/subscribe-dialog.tsx` | Confirm-and-subscribe dialog |

### Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/types/index.ts` | Add `SubscriptionPlan`, `CustomerSubscription` types |

## Implementation Steps

### 1. Add types (`src/types/index.ts`)

```typescript
export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  cadence: string;        // "MONTHLY" | "QUARTERLY"
  imageUrl: string;
  active: boolean;
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: string;          // "ACTIVE" | "PAUSED" | "CANCELLED" | "PAYMENT_FAILED"
  startDate: string;
  nextBillingDate: string;
  lastBillingDate: string | null;
  currentCycle: number;
}

export interface SubscribeRequest {
  planId: number;
  paymentMethodId?: string;
}
```

### 2. Create API service (`src/services/subscription-service.ts`)

```typescript
import api from "@/lib/api";
import type { SubscriptionPlan, CustomerSubscription, SubscribeRequest } from "@/types";

export async function getPlans(): Promise<SubscriptionPlan[]> {
  return api.get("/api/v1/subscription/plans");
}

export async function getMySubscriptions(): Promise<CustomerSubscription[]> {
  return api.get("/api/v1/subscription/my");
}

export async function subscribe(data: SubscribeRequest): Promise<CustomerSubscription> {
  return api.post("/api/v1/subscription/subscribe", data);
}

export async function cancelSubscription(id: string): Promise<void> {
  return api.post(`/api/v1/subscription/${id}/cancel`);
}

export async function pauseSubscription(id: string): Promise<void> {
  return api.post(`/api/v1/subscription/${id}/pause`);
}

export async function resumeSubscription(id: string): Promise<void> {
  return api.post(`/api/v1/subscription/${id}/resume`);
}
```

Follows the exact pattern of `src/services/catalog-service.ts`.

### 3. Create hooks (`src/hooks/use-subscriptions.ts`)

```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as subscriptionService from "@/services/subscription-service";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionService.getPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.subscribe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}
```

Additional hooks for my-subscriptions, cycles, cancel, pause, resume will be added in Phase 2.

### 4. Create plan listing page (`src/app/subscriptions/page.tsx`)

Server component wrapper or client component:

```
"use client";
- Import: useSubscriptionPlans hook, PlanCard component, PageHeader, Skeleton, EmptyState
- Fetch plans with useSubscriptionPlans()
- States:
  - Loading: 3 skeleton cards in a grid
  - Error: Display error message with retry
  - Empty: "No subscription plans available" empty state
  - Data: Grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
- PageHeader with title "Subscription Boxes" and subtitle
```

### 5. Create plan card (`src/components/subscriptions/plan-card.tsx`)

```
- Props: SubscriptionPlan
- Image (4:5 aspect ratio), name, description (2-line clamp), price, cadence badge
- "View Details" StyledLink to /subscriptions/[id]
- Follows product-card.tsx patterns: Card component, hover lift, tinted shadow
- Cadence badge: secondary badge with icon (calendar/refresh-cw)
- Price: PriceDisplay component (tabular-nums, foreground color)
```

### 6. Create plan detail page (`src/app/subscriptions/[id]/page.tsx`)

```
"use client";
- Get plan by filtering useSubscriptionPlans() data by ID
- Full plan info: image, name, description, price + cadence
- "Subscribe" button (primary, full-width on mobile)
  - If not authenticated: link to /account/login?redirect=/subscriptions/[id]
  - If authenticated: opens SubscribeDialog
- SubscribeDialog component:
  - Confirmation: plan name, price per cadence
  - "Confirm Subscription" button
  - Calls useSubscribe() mutation
  - Success toast: "Subscribed to {plan.name}!" via sonner
  - Error toast: error message
  - On success, redirect to /account/subscriptions
- Breadcrumb: Home > Subscriptions > {plan.name}
```

### 7. Create subscribe dialog (`src/components/subscriptions/subscribe-dialog.tsx`)

```
- Props: plan (SubscriptionPlan), open, onOpenChange
- Dialog component (shadcn/ui)
- Content: plan name, price, cadence, confirm button
- Mutation state: loading spinner on confirm, disable while pending
- Error state: inline error message
```

## Success Criteria

- [ ] `/subscriptions` page loads and displays active subscription plans from API
- [ ] Plan cards match storefront design tokens (colors, typography, spacing, shadows)
- [ ] `/subscriptions/[id]` shows plan detail for each seeded plan
- [ ] Clicking "Subscribe" as unauthenticated user redirects to login
- [ ] Clicking "Subscribe" as authenticated user shows confirmation dialog
- [ ] Successful subscription shows success toast and redirects to account
- [ ] All pages handle loading (skeleton), error (message + retry), and empty states
- [ ] Responsive: 1-2-3 column grid at mobile/tablet/desktop breakpoints
- [ ] Typescript compiles with no errors
- [ ] Follows existing patterns: service layer → hooks → components

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| No single-plan endpoint — detail page must filter client-side | Plans list is small (<20 items); client-side filter acceptable. Show 404 if not found. |
| Image URLs may be broken (Unsplash seed URLs) | Add fallback placeholder image in PlanCard component |
| subscribe() returns currentCycle: 0 (race with async consumer) | Not a storefront concern; display currentCycle as-is from API |
