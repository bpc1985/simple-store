package com.simplestore.subscription.dto;

import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record UpdatePlanRequest(
        String name,
        String description,
        @Positive BigDecimal price,
        String cadence,
        String imageUrl,
        Boolean active
) {}
