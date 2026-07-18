package com.simplestore.subscription.service;

import com.simplestore.common.event.SubscriptionCycleStartedEvent;
import com.simplestore.subscription.domain.*;
import com.simplestore.subscription.dto.*;
import com.simplestore.subscription.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ── Plans ────────────────────────────────────────────────────────────────

    public List<SubscriptionPlan> getActivePlans() {
        return planRepository.findByActiveTrue();
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
                .nextBillingDate(today)
                .lastBillingDate(null)
                .paymentMethodId(request.paymentMethodId())
                .lockedPrice(plan.getPrice())
                .build();
        subscription = subscriptionRepository.save(subscription);

        // Publish initial cycle event for payment processing
        UUID correlationId = UUID.randomUUID();
        streamBridge.send("subscription-cycle-started", new SubscriptionCycleStartedEvent(
                correlationId,
                subscriptionId,
                userId,
                plan.getId(),
                1,
                plan.getPrice(),
                request.paymentMethodId()
        ));

        log.info("Subscription created: id={}, userId={}, plan={}, cycle=1", subscriptionId, userId, plan.getName());
        return mapToDto(subscription, 0);
    }

    public List<CustomerSubscriptionDto> getUserSubscriptions(String userId) {
        return subscriptionRepository.findByUserId(userId).stream()
                .map(sub -> {
                    List<SubscriptionCycle> cycles = cycleRepository
                            .findBySubscriptionIdOrderByCycleNumberDesc(sub.getId());
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
                        streamBridge.send("subscription-cycle-started", new SubscriptionCycleStartedEvent(
                                UUID.randomUUID(),
                                subscriptionId,
                                sub.getUserId(),
                                sub.getPlan().getId(),
                                failedCycle.getCycleNumber(),
                                sub.getLockedPrice() != null ? sub.getLockedPrice() : sub.getPlan().getPrice(),
                                sub.getPaymentMethodId()
                        ));
                        log.info("Retrying failed cycle: subscriptionId={}, cycle={}",
                                subscriptionId, failedCycle.getCycleNumber());
                    });
        }
    }

    // ── Cycle Processing ─────────────────────────────────────────────────────

    /**
     * Process a subscription cycle after successful payment.
     */
    @Transactional
    public void advanceCycle(String subscriptionId, String transactionId, int cycleNumber) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));

        if (sub.getStatus() != SubscriptionStatus.ACTIVE) {
            log.warn("advanceCycle skipped — subscription {} is not ACTIVE (status={})", subscriptionId, sub.getStatus());
            return;
        }

        // Idempotency: only process if a PENDING cycle exists for this subscription
        // Retry loop to handle race condition with cycle creation consumer
        for (int attempt = 0; attempt < 3; attempt++) {
            var pendingOpt = cycleRepository.findBySubscriptionIdAndStatus(subscriptionId, CycleStatus.PENDING);
            if (pendingOpt.isPresent()) {
                var cycle = pendingOpt.get();
                cycle.setStatus(CycleStatus.CHARGED);
                cycle.setPaymentTransactionId(transactionId);
                cycleRepository.save(cycle);

                // Advance billing date
                sub.setLastBillingDate(sub.getNextBillingDate());
                sub.setNextBillingDate(computeNextBillingDate(sub.getNextBillingDate(), sub.getPlan().getCadence()));
                subscriptionRepository.save(sub);

                log.info("Cycle advanced: subscriptionId={}, cycle={}, nextBilling={}",
                        subscriptionId, cycleNumber, sub.getNextBillingDate());
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
     * Mark cycle as failed when payment fails.
     */
    @Transactional
    public void failCycle(String subscriptionId, int cycleNumber, String reason) {
        CustomerSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));

        cycleRepository.findBySubscriptionIdAndStatus(subscriptionId, CycleStatus.PENDING)
                .ifPresent(cycle -> {
                    cycle.setStatus(CycleStatus.FAILED);
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
