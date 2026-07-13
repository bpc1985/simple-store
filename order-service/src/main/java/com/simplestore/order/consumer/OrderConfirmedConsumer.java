package com.simplestore.order.consumer;

import com.simplestore.common.event.OrderConfirmedEvent;
import com.simplestore.order.model.Order;
import com.simplestore.order.model.OrderStatus;
import com.simplestore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderConfirmedConsumer implements Consumer<OrderConfirmedEvent> {

    private final OrderRepository orderRepository;

    @Override
    public void accept(OrderConfirmedEvent event) {
        log.info("Received OrderConfirmedEvent: correlationId={}", event.correlationId());
        Order order = orderRepository.findByCorrelationId(event.correlationId())
                .orElseThrow(() -> new RuntimeException("Order not found: " + event.correlationId()));
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        log.info("Order {} confirmed", event.correlationId());
    }
}
