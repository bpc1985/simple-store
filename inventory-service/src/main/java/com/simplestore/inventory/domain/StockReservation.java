package com.simplestore.inventory.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "stock_reservations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private int orderId;

    @Column(nullable = false, unique = true)
    private UUID correlationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.PENDING;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StockReservationItem> items = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public void addItem(StockReservationItem item) {
        items.add(item);
        item.setReservation(this);
    }
}
