package com.simplestore.common.event;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;

public record ReserveStockRequestedEvent(
        UUID correlationId,
        String userId,
        List<StockItem> items
) implements Serializable {

    public record StockItem(
            Long productId,
            int quantity
    ) implements Serializable {}
}
