package com.simplestore.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record CreateOrderRequest(
        String shippingAddress,
        @NotEmpty List<Item> items
) {
    public record Item(
            Long productId,
            String productName,
            @Positive int quantity,
            java.math.BigDecimal unitPrice
    ) {}
}
