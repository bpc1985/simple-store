package com.simplestore.inventory.consumer;

import com.simplestore.common.event.ReserveStockRequestedEvent;
import com.simplestore.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReserveStockConsumer implements Consumer<ReserveStockRequestedEvent> {

    private final InventoryService inventoryService;

    @Override
    public void accept(ReserveStockRequestedEvent event) {
        log.info("Received ReserveStockRequestedEvent: correlationId={}", event.correlationId());
        inventoryService.processReserveStock(event);
    }
}
