package com.simplestore.subscription.dto;

import jakarta.validation.constraints.NotNull;

public record SubscribeRequest(
        @NotNull Long planId,
        String paymentMethodId
) {}
