package com.simplestore.common.event;

import java.io.Serializable;
import java.math.BigDecimal;

public record ProductUpdatedEvent(
        Long productId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        int stock,
        Long categoryId
) implements Serializable {}
