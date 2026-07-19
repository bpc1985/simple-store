---
title: "Priority Improvements — Backend, Frontend, Infra"
description: "Address 21 audit findings: exception handlers, event publishing, auth, validation, CORS, CI/CD, rate limiting, Stripe, N+1, UI cleanup, Docker, migrations, cookie auth"
status: completed
priority: P2
branch: "main"
tags: ["audit", "fixes", "quality"]
blockedBy: []
blocks: []
created: "2026-07-18T15:52:43.465Z"
createdBy: "ck:plan"
source: skill
---

# Priority Improvements — Backend, Frontend, Infra

## Overview

Comprehensive 4-scout audit (backend, frontend, infra, architecture gaps) surfaced 21 findings across the SimpleStore codebase. This plan packages them into 17 ordered phases — fixes first (P0), hardening second (P1), quality-of-life third (P2), cleanup last (P3).

### Critical context from audit

- **Event publishing broken** — catalog, inventory, checkout, subscription-scheduler publish `streamBridge.send()` inside `@Transactional` without `afterCommit` (15 violations total: catalog=1, checkout=6, inventory=7, subscription-scheduler=1). subscription-service's `SubscriptionService` already uses afterCommit correctly. Order and payment use `afterCommit` correctly.
- **No global exception handlers** — only identity-service has `@RestControllerAdvice`. 7 services throw raw `RuntimeException`.
- **cart-service has no JwtAuthConverter** — all routes `permitAll()`. No role extraction from tokens.
- **CORS broken** — `allowCredentials(true)` + wildcard origin = browsers reject requests.
- **Zero tests, zero CI/CD, no restart policies** — production safety gaps.
- **Stripe plan exists, 0% implemented** — payment-service is mock wallet only.
- **13 more findings** in input validation, N+1 queries, frontend error states, duplicated UI components, missing flyway, magic numbers.

## Architecture Constraints

- Gateway is the only public entry point
- Event-driven saga via RabbitMQ — `afterCommit` publish is mandatory
- HMAC-SHA256 JWT, shared secret across all services
- Shared PostgreSQL, no cross-service FK
- No new libraries unless existing dep covers edge case poorly

## Phases

| Phase | Name | Status | Priority | Depends |
|-------|------|--------|----------|---------|
| 1 | [Fix Global Exception Handlers](./phase-01-fix-global-exception-handlers.md) | Completed | P0 | — |
| 2 | [Fix Event Publishing (afterCommit)](./phase-02-fix-event-publishing-aftercommit.md) | Completed | P0 | — |
| 3 | [Fix cart-service JWT Auth](./phase-03-fix-cart-service-jwt-auth.md) | Completed | P0 | — |
| 4 | [Fix Input Validation (@Valid)](./phase-04-fix-input-validation-valid.md) | Completed | P1 | — |
| 5 | [Fix CORS Configuration](./phase-05-fix-cors-configuration.md) | Completed | P1 | — |
| 6 | [Add CI/CD Pipeline](./phase-06-add-ci-cd-pipeline.md) | Completed | P1 | — |
| 7 | [Add Rate Limiting](./phase-07-add-rate-limiting.md) | Completed | P1 | — |
| 8 | [Stripe Phase 1 (SDK Config + Customer API)](./phase-08-stripe-phase-1-sdk-config.md) | Completed | P1 | — |
| 9 | [Fix N+1 Queries](./phase-09-fix-n-1-queries.md) | Completed | P2 | — |
| 10 | [Cleanup Duplicated UI Components](./phase-10-cleanup-duplicated-ui-components.md) | Completed | P2 | — |
| 11 | [Add Admin Error States](./phase-11-add-admin-error-states.md) | Completed | P2 | — |
| 12 | [Add Admin API Timeout & Error Handling](./phase-12-add-admin-api-timeout-error-handling.md) | Completed | P2 | — |
| 13 | [Add Docker Restart Policies & Resource Limits](./phase-13-add-docker-restart-policies-resource-limits.md) | Completed | P2 | — |
| 14 | [Flyway Database Migrations](./phase-14-flyway-database-migrations.md) | Completed | P3 | — |
| 15 | [httpOnly Cookie JWT Storage](./phase-15-httponly-cookie-jwt-storage.md) | Completed | P3 | — |
| 16 | [Wire BoxAssemblyRequestedEvent](./phase-16-wire-boxassemblyrequestedevent.md) | Completed | P3 | Phase 2 |
| 17 | [Late Cleanup](./phase-17-late-cleanup-stale-dirs-magic-numbers-dead-comments.md) | Completed | P3 | — |

## Dependencies

- Phase 16 depends on Phase 2 — must fix afterCommit publishing before adding new event publisher
- All other phases are independent and can run in any order
- Phase 8 (Stripe) aligns with the existing `plans/260718-1948-stripe-payment-integration/` plan; this phase covers only Phase 1 of that 9-phase plan

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phase 2 breaks event ordering | Low | High | Status-guard idempotency on all saga handlers. afterCommit only shifts timing — consumers already tolerate late/duplicate events |
| CORS fix blocks frontend | Low | Medium | Use explicit origins (localhost:9090,9091) not wildcard |
| Rate limiter false-positives in dev | Low | Low | Env var to disable or raise thresholds |
| Flyway conflicts with existing `ddl-auto: update` | Medium | High | Baseline existing schema; disable `ddl-auto` or set to `validate` |
| Stripe SDK breaks internal wallet mode | Low | High | `payment.provider` enum with `internal` default |

## Verification

- `mvn clean install -DskipTests` after each backend phase
- `cd frontend && npx turbo typecheck && npx turbo build` after each frontend phase
- `docker compose up --build -d` after Docker changes
- Smoke test affected flows manually

## Open Questions

1. CI/CD provider — GitHub Actions or GitLab CI? Default: GitHub Actions.
2. Rate limiter — ~~Bucket4j (in-memory)~~ **Resolved: Redis-backed** (persists across gateway restarts).
3. Flyway organization — ~~Default: per-service~~ **Resolved: per-service migrations** (clean boundaries, matches service ownership).
4. httpOnly cookie — ~~Default: identity-service~~ **Resolved: identity-service sets SameSite=Lax + Next.js proxy in dev** (same origin via rewrites).

## Validation Log

### Session 1 — 2026-07-18
**Trigger:** /ck:plan validate after plan creation
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Flyway: per-service or shared migration module for 7 services sharing one PostgreSQL DB?
   - Options: Per-service migrations | Shared migration module
   - **Answer:** Per-service migrations (Recommended)
   - **Rationale:** Clean boundaries, matches service table ownership. 7 configs but independent deploy safety.

2. **[Architecture]** Rate limiter: Bucket4j in-memory or Redis-backed?
   - Options: Bucket4j in-memory | Redis-backed
   - **Answer:** Redis-backed
   - **Rationale:** Survives gateway restart, standard Spring Cloud Gateway pattern. Extra Redis dep acceptable.

3. **[Scope]** httpOnly cookie strategy for cross-origin dev (frontend :9090, gateway :8080)?
   - Options: SameSite=Lax + Next.js proxy | Keep localStorage + CSP headers
   - **Answer:** SameSite=Lax + Next.js proxy (Recommended)
   - **Rationale:** Same-origin in dev via Next.js rewrites. No cross-origin cookie complexity. Production deploys same-origin anyway.

4. **[Scope]** BoxAssembly: read event fields now for concrete consumer or keep placeholder?
   - Options: Read event, plan concrete consumer | Keep placeholder
   - **Answer:** Read event, plan concrete consumer (Recommended)
   - **Rationale:** Event fields verified (5 fields: correlationId, subscriptionId, userId, planName, cycleNumber — all String/UUID not domain types). Phase 16 updated with real constructor.

#### Confirmed Decisions
- Flyway: per-service migration directories (Phase 14 unchanged — already specified per-service)
- Rate limiting: Redis-backed via Spring Cloud Gateway `RequestRateLimiter` (Phase 7 rewritten)
- Cookie auth: SameSite=Lax + Next.js rewrites for same-origin dev (Phase 15 updated)
- BoxAssembly: verified event fields, concrete consumer logic (Phase 16 updated)

#### Action Items
- [x] Phase 7: Rewritten from Bucket4j → Redis-backed RequestRateLimiter
- [x] Phase 15: Updated to SameSite=Lax + Next.js proxy pattern
- [x] Phase 16: Updated with actual event field names from BoxAssemblyRequestedEvent.java

#### Impact on Phases
- Phase 7: Architecture changed — adds `spring-boot-starter-data-redis-reactive` to gateway instead of Bucket4j
- Phase 15: Added Next.js `rewrites()` config step + SameSite=Lax cookies
- Phase 16: Event constructor fields corrected (subscriptionId/userId are String, no planId/paymentTransactionId)

### Verification Results
- **Tier:** Full (17 phases)
- **Claims checked:** 24
- **Verified:** 22 | **Failed:** 1 | **Unverified:** 1

#### Verified (sampled)
- cart-service SecurityConfig: no JwtAuthConverter, empty `.jwt(jwt -> {})` confirmed
- `@RestControllerAdvice`: only 1 in codebase (identity-service), 0 in catalog-service — confirming Phase 1 need
- `streamBridge.send` violation count: 15 (catalog=1, checkout=6, inventory=7, subscription-scheduler=1) — correct
- order-service + payment-service: afterCommit pattern verified on all event sends
- subscription-service SubscriptionService: already uses afterCommit (6 TransactionSynchronization usages) — not a violation pattern
- `@simplestore/ui` has 13 components as listed
- `BoxAssemblyRequestedEvent`: 5 fields (correlationId UUID, subscriptionId String, userId String, planName String, cycleNumber int)
- catalog-service has no GlobalExceptionHandler in config/ package

#### Failures
1. [Fact Checker] Plan said "13 violations" but verification found 15: catalog=1, checkout=6, inventory=7, subscription-scheduler=1. subscription-service's SubscriptionService already has afterCommit — excluded from count. **Fixed in plan.md.**

#### Unverified
1. [Flow Tracer] Exact field names from `SubscriptionPaymentSuccessEvent` and `SubscriptionConsumer.paymentSuccessConsumer()` not read during verification — Phase 16 code references `event.subscriptionId()` etc. which should be verified during implementation.

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01 through phase-17
- Decision deltas checked: 4 (rate limiter Redis, Flyway per-service, cookie SameSite=Lax, BoxAssembly field names)
- Reconciled stale references: 3 (plan.md violation count 13→15, Open Questions #2/#3/#4 resolved, Phase 7/15/16 code examples updated)
- Unresolved contradictions: 0

