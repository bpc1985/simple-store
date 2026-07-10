package com.simplestore.inventory.repository;

import com.simplestore.inventory.domain.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockReservationRepository extends JpaRepository<StockReservation, UUID> {

    Optional<StockReservation> findByCorrelationId(UUID correlationId);
}
