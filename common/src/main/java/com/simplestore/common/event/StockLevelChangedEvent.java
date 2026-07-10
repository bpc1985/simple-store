package com.simplestore.common.event;

import java.io.Serializable;

public record StockLevelChangedEvent(
        Long productId,
        int newStockLevel
) implements Serializable {}
