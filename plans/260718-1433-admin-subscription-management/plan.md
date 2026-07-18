---
title: Admin Subscription Box Management
description: >-
  Add subscription plan CRUD, customer subscription oversight, and dashboard
  stats to the Next.js admin panel, backed by new admin-only REST endpoints in
  subscription-service.
status: completed
priority: P2
branch: feature/subscription-box
tags:
  - subscription
  - admin
  - nextjs
  - backend
blockedBy: []
blocks: []
created: '2026-07-18T07:35:39.165Z'
createdBy: 'ck:plan'
source: skill
---

# Admin Subscription Box Management

## Overview

Add subscription box management to the Next.js admin panel (`admin/`). The `subscription-service` backend already has customer-facing endpoints and the storefront has subscription UI, but the admin has **zero** subscription management — no plan CRUD UI, no customer subscription oversight, no subscription dashboard stats.

This plan adds the missing admin API endpoints on the backend and the full management UI on the admin frontend.

## Current State

**Backend exists:**
- `subscription-service` with full customer lifecycle (subscribe, pause, resume, cancel, cycle processing)
- `POST /api/v1/subscription/plans` — Admin-guarded plan creation (no UI to use it)
- `GET /api/v1/subscription/plans` — Public, returns only active plans

**Frontend gap:** The `admin/` Next.js project has 6 pages (Dashboard, Products, Categories, Orders, Users, Inventory) with zero subscription awareness.

## Architecture

```
Admin Frontend (Next.js 16, port 9091)
    │  Axios with Bearer token (admin JWT)
    ▼
API Gateway (port 8080)
    │  /api/v1/subscription/** → subscription-service
    ▼
subscription-service
    ├── GET  /api/v1/subscription/admin/plans              ← NEW
    ├── PUT  /api/v1/subscription/admin/plans/{id}         ← NEW
    ├── GET  /api/v1/subscription/admin/subscriptions      ← NEW
    ├── GET  /api/v1/subscription/admin/subscriptions/{id} ← NEW
    ├── GET  /api/v1/subscription/admin/subscriptions/{id}/cycles ← NEW
    ├── POST /api/v1/subscription/admin/subscriptions/{id}/cancel ← NEW
    ├── POST /api/v1/subscription/plans                (existing, reused by UI)
```

Admin UI calls gateway directly — same pattern as all existing admin pages. No `admin-web` Thymeleaf changes needed (the Next.js admin is the active admin frontend).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Backend Admin API Endpoints](./phase-01-backend-admin-api-endpoints.md) | Completed |
| 2 | [Frontend Subscription Management Pages](./phase-02-frontend-subscription-management-pages.md) | Completed |

## Dependencies

- **subscription-service** already built and wired into gateway/docker-compose
- **Payment subscription consumer** complete ([plan](../260717-1441-payment-subscription-consumer/plan.md))
- **Storefront subscription UI** complete ([plan](../260717-1659-subscription-box-storefront/plan.md))
- No blocking dependencies — this plan adds net-new endpoints and UI

## Acceptance Criteria

- [x] `GET /api/v1/subscription/admin/plans` returns all plans (active + inactive) — code complete (AdminSubscriptionController.getAllPlans)
- [x] `PUT /api/v1/subscription/admin/plans/{id}` updates plan fields including active toggle — code complete
- [x] `GET /api/v1/subscription/admin/subscriptions` returns all customer subscriptions with optional status/userId filters — code complete
- [x] `GET /api/v1/subscription/admin/subscriptions/{id}` returns any subscription detail without ownership check — code complete
- [x] `GET /api/v1/subscription/admin/subscriptions/{id}/cycles` returns cycle history without ownership check — code complete
- [x] Admin can create, edit, list, and toggle (activate/deactivate) subscription plans via UI — pages created
- [x] Admin can view all customer subscriptions with status badges and filtering — pages created
- [x] Admin can view any customer's subscription detail with cycle history — detail page created
- [x] Admin can cancel any subscription — cancel action with AlertDialog implemented
- [x] Dashboard shows subscription KPIs (active count, MRR) — 2 stat cards added
- [x] Sidebar includes "Subscriptions" nav item — nav item + breadcrumbs added
- [x] All pages handle loading, empty, and error states — skeletons, empty messages, toasts
- [x] Backend compiles: `mvn -pl subscription-service clean compile` ✓
- [x] Frontend builds: `cd admin && npm run build` ✓ (Next.js 16.2.10, 17 routes)

## Validation Log

### Session 1 — 2026-07-18
**Trigger:** `/ck:plan validate`
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture/UX]** Page structure: separate `/subscriptions/plans` and `/subscriptions/customers` vs single tabbed `/subscriptions` page?
   - **Answer:** Separate pages
   - **Rationale:** Matches existing admin pattern — `/products`, `/orders` etc. are separate pages. Plans and customers are distinct concerns with different actions.

2. **[Architecture]** Admin cycle history access: add `GET /admin/subscriptions/{id}/cycles` or relax existing user endpoint's ownership check?
   - **Answer:** Add admin cycles endpoint
   - **Rationale:** Clean separation — no risk of weakening user endpoint security. One additional controller method.

3. **[UX]** Dashboard: add 2 subscription stat cards to existing 4-card grid (6 total) vs separate stats page vs replace cards?
   - **Answer:** Add to existing grid — 6 cards
   - **Rationale:** Subscriptions are first-class metrics alongside orders/revenue. Expand the grid rather than fragment stats.

4. **[Scope]** Plan deletion: active toggle only (soft-delete) vs toggle + guarded hard delete?
   - **Answer:** Active toggle only
   - **Rationale:** Deactivate plans to hide them. No hard delete avoids referential integrity issues with existing subscriptions. KISS.

#### Confirmed Decisions
- Page structure: separate `/subscriptions/plans` + `/subscriptions/customers` pages
- Admin cycles endpoint: new `GET /admin/subscriptions/{id}/cycles` with `@PreAuthorize`
- Dashboard: expand to 6 stat cards (add active subscriptions count + MRR)
- Plan deletion: soft-delete via active toggle, no hard delete

#### Impact on Phases
- Phase 1: Add `GET /admin/subscriptions/{id}/cycles` endpoint + `getCyclesAdmin()` service method
- Phase 2: Use admin cycles endpoint instead of user endpoint; no other changes (page structure, dashboard, and delete behavior already matched validated decisions)

### Verification Results
- **Tier:** Light
- **Claims checked:** 10
- **Verified:** 10 | **Failed:** 0 | **Unverified:** 0
- **Failures:** None

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01-backend-admin-api-endpoints.md, phase-02-frontend-subscription-management-pages.md
- Decision deltas checked: 3 (admin cycles endpoint, dashboard cards, no hard delete)
- Reconciled stale references: 1 (phase-02 referenced user cycle endpoint → now admin endpoint)
- Unresolved contradictions: 0
