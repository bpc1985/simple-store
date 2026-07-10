package com.simplestore.order.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.common.dto.PagedResult;
import com.simplestore.order.dto.*;
import com.simplestore.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Orders", description = "Order creation and management")
@RestController
@RequestMapping("/api/v1/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    private String getUserId(Jwt jwt) {
        return jwt != null ? jwt.getSubject() : "anonymous";
    }

    // ── User endpoints ─────────────────────────────────────────────────────

    @Operation(summary = "Get my orders", description = "Returns the authenticated user's order history")
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<OrderDto>>> getMyOrders(@AuthenticationPrincipal Jwt jwt) {
        String userId = getUserId(jwt);
        return ResponseEntity.ok(ApiResponse.ok(orderService.getMyOrders(userId)));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<OrderDto>> getMyOrderById(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        String userId = getUserId(jwt);
        return ResponseEntity.ok(ApiResponse.ok(orderService.getMyOrderById(id, userId)));
    }

    @Operation(summary = "Create order", description = "Creates a new order from cart items and initiates checkout saga")
    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<OrderDto>> createOrder(@AuthenticationPrincipal Jwt jwt,
                                                              @RequestBody CreateOrderRequest request) {
        String userId = getUserId(jwt);
        OrderDto order = orderService.createOrder(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Order created", order));
    }

    // ── Admin endpoints ─────────────────────────────────────────────────────

    @GetMapping("/admin/orders")
    public ResponseEntity<ApiResponse<PagedResult<OrderDto>>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrders(page, pageSize)));
    }

    @GetMapping("/admin/orders/count")
    public ResponseEntity<ApiResponse<Long>> getOrderCount() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrderCount()));
    }

    @GetMapping("/admin/orders/{id}")
    public ResponseEntity<ApiResponse<OrderDto>> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrderById(id)));
    }

    @PatchMapping("/admin/orders/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(@PathVariable Long id,
                                                           @RequestBody UpdateOrderStatusRequest request) {
        boolean updated = orderService.updateStatus(id, request.status());
        if (!updated) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Order not found"));
        return ResponseEntity.ok(ApiResponse.ok("Order status updated", null));
    }

    @GetMapping("/admin/orders/stats")
    public ResponseEntity<ApiResponse<OrderStatsDto>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getStats()));
    }

    @GetMapping("/admin/orders/counts-by-user")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getOrderCountsByUser() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrderCountsByUser()));
    }
}
