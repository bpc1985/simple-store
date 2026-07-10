package com.simplestore.admin.service;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AdminClientService {

    private final RestClient restClient;

    public AdminClientService(RestClient restClient) {
        this.restClient = restClient;
    }

    // --- Dashboard ---
    public Map<String, Object> getDashboardStats() {
        return restClient.get()
                .uri("/api/v1/admin/stats")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    // --- Products ---
    public Map<String, Object> getProducts(int page) {
        return restClient.get()
                .uri("/api/v1/catalog/products?page={page}", page)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public Map<String, Object> getProduct(Long id) {
        return restClient.get()
                .uri("/api/v1/catalog/products/{id}", id)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public Map<String, Object> createProduct(Map<String, Object> productData) {
        return restClient.post()
                .uri("/api/v1/catalog/products")
                .body(productData)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public Map<String, Object> updateProduct(Long id, Map<String, Object> productData) {
        return restClient.put()
                .uri("/api/v1/catalog/products/{id}", id)
                .body(productData)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public void deleteProduct(Long id) {
        restClient.delete()
                .uri("/api/v1/catalog/products/{id}", id)
                .retrieve()
                .toBodilessEntity();
    }

    // --- Categories ---
    public List<Map<String, Object>> getCategories() {
        return restClient.get()
                .uri("/api/v1/catalog/categories")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    // --- Orders ---
    public Map<String, Object> getOrders(int page) {
        return restClient.get()
                .uri("/api/v1/order/orders?page={page}", page)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public Map<String, Object> getOrder(Long id) {
        return restClient.get()
                .uri("/api/v1/order/orders/{id}", id)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public Map<String, Object> updateOrderStatus(Long id, String status) {
        var body = Map.of("status", status);
        return restClient.put()
                .uri("/api/v1/order/orders/{id}/status", id)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    // --- Users ---
    public List<Map<String, Object>> getUsers() {
        return restClient.get()
                .uri("/api/v1/identity/users")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public void lockUser(Long id) {
        restClient.post()
                .uri("/api/v1/identity/users/{id}/lock", id)
                .retrieve()
                .toBodilessEntity();
    }

    public void unlockUser(Long id) {
        restClient.post()
                .uri("/api/v1/identity/users/{id}/unlock", id)
                .retrieve()
                .toBodilessEntity();
    }

    // --- Auth ---
    public Map<String, Object> login(String email, String password) {
        var body = Map.of("email", email, "password", password);
        return restClient.post()
                .uri("/api/v1/identity/login")
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    // --- Inventory ---
    public List<Map<String, Object>> getInventoryStats() {
        return restClient.get()
                .uri("/api/v1/inventory/stats")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public Map<String, Object> updateStockLevel(Long productId, int quantity) {
        var body = Map.of("quantity", quantity);
        return restClient.put()
                .uri("/api/v1/inventory/stock/{productId}", productId)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }
}
