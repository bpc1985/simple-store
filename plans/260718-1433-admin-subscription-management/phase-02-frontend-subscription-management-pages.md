---
phase: 2
title: Frontend Subscription Management Pages
status: completed
priority: P2
dependencies:
  - 1
---

# Phase 2: Frontend Subscription Management Pages

## Overview

Add subscription management pages to the Next.js admin panel: plans CRUD (list/create/edit/toggle), customer subscription oversight (list with filters, detail with cycle history, admin cancel), dashboard subscription KPIs, and sidebar navigation. Follows existing admin patterns (Axios → service → hooks → page).

## Requirements

- **Functional:**
  - Plans: table list, create form, edit form, inline activate/deactivate toggle
  - Customer subscriptions: table list with status/userId filters, detail page with cycle history, admin cancel action
  - Dashboard: active subscriptions count, MRR stat card
  - Sidebar: new "Subscriptions" nav item
- **Non-functional:**
  - Match existing admin design: OLED dark theme, shadcn/ui v4 components, Tailwind v4
  - Follow existing code patterns: service per domain, hooks with React Query, forms with react-hook-form + zod
  - Loading skeletons, empty states, error toasts for all pages
  - Responsive (table → card list on mobile)

## Architecture

```
admin/src/
  types/index.ts                          ← Add subscription types
  services/subscription-service.ts        ← CREATE: API calls
  hooks/use-subscriptions.ts              ← CREATE: React Query hooks
  app/subscriptions/
    plans/
      page.tsx                            ← CREATE: Plans list + create dialog
      new/page.tsx                        ← CREATE: Create plan form
      [id]/edit/page.tsx                  ← CREATE: Edit plan form
    customers/
      page.tsx                            ← CREATE: Customer subscriptions table + filters
      [id]/page.tsx                       ← CREATE: Subscription detail + cycles + cancel
  components/layout/
    sidebar.tsx                           ← MODIFY: Add "Subscriptions" nav item
    header.tsx                            ← MODIFY: Add breadcrumb labels
  app/page.tsx                            ← MODIFY: Add subscription stat cards
```

## Related Code Files

| Action | File |
|--------|------|
| **Create** | `admin/src/services/subscription-service.ts` |
| **Create** | `admin/src/hooks/use-subscriptions.ts` |
| **Create** | `admin/src/app/subscriptions/plans/page.tsx` |
| **Create** | `admin/src/app/subscriptions/plans/new/page.tsx` |
| **Create** | `admin/src/app/subscriptions/plans/[id]/edit/page.tsx` |
| **Create** | `admin/src/app/subscriptions/customers/page.tsx` |
| **Create** | `admin/src/app/subscriptions/customers/[id]/page.tsx` |
| **Modify** | `admin/src/types/index.ts` |
| **Modify** | `admin/src/components/layout/sidebar.tsx` |
| **Modify** | `admin/src/components/layout/header.tsx` |
| **Modify** | `admin/src/app/page.tsx` |

## Implementation Steps

### Step 1: Add TypeScript types

**File:** `admin/src/types/index.ts` — append:

```typescript
export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  cadence: "MONTHLY" | "QUARTERLY";
  imageUrl: string;
  active: boolean;
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "PAYMENT_FAILED";
  startDate: string;
  nextBillingDate: string;
  lastBillingDate: string | null;
  currentCycle: number;
}

export interface Cycle {
  id: string;
  cycleNumber: number;
  status: string;
  paymentTransactionId: string | null;
  orderId: string | null;
  scheduledDate: string;
  completedDate: string | null;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  price: number;
  cadence: string;
  imageUrl: string;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: number;
  cadence?: string;
  imageUrl?: string;
  active?: boolean;
}
```

### Step 2: Create subscription service

**File:** `admin/src/services/subscription-service.ts`

```typescript
import { api } from "@/lib/api";
import {
  SubscriptionPlan,
  CustomerSubscription,
  Cycle,
  CreatePlanRequest,
  UpdatePlanRequest,
} from "@/types";

// ── Plans ────────────────────────────────────────────────────────────────

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get<SubscriptionPlan[]>(
    "/api/v1/subscription/admin/plans"
  );
  return data;
}

export async function createPlan(request: CreatePlanRequest): Promise<SubscriptionPlan> {
  const { data } = await api.post<SubscriptionPlan>(
    "/api/v1/subscription/plans",
    request
  );
  return data;
}

export async function updatePlan(
  id: number,
  request: UpdatePlanRequest
): Promise<SubscriptionPlan> {
  const { data } = await api.put<SubscriptionPlan>(
    `/api/v1/subscription/admin/plans/${id}`,
    request
  );
  return data;
}

// ── Customer Subscriptions ───────────────────────────────────────────────

export async function getSubscriptions(params?: {
  status?: string;
  userId?: string;
}): Promise<CustomerSubscription[]> {
  const { data } = await api.get<CustomerSubscription[]>(
    "/api/v1/subscription/admin/subscriptions",
    { params }
  );
  return data;
}

export async function getSubscription(id: string): Promise<CustomerSubscription> {
  const { data } = await api.get<CustomerSubscription>(
    `/api/v1/subscription/admin/subscriptions/${id}`
  );
  return data;
}

export async function cancelSubscription(id: string): Promise<void> {
  await api.post(`/api/v1/subscription/admin/subscriptions/${id}/cancel`);
}

export async function getCycles(subscriptionId: string): Promise<Cycle[]> {
  const { data } = await api.get<Cycle[]>(
    `/api/v1/subscription/admin/subscriptions/${subscriptionId}/cycles`
  );
  return data;
}
```

`createPlan` calls the existing `POST /api/v1/subscription/plans` (admin-gated via `@PreAuthorize`). All other calls use the new `/api/v1/subscription/admin/**` endpoints. `getCycles` uses the admin cycles endpoint (added in Phase 1) to bypass the ownership check.

### Step 3: Create React Query hooks

**File:** `admin/src/hooks/use-subscriptions.ts`

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as subscriptionService from "@/services/subscription-service";
import type { CreatePlanRequest, UpdatePlanRequest } from "@/types";

// ── Plans ────────────────────────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: subscriptionService.getPlans,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreatePlanRequest) =>
      subscriptionService.createPlan(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plan created");
    },
    onError: () => toast.error("Failed to create plan"),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...request }: { id: number } & UpdatePlanRequest) =>
      subscriptionService.updatePlan(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plan updated");
    },
    onError: () => toast.error("Failed to update plan"),
  });
}

// ── Customer Subscriptions ───────────────────────────────────────────────

export function useSubscriptions(params?: { status?: string; userId?: string }) {
  return useQuery({
    queryKey: ["admin-subscriptions", params],
    queryFn: () => subscriptionService.getSubscriptions(params),
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: ["admin-subscriptions", id],
    queryFn: () => subscriptionService.getSubscription(id),
    enabled: !!id,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionService.cancelSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription cancelled");
    },
    onError: () => toast.error("Failed to cancel subscription"),
  });
}

export function useCycles(subscriptionId: string) {
  return useQuery({
    queryKey: ["admin-subscriptions", subscriptionId, "cycles"],
    queryFn: () => subscriptionService.getCycles(subscriptionId),
    enabled: !!subscriptionId,
  });
}

// ── Dashboard Stats ──────────────────────────────────────────────────────

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ["admin-subscriptions", "stats"],
    queryFn: async () => {
      const subs = await subscriptionService.getSubscriptions();
      const active = subs.filter((s) => s.status === "ACTIVE").length;
      // MRR = sum of lockedPrice for all ACTIVE monthly subs + quarterly/3
      const mrr = subs
        .filter((s) => s.status === "ACTIVE")
        .reduce((sum, s) => {
          const monthlyPrice =
            s.plan.cadence === "QUARTERLY"
              ? s.plan.price / 3
              : s.plan.price;
          return sum + monthlyPrice;
        }, 0);
      return { activeCount: active, mrr };
    },
  });
}
```

### Step 4: Create Plans list page

**File:** `admin/src/app/subscriptions/plans/page.tsx`

Table listing all plans with: Name, Price, Cadence, Active (badge + toggle), Actions (Edit). "Create Plan" button opens a dialog or links to `/subscriptions/plans/new`.

- Loading: Table skeleton (matching `products/page.tsx` pattern)
- Empty: "No plans found" with create CTA
- Error: toast via React Query `onError`

Inline active toggle: calls `updatePlan({ id, active: !plan.active })`. Use the existing `Badge` component for status and `Button` for edit link.

Pattern: Client component with `usePlans()`, `useUpdatePlan()`. Table uses standard `<table>` with Tailwind classes (matches orders/products tables).

### Step 5: Create Plan form page (New)

**File:** `admin/src/app/subscriptions/plans/new/page.tsx`

Form fields: name, description (textarea), price (number), cadence (select: MONTHLY/QUARTERLY), imageUrl. Uses `react-hook-form` with `zod` resolver — same pattern as `products/new/page.tsx`.

Schema:
```typescript
const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  cadence: z.enum(["MONTHLY", "QUARTERLY"]),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
```

On submit: `createPlan.mutateAsync(data)` then `router.push("/subscriptions/plans")`.

### Step 6: Create Plan edit form page

**File:** `admin/src/app/subscriptions/plans/[id]/edit/page.tsx`

Same form as New but pre-populated via `useQuery` fetching the plan from the plans list (pulled from `usePlans` cache or a dedicated fetch). On submit calls `updatePlan.mutateAsync({ id, ...data })`.

Include an "Active" checkbox to toggle plan visibility.

### Step 7: Create Customer Subscriptions list page

**File:** `admin/src/app/subscriptions/customers/page.tsx`

Table: Subscription ID (truncated UUID), User ID, Plan Name, Status (color-coded badge), Start Date, Next Billing, Current Cycle. Row click → detail page.

Filters: status dropdown (All, ACTIVE, PAUSED, CANCELLED, PAYMENT_FAILED) + userId text input. Filter state as URL search params or local state.

Status badge colors matching storefront convention: ACTIVE → green, PAUSED → amber, CANCELLED → gray, PAYMENT_FAILED → red.

- Loading: Skeleton table
- Empty: "No subscriptions found" message
- Error: toast

### Step 8: Create Subscription detail page

**File:** `admin/src/app/subscriptions/customers/[id]/page.tsx`

Detail card showing:
- Subscription ID, User ID, Plan name + cadence
- Status badge, Start date, Next billing date, Last billing date
- Locked price, Current cycle number
- "Cancel Subscription" button with AlertDialog confirmation

Cycle history table below: Cycle #, Status, Payment Transaction ID, Scheduled Date, Completed Date. Uses `useCycles(id)`.

### Step 9: Update sidebar navigation

**File:** `admin/src/components/layout/sidebar.tsx`

Add to `navItems` array:

```typescript
{ href: "/subscriptions/plans", label: "Subscriptions", icon: Repeat },
```

Import `Repeat` from lucide-react.

Active state: prefix match on `/subscriptions` — covers plans, customers detail, and all child routes.

### Step 10: Update header breadcrumbs

**File:** `admin/src/components/layout/header.tsx`

Add to the breadcrumb label mapping:

```typescript
const breadcrumbLabels: Record<string, string> = {
  // ... existing ...
  subscriptions: "Subscriptions",
  plans: "Plans",
  customers: "Customers",
};
```

### Step 11: Add subscription stats to dashboard

**File:** `admin/src/app/page.tsx`

Add two new stat cards to the existing 4-card grid (or replace existing cards):

1. **Active Subscriptions** — count, with `Repeat` icon
2. **MRR** — formatted as currency, with `DollarSign` icon

Use `useSubscriptionStats()` hook. Cards follow the existing stat card pattern (icon + label + value in the dashboard's card grid).

If the dashboard uses a 4-column grid, expand to 6 columns or adjust layout. Existing pattern from scout: "4 stat cards (total orders, revenue, pending, confirmed)".

## Success Criteria

- [ ] `/subscriptions/plans` lists all plans with active/inactive badges and edit links
- [ ] `/subscriptions/plans/new` creates a plan with validation, redirects to list on success
- [ ] `/subscriptions/plans/[id]/edit` pre-populates form, updates plan, redirects on success
- [ ] Inline active toggle on plans table works without page refresh
- [ ] `/subscriptions/customers` lists all subscriptions with status/userId filtering
- [ ] `/subscriptions/customers/[id]` shows full subscription detail with cycle history
- [ ] Admin cancel button on detail page works with confirmation dialog
- [ ] Sidebar has "Subscriptions" link with active state on all subscription child routes
- [ ] Breadcrumbs show correct path for all subscription pages
- [ ] Dashboard shows active subscriptions count and MRR
- [ ] All pages handle loading (skeleton), empty (message), and error (toast) states
- [ ] All pages responsive (mobile sidebar sheet, stacked cards on small screens)
- [ ] `cd admin && npm run build` passes
- [ ] No TypeScript errors

## Risk Assessment

- **Low risk** — purely additive, no existing pages or services modified (except sidebar/header/dashboard which get new items, not changed logic)
- **No auth changes** — admin JWT already stored in localStorage and attached by Axios interceptor; `@PreAuthorize("hasRole('ADMIN')")` on backend handles authorization
- **API dependency on Phase 1** — frontend calls `/api/v1/subscription/admin/**` endpoints; must deploy Phase 1 first
- **Next.js 16 compatibility** — the `AGENTS.md` warns of breaking changes; follow patterns from existing pages that already work on Next.js 16
