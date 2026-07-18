---
title: "Subscription Box Storefront UI"
description: "Add subscription box browsing and management UI to the Next.js storefront, plus a cycle-history backend endpoint, backed by the existing subscription-service REST API."
status: completed
priority: P2
branch: "feature/subscription-box"
tags: ["subscription", "storefront", "ui", "nextjs", "backend"]
blockedBy: []
blocks: []
created: "2026-07-17T10:01:51.217Z"
createdBy: "ck:plan"
source: skill
---

# Subscription Box Storefront UI

## Overview

Add subscription box UI to the Next.js storefront: a public plan discovery flow (browse plans, view details, subscribe), an authenticated account management section (view subscriptions, pause/resume/cancel, cycle history), and one new backend endpoint (`GET /api/v1/subscription/{id}/cycles`) to expose per-cycle billing history. All backed by the existing `subscription-service` REST API via the gateway.

**Most backend is done.** `subscription-service` exposes these endpoints through the gateway at `/api/v1/subscription`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans` | Public | List active subscription plans |
| POST | `/plans` | Admin | Create plan |
| POST | `/subscribe` | User | Subscribe to a plan |
| GET | `/my` | User | List current user's subscriptions |
| POST | `/{id}/cancel` | User | Cancel subscription |
| POST | `/{id}/pause` | User | Pause subscription |
| POST | `/{id}/resume` | User | Resume subscription |
| GET | `/{id}/cycles` | User | **NEW** — List billing cycles for a subscription |

Gateway already routes `/api/v1/subscription/**` to subscription-service and permits `GET /plans` publicly.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Subscription Discovery](./phase-01-subscription-discovery.md) | Completed |
| 2 | [Subscription Management](./phase-02-subscription-management.md) | Completed |
| 3 | [Integration and Polish](./phase-03-integration-and-polish.md) | Completed |

## Dependencies

- Backend: subscription-service already built and wired into gateway/docker-compose. Phase 2 adds a small backend endpoint for cycle history.
- Payment integration: `payment-service` consumer for subscription charges is done ([plan](../260717-1441-payment-subscription-consumer/plan.md), status: completed)
- Design: follows SimpleStore storefront design system (`storefront/DESIGN.md`). The existing design system plan ([storefront redesign](../260717-0055-storefront-redesign/plan.md)) covers broader redesign of all storefront pages — this plan is scoped to new subscription pages only and should follow the established tokens and component patterns regardless of whether the full redesign is applied first.

## Validation Log

### Session 1 — 2026-07-17
**Trigger:** `/ck:plan validate`
**Questions asked:** 4

#### Questions & Answers

1. **[Scope]** Backend `CycleDto` exists but no `GET /{id}/cycles` endpoint is exposed. Phase 2 shows `currentCycle` number only with a placeholder note. How do you want to handle cycle history?
   - **Answer:** Add backend endpoint now
   - **Rationale:** Enables full cycle history UI rather than placeholder. Small addition: one controller method + one service method, repository query already exists.

2. **[UX/Architecture]** When an unauthenticated user clicks "Subscribe" on a plan detail page, the plan redirects to `/account/login?returnUrl=...`. Is this the UX you want?
   - **Answer:** Redirect to login
   - **Rationale:** Matches existing checkout/cart gating pattern. Consistent UX.

3. **[Architecture]** `SubscribeRequest` has an optional `paymentMethodId` field. Phase 1 doesn't expose payment method UI. Should users pick a payment method when subscribing?
   - **Answer:** Defer (don't show)
   - **Rationale:** Payment method is pre-configured/default. No UI needed now.

4. **[Behavior]** `resumeSubscription` sets `nextBillingDate = today`, meaning the scheduler fires that night. Should the UI warn users about immediate billing when they click Resume?
   - **Answer:** Show warning in dialog
   - **Rationale:** Prevents surprise charges. Added to Phase 2 resume confirmation dialog.

#### Impact on Phases
- Phase 2: Added backend endpoint task (step 0), CycleList component, useCycles hook, Cycle type, resume warning text
- Phase 1: Unchanged
- Phase 3: Unchanged

## Acceptance Criteria

- [x] Public subscription plans page at `/subscriptions` displays active plans from the API
- [x] Plan detail page at `/subscriptions/[id]` shows plan info with subscribe CTA
- [x] Authenticated users can subscribe from plan detail page (redirect to login if not authed)
- [x] Account section at `/account/subscriptions` lists user's subscriptions with status badges
- [x] Subscription detail at `/account/subscriptions/[id]` shows plan, status, cycle history (via new backend endpoint), and action buttons (pause/resume/cancel)
- [x] Resume confirmation dialog warns about immediate billing
- [x] Navigation (header dropdown + footer) includes subscription links
- [x] Homepage includes a subscription box CTA section
- [x] All subscription pages handle loading, empty, and error states
- [x] All pages responsive (mobile/tablet/desktop)
- [x] `GET /api/v1/subscription/{id}/cycles` endpoint returns cycle list with ownership check
- [x] TypeScript types cover all API shapes including Cycle
- [x] Backend compiles with `mvn compile`
