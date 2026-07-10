package com.simplestore.cart.consumer;

import com.simplestore.cart.model.Cart;
import com.simplestore.cart.model.CartItem;
import com.simplestore.cart.service.CartService;
import com.simplestore.common.event.ProductUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductUpdatedConsumer {

    private final CartService cartService;

    @Bean
    public Consumer<ProductUpdatedEvent> productUpdatedConsumer() {
        return event -> {
            log.info("Received ProductUpdatedEvent for productId={}", event.productId());
            // Cart items are stored per-owner, so we'd need to iterate all carts.
            // In a production system, you'd use Redis SCAN or maintain a product→cart index.
            // For simplicity, we log the event. The cart will reflect new data on next fetch
            // if the catalog service is the source of truth for name/price/imageUrl.
            log.info("Product {} updated - name={}, price={}. Cart items referencing this product "
                    + "will use updated info on next refresh from catalog.",
                    event.productId(), event.name(), event.price());
        };
    }
}
