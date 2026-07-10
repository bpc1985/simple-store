package com.simplestore.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderDto(
        Long id,
        UUID correlationId,
        String userId,
        Instant orderDate,
        BigDecimal totalAmount,
        String status,
        String shippingAddress,
        List<OrderItemDto> items
) {}
