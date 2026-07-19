package com.simplestore.inventory.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.common.dto.PagedResult;
import com.simplestore.inventory.domain.StockReservation;
import com.simplestore.inventory.dto.InventoryStatsDto;
import com.simplestore.inventory.dto.StockLevelDto;
import com.simplestore.inventory.dto.UpdateStockRequest;
import com.simplestore.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Inventory", description = "Stock management and reservations")
@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class InventoryController {

    private final InventoryService inventoryService;

    @Operation(summary = "List stock levels", description = "Returns paginated stock levels for all products (admin only)")
    @GetMapping("/stock-levels")
    public ResponseEntity<ApiResponse<PagedResult<StockLevelDto>>> getStockLevels(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getStockLevels(page, pageSize)));
    }

    @Operation(summary = "Count stock entries", description = "Returns total number of products tracked in inventory")
    @GetMapping("/stock-levels/count")
    public ResponseEntity<ApiResponse<Long>> getStockCount() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getStockCount()));
    }

    @Operation(summary = "Get stock level", description = "Returns the current stock level for a specific product")
    @GetMapping("/stock-levels/{productId}")
    public ResponseEntity<ApiResponse<StockLevelDto>> getStockLevel(@PathVariable int productId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getStockLevel(productId)));
    }

    @Operation(summary = "Update stock level", description = "Manually updates stock level for a product (admin only)")
    @PutMapping("/stock-levels/{productId}")
    public ResponseEntity<ApiResponse<StockLevelDto>> updateStockLevel(
            @PathVariable int productId,
            @Valid @RequestBody UpdateStockRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Stock level updated", inventoryService.updateStockLevel(productId, request.stockLevel())));
    }

    @Operation(summary = "List reservations", description = "Returns all stock reservations (admin only)")
    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<List<StockReservation>>> getReservations() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getReservations()));
    }

    @Operation(summary = "Get inventory stats", description = "Returns aggregate inventory statistics (admin only)")
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<InventoryStatsDto>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getInventoryStats()));
    }
}
