package com.simplestore.storefront.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.simplestore.storefront.dto.ApiResponse;
import com.simplestore.storefront.dto.ProductDto;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class CatalogClientService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public CatalogClientService(RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getProducts(int page, String categoryId, String search) {
        StringBuilder uri = new StringBuilder("/api/v1/catalog/products?page={page}");
        if (categoryId != null && !categoryId.isBlank()) {
            uri.append("&categoryId={categoryId}");
        }
        if (search != null && !search.isBlank()) {
            uri.append("&search={search}");
        }

        var response = restClient.get()
                .uri(uri.toString(), page, categoryId, search)
                .retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});

        if (response != null && response.getData() != null) {
            return response.getData();
        }
        return Collections.emptyMap();
    }

    public ProductDto getProduct(Long id) {
        var response = restClient.get()
                .uri("/api/v1/catalog/products/{id}", id)
                .retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<ProductDto>>() {});
        return response != null ? response.getData() : null;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCategories() {
        // categories endpoint returns ApiResponse<PageResult<CategoryDto>>, not a plain list
        var response = restClient.get()
                .uri("/api/v1/catalog/categories")
                .retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
        if (response != null && response.getData() != null) {
            Object items = response.getData().get("items");
            if (items instanceof List) {
                return (List<Map<String, Object>>) items;
            }
        }
        return Collections.emptyList();
    }
}
