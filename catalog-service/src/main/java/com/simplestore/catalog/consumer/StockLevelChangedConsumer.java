package com.simplestore.catalog.consumer;

import com.simplestore.catalog.model.Product;
import com.simplestore.catalog.repository.ProductRepository;
import com.simplestore.common.event.StockLevelChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class StockLevelChangedConsumer implements Consumer<StockLevelChangedEvent> {

    private final ProductRepository productRepository;

    @Override
    public void accept(StockLevelChangedEvent event) {
        log.info("Received StockLevelChangedEvent: productId={}, newStock={}", event.productId(), event.newStockLevel());
        productRepository.findById(event.productId()).ifPresentOrElse(
                product -> {
                    product.setStock(event.newStockLevel());
                    productRepository.save(product);
                    log.info("Updated stock for product {} to {}", event.productId(), event.newStockLevel());
                },
                () -> log.warn("StockLevelChangedEvent for unknown product {} — product may have been deleted, skipping",
                        event.productId())
        );
    }
}
