package com.simplestore.order;

import com.simplestore.order.model.Order;
import com.simplestore.order.model.OrderItem;
import com.simplestore.order.model.OrderStatus;
import com.simplestore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Seeds sample orders on first startup.
 * References well-known user UUIDs from IdentitySeeder and product IDs from CatalogSeeder.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderSeeder implements CommandLineRunner {

    // Match IdentitySeeder well-known UUIDs
    private static final String USER1 = "00000000-0000-0000-0000-000000000002";
    private static final String USER2 = "00000000-0000-0000-0000-000000000003";
    private static final String USER3 = "00000000-0000-0000-0000-000000000004";

    private final OrderRepository orderRepository;

    @Override
    public void run(String... args) {
        if (orderRepository.count() > 0) {
            log.info("Orders already exist, skipping order seed.");
            return;
        }

        log.info("Seeding order data...");
        var now = Instant.now();

        // Order 1 — PENDING (Alice, 2 headphones)
        var o1 = order(USER1, "159.98", OrderStatus.PENDING, "123 Main St, NY", now);
        o1.addItem(item(1L, "Wireless Headphones", 2, "79.99"));
        orderRepository.save(o1);

        // Order 2 — CONFIRMED (Alice, jeans + t-shirt)
        var o2 = order(USER1, "84.98", OrderStatus.CONFIRMED, "123 Main St, NY", now.minusSeconds(3600));
        o2.addItem(item(5L, "Denim Jeans", 1, "59.99"));
        o2.addItem(item(4L, "Cotton T-Shirt", 1, "24.99"));
        orderRepository.save(o2);

        // Order 3 — PENDING (Bob, charger + phone case)
        var o3 = order(USER2, "54.98", OrderStatus.PENDING, "456 Oak Ave, LA", now.minusSeconds(7200));
        o3.addItem(item(3L, "USB-C Charger", 1, "34.99"));
        o3.addItem(item(2L, "Smartphone Case", 1, "19.99"));
        orderRepository.save(o3);

        // Order 4 — CANCELLED (Bob, coffee maker)
        var o4 = order(USER2, "49.99", OrderStatus.CANCELLED, "456 Oak Ave, LA", now.minusSeconds(10800));
        o4.addItem(item(9L, "Coffee Maker", 1, "49.99"));
        orderRepository.save(o4);

        // Order 5 — PENDING (Carol, book + shoes)
        var o5 = order(USER3, "134.98", OrderStatus.PENDING, "789 Pine Rd, Chicago", now.minusSeconds(14400));
        o5.addItem(item(7L, "Spring Boot in Action", 1, "44.99"));
        o5.addItem(item(6L, "Running Shoes", 1, "89.99"));
        orderRepository.save(o5);

        log.info("Seeded 5 orders: 2 for user1, 2 for user2, 1 for user3");
    }

    private Order order(String userId, String total, OrderStatus status, String address, Instant date) {
        return Order.builder()
                .correlationId(UUID.randomUUID())
                .userId(userId)
                .orderDate(date)
                .totalAmount(new BigDecimal(total))
                .status(status)
                .shippingAddress(address)
                .build();
    }

    private OrderItem item(Long productId, String name, int qty, String price) {
        return OrderItem.builder()
                .productId(productId)
                .productName(name)
                .quantity(qty)
                .unitPrice(new BigDecimal(price))
                .build();
    }
}
