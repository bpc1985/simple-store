package com.simplestore.catalog.consumer;

import com.simplestore.catalog.model.Product;
import com.simplestore.catalog.repository.ProductRepository;
import com.simplestore.common.event.StockLevelChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class StockLevelChangedConsumer {

    private final ProductRepository productRepository;

    @Bean
    public Consumer<StockLevelChangedEvent> stockLevelChangedConsumer() {
        return event -> {
            log.info("Received StockLevelChangedEvent: productId={}, newStock={}", event.productId(), event.newStockLevel());
            Product product = productRepository.findById(event.productId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + event.productId()));
            product.setStock(event.newStockLevel());
            productRepository.save(product);
            log.info("Updated stock for product {} to {}", event.productId(), event.newStockLevel());
        };
    }
}
