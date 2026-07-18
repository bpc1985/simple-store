package com.simplestore.common.event;

import java.io.Serializable;
import java.util.UUID;

/**
 * Published by subscription-service after successful payment.
 * Consumed by order-service to create a fulfillment order and
 * inventory-service to reserve box contents.
 */
public record BoxAssemblyRequestedEvent(
        UUID correlationId,
        String subscriptionId,
        String userId,
        String planName,
        int cycleNumber
) implements Serializable {}
