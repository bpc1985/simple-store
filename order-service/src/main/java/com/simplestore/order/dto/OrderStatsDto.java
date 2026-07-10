package com.simplestore.order.dto;

import java.math.BigDecimal;

public record OrderStatsDto(
        long totalOrders,
        long pendingOrders,
        long confirmedOrders,
        long cancelledOrders,
        BigDecimal totalRevenue
) {}
