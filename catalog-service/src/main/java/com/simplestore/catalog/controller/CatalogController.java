package com.simplestore.catalog.controller;

import com.simplestore.catalog.dto.CategoryDto;
import com.simplestore.catalog.dto.CreateProductRequest;
import com.simplestore.catalog.dto.ProductDto;
import com.simplestore.catalog.dto.UpdateProductRequest;
import com.simplestore.catalog.service.CatalogService;
import com.simplestore.common.dto.ApiResponse;
import com.simplestore.common.dto.PagedResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog")
@RequiredArgsConstructor
@Tag(name = "Catalog", description = "Product and category management")
public class CatalogController {

    private final CatalogService catalogService;

    // ── Products ───────────────────────────────────────────────────────────────

    @Operation(summary = "List products", description = "Returns paginated products with optional category filter and search")
    @GetMapping("/products")
    public ResponseEntity<ApiResponse<PagedResult<ProductDto>>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getProducts(page, pageSize, categoryId, search)));
    }

    @GetMapping("/products/count")
    public ResponseEntity<ApiResponse<Long>> getProductCount() {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getProductCount()));
    }

    @Operation(summary = "Get product", description = "Returns a single product by ID")
    @GetMapping("/products/{id}")
    public ResponseEntity<ApiResponse<ProductDto>> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getProductById(id)));
    }

    @Operation(summary = "Create product", description = "Creates a new product (admin only)")
    @PostMapping("/products")
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductDto product = catalogService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Product created", product));
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<ApiResponse<Void>> updateProduct(@PathVariable Long id, @RequestBody UpdateProductRequest request) {
        boolean updated = catalogService.updateProduct(id, request);
        if (!updated) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Product not found"));
        return ResponseEntity.ok(ApiResponse.ok("Product updated", null));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        boolean deleted = catalogService.deleteProduct(id);
        if (!deleted) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Product not found"));
        return ResponseEntity.ok(ApiResponse.ok("Product deleted", null));
    }

    // ── Categories ─────────────────────────────────────────────────────────────

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<PagedResult<CategoryDto>>> getCategories(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getCategories(page, pageSize)));
    }

    @GetMapping("/categories/count")
    public ResponseEntity<ApiResponse<Long>> getCategoryCount() {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getCategoryCount()));
    }

    @GetMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<CategoryDto>> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getCategoryById(id)));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<CategoryDto>> createCategory(@RequestBody CategoryDto dto) {
        CategoryDto category = catalogService.createCategory(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Category created", category));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> updateCategory(@PathVariable Long id, @RequestBody CategoryDto dto) {
        boolean updated = catalogService.updateCategory(id, dto);
        if (!updated) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Category not found"));
        return ResponseEntity.ok(ApiResponse.ok("Category updated", null));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        CatalogService.DeleteCategoryResult result = catalogService.deleteCategory(id);
        return switch (result) {
            case NOT_FOUND -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Category not found"));
            case HAS_PRODUCTS -> ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error("Category has products"));
            case DELETED -> ResponseEntity.ok(ApiResponse.ok("Category deleted", null));
        };
    }
}
