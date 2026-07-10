package com.simplestore.catalog.dto;

import java.math.BigDecimal;

public record ProductDto(
        Long id,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        int stock,
        Long categoryId,
        String categoryName
) {}
