package com.simplestore.catalog.dto;

import java.math.BigDecimal;

public record UpdateProductRequest(
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        Integer stock,
        Long categoryId
) {}
