package com.simplestore.storefront.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    public Map<String, Object> getProducts(int page, String categoryId, String search) {
        StringBuilder uri = new StringBuilder("/api/v1/catalog/products?page={page}");
        if (categoryId != null && !categoryId.isBlank()) {
            uri.append("&categoryId={categoryId}");
        }
        if (search != null && !search.isBlank()) {
            uri.append("&search={search}");
        }

        var spec = restClient.get()
                .uri(uri.toString(), page, categoryId, search);

        Map<String, Object> response = spec.retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});

        if (response != null && response.containsKey("content")) {
            @SuppressWarnings("unchecked")
            List<Object> content = (List<Object>) response.get("content");
            List<ProductDto> products = content.stream()
                    .map(obj -> objectMapper.convertValue(obj, ProductDto.class))
                    .toList();
            response.put("content", products);
        }

        return response != null ? response : Collections.emptyMap();
    }

    public ProductDto getProduct(Long id) {
        return restClient.get()
                .uri("/api/v1/catalog/products/{id}", id)
                .retrieve()
                .body(ProductDto.class);
    }

    public List<Map<String, Object>> getCategories() {
        List<Map<String, Object>> response = restClient.get()
                .uri("/api/v1/catalog/categories")
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        return response != null ? response : Collections.emptyList();
    }
}
