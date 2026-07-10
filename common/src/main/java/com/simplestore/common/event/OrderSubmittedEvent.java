package com.simplestore.common.event;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderSubmittedEvent(
        UUID correlationId,
        String userId,
        Instant orderDate,
        BigDecimal totalAmount,
        String shippingAddress,
        List<OrderItemDetail> items
) implements Serializable {

    public record OrderItemDetail(
            Long productId,
            String productName,
            int quantity,
            BigDecimal unitPrice
    ) implements Serializable {}
}
