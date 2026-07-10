package com.simplestore.storefront.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDto {
    private Long id;
    private String orderDate;
    private BigDecimal totalAmount;
    private String status;
    private String shippingAddress;
    private List<CartItemDto> items;
}
