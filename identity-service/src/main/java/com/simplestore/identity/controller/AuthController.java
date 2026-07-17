package com.simplestore.identity.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.identity.dto.LoginRequest;
import com.simplestore.identity.dto.RefreshRequest;
import com.simplestore.identity.dto.RegisterRequest;
import com.simplestore.identity.dto.TokenResponse;
import com.simplestore.identity.dto.UserDto;
import com.simplestore.identity.service.IdentityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/identity")
@Tag(name = "Authentication", description = "User registration, login, and token management")
public class AuthController {

    private final IdentityService identityService;

    public AuthController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @Operation(summary = "Register a new user", description = "Creates a new account and returns access + refresh tokens")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<TokenResponse>> register(@Valid @RequestBody RegisterRequest request) {
        TokenResponse tokens = identityService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registration successful", tokens));
    }

    @Operation(summary = "Login", description = "Authenticates with email/password and returns JWT tokens")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokens = identityService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", tokens));
    }

    @Operation(summary = "Refresh token", description = "Exchange a refresh token for a new access token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        TokenResponse tokens = identityService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed", tokens));
    }

    @Operation(summary = "Logout", description = "Revokes the provided refresh token")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody RefreshRequest request) {
        identityService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Logged out", null));
    }

    @Operation(summary = "Get current user", description = "Returns the authenticated user's profile info")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> me(Principal principal) {
        UserDto user = identityService.getUserInfo(principal.getName());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }
}
