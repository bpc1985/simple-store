package com.simplestore.common.event;

import java.io.Serializable;
import java.util.UUID;

/**
 * Published by payment-service when a subscription cycle charge fails.
 * Consumed by subscription-service to mark the cycle as failed and pause the subscription.
 */
public record SubscriptionPaymentFailedEvent(
        UUID correlationId,
        String subscriptionId,
        int cycleNumber,
        String reason
) implements Serializable {}
