# Priority Improvements — Final Status Report

**Plan:** `plans/260718-2250-priority-improvements/`
**Completed:** 2026-07-19 03:21 +07
**Phases:** 17/17 complete
**Build:** `mvn clean install -DskipTests` pass | `npx turbo typecheck` 4/4 pass

## Phase Summary

| # | Phase | Priority | Status |
|---|-------|----------|--------|
| 1 | Global Exception Handlers | P0 | Done — 7 handlers |
| 2 | Event Publishing afterCommit | P0 | Done — 15 fixes |
| 3 | cart-service JWT Auth | P0 | Done — JwtAuthConverter |
| 4 | Input Validation @Valid | P1 | Done — 7 services + cart DTOs |
| 5 | CORS Configuration | P1 | Done — explicit origins |
| 6 | CI/CD Pipeline | P1 | Done — GitHub Actions |
| 7 | Rate Limiting | P1 | Done — Redis-backed |
| 8 | Stripe Phase 1 | P1 | Done — SDK + Customer API |
| 9 | N+1 Queries | P2 | Done — @EntityGraph |
| 10 | UI Component Cleanup | P2 | Done — 24 files deleted |
| 11 | Admin Error States | P2 | Done — 6 pages |
| 12 | Admin API Timeout | P2 | Done — 10s + error msgs |
| 13 | Docker Policies | P2 | Done — restart + limits |
| 14 | Flyway Migrations | P3 | Done — per-service |
| 15 | httpOnly Cookie JWT | P3 | Done — refresh cookie only |
| 16 | BoxAssembly Event | P3 | Done — wired + consumers |
| 17 | Late Cleanup | P3 | Done — magic numbers + dead code |

## Key Architecture Decisions

- **Cookie strategy**: refresh token in httpOnly cookie (SameSite=Lax, 7 days). Access token in JSON response body → React in-memory state → Bearer header. No localStorage auth tokens.
- **Flyway**: per-service with `baseline-on-migrate: true`. ddl-auto stays `update` initially, switch to `validate` after first stable boot.
- **Rate limiting**: Redis-backed Spring Cloud Gateway `RequestRateLimiter` on auth endpoints (login 5/sec, register 3/sec).
- **Stripe**: `@ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")`. Default `internal` = no Stripe.

## Review Findings Fixed

- C1: `spring-boot-starter-validation` added to cart-service
- C2: `AddCartItemRequest.productId` changed from `String` to `Long`
- H1: `@EntityGraph` on scheduler `findByStatusAndNextBillingDateBefore`
- M1: `@EntityGraph` on `ProductRepository.findById`
- H2: Dead `@PreAuthorize` removed from `AdminUserController`
- M3: `cancelledEvent1`/`cancelledEvent2` renamed
- M4: `BoxAssemblyConsumer` uses `implements Consumer<T>` pattern
- Payment Flyway indentation fixed (was under `payment:` not `spring:`)
- Gateway Docker missing `REDIS_HOST: redis` added

## Known Debt (not fixed)

- String-matching exception handlers (contains("not found") → 404). Acceptable for v1 per plan.
- Flyway `ddl-auto: update` + `baseline-on-migrate` both active. Switch to `validate` after first boot.
- No tests exist in codebase (`-DskipTests` everywhere).
- CORS origins hardcoded (localhost ports). Should be env-driven per original plan.

## Unresolved

- Flyway `baseline-on-migrate: true` + empty `V1__baseline.sql` = Flyway records V1 without creating tables. JPA handles DDL. When first real V2 migration arrives, must verify Flyway won't try to create tables JPA already made.
