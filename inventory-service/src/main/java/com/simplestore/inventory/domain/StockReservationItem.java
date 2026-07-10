package com.simplestore.inventory.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stock_reservation_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "reservation")
public class StockReservationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private StockReservation reservation;

    @Column(nullable = false)
    private int productId;

    @Column(nullable = false)
    private int quantity;
}
