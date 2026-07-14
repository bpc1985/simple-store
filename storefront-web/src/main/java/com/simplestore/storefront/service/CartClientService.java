package com.simplestore.storefront.service;

import com.simplestore.storefront.dto.ApiResponse;
import com.simplestore.storefront.dto.CartDto;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class CartClientService {

    private final RestClient restClient;

    public CartClientService(RestClient restClient) {
        this.restClient = restClient;
    }

    public CartDto getCart(String cartId) {
        var spec = restClient.get().uri("/api/v1/cart");
        if (cartId != null && !cartId.isBlank()) {
            spec.header("X-Cart-Id", cartId);
        }
        var response = spec.retrieve().body(new ParameterizedTypeReference<ApiResponse<CartDto>>() {});
        return response != null ? response.getData() : null;
    }

    public CartDto addToCart(Long productId, int quantity, String cartId) {
        var body = Map.of("productId", productId, "quantity", quantity);
        var spec = restClient.post().uri("/api/v1/cart/items").body(body);
        if (cartId != null && !cartId.isBlank()) {
            spec.header("X-Cart-Id", cartId);
        }
        var response = spec.retrieve().body(new ParameterizedTypeReference<ApiResponse<CartDto>>() {});
        return response != null ? response.getData() : null;
    }

    public CartDto updateCartItem(Long productId, int quantity, String cartId) {
        var body = Map.of("productId", productId, "quantity", quantity);
        var spec = restClient.put().uri("/api/v1/cart/items").body(body);
        if (cartId != null && !cartId.isBlank()) {
            spec.header("X-Cart-Id", cartId);
        }
        var response = spec.retrieve().body(new ParameterizedTypeReference<ApiResponse<CartDto>>() {});
        return response != null ? response.getData() : null;
    }

    public CartDto removeCartItem(Long productId, String cartId) {
        var spec = restClient.delete().uri("/api/v1/cart/items/{productId}", productId);
        if (cartId != null && !cartId.isBlank()) {
            spec.header("X-Cart-Id", cartId);
        }
        var response = spec.retrieve().body(new ParameterizedTypeReference<ApiResponse<CartDto>>() {});
        return response != null ? response.getData() : null;
    }

    public void clearCart(String cartId) {
        var spec = restClient.delete().uri("/api/v1/cart");
        if (cartId != null && !cartId.isBlank()) {
            spec.header("X-Cart-Id", cartId);
        }
        spec.retrieve().toBodilessEntity();
    }
}
