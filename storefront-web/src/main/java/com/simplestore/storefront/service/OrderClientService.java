package com.simplestore.storefront.service;

import com.simplestore.storefront.dto.CartItemDto;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class OrderClientService {

    private final RestClient restClient;

    public OrderClientService(RestClient restClient) {
        this.restClient = restClient;
    }

    public Map<String, Object> createOrder(String shippingAddress, List<CartItemDto> items) {
        var body = Map.of("shippingAddress", shippingAddress, "items", items);
        Map<String, Object> response = restClient.post()
                .uri("/api/v1/order/orders")
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        return response != null ? response : Collections.emptyMap();
    }

    public List<Map<String, Object>> getMyOrders() {
        List<Map<String, Object>> response = restClient.get()
                .uri("/api/v1/order/orders")
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        return response != null ? response : Collections.emptyList();
    }
}
