package com.simplestore.cart.service;

import com.simplestore.cart.model.Cart;

import java.math.BigDecimal;

public interface CartService {

    Cart getCart(String owner);

    Cart addItem(String owner, Long productId, String productName, BigDecimal price, String imageUrl, int quantity);

    Cart updateItemQuantity(String owner, Long productId, int quantity);

    Cart removeItem(String owner, Long productId);

    void clearCart(String owner);

    void mergeCart(String anonymousCartId, String userCartId);

    int getCartCount(String owner);

    BigDecimal getCartTotal(String owner);
}
