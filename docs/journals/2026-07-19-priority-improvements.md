# Priority Improvements Shipped Across Backend, Frontend, and Infra

**Date**: 2026-07-19 12:23
**Severity**: Medium
**Component**: SimpleStore (Spring Boot microservices + Next.js frontend + Docker infra)
**Status**: Resolved (with documented debt)

## What Happened

A 17-phase priority plan was executed and merged in commit `04ac28c5` — 85 files changed, +937 / −2723. The net deletion is a good sign: we removed more than we added. Work was triaged P0→P3. Two rounds of self-review caught seven defects before they reached production.

## The Brutal Truth

The relief is real but tempered. We cleaned house on a reference project that had *zero tests*, so every "fix" is verified only by reading and reasoning — not by a single green test. Shipping 937 insertions of hardening onto a codebase with no safety net is the kind of thing that feels great until the 3am page. The deletions (2723 lines, 24 duplicated shadcn components, dead config) are the genuinely valuable part. The new code is mostly necessary, but unproven.

## Technical Details

**P0 fixes**
- 7 `GlobalExceptionHandler`s now return structured JSON (`{"status":...,"message":...,"timestamp":...}`). Note: handlers string-match exception class names — brittle, will silently miss renamed exceptions.
- 15 `streamBridge.send()` calls wrapped in `TransactionSynchronizationManager.registerSynchronization(afterCommit)` — fixes ghost-event-on-rollback. Previously events could fire inside `@Transactional` and vanish on rollback.
- cart-service `JwtAuthConverter` finally wired for role extraction (was silently ignoring `roles` claim).

**P1 hardening**
- `@Valid` on all mutation endpoints; cart DTO `productId` is now `Long`, not `String` (the old `String` threw `NumberFormatException` on bad input — caught in review).
- CORS: wildcard `*` + `allowCredentials` (illegal combo) → explicit `localhost:9090/9091` origins.
- GitHub Actions CI: backend `mvn` + frontend `turbo typecheck` + `build`.
- Gateway auth rate limiting via Redis: login 5/s, register 3/s.
- Stripe SDK + `StripeConfig` gated by `@ConditionalOnProperty` + `StripeCustomerService` + `stripeCustomerId` column.

**P2 quality**
- `@EntityGraph` on Product/Order repos; plan LAZY fetch; `countByStockLevelLessThan` aggregate (no `findAll()`+stream).
- 24 duplicated shadcn components deleted — apps import from `@simplestore/ui`.
- Admin: error states + retry on 6 pages; timeout + network error handling in api client.
- Docker: `restart: unless-stopped`, 512M/0.5 CPU limits, redis/rabbitmq named volumes.

**P3 cleanup**
- Flyway per-service with `baseline-on-migrate`, 7 migration dirs.
- Refresh token moved to httpOnly cookie (`SameSite=Lax`); access token in-memory Bearer only — no auth token in `localStorage`. Admin `AuthProvider` gained `/me` on mount + refresh interceptor (lost session on refresh before this).
- `BoxAssemblyRequestedEvent` wired: published in `SubscriptionService`, log-only consumers in order + inventory.
- Magic numbers → `@Value`; dead `@EnableMethodSecurity` comment removed; `orderId=0` documented.

**Review-caught fixes (7)**
- missing `spring-boot-starter-validation` in cart-service
- `AddCartItemRequest.productId` String→Long
- scheduler `findByStatusAndNextBillingDateBefore` missing `@EntityGraph`
- payment-service Flyway config indented under `payment:` not `spring:` (won't apply)
- scheduler advisory lock spanned multiple DB sessions → collapsed into single `@Transactional`
- admin `AuthProvider` no session recovery on refresh
- gateway `docker-compose.yml` missing `REDIS_HOST`

## Root Cause Analysis

Most defects were the classic "reference project never hardened" set: validation not on classpath, DTO types wrong at the boundary, CORS misconfigured, infra env var missing. The Flyway indent bug is pure YAML-fatigue — a config key in the wrong nesting, invisible until runtime. The advisory-lock-across-sessions bug is the dangerous one: it would have allowed duplicate billing cycles under load. The auth model change (httpOnly cookie + in-memory token) is the right call and finally kills the localStorage-token antipattern.

## Lessons Learned

- Deletion is the highest-leverage work. 24 duplicated component files were pure drag.
- `@ConditionalOnProperty` for Stripe is correct — keeps the feature off until keys exist. Copy this pattern for any external integration.
- Two review passes caught 7 issues a single pass missed. Cheap insurance on a no-test codebase.
- Config indentation bugs survive every build. YAML needs a schema check or a smoke test.

## Unresolved Debt (be honest)

1. **Zero tests.** Nothing in this commit is covered. The entire hardening layer is trust-me.
2. **Flyway + `ddl-auto: update` coexist.** Migrations run but Hibernate still auto-mutates schema — they will drift. Pick one.
3. **CORS origins hardcoded** to localhost:9090/9091. Breaks on any new deploy host; needs env-driven origins.
4. **Exception handlers string-match** class names — rename an exception and the handler goes silent.
5. **`BoxAssemblyRequestedEvent` is log-only** in order/inventory — the box-assembly flow is still unwired.

## Next Steps

- Owner: team. Add at least smoke tests for the saga + subscription billing before claiming "hardened."
- Flip `ddl-auto` to `validate` once Flyway owns schema, or drop Flyway — having both is worse than either.
- Move CORS origins to `@Value` / env.
- Wire real `BoxAssemblyRequestedEvent` consumers or delete the event.
