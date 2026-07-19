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
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
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
    public ResponseEntity<ApiResponse<TokenResponse>> register(@Valid @RequestBody RegisterRequest request,
                                                                HttpServletResponse response) {
        TokenResponse tokens = identityService.register(request);
        addRefreshTokenCookie(response, tokens.getRefreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registration successful", tokens));
    }

    @Operation(summary = "Login", description = "Authenticates with email/password and returns JWT tokens")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request,
                                                             HttpServletResponse response) {
        TokenResponse tokens = identityService.login(request);
        addRefreshTokenCookie(response, tokens.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Login successful", tokens));
    }

    @Operation(summary = "Refresh token", description = "Exchange a refresh token for a new access token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@RequestBody RefreshRequest request,
                                                               HttpServletResponse response,
                                                               @CookieValue(value = "refreshToken", required = false) Cookie refreshCookie) {
        String refreshToken = refreshCookie != null ? refreshCookie.getValue() : request.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Refresh token is required"));
        }
        TokenResponse tokens = identityService.refresh(refreshToken);
        addRefreshTokenCookie(response, tokens.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed", tokens));
    }

    @Operation(summary = "Logout", description = "Revokes the provided refresh token")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody RefreshRequest request,
                                                     HttpServletResponse response,
                                                     @CookieValue(value = "refreshToken", required = false) Cookie refreshCookie) {
        String refreshToken = refreshCookie != null ? refreshCookie.getValue() : request.getRefreshToken();
        if (refreshToken != null && !refreshToken.isBlank()) {
            identityService.logout(refreshToken);
        }
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.ok("Logged out", null));
    }

    @Operation(summary = "Get current user", description = "Returns the authenticated user's profile info")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> me(Principal principal) {
        UserDto user = identityService.getUserInfo(principal.getName());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("refreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // ponytail: false for local dev, set true in production
        cookie.setPath("/api/v1/identity");
        cookie.setMaxAge(7 * 24 * 3600); // 7 days, matches JWT refresh expiry
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie refresh = new Cookie("refreshToken", "");
        refresh.setHttpOnly(true);
        refresh.setSecure(false);
        refresh.setPath("/api/v1/identity");
        refresh.setMaxAge(0);
        refresh.setAttribute("SameSite", "Lax");
        response.addCookie(refresh);
    }
}
