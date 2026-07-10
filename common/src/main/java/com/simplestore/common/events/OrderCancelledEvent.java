package com.simplestore.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCancelledEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int version = 1;
    private UUID correlationId;
    private UUID orderId;
    private String reason;
    private Instant cancelledAt;
}
