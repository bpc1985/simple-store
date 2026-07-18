---
phase: 2
title: "Subscription Management"
status: pending
priority: P1
dependencies: ["phase-01-subscription-discovery"]
---

# Phase 2: Subscription Management

## Overview

Add an authenticated account section where users can view their subscriptions, see status and billing details, perform lifecycle actions (pause/resume/cancel), and review cycle history. Includes a new backend endpoint (`GET /api/v1/subscription/{id}/cycles`) to expose per-cycle transaction history. Backed by `GET /api/v1/subscription/my`, `POST /{id}/cancel`, `POST /{id}/pause`, `POST /{id}/resume`.

## Requirements

- **Functional:** List user's subscriptions with status badges. Detail view showing plan info, billing dates, status, action buttons, and cycle history (date, status, transaction ID). Pause/resume toggle with billing warning, cancel with confirmation. Visual distinction between ACTIVE, PAUSED, CANCELLED, PAYMENT_FAILED statuses.
- **Non-functional:** Auth-gated (redirect to login if not authenticated). Follows existing account page layout patterns. Toast notifications for actions. Resume confirmation dialog warns about immediate billing. Responsive.

## Architecture

```
Storefront UI                                          Gateway (8080)              subscription-service
───────────────────────────────────────────────────────────────────────────────────────────────────────
/account/subscriptions
  → useMySubscriptions() ───────────────────────────→ GET /api/v1/subscription/my
  ← List<CustomerSubscriptionDto>

/account/subscriptions/[id]
  → useMySubscriptions() (client-filter by ID)
  → useCycles(id) ──────────────────────────────────→ GET /api/v1/subscription/{id}/cycles    [NEW BACKEND]
  ← List<CycleDto>
  → useCancelSubscription() mutation ───────────────→ POST /api/v1/subscription/{id}/cancel
  → usePauseSubscription() mutation ────────────────→ POST /api/v1/subscription/{id}/pause
  → useResumeSubscription() mutation ───────────────→ POST /api/v1/subscription/{id}/resume
```

## Related Code Files

### Create
| Action | File | Purpose |
|--------|------|---------|
| Create | `src/app/account/subscriptions/page.tsx` | My subscriptions list |
| Create | `src/app/account/subscriptions/[id]/page.tsx` | Subscription detail + actions + cycle history |
| Create | `src/components/subscriptions/subscription-card.tsx` | Subscription summary card |
| Create | `src/components/subscriptions/status-badge.tsx` | Status badge with color coding |
| Create | `src/components/subscriptions/cycle-list.tsx` | Cycle history table/list |

### Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/app/account/page.tsx` | Add "Subscriptions" link/card in account hub |
| Modify | `src/hooks/use-subscriptions.ts` | Add mySubscriptions, useCycles, cancel, pause, resume hooks |
| Modify | `src/services/subscription-service.ts` | Add getCycles method |
| Modify | `src/types/index.ts` | Add Cycle type |
| Modify | `subscription-service/.../controller/SubscriptionController.java` | Add GET /{id}/cycles endpoint |
| Modify | `subscription-service/.../repository/SubscriptionCycleRepository.java` | Add findBySubscriptionId with ordering (if needed) |

## Implementation Steps

### 0. Add backend cycles endpoint

**Controller** (`SubscriptionController.java`):
```java
@GetMapping("/{id}/cycles")
public ResponseEntity<ApiResponse<List<CycleDto>>> getCycles(
        @PathVariable String id,
        @AuthenticationPrincipal Jwt jwt) {
    List<SubscriptionCycle> cycles = subscriptionService.getCycles(id, jwt.getSubject());
    List<CycleDto> dtos = cycles.stream()
            .map(c -> new CycleDto(
                    c.getId(), c.getCycleNumber(), c.getStatus().name(),
                    c.getPaymentTransactionId(), c.getOrderId(),
                    c.getScheduledDate(), c.getCompletedDate()))
            .toList();
    return ResponseEntity.ok(ApiResponse.ok(dtos));
}
```

**Service** (`SubscriptionService.java`):
```java
public List<SubscriptionCycle> getCycles(String subscriptionId, String userId) {
    CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
    if (!sub.getUserId().equals(userId)) {
        throw new SecurityException("Not your subscription");
    }
    return cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc(subscriptionId);
}
```

Ownership check — only the subscription owner can view cycles. Repository method `findBySubscriptionIdOrderByCycleNumberDesc` already exists (verified).

### 1. Add Cycle type (`src/types/index.ts`)

```typescript
export interface Cycle {
  id: string;
  cycleNumber: number;
  status: string;           // "PENDING" | "CHARGED" | "ASSEMBLING" | "SHIPPED" | "FAILED"
  paymentTransactionId: string | null;
  orderId: string | null;
  scheduledDate: string;
  completedDate: string | null;
}
```

### 2. Add to API service and hooks

**Service** (`subscription-service.ts`):
```typescript
export async function getCycles(subscriptionId: string): Promise<Cycle[]> {
  return api.get(`/api/v1/subscription/${subscriptionId}/cycles`);
}
```

**Hooks** (`use-subscriptions.ts`):
```typescript
export function useCycles(subscriptionId: string) {
  return useQuery({
    queryKey: ["subscription-cycles", subscriptionId],
    queryFn: () => subscriptionService.getCycles(subscriptionId),
    enabled: !!subscriptionId,
  });
}
```

### 3. Extend hooks (`src/hooks/use-subscriptions.ts`)

Add to existing hooks from Phase 1:

```typescript
export function useMySubscriptions() {
  return useQuery({
    queryKey: ["my-subscriptions"],
    queryFn: subscriptionService.getMySubscriptions,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] }),
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.pauseSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] }),
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.resumeSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] }),
  });
}
```

### 4. Create status badge (`src/components/subscriptions/status-badge.tsx`)

```
- Props: status (string)
- Maps status to Badge variant:
  - ACTIVE → success (green), icon: CheckCircle
  - PAUSED → warning (amber), icon: PauseCircle
  - CANCELLED → secondary (gray), icon: XCircle
  - PAYMENT_FAILED → destructive (red), icon: AlertTriangle
- Maps cycle statuses too (for CycleList):
  - PENDING → outline, icon: Clock
  - CHARGED → success, icon: CreditCard
  - ASSEMBLING → default, icon: Package
  - SHIPPED → default, icon: Truck
  - FAILED → destructive, icon: AlertTriangle
- Follows StockBadge pattern from existing components
```

### 5. Create cycle list (`src/components/subscriptions/cycle-list.tsx`)

```
- Props: cycles (Cycle[]), isLoading: boolean
- Loading: 3 skeleton rows
- Empty: "No billing cycles yet"
- Data: table (desktop) / card list (mobile)
  - Columns: Cycle #, Status (badge), Scheduled Date, Transaction ID (truncated), Completed Date
  - Mobile: stacked cards with label-value pairs
- Cycles sorted by cycleNumber descending (newest first, from API)
```

### 6. Create subscription card (`src/components/subscriptions/subscription-card.tsx`)

```
- Props: subscription (CustomerSubscription)
- Card component with:
  - Plan image (small), name, price + cadence
  - StatusBadge
  - Next billing date (formatted)
  - Current cycle number
  - "View Details" StyledLink to /account/subscriptions/[id]
- Hover lift effect (matching product-card)
- Responsive: stacked on mobile, horizontal on desktop
```

### 7. Create my subscriptions page (`src/app/account/subscriptions/page.tsx`)

```
"use client";
- Guard: if not authenticated, redirect to /account/login
- Fetch with useMySubscriptions()
- States:
  - Loading: 2-3 skeleton cards
  - Error: error message with retry
  - Empty: EmptyState "No subscriptions yet" + "Browse Plans" CTA → /subscriptions
  - Data: list of SubscriptionCard components
- PageHeader: "My Subscriptions"
```

### 8. Create subscription detail page (`src/app/account/subscriptions/[id]/page.tsx`)

```
"use client";
- Filter useMySubscriptions() data by ID. Show 404 EmptyState if not found.
- Fetch cycles with useCycles(id)
- Full subscription info:
  - Plan image, name, description
  - StatusBadge (large)
  - Billing info: start date, last billing date, next billing date
  - Current cycle number
- Cycle history section:
  - SectionHeader: "Billing History"
  - CycleList component with loading/empty/data states
- Action buttons (contextual, based on status):
  - ACTIVE: [Pause] [Cancel]
  - PAUSED: [Resume] [Cancel]
  - PAYMENT_FAILED: [Resume] [Cancel]
  - CANCELLED: no actions (show "Cancelled" notice)
- Each action opens a confirmation dialog:
  - CancelDialog: "Are you sure you want to cancel {plan.name}?"
  - PauseDialog: "Pause billing for {plan.name}? You can resume anytime."
  - ResumeDialog: "Resume {plan.name}? ⚠️ Billing will restart from today. Your next charge may occur as soon as tonight." (warning emphasis)
- Toast on success/failure via sonner
- Breadcrumb: Home > Account > My Subscriptions > {plan.name}
```

### 9. Update account hub (`src/app/account/page.tsx`)

Add a "Subscriptions" link with Package icon (lucide-react), following existing account page layout.

## Success Criteria

- [ ] `GET /api/v1/subscription/{id}/cycles` returns cycle list, gated by ownership
- [ ] `Cycle` type matches CycleDto shape
- [ ] `/account/subscriptions` shows authenticated user's subscriptions
- [ ] Empty state links to plan discovery when user has no subscriptions
- [ ] Subscription cards display plan info, status badge, billing dates
- [ ] StatusBadge uses correct color per status
- [ ] `/account/subscriptions/[id]` shows full subscription detail
- [ ] Cycle history section displays per-cycle status, dates, and transaction IDs
- [ ] Pause action works for ACTIVE subscriptions
- [ ] Resume action works for PAUSED/PAYMENT_FAILED with billing warning in dialog
- [ ] Cancel action works with confirmation dialog
- [ ] Actions show loading state, success/error toasts
- [ ] Unauthenticated users redirected to login
- [ ] Account hub includes link to subscriptions section
- [ ] All pages responsive
- [ ] Backend changes compile with `mvn compile`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Cycle endpoint exposes data across users if ownership check fails | Ownership check in service method verifies `userId` before querying cycles |
| No single-subscription endpoint; filter from full list may show stale data | Query invalidation on mutations ensures fresh data after actions |
| Cancel is irreversible (no reactivation endpoint) | Confirmation dialog with clear messaging |
| Resume sets nextBillingDate=today; user may not expect immediate charge | Warning text in resume confirmation dialog |
| Backend change requires rebuild of subscription-service | Single small method addition; existing repository method already supports it |
