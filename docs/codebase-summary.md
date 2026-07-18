# Codebase Summary

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21, Spring Boot 3.4, Spring Cloud 2024.0, Maven |
| Database | PostgreSQL 16, Redis 7 |
| Messaging | RabbitMQ 4, Spring Cloud Stream |
| Security | Spring Security, HMAC-SHA256 JWT |
| Observability | ELK (Elasticsearch, Logstash, Kibana, APM) |
| Container | Docker Compose |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, React Query, Turborepo |

## Module Map (Maven)

| Module | Type | DB | Port |
|--------|------|----|------|
| `common` | Shared lib (DTOs, events, JwtAuthConverter) | — | — |
| `gateway` | API Gateway (Spring Cloud Gateway, reactive) | — | 8080 |
| `identity-service` | Auth (JWT sign/verify, user CRUD) | PG | 8081 |
| `catalog-service` | Products + categories | PG | 8082 |
| `cart-service` | Shopping cart | Redis | 8083 |
| `order-service` | Order CRUD, stats | PG | 8084 |
| `inventory-service` | Stock (CQRS: reservations + entries) | PG | 8085 |
| `checkout-service` | Saga orchestrator (event-only, no HTTP) | PG | 8086 |
| `payment-service` | Payment accounts, transactions | PG | 8087 |
| `subscription-service` | Plans, customer subs, recurring billing | PG | 8088 |

## Frontend (npm workspaces)

| Package | Path | Description |
|---------|------|-------------|
| `storefront` | `frontend/apps/storefront/` | Customer SPA |
| `admin` | `frontend/apps/admin/` | Admin dashboard |
| `@simplestore/shared` | `frontend/packages/shared/` | Types, `cn()` utility |

## Key Patterns

- **Events**: Java records in `common/event/`. Published via `StreamBridge.send()` wrapped in `afterCommit`. Consumed via `Consumer<T>` beans. 16 events, all binding names verified consistent.
- **Entities**: Lombok `@Getter @Setter @Builder`. Money/concurrent entities use `@Version` (PaymentAccount, CheckoutSagaState, CustomerSubscription, SubscriptionCycle, StockEntry).
- **Paging**: `PagedResult.from(content, total, page, size, mapper)` factory in common.
- **Auth**: HMAC-SHA256 JWT. Gateway validates + backends re-validate (defense-in-depth). `JwtAuthConverter` in common. Refresh tokens SHA-256 hashed, rotated, revoked.
- **Saga**: Idempotent by status check. `@Transactional` on every handler. Persist-then-publish.
- **Stats**: Aggregate SQL queries (`countByStatus`, `@Query SUM/COUNT`) — never `findAll()` + Java streams.
- **Cart**: Redis hash per owner. Authenticated users resolved via `@AuthenticationPrincipal Jwt`. 30-day TTL.
- **Exception handling**: `@RestControllerAdvice` in identity-service maps `IllegalArgumentException` → 400, `UsernameNotFoundException` → 404.

## Build Commands

```bash
# Backend (from repo root)
mvn clean install -DskipTests              # full build
mvn -pl <module> -am clean install -DskipTests  # single module + deps
docker compose up --build -d               # run everything

# Frontend (from frontend/)
cd frontend && npm install && npx turbo typecheck && npx turbo build
```
