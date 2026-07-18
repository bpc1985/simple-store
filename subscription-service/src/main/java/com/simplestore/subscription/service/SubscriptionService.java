package com.simplestore.subscription.service;

import com.simplestore.common.event.SubscriptionCycleStartedEvent;
import com.simplestore.subscription.domain.*;
import com.simplestore.subscription.dto.*;
import com.simplestore.subscription.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final CustomerSubscriptionRepository subscriptionRepository;
    private final SubscriptionCycleRepository cycleRepository;
    private final StreamBridge streamBridge;

    @Lazy
    private final SubscriptionService self;

    // ── Plans ────────────────────────────────────────────────────────────────

    public List<SubscriptionPlan> getActivePlans() {
        return planRepository.findByActiveTrue();
    }

    public SubscriptionPlan getPlan(Long planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));
    }

    @Transactional
    public SubscriptionPlan createPlan(CreatePlanRequest request) {
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .cadence(SubscriptionCadence.valueOf(request.cadence().toUpperCase()))
                .imageUrl(request.imageUrl())
                .active(true)
                .build();
        return planRepository.save(plan);
    }

    // ── Subscriptions ────────────────────────────────────────────────────────

    /**
     * Subscribe a user to a plan. Creates the subscription and publishes the
     * initial cycle started event so payment-service can charge the first payment.
     */
    @Transactional
    public CustomerSubscriptionDto subscribe(String userId, SubscribeRequest request) {
        SubscriptionPlan plan = planRepository.findById(request.planId())
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + request.planId()));

        if (!plan.isActive()) {
            throw new IllegalStateException("Plan is not active: " + plan.getName());
        }

        // Prevent duplicate subscriptions to the same plan (only CANCELLED can be re-subscribed)
        List<CustomerSubscription> existing = subscriptionRepository
                .findByUserIdAndPlanId(userId, plan.getId());
        boolean hasNonCancelled = existing.stream()
                .anyMatch(s -> s.getStatus() != SubscriptionStatus.CANCELLED);
        if (hasNonCancelled) {
            throw new IllegalStateException("Already subscribed to this plan");
        }

        LocalDate today = LocalDate.now();
        String subscriptionId = UUID.randomUUID().toString();

        CustomerSubscription subscription = CustomerSubscription.builder()
                .id(subscriptionId)
                .userId(userId)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(today)
                .nextBillingDate(computeNextBillingDate(today, plan.getCadence()))
                .lastBillingDate(null)
                .paymentMethodId(request.paymentMethodId())
                .lockedPrice(plan.getPrice())
                .build();
        subscription = subscriptionRepository.save(subscription);

        // Publish initial cycle event for payment processing after transaction commits
        UUID correlationId = UUID.randomUUID();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                boolean sent = streamBridge.send("subscription-cycle-started", new SubscriptionCycleStartedEvent(
                        correlationId,
                        subscriptionId,
                        userId,
                        plan.getId(),
                        1,
                        plan.getPrice(),
                        request.paymentMethodId()
                ));
                if (!sent) {
                    log.error("Failed to send subscription-cycle-started event for subscription={}, cycle=1", subscriptionId);
                }
            }
        });

        log.info("Subscription created: id={}, userId={}, plan={}, cycle=1", subscriptionId, userId, plan.getName());
        return mapToDto(subscription, 0);
    }

    public CustomerSubscriptionDto getUserSubscription(String subscriptionId, String userId) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new AccessDeniedException("Not your subscription");
        }
        List<SubscriptionCycle> cycles = cycleRepository
                .findBySubscriptionIdOrderByCycleNumberDesc(subscriptionId);
        return mapToDto(sub, cycles.isEmpty() ? 0 : cycles.getFirst().getCycleNumber());
    }

    public List<CustomerSubscriptionDto> getUserSubscriptions(String userId) {
        List<CustomerSubscription> subs = subscriptionRepository.findByUserId(userId);
        if (subs.isEmpty()) return List.of();

        // Batch-fetch cycles for all subscriptions to avoid N+1 queries
        List<String> subIds = subs.stream().map(CustomerSubscription::getId).toList();
        var cyclesBySubId = cycleRepository.findBySubscriptionIdInOrderByCycleNumberDesc(subIds)
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(SubscriptionCycle::getSubscriptionId));

        return subs.stream()
                .map(sub -> {
                    var cycles = cyclesBySubId.getOrDefault(sub.getId(), List.of());
                    return mapToDto(sub, cycles.isEmpty() ? 0 : cycles.getFirst().getCycleNumber());
                })
                .toList();
    }

    @Transactional
    public void cancelSubscription(String subscriptionId, String userId) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new AccessDeniedException("Not your subscription");
        }
        if (sub.getStatus() != SubscriptionStatus.ACTIVE
                && sub.getStatus() != SubscriptionStatus.PAUSED
                && sub.getStatus() != SubscriptionStatus.PAYMENT_FAILED) {
            throw new IllegalStateException("Cannot cancel subscription in " + sub.getStatus() + " status");
        }
        sub.setStatus(SubscriptionStatus.CANCELLED);
        subscriptionRepository.save(sub);
        log.info("Subscription cancelled: id={}", subscriptionId);
    }

    @Transactional
    public void pauseSubscription(String subscriptionId, String userId) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new AccessDeniedException("Not your subscription");
        }
        if (sub.getStatus() != SubscriptionStatus.ACTIVE) {
            throw new IllegalStateException("Cannot pause subscription in " + sub.getStatus() + " status");
        }
        sub.setStatus(SubscriptionStatus.PAUSED);
        subscriptionRepository.save(sub);
        log.info("Subscription paused: id={}", subscriptionId);
    }

    @Transactional
    public void resumeSubscription(String subscriptionId, String userId) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new AccessDeniedException("Not your subscription");
        }
        if (sub.getStatus() != SubscriptionStatus.PAUSED
                && sub.getStatus() != SubscriptionStatus.PAYMENT_FAILED) {
            throw new IllegalStateException("Cannot resume subscription in " + sub.getStatus() + " status");
        }

        SubscriptionStatus previousStatus = sub.getStatus();

        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setNextBillingDate(LocalDate.now());
        subscriptionRepository.save(sub);
        log.info("Subscription resumed: id={}", subscriptionId);

        // If resuming from PAYMENT_FAILED, retry the last failed cycle
        if (previousStatus == SubscriptionStatus.PAYMENT_FAILED) {
            cycleRepository.findBySubscriptionIdAndStatus(subscriptionId, CycleStatus.FAILED)
                    .ifPresent(failedCycle -> {
                        // Reset the existing FAILED cycle to PENDING instead of creating a new one
                        // (avoids violating the UNIQUE constraint on subscriptionId + cycleNumber)
                        failedCycle.setStatus(CycleStatus.PENDING);
                        failedCycle.setPaymentTransactionId(null);
                        cycleRepository.save(failedCycle);

                        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                                boolean sent = streamBridge.send("subscription-cycle-started", new SubscriptionCycleStartedEvent(
                                        UUID.randomUUID(),
                                        subscriptionId,
                                        sub.getUserId(),
                                        sub.getPlan().getId(),
                                        failedCycle.getCycleNumber(),
                                        sub.getLockedPrice() != null ? sub.getLockedPrice() : sub.getPlan().getPrice(),
                                        sub.getPaymentMethodId()
                                ));
                                if (!sent) {
                                    log.error("Failed to send subscription-cycle-started for retry: subscriptionId={}, cycle={}",
                                            subscriptionId, failedCycle.getCycleNumber());
                                }
                            }
                        });
                        log.info("Retrying failed cycle: subscriptionId={}, cycle={}",
                                subscriptionId, failedCycle.getCycleNumber());
                    });
        }
    }

    // ── Cycle Processing ─────────────────────────────────────────────────────

    /**
     * Process a subscription cycle after successful payment.
     * Retries up to 3 times to handle the race between cycle creation and payment
     * processing (both consume the same fanout event in parallel).
     * Each retry runs in a fresh transaction so Thread.sleep does not hold a DB connection.
     */
    public void advanceCycle(String subscriptionId, String transactionId, int cycleNumber) {
        for (int attempt = 0; attempt < 3; attempt++) {
            if (self.tryAdvanceCycle(subscriptionId, transactionId, cycleNumber)) {
                return;
            }
            if (attempt < 2) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.error("Interrupted while waiting for PENDING cycle for subscription {}", subscriptionId);
                    return;
                }
            }
        }
        log.error("No PENDING cycle found after retries for subscription {}", subscriptionId);
    }

    /**
     * Single attempt to advance a cycle. Must be called through the Spring proxy
     * (self.tryAdvanceCycle) to ensure @Transactional applies.
     */
    @Transactional
    public boolean tryAdvanceCycle(String subscriptionId, String transactionId, int cycleNumber) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));

        if (sub.getStatus() != SubscriptionStatus.ACTIVE) {
            log.warn("advanceCycle skipped — subscription {} is not ACTIVE (status={})", subscriptionId, sub.getStatus());
            return true; // nothing to do, but don't retry
        }

        var pendingOpt = cycleRepository.findBySubscriptionIdAndStatus(subscriptionId, CycleStatus.PENDING);
        if (pendingOpt.isPresent()) {
            var cycle = pendingOpt.get();
            cycle.setStatus(CycleStatus.CHARGED);
            cycle.setPaymentTransactionId(transactionId);
            cycle.setCompletedDate(java.time.Instant.now());
            cycleRepository.save(cycle);

            // Advance billing date
            sub.setLastBillingDate(sub.getNextBillingDate());
            sub.setNextBillingDate(computeNextBillingDate(sub.getNextBillingDate(), sub.getPlan().getCadence()));
            subscriptionRepository.save(sub);

            log.info("Cycle advanced: subscriptionId={}, cycle={}, nextBilling={}",
                    subscriptionId, cycleNumber, sub.getNextBillingDate());
            return true;
        }
        return false; // PENDING cycle not found — caller will retry
    }

    /**
     * Mark a specific cycle as failed when payment fails.
     */
    @Transactional
    public void failCycle(String subscriptionId, int cycleNumber, String reason) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));

        cycleRepository.findBySubscriptionIdAndCycleNumber(subscriptionId, cycleNumber)
                .filter(cycle -> cycle.getStatus() == CycleStatus.PENDING)
                .ifPresent(cycle -> {
                    cycle.setStatus(CycleStatus.FAILED);
                    cycle.setCompletedDate(java.time.Instant.now());
                    cycleRepository.save(cycle);
                });

        if (sub.getStatus() == SubscriptionStatus.ACTIVE) {
            sub.setStatus(SubscriptionStatus.PAYMENT_FAILED);
        }
        subscriptionRepository.save(sub);

        log.warn("Cycle failed: subscriptionId={}, cycle={}, reason={}", subscriptionId, cycleNumber, reason);
    }

    /**
     * Create a new cycle for a subscription. Called by the consumer.
     * Idempotent: returns existing PENDING cycle on redelivery.
     */
    @Transactional
    public SubscriptionCycle createCycle(String subscriptionId, int cycleNumber) {
        return cycleRepository.findBySubscriptionIdAndStatus(subscriptionId, CycleStatus.PENDING)
                .orElseGet(() -> {
                    String cycleId = UUID.randomUUID().toString();
                    SubscriptionCycle cycle = SubscriptionCycle.builder()
                            .id(cycleId)
                            .subscriptionId(subscriptionId)
                            .cycleNumber(cycleNumber)
                            .status(CycleStatus.PENDING)
                            .scheduledDate(java.time.Instant.now())
                            .build();
                    return cycleRepository.save(cycle);
                });
    }

    // ── Cycles ────────────────────────────────────────────────────────────────

    public List<SubscriptionCycle> getCycles(String subscriptionId, String userId) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new AccessDeniedException("Not your subscription");
        }
        return cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc(subscriptionId);
    }

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
        if (request.cadence() != null)
            plan.setCadence(SubscriptionCadence.valueOf(request.cadence().toUpperCase()));
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

    /**
     * Batch-fetch subscriptions with their current cycle numbers to avoid N+1 queries.
     */
    public List<CustomerSubscriptionDto> getSubscriptionDtos(List<CustomerSubscription> subs) {
        if (subs.isEmpty()) return List.of();

        List<String> subIds = subs.stream().map(CustomerSubscription::getId).toList();
        var cyclesBySubId = cycleRepository.findBySubscriptionIdInOrderByCycleNumberDesc(subIds)
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(SubscriptionCycle::getSubscriptionId));

        return subs.stream()
                .map(sub -> {
                    var cycles = cyclesBySubId.getOrDefault(sub.getId(), List.of());
                    int currentCycle = cycles.isEmpty() ? 0 : cycles.getFirst().getCycleNumber();
                    return mapToDto(sub, currentCycle);
                })
                .toList();
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
        if (!subscriptionRepository.existsById(subscriptionId)) {
            throw new IllegalArgumentException("Subscription not found: " + subscriptionId);
        }
        return cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc(subscriptionId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private LocalDate computeNextBillingDate(LocalDate current, SubscriptionCadence cadence) {
        return switch (cadence) {
            case MONTHLY -> current.plusMonths(1);
            case QUARTERLY -> current.plusMonths(3);
        };
    }

    private CustomerSubscriptionDto mapToDto(CustomerSubscription sub, int currentCycle) {
        return new CustomerSubscriptionDto(
                sub.getId(),
                sub.getUserId(),
                new SubscriptionPlanDto(
                        sub.getPlan().getId(),
                        sub.getPlan().getName(),
                        sub.getPlan().getDescription(),
                        sub.getPlan().getPrice(),
                        sub.getPlan().getCadence().name(),
                        sub.getPlan().getImageUrl(),
                        sub.getPlan().isActive()
                ),
                sub.getStatus().name(),
                sub.getStartDate(),
                sub.getNextBillingDate(),
                sub.getLastBillingDate(),
                currentCycle
        );
    }
}
