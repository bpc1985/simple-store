package com.simplestore.subscription.consumer;

import com.simplestore.common.event.SubscriptionCycleStartedEvent;
import com.simplestore.common.event.SubscriptionPaymentFailedEvent;
import com.simplestore.common.event.SubscriptionPaymentSuccessEvent;
import com.simplestore.subscription.domain.CycleStatus;
import com.simplestore.subscription.domain.SubscriptionCycle;
import com.simplestore.subscription.repository.SubscriptionCycleRepository;
import com.simplestore.subscription.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Consumer;

/**
 * Event consumers for subscription cycle processing.
 * Uses the multi-event consumer pattern (per checkout-service conventions).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionConsumer {

    private final SubscriptionService subscriptionService;
    private final SubscriptionCycleRepository cycleRepository;

    /**
     * Handles a new cycle started. Creates the SubscriptionCycle entity in PENDING state.
     * The payment-service handles the actual charge and publishes success/failure events.
     */
    @Bean
    public Consumer<SubscriptionCycleStartedEvent> subscriptionCycleStartedConsumer() {
        return event -> {
            log.info("Received cycle started: subscriptionId={}, cycle={}", event.subscriptionId(), event.cycleNumber());

            SubscriptionCycle cycle = subscriptionService.createCycle(
                    event.subscriptionId(), event.cycleNumber());

            log.info("Cycle created: id={}, status={}", cycle.getId(), cycle.getStatus());
        };
    }

    /**
     * Handles successful payment for a cycle. Advances the subscription billing date.
     */
    @Bean
    public Consumer<SubscriptionPaymentSuccessEvent> paymentSuccessConsumer() {
        return event -> {
            log.info("Payment success: subscriptionId={}, cycle={}", event.subscriptionId(), event.cycleNumber());
            subscriptionService.advanceCycle(event.subscriptionId(), event.transactionId(), event.cycleNumber());
        };
    }

    /**
     * Handles failed payment for a cycle. Marks the subscription as PAYMENT_FAILED.
     */
    @Bean
    public Consumer<SubscriptionPaymentFailedEvent> paymentFailureConsumer() {
        return event -> {
            log.warn("Payment failed: subscriptionId={}, cycle={}, reason={}",
                    event.subscriptionId(), event.cycleNumber(), event.reason());
            subscriptionService.failCycle(event.subscriptionId(), event.cycleNumber(), event.reason());
        };
    }
}
