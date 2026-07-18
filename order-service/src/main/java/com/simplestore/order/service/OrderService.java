package com.simplestore.order.service;

import com.simplestore.common.dto.PagedResult;
import com.simplestore.common.event.OrderSubmittedEvent;
import com.simplestore.order.dto.*;
import com.simplestore.order.model.Order;
import com.simplestore.order.model.OrderItem;
import com.simplestore.order.model.OrderStatus;
import com.simplestore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.*;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final StreamBridge streamBridge;

    @Transactional
    public OrderDto createOrder(String userId, CreateOrderRequest request) {
        BigDecimal total = request.items().stream()
                .map(i -> {
                    BigDecimal price = i.unitPrice() != null ? i.unitPrice() : BigDecimal.ZERO;
                    return price.multiply(BigDecimal.valueOf(i.quantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
                .userId(userId)
                .totalAmount(total)
                .shippingAddress(request.shippingAddress())
                .status(OrderStatus.PENDING)
                .build();

        for (var item : request.items()) {
            OrderItem orderItem = OrderItem.builder()
                    .productId(item.productId())
                    .productName(item.productName() != null ? item.productName() : "Product #" + item.productId())
                    .quantity(item.quantity())
                    .unitPrice(item.unitPrice() != null ? item.unitPrice() : BigDecimal.ZERO)
                    .build();
            order.addItem(orderItem);
        }

        order = orderRepository.save(order);

        // Publish OrderSubmittedEvent after transaction commit
        UUID correlationId = order.getCorrelationId();
        String orderUserId = order.getUserId();
        java.time.Instant orderDate = order.getOrderDate();
        BigDecimal totalAmount = order.getTotalAmount();
        String shippingAddr = order.getShippingAddress();
        List<OrderSubmittedEvent.OrderItemDetail> itemDetails = order.getItems().stream()
                .map(i -> new OrderSubmittedEvent.OrderItemDetail(
                        i.getProductId(), i.getProductName(), i.getQuantity(), i.getUnitPrice()))
                .toList();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                OrderSubmittedEvent event = new OrderSubmittedEvent(
                        correlationId, orderUserId, orderDate, totalAmount, shippingAddr, itemDetails);
                boolean sent = streamBridge.send("order-submitted", event);
                if (!sent) {
                    log.error("Failed to send order-submitted event for correlationId={}", correlationId);
                }
            }
        });
        log.info("Order {} created", correlationId);

        return toOrderDto(order);
    }

    public List<OrderDto> getMyOrders(String userId) {
        return orderRepository.findByUserId(userId, PageRequest.of(0, 100))
                .stream().map(this::toOrderDto).toList();
    }

    public OrderDto getMyOrderById(Long id, String userId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        if (!order.getUserId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        return toOrderDto(order);
    }

    @Transactional
    public OrderDto cancelOrder(Long id, String userId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        if (!order.getUserId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Only pending orders can be cancelled");
        }
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        log.info("Order {} cancelled by user {}", id, userId);
        return toOrderDto(order);
    }

    public PagedResult<OrderDto> getOrders(int page, int pageSize) {
        Page<Order> orderPage = orderRepository.findAll(PageRequest.of(page, pageSize));
        return PagedResult.from(orderPage.getContent(), orderPage.getTotalElements(),
                orderPage.getNumber(), orderPage.getSize(), this::toOrderDto);
    }

    public OrderDto getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        return toOrderDto(order);
    }

    public long getOrderCount() {
        return orderRepository.count();
    }

    @Transactional
    public boolean updateStatus(Long id, String status) {
        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isEmpty()) return false;

        Order order = opt.get();
        order.setStatus(OrderStatus.valueOf(status.toUpperCase()));
        orderRepository.save(order);
        log.info("Order {} status updated to {}", id, status);
        return true;
    }

    public OrderStatsDto getStats() {
        long total = orderRepository.count();
        long pending = orderRepository.countByStatus(OrderStatus.PENDING);
        long confirmed = orderRepository.countByStatus(OrderStatus.CONFIRMED);
        long cancelled = orderRepository.countByStatus(OrderStatus.CANCELLED);
        BigDecimal revenue = orderRepository.sumTotalAmountByStatusConfirmed();

        return new OrderStatsDto(total, pending, confirmed, cancelled, revenue);
    }

    public Map<String, Long> getOrderCountsByUser() {
        return orderRepository.countOrdersByUserRaw().stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
    }

    private OrderDto toOrderDto(Order order) {
        List<OrderItemDto> itemDtos = order.getItems().stream()
                .map(i -> new OrderItemDto(i.getProductId(), i.getProductName(), i.getQuantity(), i.getUnitPrice()))
                .toList();
        return new OrderDto(
                order.getId(),
                order.getCorrelationId(),
                order.getUserId(),
                order.getOrderDate(),
                order.getTotalAmount(),
                order.getStatus().name(),
                order.getShippingAddress(),
                itemDtos
        );
    }
}
