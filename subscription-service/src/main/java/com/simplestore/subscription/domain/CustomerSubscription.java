package com.simplestore.subscription.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "customer_subscriptions")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CustomerSubscription {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false, length = 36)
    private String userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SubscriptionStatus status;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate nextBillingDate;

    @Column
    private LocalDate lastBillingDate;

    @Column(length = 100)
    private String paymentMethodId;

    @Column(precision = 12, scale = 2)
    private BigDecimal lockedPrice;

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
