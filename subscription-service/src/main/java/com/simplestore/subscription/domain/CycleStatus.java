package com.simplestore.subscription.domain;

/**
 * States for a single billing cycle.
 */
public enum CycleStatus {
    PENDING,
    CHARGED,
    ASSEMBLING,
    SHIPPED,
    FAILED
}
