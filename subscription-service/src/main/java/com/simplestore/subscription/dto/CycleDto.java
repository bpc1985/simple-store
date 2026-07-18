package com.simplestore.subscription.dto;

public record CycleDto(
        String id,
        int cycleNumber,
        String status,
        String paymentTransactionId,
        String orderId,
        java.time.Instant scheduledDate,
        java.time.Instant completedDate
) {}
