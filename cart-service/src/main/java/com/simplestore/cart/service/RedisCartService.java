package com.simplestore.cart.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.simplestore.cart.model.Cart;
import com.simplestore.cart.model.CartItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisCartService implements CartService {

    private static final String CART_KEY_PREFIX = "cart:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private String cartKey(String owner) {
        return CART_KEY_PREFIX + owner;
    }

    @Override
    public Cart getCart(String owner) {
        HashOperations<String, String, String> hashOps = redisTemplate.opsForHash();
        Map<String, String> entries = hashOps.entries(cartKey(owner));

        List<CartItem> items = new ArrayList<>();
        for (Map.Entry<String, String> entry : entries.entrySet()) {
            try {
                CartItem item = objectMapper.readValue(entry.getValue(), CartItem.class);
                items.add(item);
            } catch (JsonProcessingException e) {
                log.error("Failed to deserialize cart item for owner={}, field={}", owner, entry.getKey(), e);
            }
        }

        return Cart.builder().owner(owner).items(items).build();
    }

    @Override
    public Cart addItem(String owner, Long productId, String productName, BigDecimal price, String imageUrl, int quantity) {
        HashOperations<String, String, String> hashOps = redisTemplate.opsForHash();
        String field = productId.toString();
        String key = cartKey(owner);

        String existingJson = hashOps.get(key, field);
        CartItem item;
        if (existingJson != null) {
            try {
                item = objectMapper.readValue(existingJson, CartItem.class);
                item.setQuantity(item.getQuantity() + quantity);
            } catch (JsonProcessingException e) {
                item = CartItem.builder().productId(productId).productName(productName)
                        .price(price).imageUrl(imageUrl).quantity(quantity).build();
            }
        } else {
            item = CartItem.builder().productId(productId).productName(productName)
                    .price(price).imageUrl(imageUrl).quantity(quantity).build();
        }

        try {
            hashOps.put(key, field, objectMapper.writeValueAsString(item));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize cart item", e);
        }

        log.debug("Added item {} to cart of {}", productId, owner);
        return getCart(owner);
    }

    @Override
    public Cart updateItemQuantity(String owner, Long productId, int quantity) {
        HashOperations<String, String, String> hashOps = redisTemplate.opsForHash();
        String field = productId.toString();
        String key = cartKey(owner);

        if (quantity <= 0) {
            return removeItem(owner, productId);
        }

        String existingJson = hashOps.get(key, field);
        if (existingJson != null) {
            try {
                CartItem item = objectMapper.readValue(existingJson, CartItem.class);
                item.setQuantity(quantity);
                hashOps.put(key, field, objectMapper.writeValueAsString(item));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to update cart item", e);
            }
        }

        return getCart(owner);
    }

    @Override
    public Cart removeItem(String owner, Long productId) {
        HashOperations<String, String, String> hashOps = redisTemplate.opsForHash();
        hashOps.delete(cartKey(owner), productId.toString());
        log.debug("Removed item {} from cart of {}", productId, owner);
        return getCart(owner);
    }

    @Override
    public void clearCart(String owner) {
        redisTemplate.delete(cartKey(owner));
        log.debug("Cleared cart of {}", owner);
    }

    @Override
    public void mergeCart(String anonymousCartId, String userCartId) {
        Cart anonymousCart = getCart(anonymousCartId);
        if (anonymousCart.getItems().isEmpty()) {
            return;
        }

        for (CartItem item : anonymousCart.getItems()) {
            addItem(userCartId, item.getProductId(), item.getProductName(),
                    item.getPrice(), item.getImageUrl(), item.getQuantity());
        }
        clearCart(anonymousCartId);
        log.info("Merged cart {} into {}", anonymousCartId, userCartId);
    }

    @Override
    public int getCartCount(String owner) {
        return getCart(owner).getCount();
    }

    @Override
    public BigDecimal getCartTotal(String owner) {
        return getCart(owner).getTotal();
    }
}
