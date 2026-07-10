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
public class StockLevelChangedEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int version = 1;
    private int productId;
    private int newStockLevel;
    private Instant timestamp;
}
