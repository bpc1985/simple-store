package com.simplestore.subscription.dto;

import java.math.BigDecimal;

public record SubscriptionPlanDto(
        Long id,
        String name,
        String description,
        BigDecimal price,
        String cadence,
        String imageUrl,
        boolean active
) {}
