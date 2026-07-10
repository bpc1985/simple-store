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
public class StockReservationFailedEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int version = 1;
    private UUID correlationId;
    private UUID reservationId;
    private UUID orderId;
    private String reason;
    private List<ShortageLine> shortageLines;
    private Instant failedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShortageLine implements Serializable {
        private static final long serialVersionUID = 1L;
        private int productId;
        private int requested;
        private int available;
    }
}
