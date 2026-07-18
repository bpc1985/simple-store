package com.simplestore.cart.controller;

import com.simplestore.cart.model.Cart;
import com.simplestore.cart.service.CartService;
import com.simplestore.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Cart", description = "Shopping cart management")
@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    private String resolveOwner(Map<String, String> headers, Jwt jwt) {
        if (jwt != null && jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }
        String cartId = headers.get("x-cart-id");
        if (cartId != null && !cartId.isBlank()) {
            return "anon:" + cartId;
        }
        return "anon:" + UUID.randomUUID().toString();
    }

    @Operation(summary = "Get cart", description = "Returns the current cart (authenticated via JWT or anonymous via X-Cart-Id header)")
    @GetMapping
    public ResponseEntity<ApiResponse<Cart>> getCart(
            @RequestHeader Map<String, String> headers,
            @RequestParam(required = false) String owner,
            @AuthenticationPrincipal Jwt jwt) {
        String resolved = (owner != null) ? owner : resolveOwner(headers, jwt);
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCart(resolved)));
    }

    @Operation(summary = "Add item", description = "Adds an item to the cart")
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<Cart>> addItem(
            @RequestHeader Map<String, String> headers,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt jwt) {
        String owner = resolveOwner(headers, jwt);
        Object productIdObj = body.get("productId");
        if (productIdObj == null) {
            throw new IllegalArgumentException("productId is required");
        }
        Long productId = ((Number) productIdObj).longValue();
        String productName = (String) body.getOrDefault("productName", "Product #" + productId);
        Object priceObj = body.getOrDefault("price", null);
        BigDecimal price = priceObj != null ? new BigDecimal(priceObj.toString()) : BigDecimal.ZERO;
        String imageUrl = (String) body.getOrDefault("imageUrl", null);
        int quantity = Math.max(1, ((Number) body.getOrDefault("quantity", 1)).intValue());

        Cart cart = cartService.addItem(owner, productId, productName, price, imageUrl, quantity);
        return ResponseEntity.ok(ApiResponse.ok("Item added to cart", cart));
    }

    @Operation(summary = "Update item quantity", description = "Updates the quantity of an item in the cart")
    @PutMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Cart>> updateItemQuantity(
            @RequestHeader Map<String, String> headers,
            @PathVariable Long productId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt jwt) {
        String owner = resolveOwner(headers, jwt);
        int quantity = ((Number) body.get("quantity")).intValue();
        Cart cart = cartService.updateItemQuantity(owner, productId, quantity);
        return ResponseEntity.ok(ApiResponse.ok("Item quantity updated", cart));
    }

    @Operation(summary = "Remove item", description = "Removes an item from the cart")
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Cart>> removeItem(
            @RequestHeader Map<String, String> headers,
            @PathVariable Long productId,
            @AuthenticationPrincipal Jwt jwt) {
        String owner = resolveOwner(headers, jwt);
        Cart cart = cartService.removeItem(owner, productId);
        return ResponseEntity.ok(ApiResponse.ok("Item removed from cart", cart));
    }

    @Operation(summary = "Clear cart", description = "Removes all items from the cart")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(@RequestHeader Map<String, String> headers,
                                                        @AuthenticationPrincipal Jwt jwt) {
        String owner = resolveOwner(headers, jwt);
        cartService.clearCart(owner);
        return ResponseEntity.ok(ApiResponse.ok("Cart cleared", null));
    }

    @Operation(summary = "Count cart items", description = "Returns the number of distinct items in the cart")
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Integer>> getCartCount(@RequestHeader Map<String, String> headers,
                                                              @AuthenticationPrincipal Jwt jwt) {
        String owner = resolveOwner(headers, jwt);
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCartCount(owner)));
    }

    @Operation(summary = "Get cart total", description = "Returns the total price of all items in the cart")
    @GetMapping("/total")
    public ResponseEntity<ApiResponse<BigDecimal>> getCartTotal(@RequestHeader Map<String, String> headers,
                                                                 @AuthenticationPrincipal Jwt jwt) {
        String owner = resolveOwner(headers, jwt);
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCartTotal(owner)));
    }

    @Operation(summary = "Merge carts", description = "Merges an anonymous cart into the authenticated user's cart")
    @PostMapping("/merge")
    public ResponseEntity<ApiResponse<Void>> mergeCart(
            @RequestHeader Map<String, String> headers,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        String anonymousCartId = body.get("anonymousCartId");
        String userCartId = resolveOwner(headers, jwt);
        cartService.mergeCart(anonymousCartId, userCartId);
        return ResponseEntity.ok(ApiResponse.ok("Carts merged", null));
    }
}
