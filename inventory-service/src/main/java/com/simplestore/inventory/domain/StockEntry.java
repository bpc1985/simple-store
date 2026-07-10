package com.simplestore.inventory.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "stock_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private int productId;

    @Column(nullable = false)
    private int stockLevel;

    @Column(nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
