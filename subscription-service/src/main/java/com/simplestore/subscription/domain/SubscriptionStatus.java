package com.simplestore.subscription.domain;

/**
 * Lifecycle of a customer subscription.
 */
public enum SubscriptionStatus {
    ACTIVE,
    PAUSED,
    CANCELLED,
    PAYMENT_FAILED
}
