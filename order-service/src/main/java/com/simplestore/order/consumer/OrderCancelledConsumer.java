package com.simplestore.order.consumer;

import com.simplestore.common.event.OrderCancelledEvent;
import com.simplestore.order.model.Order;
import com.simplestore.order.model.OrderStatus;
import com.simplestore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCancelledConsumer {

    private final OrderRepository orderRepository;

    @Bean
    public Consumer<OrderCancelledEvent> orderCancelledConsumer() {
        return event -> {
            log.info("Received OrderCancelledEvent: correlationId={}, reason={}", event.correlationId(), event.reason());
            Order order = orderRepository.findByCorrelationId(event.correlationId())
                    .orElseThrow(() -> new RuntimeException("Order not found: " + event.correlationId()));
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
            log.info("Order {} cancelled", event.correlationId());
        };
    }
}
