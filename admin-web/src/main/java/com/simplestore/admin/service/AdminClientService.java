package com.simplestore.admin.service;

import com.simplestore.admin.dto.ApiResponse;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
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
        var response = restClient.get().uri("/api/v1/admin/stats")
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    // --- Products ---
    public Map<String, Object> getProducts(int page) {
        var response = restClient.get().uri("/api/v1/catalog/products?page={page}", page)
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> getProduct(Long id) {
        var response = restClient.get().uri("/api/v1/catalog/products/{id}", id)
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> createProduct(Map<String, Object> productData) {
        var response = restClient.post().uri("/api/v1/catalog/products")
                .body(productData).retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> updateProduct(Long id, Map<String, Object> productData) {
        var response = restClient.put().uri("/api/v1/catalog/products/{id}", id)
                .body(productData).retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public void deleteProduct(Long id) {
        restClient.delete().uri("/api/v1/catalog/products/{id}", id)
                .retrieve().toBodilessEntity();
    }

    // --- Categories ---
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCategories() {
        var response = restClient.get().uri("/api/v1/catalog/categories")
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        if (response != null && response.getData() != null) {
            Object items = response.getData().get("items");
            if (items instanceof List) return (List<Map<String, Object>>) items;
        }
        return Collections.emptyList();
    }

    // --- Orders (admin paths need /admin prefix) ---
    public Map<String, Object> getOrders(int page) {
        var response = restClient.get().uri("/api/v1/order/admin/orders?page={page}", page)
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> getOrder(Long id) {
        var response = restClient.get().uri("/api/v1/order/admin/orders/{id}", id)
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> updateOrderStatus(Long id, String status) {
        var response = restClient.patch().uri("/api/v1/order/admin/orders/{id}/status", id)
                .body(Map.of("status", status)).retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    // --- Users ---
    public List<Map<String, Object>> getUsers() {
        var response = restClient.get().uri("/api/v1/identity/admin/users")
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<List<Map<String, Object>>>>() {});
        return response != null ? response.getData() : Collections.emptyList();
    }

    public Map<String, Object> getUsersPage() {
        var response = restClient.get().uri("/api/v1/identity/admin/users")
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public void lockUser(Long id) {
        restClient.post().uri("/api/v1/identity/admin/users/{id}/lock", id)
                .retrieve().toBodilessEntity();
    }

    public void unlockUser(Long id) {
        restClient.post().uri("/api/v1/identity/admin/users/{id}/unlock", id)
                .retrieve().toBodilessEntity();
    }

    // --- Auth ---
    public Map<String, Object> login(String email, String password) {
        var response = restClient.post().uri("/api/v1/identity/login")
                .body(Map.of("email", email, "password", password)).retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    // --- Inventory ---
    public Map<String, Object> getInventoryStats() {
        var response = restClient.get().uri("/api/v1/inventory/stats")
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> getStockLevels() {
        var response = restClient.get().uri("/api/v1/inventory/stock-levels")
                .retrieve().body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }

    public Map<String, Object> updateStockLevel(Long productId, int quantity) {
        var response = restClient.put().uri("/api/v1/inventory/stock-levels/{productId}", productId)
                .body(Map.of("stockLevel", quantity)).retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        return response != null ? response.getData() : Collections.emptyMap();
    }
}
