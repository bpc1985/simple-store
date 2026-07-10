package com.simplestore.inventory.consumer;

import com.simplestore.common.event.ReserveStockRequestedEvent;
import com.simplestore.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReserveStockConsumer {

    private final InventoryService inventoryService;

    @Bean
    public Consumer<ReserveStockRequestedEvent> reserveStockConsumer() {
        return event -> {
            log.info("Received ReserveStockRequestedEvent: correlationId={}", event.correlationId());
            inventoryService.processReserveStock(event);
        };
    }
}
