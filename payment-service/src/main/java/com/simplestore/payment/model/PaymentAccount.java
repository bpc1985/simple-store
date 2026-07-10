package com.simplestore.payment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String userId;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
