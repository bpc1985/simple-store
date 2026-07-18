package com.simplestore.subscription.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.subscription.domain.CustomerSubscription;
import com.simplestore.subscription.domain.SubscriptionCycle;
import com.simplestore.subscription.domain.SubscriptionPlan;
import com.simplestore.subscription.dto.*;
import com.simplestore.subscription.repository.SubscriptionCycleRepository;
import com.simplestore.subscription.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/subscription/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Subscriptions", description = "Admin subscription and plan management")
public class AdminSubscriptionController {

    private final SubscriptionService subscriptionService;
    private final SubscriptionCycleRepository cycleRepository;

    // ── Plans ────────────────────────────────────────────────────────────────

    @Operation(summary = "List all plans", description = "Admin: list all subscription plans (active and inactive)")
    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanDto>>> getAllPlans() {
        List<SubscriptionPlan> plans = subscriptionService.getAllPlans();
        List<SubscriptionPlanDto> dtos = plans.stream()
                .map(p -> new SubscriptionPlanDto(
                        p.getId(), p.getName(), p.getDescription(),
                        p.getPrice(), p.getCadence().name(), p.getImageUrl(), p.isActive()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    @Operation(summary = "Update plan", description = "Admin: update a subscription plan (partial update)")
    @PutMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<SubscriptionPlanDto>> updatePlan(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePlanRequest request) {
        SubscriptionPlan plan = subscriptionService.updatePlan(id, request);
        SubscriptionPlanDto dto = new SubscriptionPlanDto(
                plan.getId(), plan.getName(), plan.getDescription(),
                plan.getPrice(), plan.getCadence().name(), plan.getImageUrl(), plan.isActive());
        return ResponseEntity.ok(ApiResponse.ok("Plan updated", dto));
    }

    @Operation(summary = "Create plan", description = "Admin: create a new subscription plan")
    @PostMapping("/plans")
    public ResponseEntity<ApiResponse<SubscriptionPlanDto>> createPlan(
            @Valid @RequestBody CreatePlanRequest request) {
        SubscriptionPlan plan = subscriptionService.createPlan(request);
        SubscriptionPlanDto dto = new SubscriptionPlanDto(
                plan.getId(), plan.getName(), plan.getDescription(),
                plan.getPrice(), plan.getCadence().name(), plan.getImageUrl(), plan.isActive());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Plan created", dto));
    }

    // ── Subscriptions ────────────────────────────────────────────────────────

    @Operation(summary = "List all subscriptions",
            description = "Admin: list all customer subscriptions with optional status and userId filters")
    @GetMapping("/subscriptions")
    public ResponseEntity<ApiResponse<List<CustomerSubscriptionDto>>> getAllSubscriptions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String userId) {
        List<CustomerSubscription> subs = subscriptionService.getAllSubscriptions(status, userId);
        List<CustomerSubscriptionDto> dtos = subs.stream()
                .map(this::toCustomerSubscriptionDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    @Operation(summary = "Get subscription", description = "Admin: get any subscription detail without ownership check")
    @GetMapping("/subscriptions/{id}")
    public ResponseEntity<ApiResponse<CustomerSubscriptionDto>> getSubscription(@PathVariable String id) {
        CustomerSubscription sub = subscriptionService.getSubscription(id);
        return ResponseEntity.ok(ApiResponse.ok(toCustomerSubscriptionDto(sub)));
    }

    @Operation(summary = "Cancel subscription", description = "Admin: cancel any subscription")
    @PostMapping("/subscriptions/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelSubscription(@PathVariable String id) {
        subscriptionService.cancelSubscriptionAdmin(id);
        return ResponseEntity.ok(ApiResponse.ok("Subscription cancelled", null));
    }

    @Operation(summary = "Get billing cycles", description = "Admin: list billing cycles for any subscription")
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

    // ── Helpers ──────────────────────────────────────────────────────────────

    private CustomerSubscriptionDto toCustomerSubscriptionDto(CustomerSubscription sub) {
        List<SubscriptionCycle> cycles = cycleRepository
                .findBySubscriptionIdOrderByCycleNumberDesc(sub.getId());
        int currentCycle = cycles.isEmpty() ? 0 : cycles.getFirst().getCycleNumber();

        SubscriptionPlan plan = sub.getPlan();
        SubscriptionPlanDto planDto = new SubscriptionPlanDto(
                plan.getId(), plan.getName(), plan.getDescription(),
                plan.getPrice(), plan.getCadence().name(), plan.getImageUrl(), plan.isActive());

        return new CustomerSubscriptionDto(
                sub.getId(),
                sub.getUserId(),
                planDto,
                sub.getStatus().name(),
                sub.getStartDate(),
                sub.getNextBillingDate(),
                sub.getLastBillingDate(),
                currentCycle
        );
    }
}
