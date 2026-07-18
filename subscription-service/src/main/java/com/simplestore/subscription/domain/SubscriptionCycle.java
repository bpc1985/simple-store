package com.simplestore.subscription.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "subscription_cycles", uniqueConstraints = @UniqueConstraint(columnNames = {"subscriptionId", "cycleNumber"}))
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class SubscriptionCycle {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false, length = 36)
    private String subscriptionId;

    @Column(nullable = false)
    private int cycleNumber;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CycleStatus status;

    @Column(length = 100)
    private String paymentTransactionId;

    @Column(length = 100)
    private String orderId;

    @Column(nullable = false)
    private Instant scheduledDate;

    @Column
    private Instant completedDate;

    @Version
    private Long version;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
