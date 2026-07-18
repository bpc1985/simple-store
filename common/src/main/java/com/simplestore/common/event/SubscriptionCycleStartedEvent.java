package com.simplestore.common.event;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published by the subscription scheduler when a cycle is due.
 * Consumed by subscription-service itself to process the cycle,
 * and by payment-service to charge the subscriber.
 */
public record SubscriptionCycleStartedEvent(
        UUID correlationId,
        String subscriptionId,
        String userId,
        Long planId,
        int cycleNumber,
        BigDecimal amount,
        String paymentMethodId
) implements Serializable {}
