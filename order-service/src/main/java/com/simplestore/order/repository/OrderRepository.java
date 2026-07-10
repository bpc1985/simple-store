package com.simplestore.order.repository;

import com.simplestore.order.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(String userId, Pageable pageable);

    Optional<Order> findByCorrelationId(UUID correlationId);

    @Query("SELECT o.userId, COUNT(o) FROM Order o GROUP BY o.userId")
    List<Object[]> countOrdersByUserRaw();
}
