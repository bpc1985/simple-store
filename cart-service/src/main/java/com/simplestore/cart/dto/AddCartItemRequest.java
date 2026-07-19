package com.simplestore.cart.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record AddCartItemRequest(
        @NotNull Long productId,
        String productName,
        BigDecimal price,
        String imageUrl,
        @Positive int quantity
) {}
