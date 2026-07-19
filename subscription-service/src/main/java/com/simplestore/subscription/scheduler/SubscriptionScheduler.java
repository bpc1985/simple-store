package com.simplestore.subscription.scheduler;

import com.simplestore.common.event.SubscriptionCycleStartedEvent;
import com.simplestore.subscription.domain.CustomerSubscription;
import com.simplestore.subscription.domain.CycleStatus;
import com.simplestore.subscription.domain.SubscriptionStatus;
import com.simplestore.subscription.repository.CustomerSubscriptionRepository;
import com.simplestore.subscription.repository.SubscriptionCycleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Daily scan for subscriptions due for billing.
 * Publishes a {@link SubscriptionCycleStartedEvent} for each due subscription.
 * The consumer ({@code SubscriptionConsumer}) creates the cycle entity,
 * and payment-service processes the charge.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final CustomerSubscriptionRepository subscriptionRepository;
    private final SubscriptionCycleRepository cycleRepository;
    private final StreamBridge streamBridge;

    /**
     * Runs daily at 2 AM. Finds ACTIVE subscriptions whose next billing date
     * is today or earlier, publishes a cycle event, and lets the
     * event-driven chain (consumer → payment → advance) handle the rest.
     */
    @Scheduled(cron = "${app.subscription.billing.cron:0 0 2 * * ?}")
    @Transactional
    public void processDueSubscriptions() {
        // Acquire DB advisory lock to prevent duplicate scheduler runs.
        // Must be inside @Transactional so lock + queries share the same DB session.
        if (!subscriptionRepository.tryAcquireSchedulerLock()) {
            log.info("Scheduler lock not acquired — another instance is running");
            return;
        }
        try {
            List<SubscriptionCycleStartedEvent> events = collectDueEvents();
            // Publish events after transaction commit to avoid ghost events on rollback
            if (!events.isEmpty()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        for (SubscriptionCycleStartedEvent event : events) {
                            boolean sent = streamBridge.send("subscription-cycle-started", event);
                            if (!sent) {
                                log.error("Failed to send subscription-cycle-started for subscriptionId={}, cycle={}",
                                        event.subscriptionId(), event.cycleNumber());
                            }
                        }
                    }
                });
            }
        } finally {
            subscriptionRepository.releaseSchedulerLock();
        }
    }

    private List<SubscriptionCycleStartedEvent> collectDueEvents() {
        List<SubscriptionCycleStartedEvent> events = new ArrayList<>();
        List<CustomerSubscription> due = subscriptionRepository
                .findByStatusAndNextBillingDateBefore(SubscriptionStatus.ACTIVE, LocalDate.now().plusDays(1));

        if (due.isEmpty()) {
            log.debug("No subscriptions due today");
            return events;
        }

        log.info("Processing {} due subscriptions", due.size());

        for (CustomerSubscription sub : due) {
            try {
                // Idempotency: skip if a PENDING cycle already exists for this subscription
                if (cycleRepository.findBySubscriptionIdAndStatus(sub.getId(), CycleStatus.PENDING).isPresent()) {
                    log.debug("Skipping {} — PENDING cycle already exists", sub.getId());
                    continue;
                }

                // Compute next cycle number from existing cycles
                int nextCycle = cycleRepository.findBySubscriptionIdOrderByCycleNumberDesc(sub.getId())
                        .stream()
                        .findFirst()
                        .map(c -> c.getCycleNumber() + 1)
                        .orElse(1);

                UUID correlationId = UUID.randomUUID();
                BigDecimal billingAmount = sub.getLockedPrice() != null ? sub.getLockedPrice() : sub.getPlan().getPrice();
                events.add(new SubscriptionCycleStartedEvent(
                        correlationId,
                        sub.getId(),
                        sub.getUserId(),
                        sub.getPlan().getId(),
                        nextCycle,
                        billingAmount,
                        sub.getPaymentMethodId()
                ));

                log.debug("Cycle event queued: subscriptionId={}, cycle={}", sub.getId(), nextCycle);
            } catch (Exception e) {
                log.error("Failed to process subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
        return events;
    }
}
