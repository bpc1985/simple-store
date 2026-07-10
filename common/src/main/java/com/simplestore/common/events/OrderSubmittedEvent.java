package com.simplestore.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Published by Order Service after an order is persisted.
 * The checkout saga consumes this to start the reserve-stock workflow.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderSubmittedEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int version = 1;
    private UUID correlationId;
    private int orderId;
    private String userId;
    private Instant orderDate;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private List<OrderLineItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderLineItem implements Serializable {
        private static final long serialVersionUID = 1L;
        private int productId;
        private String productName;
        private int quantity;
        private BigDecimal unitPrice;
    }
}
