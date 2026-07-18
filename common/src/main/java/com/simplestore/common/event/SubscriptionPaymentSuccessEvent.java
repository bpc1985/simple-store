package com.simplestore.common.event;

import java.io.Serializable;
import java.util.UUID;

/**
 * Published by payment-service when a subscription cycle charge succeeds.
 * Consumed by subscription-service to advance the cycle and trigger box assembly.
 */
public record SubscriptionPaymentSuccessEvent(
        UUID correlationId,
        String subscriptionId,
        String transactionId,
        int cycleNumber
) implements Serializable {}
