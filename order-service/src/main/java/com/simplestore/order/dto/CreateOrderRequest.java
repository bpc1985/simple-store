package com.simplestore.order.dto;

import java.util.List;

public record CreateOrderRequest(
        String shippingAddress,
        List<Item> items
) {
    public record Item(
            Long productId,
            String productName,
            int quantity,
            java.math.BigDecimal unitPrice
    ) {}
}
