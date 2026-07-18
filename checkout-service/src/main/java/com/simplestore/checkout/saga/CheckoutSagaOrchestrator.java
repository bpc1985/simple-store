package com.simplestore.checkout.saga;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.simplestore.checkout.model.CheckoutSagaState;
import com.simplestore.checkout.model.SagaStatus;
import com.simplestore.checkout.repository.CheckoutSagaStateRepository;
import com.simplestore.common.event.OrderCancelledEvent;
import com.simplestore.common.event.OrderConfirmedEvent;
import com.simplestore.common.event.OrderSubmittedEvent;
import com.simplestore.common.event.PaymentFailedEvent;
import com.simplestore.common.event.PaymentSucceededEvent;
import com.simplestore.common.event.ProcessPaymentRequestedEvent;
import com.simplestore.common.event.ReserveStockRequestedEvent;
import com.simplestore.common.event.ReserveStockRequestedEvent.StockItem;
import com.simplestore.common.event.StockReservationCancelRequestedEvent;
import com.simplestore.common.event.StockReservationCancelledEvent;
import com.simplestore.common.event.StockReservationFailedEvent;
import com.simplestore.common.event.StockReservedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutSagaOrchestrator {

    private final CheckoutSagaStateRepository repository;
    private final StreamBridge streamBridge;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void handleOrderSubmitted(OrderSubmittedEvent event) {
        log.info("Handling OrderSubmittedEvent: correlationId={}, userId={}",
                event.correlationId(), event.userId());

        // Idempotency: skip if saga already exists (duplicate event delivery)
        if (repository.findById(event.correlationId()).isPresent()) {
            log.warn("Saga already exists for correlationId={}, skipping", event.correlationId());
            return;
        }

        List<StockItem> stockItems = event.items().stream()
                .map(item -> new StockItem(item.productId(), item.quantity()))
                .toList();

        String itemsJson = serializeToJson(event.items());

        CheckoutSagaState saga = CheckoutSagaState.builder()
                .id(event.correlationId())
                .userId(event.userId())
                .status(SagaStatus.STARTED)
                .totalAmount(event.totalAmount())
                .shippingAddress(event.shippingAddress())
                .items(itemsJson)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        repository.save(saga);
        log.info("Created saga state: id={}", saga.getId());

        UUID reservationId = UUID.randomUUID();
        saga.setReservationId(reservationId);
        saga.setStatus(SagaStatus.RESERVING_STOCK);
        saga.setUpdatedAt(Instant.now());
        repository.save(saga);

        ReserveStockRequestedEvent reserveEvent = new ReserveStockRequestedEvent(
                event.correlationId(), event.userId(), stockItems);
        streamBridge.send("reserve-stock-requested", reserveEvent);
        log.info("Published ReserveStockRequestedEvent: correlationId={}, reservationId={}",
                event.correlationId(), reservationId);
    }

    @Transactional
    public void handleStockReserved(StockReservedEvent event) {
        log.info("Handling StockReservedEvent: correlationId={}", event.correlationId());

        CheckoutSagaState saga = repository.findById(event.correlationId())
                .orElseThrow(() -> new IllegalStateException(
                        "Saga not found: " + event.correlationId()));

        // Idempotency: only act if we are expecting this event
        if (saga.getStatus() != SagaStatus.RESERVING_STOCK) {
            log.warn("Received StockReservedEvent but saga status is {} for correlationId={}",
                    saga.getStatus(), event.correlationId());
            return;
        }

        UUID paymentId = UUID.randomUUID();
        saga.setPaymentId(paymentId);
        saga.setStatus(SagaStatus.PROCESSING_PAYMENT);
        saga.setUpdatedAt(Instant.now());
        repository.save(saga);

        ProcessPaymentRequestedEvent paymentEvent = new ProcessPaymentRequestedEvent(
                event.correlationId(), saga.getUserId(), saga.getTotalAmount());
        streamBridge.send("process-payment-requested", paymentEvent);
        log.info("Published ProcessPaymentRequestedEvent: correlationId={}, paymentId={}",
                event.correlationId(), paymentId);
    }

    @Transactional
    public void handleStockReservationFailed(StockReservationFailedEvent event) {
        log.info("Handling StockReservationFailedEvent: correlationId={}, reason={}",
                event.correlationId(), event.reason());

        CheckoutSagaState saga = repository.findById(event.correlationId())
                .orElseThrow(() -> new IllegalStateException(
                        "Saga not found: " + event.correlationId()));

        // Idempotency: only cancel if not already in a terminal state
        if (saga.getStatus() == SagaStatus.CANCELLED || saga.getStatus() == SagaStatus.CONFIRMED) {
            log.warn("Saga already in terminal state {} for correlationId={}, skipping",
                    saga.getStatus(), event.correlationId());
            return;
        }

        saga.setStatus(SagaStatus.CANCELLED);
        saga.setReason(event.reason());
        saga.setUpdatedAt(Instant.now());
        repository.save(saga);

        OrderCancelledEvent cancelledEvent = new OrderCancelledEvent(
                event.correlationId(), saga.getUserId(), event.reason());
        streamBridge.send("order-cancelled", cancelledEvent);
        log.info("Published OrderCancelledEvent: correlationId={}",
                event.correlationId());
    }

    @Transactional
    public void handlePaymentSucceeded(PaymentSucceededEvent event) {
        log.info("Handling PaymentSucceededEvent: correlationId={}", event.correlationId());

        CheckoutSagaState saga = repository.findById(event.correlationId())
                .orElseThrow(() -> new IllegalStateException(
                        "Saga not found: " + event.correlationId()));

        // Idempotency: only confirm if we are expecting this event
        if (saga.getStatus() != SagaStatus.PROCESSING_PAYMENT) {
            log.warn("Saga status is {} for correlationId={}, skipping payment success",
                    saga.getStatus(), event.correlationId());
            return;
        }

        saga.setStatus(SagaStatus.CONFIRMED);
        saga.setUpdatedAt(Instant.now());
        repository.save(saga);

        OrderConfirmedEvent confirmedEvent = new OrderConfirmedEvent(
                event.correlationId(), saga.getUserId());
        streamBridge.send("order-confirmed", confirmedEvent);
        log.info("Published OrderConfirmedEvent: correlationId={}", event.correlationId());
    }

    @Transactional
    public void handlePaymentFailed(PaymentFailedEvent event) {
        log.info("Handling PaymentFailedEvent: correlationId={}, reason={}",
                event.correlationId(), event.reason());

        CheckoutSagaState saga = repository.findById(event.correlationId())
                .orElseThrow(() -> new IllegalStateException(
                        "Saga not found: " + event.correlationId()));

        // Idempotency: only compensate if we are expecting this event
        if (saga.getStatus() != SagaStatus.PROCESSING_PAYMENT) {
            log.warn("Saga status is {} for correlationId={}, skipping payment failure",
                    saga.getStatus(), event.correlationId());
            return;
        }

        saga.setReason(event.reason());
        saga.setStatus(SagaStatus.COMPENSATING);
        saga.setUpdatedAt(Instant.now());
        repository.save(saga);

        StockReservationCancelRequestedEvent cancelEvent =
                new StockReservationCancelRequestedEvent(
                        event.correlationId(), saga.getUserId());
        streamBridge.send("stock-reservation-cancel-requested", cancelEvent);
        log.info("Published StockReservationCancelRequestedEvent: correlationId={}",
                event.correlationId());
    }

    @Transactional
    public void handleStockReservationCancelled(StockReservationCancelledEvent event) {
        log.info("Handling StockReservationCancelledEvent: correlationId={}",
                event.correlationId());

        CheckoutSagaState saga = repository.findById(event.correlationId())
                .orElseThrow(() -> new IllegalStateException(
                        "Saga not found: " + event.correlationId()));

        // Idempotency: only finalize if we are expecting this event
        if (saga.getStatus() != SagaStatus.COMPENSATING) {
            log.warn("Saga status is {} for correlationId={}, skipping cancellation finalization",
                    saga.getStatus(), event.correlationId());
            return;
        }

        saga.setStatus(SagaStatus.CANCELLED);
        saga.setUpdatedAt(Instant.now());
        repository.save(saga);

        String reason = saga.getReason() != null
                ? saga.getReason() : "Stock reservation cancelled";
        OrderCancelledEvent cancelledEvent = new OrderCancelledEvent(
                event.correlationId(), saga.getUserId(), reason);
        streamBridge.send("order-cancelled", cancelledEvent);
        log.info("Published OrderCancelledEvent: correlationId={}", event.correlationId());
    }

    private String serializeToJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize object to JSON", e);
            return "[]";
        }
    }
}

