package com.simplestore.checkout.model;

public enum SagaStatus {
    STARTED,
    RESERVING_STOCK,
    PROCESSING_PAYMENT,
    CONFIRMED,
    CANCELLED,
    COMPENSATING
}
