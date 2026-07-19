---
phase: 9
title: "Fix N+1 Queries"
status: pending
priority: P2
dependencies: []
effort: "1h"
---

# Phase 9: Fix N+1 Queries

## Overview

Fix N+1 query issues in catalog-service (product categories) and order-service (order items). Change EAGER fetch on `CustomerSubscription.plan` to LAZY. Add aggregate query for inventory low-stock count.

## Requirements

- Functional: Same behavior, fewer queries
- Non-functional: Product listing uses 1 query (not 1+N), order listing uses 1 query (not 1+N)

## Related Code Files

- **Modify**: `catalog-service/.../repository/ProductRepository.java` — add `@EntityGraph` query
- **Modify**: `catalog-service/.../service/CatalogService.java` — use new query
- **Modify**: `order-service/.../repository/OrderRepository.java` — add `@EntityGraph` query
- **Modify**: `order-service/.../service/OrderService.java` — use new query
- **Modify**: `subscription-service/.../domain/CustomerSubscription.java` — EAGER → LAZY
- **Modify**: `subscription-service/.../repository/SubscriptionRepository.java` — add JOIN FETCH where needed
- **Modify**: `inventory-service/.../service/InventoryService.java` — replace full-table scan
- **Modify**: `inventory-service/.../repository/StockEntryRepository.java` — add count query

## Implementation Steps

### 1. catalog-service — JOIN FETCH categories

```java
// ProductRepository.java
@EntityGraph(attributePaths = {"category"})
Page<Product> findAll(Pageable pageable);  // override default

// Or use @Query:
@Query("SELECT p FROM Product p JOIN FETCH p.category")
Page<Product> findAllWithCategory(Pageable pageable);
```

### 2. order-service — JOIN FETCH items

```java
// OrderRepository.java
@EntityGraph(attributePaths = {"items"})
List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

@EntityGraph(attributePaths = {"items"})
Optional<Order> findById(UUID id);
```

### 3. subscription-service — EAGER → LAZY

```java
// CustomerSubscription.java
@ManyToOne(fetch = FetchType.LAZY)  // was EAGER
private SubscriptionPlan plan;
```

Add `@EntityGraph(attributePaths = {"plan"})` to queries that need plan data (e.g., `findByUserId`).

### 4. inventory-service — aggregate low-stock query

```java
// StockEntryRepository.java — replace findAll() + stream filter
@Query("SELECT COUNT(s) FROM StockEntry s WHERE s.stockLevel < :threshold")
long countByStockLevelLessThan(@Param("threshold") int threshold);
```

```java
// InventoryService.java
long lowStockCount = stockEntryRepository.countByStockLevelLessThan(10);
```

## Success Criteria

- [ ] Product listing: 1 query for products + categories (was 1 + N)
- [ ] Order listing: 1 query for orders + items (was 1 + N)
- [ ] `CustomerSubscription.plan` is LAZY
- [ ] `countByStockLevelLessThan` uses SQL COUNT, not in-memory stream
- [ ] `mvn clean install -DskipTests` passes
- [ ] No behavior changes (same data returned, same API contracts)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| JOIN FETCH with pagination requires count query | Hibernate handles when using `@EntityGraph` on Spring Data `Page` methods. Fallback: separate count query |
| EAGER→LAZY breaks existing callers | All plan access goes through `toDto()` which triggers LAZY load inside transaction (Phase 1 ensures `@Transactional` on service methods) |
