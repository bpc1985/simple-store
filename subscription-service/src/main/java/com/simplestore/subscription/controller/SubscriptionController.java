package com.simplestore.subscription.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.subscription.domain.SubscriptionCycle;
import com.simplestore.subscription.domain.SubscriptionPlan;
import com.simplestore.subscription.dto.*;
import com.simplestore.subscription.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/subscription")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "Subscription plans and customer subscription management")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    // ── Plans (public read, admin write) ─────────────────────────────────────

    @Operation(summary = "List active plans", description = "Returns all active subscription plans")
    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanDto>>> getPlans() {
        List<SubscriptionPlan> plans = subscriptionService.getActivePlans();
        List<SubscriptionPlanDto> dtos = plans.stream()
                .map(p -> new SubscriptionPlanDto(
                        p.getId(), p.getName(), p.getDescription(),
                        p.getPrice(), p.getCadence().name(), p.getImageUrl(), p.isActive()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    @Operation(summary = "Get plan", description = "Get a single subscription plan by ID")
    @GetMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<SubscriptionPlanDto>> getPlan(@PathVariable Long id) {
        SubscriptionPlan plan = subscriptionService.getPlan(id);
        SubscriptionPlanDto dto = new SubscriptionPlanDto(
                plan.getId(), plan.getName(), plan.getDescription(),
                plan.getPrice(), plan.getCadence().name(), plan.getImageUrl(), plan.isActive());
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @Operation(summary = "Create plan", description = "Admin: create a new subscription plan")
    @PostMapping("/plans")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SubscriptionPlanDto>> createPlan(@Valid @RequestBody CreatePlanRequest request) {
        SubscriptionPlan plan = subscriptionService.createPlan(request);
        SubscriptionPlanDto dto = new SubscriptionPlanDto(
                plan.getId(), plan.getName(), plan.getDescription(),
                plan.getPrice(), plan.getCadence().name(), plan.getImageUrl(), plan.isActive());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Plan created", dto));
    }

    // ── Customer Subscriptions ───────────────────────────────────────────────

    @Operation(summary = "Subscribe", description = "Subscribe the current user to a plan")
    @PostMapping("/subscribe")
    public ResponseEntity<ApiResponse<CustomerSubscriptionDto>> subscribe(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SubscribeRequest request) {
        String userId = jwt.getSubject();
        CustomerSubscriptionDto dto = subscriptionService.subscribe(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Subscribed", dto));
    }

    @Operation(summary = "My subscriptions", description = "List the current user's subscriptions")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<CustomerSubscriptionDto>>> getMySubscriptions(
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<CustomerSubscriptionDto> subs = subscriptionService.getUserSubscriptions(userId);
        return ResponseEntity.ok(ApiResponse.ok(subs));
    }

    @Operation(summary = "Get my subscription", description = "Get a single subscription by ID (ownership-checked)")
    @GetMapping("/my/{id}")
    public ResponseEntity<ApiResponse<CustomerSubscriptionDto>> getMySubscription(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        CustomerSubscriptionDto dto = subscriptionService.getUserSubscription(id, jwt.getSubject());
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @Operation(summary = "Cancel subscription")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        subscriptionService.cancelSubscription(id, jwt.getSubject());
        return ResponseEntity.ok(ApiResponse.ok("Subscription cancelled", null));
    }

    @Operation(summary = "Pause subscription")
    @PostMapping("/{id}/pause")
    public ResponseEntity<ApiResponse<Void>> pause(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        subscriptionService.pauseSubscription(id, jwt.getSubject());
        return ResponseEntity.ok(ApiResponse.ok("Subscription paused", null));
    }

    @Operation(summary = "Resume subscription")
    @PostMapping("/{id}/resume")
    public ResponseEntity<ApiResponse<Void>> resume(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        subscriptionService.resumeSubscription(id, jwt.getSubject());
        return ResponseEntity.ok(ApiResponse.ok("Subscription resumed", null));
    }

    @Operation(summary = "Get billing cycles", description = "List billing cycles for a subscription")
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
}
