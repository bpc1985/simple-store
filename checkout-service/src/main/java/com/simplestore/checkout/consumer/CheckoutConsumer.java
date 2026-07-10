package com.simplestore.checkout.consumer;

import com.simplestore.checkout.saga.CheckoutSagaOrchestrator;
import com.simplestore.common.event.OrderSubmittedEvent;
import com.simplestore.common.event.PaymentFailedEvent;
import com.simplestore.common.event.PaymentSucceededEvent;
import com.simplestore.common.event.StockReservationCancelledEvent;
import com.simplestore.common.event.StockReservationFailedEvent;
import com.simplestore.common.event.StockReservedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class CheckoutConsumer {

    private final CheckoutSagaOrchestrator orchestrator;

    @Bean
    public Consumer<OrderSubmittedEvent> orderSubmittedConsumer() {
        return event -> {
            log.info("Received OrderSubmittedEvent: correlationId={}", event.correlationId());
            orchestrator.handleOrderSubmitted(event);
        };
    }

    @Bean
    public Consumer<StockReservedEvent> stockReservedConsumer() {
        return event -> {
            log.info("Received StockReservedEvent: correlationId={}", event.correlationId());
            orchestrator.handleStockReserved(event);
        };
    }

    @Bean
    public Consumer<StockReservationFailedEvent> stockReservationFailedConsumer() {
        return event -> {
            log.info("Received StockReservationFailedEvent: correlationId={}", event.correlationId());
            orchestrator.handleStockReservationFailed(event);
        };
    }

    @Bean
    public Consumer<PaymentSucceededEvent> paymentSucceededConsumer() {
        return event -> {
            log.info("Received PaymentSucceededEvent: correlationId={}", event.correlationId());
            orchestrator.handlePaymentSucceeded(event);
        };
    }

    @Bean
    public Consumer<PaymentFailedEvent> paymentFailedConsumer() {
        return event -> {
            log.info("Received PaymentFailedEvent: correlationId={}", event.correlationId());
            orchestrator.handlePaymentFailed(event);
        };
    }

    @Bean
    public Consumer<StockReservationCancelledEvent> stockReservationCancelledConsumer() {
        return event -> {
            log.info("Received StockReservationCancelledEvent: correlationId={}", event.correlationId());
            orchestrator.handleStockReservationCancelled(event);
        };
    }
}
