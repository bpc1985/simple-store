package com.simplestore.inventory.consumer;

import com.simplestore.common.event.StockReservationCancelRequestedEvent;
import com.simplestore.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class CancelReservationConsumer {

    private final InventoryService inventoryService;

    @Bean
    public Consumer<StockReservationCancelRequestedEvent> cancelReservationConsumer() {
        return event -> {
            log.info("Received StockReservationCancelRequestedEvent: correlationId={}", event.correlationId());
            inventoryService.processCancelReservation(event);
        };
    }
}
