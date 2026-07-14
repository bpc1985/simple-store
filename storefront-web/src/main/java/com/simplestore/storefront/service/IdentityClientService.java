package com.simplestore.storefront.service;

import com.simplestore.storefront.dto.ApiResponse;
import com.simplestore.storefront.dto.TokenResponse;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class IdentityClientService {

    private final RestClient restClient;

    public IdentityClientService(RestClient restClient) {
        this.restClient = restClient;
    }

    public TokenResponse login(String email, String password) {
        var body = Map.of("email", email, "password", password);
        var response = restClient.post()
                .uri("/api/v1/identity/login")
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<TokenResponse>>() {});
        return response != null ? response.getData() : null;
    }

    public TokenResponse register(String email, String password, String fullName) {
        var body = Map.of("email", email, "password", password, "fullName", fullName);
        var response = restClient.post()
                .uri("/api/v1/identity/register")
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<TokenResponse>>() {});
        return response != null ? response.getData() : null;
    }

    public void logout(String refreshToken) {
        var body = Map.of("refreshToken", refreshToken);
        restClient.post()
                .uri("/api/v1/identity/logout")
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }
}
