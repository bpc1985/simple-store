package com.simplestore.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockReservedEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID correlationId;
    private UUID reservationId;
    private UUID orderId;
    private Instant reservedAt;
    private List<ReservationLineItem> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReservationLineItem implements Serializable {
        private static final long serialVersionUID = 1L;
        private int productId;
        private int quantity;
    }
}
