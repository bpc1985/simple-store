package com.simplestore.storefront.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDto {
    private Long productId;
    private String productName;
    private BigDecimal price;
    private String imageUrl;
    private int quantity;
}
