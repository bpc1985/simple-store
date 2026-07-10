package com.simplestore.catalog.service;

import com.simplestore.catalog.dto.*;
import com.simplestore.catalog.model.Category;
import com.simplestore.catalog.model.Product;
import com.simplestore.catalog.repository.CategoryRepository;
import com.simplestore.catalog.repository.ProductRepository;
import com.simplestore.common.dto.PagedResult;
import com.simplestore.common.event.ProductUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final StreamBridge streamBridge;

    public enum DeleteCategoryResult { DELETED, NOT_FOUND, HAS_PRODUCTS }

    public PagedResult<ProductDto> getProducts(int page, int pageSize, Long categoryId, String search) {
        PageRequest pr = PageRequest.of(page, pageSize);
        Page<Product> pp;
        if (categoryId != null) pp = productRepository.findByCategoryId(categoryId, pr);
        else if (search != null && !search.isBlank()) pp = productRepository.findByNameContainingIgnoreCase(search, pr);
        else pp = productRepository.findAll(pr);
        var dtos = pp.getContent().stream().map(this::toProductDto).toList();
        PagedResult<ProductDto> result = new PagedResult<>();
        result.setItems(dtos);
        result.setPage(page);
        result.setPageSize(pageSize);
        result.setTotalCount(pp.getTotalElements());
        return result;
    }

    public ProductDto getProductById(Long id) {
        Product p = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found: " + id));
        return toProductDto(p);
    }

    public long getProductCount() { return productRepository.count(); }

    @Transactional
    public ProductDto createProduct(CreateProductRequest req) {
        Product p = Product.builder().name(req.name()).description(req.description())
                .price(req.price()).imageUrl(req.imageUrl()).stock(req.stock()).categoryId(req.categoryId()).build();
        p = productRepository.save(p);
        ProductDto dto = toProductDto(p);
        publishProductUpdatedEvent(p);
        log.info("Created product {} and published ProductUpdatedEvent", p.getId());
        return dto;
    }

    @Transactional
    public boolean updateProduct(Long id, UpdateProductRequest req) {
        Optional<Product> opt = productRepository.findById(id);
        if (opt.isEmpty()) return false;
        Product p = opt.get();
        if (req.name() != null) p.setName(req.name());
        if (req.description() != null) p.setDescription(req.description());
        if (req.price() != null) p.setPrice(req.price());
        if (req.imageUrl() != null) p.setImageUrl(req.imageUrl());
        if (req.stock() != null) p.setStock(req.stock());
        if (req.categoryId() != null) p.setCategoryId(req.categoryId());
        productRepository.save(p);
        publishProductUpdatedEvent(p);
        log.info("Updated product {} and published ProductUpdatedEvent", p.getId());
        return true;
    }

    @Transactional
    public boolean deleteProduct(Long id) {
        if (!productRepository.existsById(id)) return false;
        productRepository.deleteById(id);
        return true;
    }

    public PagedResult<CategoryDto> getCategories(int page, int pageSize) {
        PageRequest pr = PageRequest.of(page, pageSize);
        Page<Category> cp = categoryRepository.findAll(pr);
        var dtos = cp.getContent().stream().map(this::toCategoryDto).toList();
        PagedResult<CategoryDto> result = new PagedResult<>();
        result.setItems(dtos);
        result.setPage(page);
        result.setPageSize(pageSize);
        result.setTotalCount(cp.getTotalElements());
        return result;
    }

    public CategoryDto getCategoryById(Long id) {
        Category c = categoryRepository.findById(id).orElseThrow(() -> new RuntimeException("Category not found: " + id));
        return toCategoryDto(c);
    }

    public long getCategoryCount() { return categoryRepository.count(); }

    @Transactional
    public CategoryDto createCategory(CategoryDto dto) {
        Category c = Category.builder().name(dto.name()).description(dto.description()).build();
        c = categoryRepository.save(c);
        return toCategoryDto(c);
    }

    @Transactional
    public boolean updateCategory(Long id, CategoryDto dto) {
        Optional<Category> opt = categoryRepository.findById(id);
        if (opt.isEmpty()) return false;
        Category c = opt.get();
        if (dto.name() != null) c.setName(dto.name());
        if (dto.description() != null) c.setDescription(dto.description());
        categoryRepository.save(c);
        return true;
    }

    @Transactional
    public DeleteCategoryResult deleteCategory(Long id) {
        Optional<Category> opt = categoryRepository.findById(id);
        if (opt.isEmpty()) return DeleteCategoryResult.NOT_FOUND;
        if (productRepository.existsByCategoryId(id)) return DeleteCategoryResult.HAS_PRODUCTS;
        categoryRepository.deleteById(id);
        return DeleteCategoryResult.DELETED;
    }

    private ProductDto toProductDto(Product p) {
        String cn = p.getCategory() != null ? p.getCategory().getName() : null;
        return new ProductDto(p.getId(), p.getName(), p.getDescription(), p.getPrice(),
                p.getImageUrl(), p.getStock(), p.getCategoryId(), cn);
    }

    private CategoryDto toCategoryDto(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getDescription());
    }

    private void publishProductUpdatedEvent(Product p) {
        streamBridge.send("product-updated",
                new ProductUpdatedEvent(p.getId(), p.getName(), p.getDescription(),
                        p.getPrice(), p.getImageUrl(), p.getStock(), p.getCategoryId()));
    }
}

