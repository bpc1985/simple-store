package com.simplestore.cart.controller;

import com.simplestore.cart.model.Cart;
import com.simplestore.cart.service.CartService;
import com.simplestore.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    private String resolveOwner(Map<String, String> headers, String principalName) {
        if (principalName != null && !principalName.isBlank()) {
            return principalName;
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
            @RequestParam(required = false) String owner) {
        // owner param can be passed explicitly; otherwise derive from headers/auth
        String resolved = (owner != null) ? owner : resolveOwner(headers, null);
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCart(resolved)));
    }

    @Operation(summary = "Add item", description = "Adds an item to the cart")
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<Cart>> addItem(
            @RequestHeader Map<String, String> headers,
            @RequestBody Map<String, Object> body) {
        String owner = resolveOwner(headers, null);
        Long productId = ((Number) body.get("productId")).longValue();
        String productName = (String) body.get("productName");
        BigDecimal price = new BigDecimal(body.get("price").toString());
        String imageUrl = (String) body.getOrDefault("imageUrl", null);
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();

        Cart cart = cartService.addItem(owner, productId, productName, price, imageUrl, quantity);
        return ResponseEntity.ok(ApiResponse.ok("Item added to cart", cart));
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Cart>> updateItemQuantity(
            @RequestHeader Map<String, String> headers,
            @PathVariable Long productId,
            @RequestBody Map<String, Object> body) {
        String owner = resolveOwner(headers, null);
        int quantity = ((Number) body.get("quantity")).intValue();
        Cart cart = cartService.updateItemQuantity(owner, productId, quantity);
        return ResponseEntity.ok(ApiResponse.ok("Item quantity updated", cart));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Cart>> removeItem(
            @RequestHeader Map<String, String> headers,
            @PathVariable Long productId) {
        String owner = resolveOwner(headers, null);
        Cart cart = cartService.removeItem(owner, productId);
        return ResponseEntity.ok(ApiResponse.ok("Item removed from cart", cart));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(@RequestHeader Map<String, String> headers) {
        String owner = resolveOwner(headers, null);
        cartService.clearCart(owner);
        return ResponseEntity.ok(ApiResponse.ok("Cart cleared", null));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Integer>> getCartCount(@RequestHeader Map<String, String> headers) {
        String owner = resolveOwner(headers, null);
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCartCount(owner)));
    }

    @GetMapping("/total")
    public ResponseEntity<ApiResponse<BigDecimal>> getCartTotal(@RequestHeader Map<String, String> headers) {
        String owner = resolveOwner(headers, null);
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCartTotal(owner)));
    }

    @PostMapping("/merge")
    public ResponseEntity<ApiResponse<Void>> mergeCart(
            @RequestHeader Map<String, String> headers,
            @RequestBody Map<String, String> body) {
        String anonymousCartId = body.get("anonymousCartId");
        String userCartId = resolveOwner(headers, null);
        cartService.mergeCart(anonymousCartId, userCartId);
        return ResponseEntity.ok(ApiResponse.ok("Carts merged", null));
    }
}
