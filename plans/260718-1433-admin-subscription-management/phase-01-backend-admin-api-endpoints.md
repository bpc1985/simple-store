---
phase: 1
title: Backend Admin API Endpoints
status: completed
priority: P2
dependencies: []
---

# Phase 1: Backend Admin API Endpoints

## Overview

Add admin-only REST endpoints to `subscription-service` for plan management (list all, update, toggle) and customer subscription oversight (list all across users, get any without ownership check). All guarded with `@PreAuthorize("hasRole('ADMIN')")`.

## Requirements

- **Functional:**
  - Admin can list ALL plans (including inactive) — current `GET /plans` returns only active ones
  - Admin can update any plan field: name, description, price, cadence, imageUrl, active flag
  - Admin can list all customer subscriptions across all users with optional status/userId filters
  - Admin can view any subscription's detail including cycle history (no ownership check)
- **Non-functional:**
  - All endpoints under `/api/v1/subscription/admin/**` with `@PreAuthorize("hasRole('ADMIN')")`
  - Follow existing patterns: same DTOs, same `ApiResponse` wrapper, same service layer
  - No breaking changes to existing public/user endpoints

## Architecture

New admin controller at `/api/v1/subscription/admin` — clean separation from user-facing controller at `/api/v1/subscription`.

```
AdminSubscriptionController  (@PreAuthorize on class)
├── GET  /admin/plans                    → getAllPlans()
├── PUT  /admin/plans/{id}              → updatePlan(id, request)
├── GET  /admin/subscriptions           → getAllSubscriptions(status?, userId?)
├── GET  /admin/subscriptions/{id}      → getSubscription(id)
├── GET  /admin/subscriptions/{id}/cycles → getCyclesAdmin(id)    [no owner check]
└── POST /admin/subscriptions/{id}/cancel → cancelSubscriptionAdmin(id)
```

No new RabbitMQ bindings needed — this is purely REST. Gateway already routes `/api/v1/subscription/**` to subscription-service, so `/api/v1/subscription/admin/**` is automatically covered.

### Data Flow

```
Admin UI → Axios (Bearer admin JWT) → Gateway /api/v1/subscription/admin/** → AdminSubscriptionController → SubscriptionService → JPA repos
```

Existing `SubscriptionService` already has most needed repository access. New service methods needed:

| Method | Repository Query | Notes |
|--------|-----------------|-------|
| `getAllPlans()` | `planRepository.findAll()` | JPA built-in, returns all |
| `updatePlan(id, req)` | `planRepository.findById(id)` + save | Update fields from request |
| `getAllSubscriptions(status?, userId?, page)` | `subscriptionRepository.findAll(Spec, pageable)` | JPA spec for optional filters |
| `getSubscription(id)` | `subscriptionRepository.findById(id)` | No owner check |
| `cancelSubscriptionAdmin(id)` | Existing `cancelSubscription` without userId check | Admin override |
| `getCyclesAdmin(subscriptionId)` | `cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc(id)` | No owner check |

## Related Code Files

| Action | File |
|--------|------|
| **Create** | `subscription-service/.../controller/AdminSubscriptionController.java` |
| **Create** | `subscription-service/.../dto/UpdatePlanRequest.java` |
| **Modify** | `subscription-service/.../service/SubscriptionService.java` |
| **Modify** | `subscription-service/.../config/SecurityConfig.java` (if needed for path patterns) |

## Implementation Steps

### Step 1: Create `UpdatePlanRequest` DTO

**File:** `subscription-service/src/main/java/com/simplestore/subscription/dto/UpdatePlanRequest.java`

```java
package com.simplestore.subscription.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.Positive;

public record UpdatePlanRequest(
        String name,
        String description,
        @Positive BigDecimal price,
        String cadence,
        String imageUrl,
        Boolean active
) {}
```

All fields optional — only present fields get updated (partial update semantics).

### Step 2: Add admin service methods to `SubscriptionService`

**File:** `subscription-service/.../service/SubscriptionService.java`

Add these methods:

```java
// ── Admin: Plans ──────────────────────────────────────────────────────────

public List<SubscriptionPlan> getAllPlans() {
    return planRepository.findAll();
}

@Transactional
public SubscriptionPlan updatePlan(Long planId, UpdatePlanRequest request) {
    SubscriptionPlan plan = planRepository.findById(planId)
            .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));

    if (request.name() != null) plan.setName(request.name());
    if (request.description() != null) plan.setDescription(request.description());
    if (request.price() != null) plan.setPrice(request.price());
    if (request.cadence() != null) plan.setCadence(SubscriptionCadence.valueOf(request.cadence().toUpperCase()));
    if (request.imageUrl() != null) plan.setImageUrl(request.imageUrl());
    if (request.active() != null) plan.setActive(request.active());

    return planRepository.save(plan);
}

// ── Admin: Subscriptions ─────────────────────────────────────────────────

public List<CustomerSubscription> getAllSubscriptions(String status, String userId) {
    if (status != null && userId != null) {
        return subscriptionRepository.findByStatusAndUserId(
                SubscriptionStatus.valueOf(status.toUpperCase()), userId);
    }
    if (status != null) {
        return subscriptionRepository.findByStatus(SubscriptionStatus.valueOf(status.toUpperCase()));
    }
    if (userId != null) {
        return subscriptionRepository.findByUserId(userId);
    }
    return subscriptionRepository.findAll();
}

public CustomerSubscription getSubscription(String subscriptionId) {
    return subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + subscriptionId));
}

@Transactional
public void cancelSubscriptionAdmin(String subscriptionId) {
    CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
    if (sub.getStatus() != SubscriptionStatus.ACTIVE
            && sub.getStatus() != SubscriptionStatus.PAUSED
            && sub.getStatus() != SubscriptionStatus.PAYMENT_FAILED) {
        throw new IllegalStateException("Cannot cancel subscription in " + sub.getStatus() + " status");
    }
    sub.setStatus(SubscriptionStatus.CANCELLED);
    subscriptionRepository.save(sub);
    log.info("Subscription cancelled by admin: id={}", subscriptionId);
}

public List<SubscriptionCycle> getCyclesAdmin(String subscriptionId) {
    // No ownership check — admin can view any subscription's cycles
    if (!subscriptionRepository.existsById(subscriptionId)) {
        throw new IllegalArgumentException("Subscription not found: " + subscriptionId);
    }
    return cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc(subscriptionId);
}
```

### Step 3: Add missing repository methods

**File:** `subscription-service/.../repository/CustomerSubscriptionRepository.java`

The `findAll()` and `findById()` methods exist via `JpaRepository`. Add filter queries:

```java
List<CustomerSubscription> findByStatus(SubscriptionStatus status);

List<CustomerSubscription> findByStatusAndUserId(SubscriptionStatus status, String userId);
```

### Step 4: Create `AdminSubscriptionController`

**File:** `subscription-service/src/main/java/com/simplestore/subscription/controller/AdminSubscriptionController.java`

```java
@RestController
@RequestMapping("/api/v1/subscription/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Subscriptions", description = "Admin subscription and plan management")
public class AdminSubscriptionController {

    private final SubscriptionService subscriptionService;

    // Plans
    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanDto>>> getAllPlans() {
        List<SubscriptionPlanDto> dtos = subscriptionService.getAllPlans().stream()
                .map(p -> new SubscriptionPlanDto(...)).toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    @PutMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<SubscriptionPlanDto>> updatePlan(
            @PathVariable Long id, @Valid @RequestBody UpdatePlanRequest request) {
        SubscriptionPlan plan = subscriptionService.updatePlan(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Plan updated", new SubscriptionPlanDto(...)));
    }

    // Subscriptions
    @GetMapping("/subscriptions")
    public ResponseEntity<ApiResponse<List<CustomerSubscriptionDto>>> getAllSubscriptions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String userId) {
        List<CustomerSubscriptionDto> dtos = subscriptionService
                .getAllSubscriptions(status, userId).stream()
                .map(sub -> mapToDto(sub, getCurrentCycle(sub))).toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    @GetMapping("/subscriptions/{id}")
    public ResponseEntity<ApiResponse<CustomerSubscriptionDto>> getSubscription(@PathVariable String id) {
        CustomerSubscription sub = subscriptionService.getSubscription(id);
        return ResponseEntity.ok(ApiResponse.ok(mapToDto(sub, getCurrentCycle(sub))));
    }

    @PostMapping("/subscriptions/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelSubscription(@PathVariable String id) {
        subscriptionService.cancelSubscriptionAdmin(id);
        return ResponseEntity.ok(ApiResponse.ok("Subscription cancelled", null));
    }

    @GetMapping("/subscriptions/{id}/cycles")
    public ResponseEntity<ApiResponse<List<CycleDto>>> getCycles(@PathVariable String id) {
        List<SubscriptionCycle> cycles = subscriptionService.getCyclesAdmin(id);
        List<CycleDto> dtos = cycles.stream()
                .map(c -> new CycleDto(
                        c.getId(), c.getCycleNumber(), c.getStatus().name(),
                        c.getPaymentTransactionId(), c.getOrderId(),
                        c.getScheduledDate(), c.getCompletedDate()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }
}
```

### Step 5: Verify gateway routing

No gateway changes needed — the existing route `Path=/api/v1/subscription/**` already catches `/api/v1/subscription/admin/**`. The gateway's `SecurityConfig` should permit `/api/v1/subscription/admin/**` for authenticated users (only admin will pass the `@PreAuthorize` check at the service level).

## Success Criteria

- [ ] `GET /api/v1/subscription/admin/plans` returns all plans (active + inactive), only for ADMIN role
- [ ] `PUT /api/v1/subscription/admin/plans/{id}` updates plan with partial payload, validates cadence enum
- [ ] `GET /api/v1/subscription/admin/subscriptions` returns all subscriptions, with optional `?status=` and `?userId=` query params
- [ ] `GET /api/v1/subscription/admin/subscriptions/{id}` returns subscription detail without ownership check
- [ ] `POST /api/v1/subscription/admin/subscriptions/{id}/cancel` cancels any subscription regardless of owner
- [ ] `GET /api/v1/subscription/admin/subscriptions/{id}/cycles` returns cycle history without ownership check
- [ ] All admin endpoints return 403 when called without ADMIN role
- [ ] Existing user endpoints unchanged
- [ ] `mvn -pl subscription-service clean compile` passes

## Risk Assessment

- **Low risk** — net-new controller and service methods, no changes to existing endpoints or event consumers
- **Security**: `@PreAuthorize` on the controller class ensures all admin endpoints are gated. The service-level `cancelSubscription` has an ownership check; admin cancel uses a separate method `cancelSubscriptionAdmin` that skips it — no risk of accidentally opening user endpoints
- **No migration needed** — no schema changes, no new tables
- **Gateway security**: verify the gateway already forwards `/api/v1/subscription/admin/**` for authenticated users (existing config covers it, but confirm during implementation)
