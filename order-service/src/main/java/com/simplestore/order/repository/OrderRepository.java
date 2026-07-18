package com.simplestore.order.repository;

import com.simplestore.order.model.Order;
import com.simplestore.order.model.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(String userId, Pageable pageable);

    Optional<Order> findByCorrelationId(UUID correlationId);

    long countByStatus(OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status = 'CONFIRMED'")
    BigDecimal sumTotalAmountByStatusConfirmed();

    @Query("SELECT o.userId, COUNT(o) FROM Order o GROUP BY o.userId")
    List<Object[]> countOrdersByUserRaw();
}
