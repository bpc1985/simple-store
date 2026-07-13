package com.simplestore.inventory.consumer;

import com.simplestore.common.event.StockReservationCancelRequestedEvent;
import com.simplestore.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class CancelReservationConsumer implements Consumer<StockReservationCancelRequestedEvent> {

    private final InventoryService inventoryService;

    @Override
    public void accept(StockReservationCancelRequestedEvent event) {
        log.info("Received StockReservationCancelRequestedEvent: correlationId={}", event.correlationId());
        inventoryService.processCancelReservation(event);
    }
}
