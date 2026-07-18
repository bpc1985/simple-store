package com.simplestore.subscription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreatePlanRequest(
        @NotBlank String name,
        String description,
        @NotNull @Positive java.math.BigDecimal price,
        String cadence,
        String imageUrl
) {}
