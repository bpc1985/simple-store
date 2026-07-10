package com.simplestore.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductUpdatedEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int version = 1;
    private int productId;
    private String name;
    private BigDecimal price;
    private String imageUrl;
    private int stock;
    private Instant timestamp;
}
