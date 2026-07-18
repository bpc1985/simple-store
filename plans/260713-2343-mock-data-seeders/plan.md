---
phase: 0
title: "Mock Data Seeders"
status: completed
priority: P1
effort: "3h"
---

# Plan: Mock Data for All Services

## Context

3 services have seeders (Catalog, Inventory, Payment). 2 are missing (Identity, Order). Identity model hardcodes `ROLE_USER` for all users — admin role impossible. Payment seeder uses string IDs (`"user1"`, `"admin"`) that don't match identity UUIDs.

## Current state

| Service | Seeder | Issue |
|---------|--------|-------|
| Catalog | Yes | 4 categories, 10 products — works |
| Inventory | Yes | 10 stock entries for products 1-10 — works |
| Payment | Yes | Uses hardcoded `"user1"`/`"admin"` IDs — wrong format |
| Identity | **None** | README claims seed users exist — they don't. Model lacks roles field. |
| Order | **None** | No sample orders |
| Cart | N/A | Redis, ephemeral |
| Checkout | N/A | Event-only, no HTTP |
| Gateway/Web | N/A | No database |

## Fixes needed (2 phases)

### Phase 1: Identity — roles + seeder

**1a. Add roles to ApplicationUser**

Add `roles` field to `ApplicationUser`. Update `getAuthorities()` to read from it instead of hardcoding `ROLE_USER`.

```java
@ElementCollection(fetch = FetchType.EAGER)
@CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
@Column(name = "role")
@Builder.Default
private List<String> roles = List.of("ROLE_USER");

@Override
public Collection<? extends GrantedAuthority> getAuthorities() {
    return roles.stream().map(SimpleGrantedAuthority::new).toList();
}
```

**1b. Create IdentitySeeder**

`CommandLineRunner`, idempotent (skip if users exist). Seeds 4 users with well-known UUIDs for cross-service reference:

| Email | Password | Roles | UUID |
|-------|----------|-------|------|
| `admin@store.com` | `Admin123!` | ROLE_ADMIN, ROLE_USER | `00...01` |
| `user1@store.com` | `User123!` | ROLE_USER | `00...02` |
| `user2@store.com` | `User123!` | ROLE_USER | `00...03` |
| `user3@store.com` | `User123!` | ROLE_USER | `00...04` |

### Phase 2: Order seeder + Payment fix

**2a. Create OrderSeeder**

`CommandLineRunner`, idempotent. 5 orders with items referencing catalog product IDs 1-10 and identity user UUIDs:

- 2 orders for user1 (PENDING, CONFIRMED)
- 2 orders for user2 (PENDING, CANCELLED)
- 1 order for user3 (PENDING)

**2b. Fix PaymentSeeder userIds**

Replace `"user1"`, `"user2"`, `"admin"` with well-known UUIDs matching IdentitySeeder.

## Files to change

| File | Action |
|------|--------|
| `identity-service/.../model/ApplicationUser.java` | Add roles field, update getAuthorities() |
| `identity-service/.../IdentitySeeder.java` | **NEW** — 4 users |
| `order-service/.../OrderSeeder.java` | **NEW** — 5 orders |
| `payment-service/.../PaymentSeeder.java` | Fix userIds to UUIDs |

## Verify

```bash
mvn clean install -DskipTests
docker compose down -v && docker compose up --build -d
# Login as admin
curl -X POST http://localhost:8080/api/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@store.com","password":"Admin123!"}'
# List products (10 products seeded)
curl http://localhost:8080/api/v1/catalog/products
```

## Risk

| Risk | Mitigation |
|------|-----------|
| Roles field changes break existing JWT | Default `ROLE_USER` — backward compatible |
| Order items ref non-existent products | Catalog seeder runs first, products 1-10 exist |
| Payment user IDs wrong format | Well-known UUIDs match identity seeder exactly |
