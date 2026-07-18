# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SimpleStore — Spring Boot 3.4 microservices e-commerce reference architecture (Java 21), ported from a .NET project. Maven multi-module: 1 shared lib + 1 gateway + 8 backend services. Backed by PostgreSQL, Redis, RabbitMQ, and an ELK observability stack, all via Docker Compose.

## Commands

All Maven commands run from repo root.

```bash
# Build every module (parent pom drives the reactor)
mvn clean install -DskipTests

# Build a single module (+ its dependency, common)
mvn -pl catalog-service -am clean install -DskipTests

# Run a service locally against Dockerized infra (infra must be up first)
docker compose up -d postgres redis rabbitmq
mvn -pl <module> spring-boot:run        # e.g. catalog-service

# Run everything via Docker
mvn clean install -DskipTests
docker compose up --build -d             # --build is REQUIRED to pick up new JARs
docker compose ps                        # status
docker compose logs -f <service>         # tail one service
docker compose down -v                   # stop + wipe volumes (resets DBs)

# Reset a flaky environment
docker compose down -v && docker compose up --build -d
```

### Running single modules

Each backend service is a standard `spring-boot:run` app. Module names (Maven artifact dirs): `common`, `gateway`, `identity-service`, `catalog-service`, `cart-service`, `order-service`, `inventory-service`, `checkout-service`, `payment-service`, `subscription-service`.

### Tests

**No test sources exist** — `src/test` is empty across all 10 modules. This is a reference/demo project. When adding tests, follow Spring Boot conventions (`@SpringBootTest`, Testcontainers from the parent POM's `testcontainers.version`). Run with `mvn test` or `mvn -pl <module> test`.

## Ports and access

| Service | Container port | Host port | DB |
|---------|----|----|----|
| gateway | 8080 | 8080 | — |
| identity-service | 8080 | 8081 | PostgreSQL |
| catalog-service | 8080 | 8082 | PostgreSQL |
| cart-service | 8080 | 8083 | Redis |
| order-service | 8080 | 8084 | PostgreSQL |
| inventory-service | 8080 | 8085 | PostgreSQL |
| checkout-service | 8080 | 8086 | PostgreSQL |
| payment-service | 8080 | 8087 | PostgreSQL |
| subscription-service | 8080 | 8088 | PostgreSQL |

In Docker, every service listens on container port 8080 and is mapped to a unique host port. Locally (`spring-boot:run`), the service's own `application.yml` sets `server.port` to its host port (e.g. catalog=8082, checkout=8083). **Note:** checkout-service's `application.yml` says `server.port: 8083` but README maps it to 8086 — in Docker the compose port mapping wins; locally it boots on 8083. Check the service's yml before assuming a port.

Swagger UI per service (via gateway): `http://localhost:8080/api/v1/<service>/swagger-ui.html`. Each service's yml sets `springdoc.swagger-ui.path` prefixed with its gateway route.

Kibana (logs/traces/metrics): `http://localhost:5601`. RabbitMQ mgmt UI: `http://localhost:15672` (`simplestore`/`simplestore`).

Seeded users: admin `admin@store.com` / `Admin123!`, user1 `user1@store.com` / `User123!`, user2 `user2@store.com` / `User123!`, user3 `user3@store.com` / `User123!`.

## Architecture

### Request path — gateway is the only public API entry

```
Client → gateway (8080, Spring Cloud Gateway, validates JWT)
       → backend service (catalog/order/cart/inventory/payment/identity/subscription)
```

### Gateway routes + auth

Routes are static, defined in `gateway/src/main/resources/application.yml` as `Path=/api/v1/<service>/**` → `http://<service>:8080` (Docker DNS). No service discovery. `SecurityConfig` (reactive/WebFlux) marks these public: `identity/register|login|refresh`, `GET catalog/products|categories`, `cart/**`. Everything else requires a valid JWT.

### Auth — shared-secret HMAC JWT, not OAuth2 JWK

This is the most common source of confusion: the gateway and backend services have `spring.security.oauth2.resourceserver.jwt.issuer-uri` / `jwk-set-uri` in their yml, but **the actual validation uses a symmetric HMAC-SHA256 secret**, not a JWK set. `issuer-uri`/`jwk-set-uri` point at `http://identity-service:8080/.well-known/jwks.json`, an endpoint that does not exist — that config is inert boilerplate.

How it really works:
- `identity-service/JwtService` signs tokens with `io.jsonwebtoken` (JJWT) using `Keys.hmacShaKeyFor(Base64-decoded JWT_SECRET)`. Access token claims: `sub`=userId, `roles`=list. Refresh token: `sub`=userId, `type`=`refresh`.
- The same `JWT_SECRET` Base64 value is injected into every service and the gateway via env (`docker-compose.yml`) / yml default. `jwt.secret` is read by each service's security config to validate.
- `JwtAuthConverter` (one per backend service, under `config/`) turns the `roles` claim into Spring `ROLE_*` authorities. It also tolerates a single `role` claim and Keycloak-style `realm_access.roles`.
- Backend `SecurityConfig` (servlet, `@EnableWebSecurity`) is **defense in depth**: it re-validates the JWT and enforces method/path rules (e.g. catalog: GET public, POST/PUT/DELETE `ROLE_ADMIN`). The gateway already authenticated, but services do not blindly trust headers.
- Refresh tokens are stored as **SHA-256 hashes** in `refresh_tokens`, rotated on each refresh (old deleted, new issued), and revoked on logout.

When touching auth: do not "fix" the unused `issuer-uri`/`jwk-set-uri` without confirming the user wants to move to asymmetric keys — removing it is safe (it's dead config), but switching the signing scheme is a cross-service breaking change.

### Checkout saga — the only event-only service

`checkout-service` has **no HTTP controller**. It is a pure saga orchestrator driven by 6 RabbitMQ consumers (`CheckoutConsumer` registers them as `Consumer<Event>` beans). State machine persisted in `checkout_saga_state` via `CheckoutSagaStateRepository`; `correlationId` = order UUID = saga ID.

```
OrderSubmitted → STARTED → RESERVING_STOCK
  → (ReserveStockRequested → inventory)
    StockReserved → PROCESSING_PAYMENT → (ProcessPaymentRequested → payment)
      PaymentSucceeded → CONFIRMED → OrderConfirmed → (order-service updates order)
      PaymentFailed → COMPENSATING → (StockReservationCancelRequested → inventory)
        StockReservationCancelled → CANCELLED → OrderCancelled → (order-service updates order)
    StockReservationFailed → CANCELLED → OrderCancelled   (no payment attempted)
```

Invariants when editing the orchestrator:
- Every handler is **idempotent by status check** — `handleStockReserved` only acts if `status == RESERVING_STOCK`; duplicate redeliveries are logged and dropped. Preserve this guard on any new transition.
- Each step persists `saga.status` + `updatedAt` before publishing the next event, so a crash mid-flow can resume from DB state.
- The orchestrator never calls inventory/payment over HTTP. Adding a synchronous call here defeats the saga.

### Event bus — Spring Cloud Stream + RabbitMQ

Events are Java records in `common/src/main/java/com/simplestore/common/event/`. Publishers use `StreamBridge.send("binding-name", event)`; consumers are `@Component` beans implementing `Consumer<EventType>` directly. Spring Cloud Stream function definitions declare them in each service's `application.yml` under `spring.cloud.stream.function.definition`.

Binding-name → RabbitMQ destination mapping lives in each service's `application.yml` under `spring.cloud.stream.bindings.<name>-in-0.destination`. Exchanges are `fanout`. Consumer groups (e.g. `group: checkout-service`) give durable subscriptions.

**Event catalog:**

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| `OrderSubmittedEvent` | order | checkout |
| `ReserveStockRequestedEvent` | checkout | inventory |
| `StockReservedEvent` | inventory | checkout |
| `StockReservationFailedEvent` | inventory | checkout |
| `ProcessPaymentRequestedEvent` | checkout | payment |
| `PaymentSucceededEvent` | payment | checkout |
| `PaymentFailedEvent` | payment | checkout |
| `OrderConfirmedEvent` | checkout | order |
| `OrderCancelledEvent` | checkout | order |
| `StockReservationCancelledEvent` | inventory | checkout |
| `StockLevelChangedEvent` | inventory | catalog |
| `ProductUpdatedEvent` | catalog | cart |
| `SubscriptionCycleStartedEvent` | subscription | subscription, payment |
| `SubscriptionPaymentSuccessEvent` | payment | subscription |
| `SubscriptionPaymentFailedEvent` | payment | subscription |
| `BoxAssemblyRequestedEvent` | — (defined, not yet wired) | — |

**Event publishing pattern — always use `afterCommit`:**

Events must be published AFTER the DB transaction commits, not inside it. Publish inside `@Transactional` → ghost event on rollback. Use the pattern from `PaymentService.processSubscriptionPayment()`:

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        boolean sent = streamBridge.send("binding-name", event);
        if (!sent) log.error("Failed to send event for ...");
    }
});
```

When adding an event: define the record in `common/event/`, add a binding in both publisher's and consumer's yml, create the `@Component Consumer<Event>` class. Do not inline event classes in a service — `common` is the contract.

**Consumer patterns:**
- **Single-event consumers** (most services): the class `implements Consumer<EventType>` directly. The `@Component` class IS the consumer bean — no `@Bean` method needed. Example: `CancelReservationConsumer implements Consumer<StockReservationCancelRequestedEvent>`.
- **Multi-event consumers** (checkout, subscription): one `@Component` class with multiple `@Bean` methods, each returning a `Consumer<EventType>`. The `@Bean` method names must differ from the class bean name to avoid collisions. Example: `CheckoutConsumer` has `orderSubmittedConsumer()`, etc.; `SubscriptionConsumer` has `subscriptionCycleStartedConsumer()`, `paymentSuccessConsumer()`, `paymentFailureConsumer()`.

### Subscription service — event-driven recurring billing

`subscription-service` handles plan management (CRUD), customer subscriptions (subscribe/cancel/pause/resume), and recurring billing via a daily scheduler + event chain:

```
Scheduler (daily 2 AM) → subscription-cycle-started event
  → SubscriptionConsumer creates PENDING cycle
  → PaymentService.SubscriptionCycleChargeConsumer charges subscriber
    → success → subscription-payment-success event
      → SubscriptionConsumer.advanceCycle() advances billing date
    → failure → subscription-payment-failure event
      → SubscriptionConsumer marks cycle FAILED, subscription PAYMENT_FAILED
```

- Initial subscribe publishes `subscription-cycle-started` immediately (not via scheduler), but sets `nextBillingDate` to the first renewal date so the scheduler doesn't double-charge.
- `resumeSubscription` from `PAYMENT_FAILED` resets the existing FAILED cycle to PENDING rather than creating a new one (avoids unique constraint on `(subscriptionId, cycleNumber)`).
- `CustomerSubscription` and `SubscriptionCycle` have `@Version` for optimistic locking.
- The scheduler uses a PostgreSQL advisory lock (`pg_try_advisory_lock(42)`) to prevent duplicate runs across instances.

### Identity-service circular dependency

`SecurityConfig` injects `IdentityService` (as `UserDetailsService`), and `IdentityService` injects `AuthenticationManager` (defined as a `@Bean` in `SecurityConfig`). Cycle: `SecurityConfig → IdentityService → AuthenticationManager → SecurityConfig`. Fixed with `@Lazy` on `AuthenticationManager` in `IdentityService`'s constructor — the proxy defers resolution until `login()` is called.

### Inventory — CQRS-lite

`inventory-service` separates writes (`StockReservation` rows, status `RESERVED`/`CANCELLED`) from the read model (`StockEntry.available`). Reserve = insert reservation + decrement available in **one transaction**; compensate = flip reservation to `CANCELLED` + increment available. After any change (saga or admin) it publishes `StockLevelChangedEvent`, which `catalog-service` consumes to update its own cached stock (eventual consistency — inventory is the source of truth). Admin direct stock updates go through `InventoryController`, not the saga path.

**Key invariants:**
- `StockEntry` has `@Version` for optimistic locking — concurrent reservations on the same product throw `OptimisticLockException` instead of silently going negative.
- `processReserveStock` batch-fetches all `StockEntry` rows with `findByProductIdIn(Set)` (1 query, not N). Stock updates use `saveAll()` (1 batch write, not N individual saves).

### Data stores

- PostgreSQL 16: one shared instance, six services own disjoint table sets (no cross-service FKs). `spring.jpa.hibernate.ddl-auto=update` everywhere — schema is derived from entities, no Flyway/Liquibase. Seeders (`CatalogSeeder`, `InventorySeeder`, `PaymentSeeder`) run as `CommandLineRunner` on first boot.
- Redis 7: `cart-service` only. Carts keyed by session cookie (`anon:<uuid>`) or userId (authed, via `@AuthenticationPrincipal Jwt`); stored as Redis hashes. Cart keys have a 30-day TTL to prevent abandoned-cart memory leaks. `CartController.resolveOwner()` resolves the JWT subject for authenticated users, falling back to `x-cart-id` header for anonymous sessions.
- RabbitMQ 4: event bus, fanout exchanges.

### Observability — ELK

Every service has `logstash-logback-encoder` (JSON logs → Logstash TCP :5000 → Elasticsearch), `spring-boot-starter-actuator` (health/metrics on `/actuator/health`), and `apm-agent-attach` (Elastic APM auto-instruments HTTP, JDBC, RabbitMQ). `logstash.conf` at repo root is the Logstash pipeline. APM gives distributed traces keyed so the saga `correlationId` is followable across services in Kibana APM.

## Conventions

- Package root: `com.simplestore.<service>`. Subpackages: `config`, `controller`, `service`, `model` or `domain`, `dto`, `repository`, `consumer`.
- Entities use Lombok (`@Getter`/`@Setter`/`@Builder`/`@NoArgsConstructor`) + JPA. Prefer `@Getter @Setter` over `@Data` to avoid Hibernate proxy issues with `equals()`/`hashCode()`. DTOs are Java records or Lombok builders. **Events are Java records** — no Lombok.
- **Money-handling entities** and **entities touched by concurrent consumers** must have `@Version` for optimistic locking (e.g. `PaymentAccount`, `CheckoutSagaState`, `CustomerSubscription`, `SubscriptionCycle`, `StockEntry`).
- JPA repositories extend `JpaRepository`. Use aggregate queries (`countByStatus`, `@Query` with `SUM`/`COUNT`/`GROUP BY`) for stats — never `findAll()` + Java streams. Use `PagedResult.from(Page.getContent(), total, page, size, mapper)` instead of manual `setItems`/`setPage`/`setSize`/`setTotalCount` boilerplate.
- `common` module is a dependency of every service — shared DTOs, events, OpenAPI config, and `JwtAuthConverter` (lives in `common/config/`, imported by all services that re-validate JWT). Never duplicate event schemas or auth converters across services.
- **Event publishing** must use `TransactionSynchronizationManager.registerSynchronization` with `afterCommit()` — never call `streamBridge.send()` directly inside a `@Transactional` method. Check the return value and log errors.
- File naming: Java PascalCase for classes; service modules are kebab-case dirs.
- When adding a new service: add to parent `pom.xml` `<modules>`, create a `Dockerfile`, wire into `docker-compose.yml` with the standard env block, add a gateway route, and register its Swagger docs in `gateway/application.yml`.
- **Identity-service** has a `GlobalExceptionHandler` (`@RestControllerAdvice`) mapping `IllegalArgumentException` → 400, `UsernameNotFoundException` → 404. Follow this pattern when adding new exception types.
- **JWT secret** must use `${JWT_SECRET:<default>}` in every service's `application.yml` with the same default value. Identity-service previously had a different default — tokens signed by identity-service were rejected by all other services when running locally without `JWT_SECRET` env var set.

## Gotchas & Known Issues

### Docker: always use `--build` after Maven

`docker compose up` without `--build` reuses cached images even when JARs changed. After any `mvn clean install`, use `docker compose up --build -d`. The full safe sequence:

```bash
mvn clean install -DskipTests
docker compose down
docker compose up --build -d
```

### Java 26 + Lombok sun.misc.Unsafe warnings

Project targets Java 21. Java 26 produces these warnings from Lombok 1.18.46:
```
WARNING: sun.misc.Unsafe::objectFieldOffset has been called by lombok.permit.Permit
```
Harmless. No Lombok upgrade available (1.18.46 is latest). Resolves when Lombok releases Java 26-compatible version, or use Java 21 JDK.

### Logstash port 5001 (not 5000)

Host port is 5001, not the default 5000. macOS AirPlay Receiver binds port 5000. docker-compose.yml maps `5001:5000` — Logstash listens on container port 5000, exposed on host 5001. All services connect via Docker network DNS (`logstash:5000`), so no code config changed.

### docker-compose.yml version field

The `version: '3.9'` line triggers a deprecation warning. Can be removed — Docker Compose v2 ignores it.

### Consumer bean naming collision

A class annotated `@Component` with a `@Bean` method whose name matches the default class bean name causes "A bean with that name has already been defined". Solution: either implement `Consumer<T>` directly (no `@Bean` method), or ensure `@Bean` method names differ from the class-derived bean name (checkout pattern).

### Swagger aggregation

Gateway serves aggregated Swagger UI at `http://localhost:8080/swagger-ui.html`. `gateway/application.yml` lists all service api-docs paths under `springdoc.swagger-ui.urls`. Gateway's `SecurityConfig` permits `/swagger-ui/**`, `/v3/api-docs/**`, `/webjars/**`, and per-service swagger paths. Each backend's SecurityConfig also permits its own `/api/v1/*/swagger-ui.html` and `/api/v1/*/api-docs` paths. `OpenApiConfig` in `common` defines shared servers (`http://localhost:8080`, `/`) — but only if the service's `@SpringBootApplication` scans `com.simplestore.common` (requires explicit `scanBasePackages`).

### JWT secret mismatch in local dev

`identity-service` signs tokens; all other services + gateway validate them. All use `jwt.secret: ${JWT_SECRET:<default>}` — the env var `JWT_SECRET` set in `docker-compose.yml` ensures they all use the same key. When running locally via `spring-boot:run` without setting `JWT_SECRET`, each service falls back to its yml default. If identity-service's default differs from other services (as it previously did), tokens are rejected. **All services must use the same default value for `jwt.secret`.** The canonical value is `c2ltcGxlLXN0b3JlLXNlY3JldC1rZXktZm9yLWp3dC10b2tlbnMtc2hhcmVkLWFjcm9zcy1zZXJ2aWNlcw==`.

### Saga idempotency

All 6 saga handlers in `CheckoutSagaOrchestrator` are annotated `@Transactional` and have status-guard idempotency checks. `handleOrderSubmitted` checks if saga already exists before creating. The other 5 handlers check the current saga status before transitioning. When adding a new handler, both `@Transactional` and the status guard are mandatory — duplicate event delivery is normal with RabbitMQ at-least-once semantics.

### Frontend apps

Two Next.js 15 frontends live in the `frontend/` Turborepo monorepo:

```
frontend/
├── apps/
│   ├── storefront/    # Customer-facing SPA (port 9090)
│   └── admin/         # Admin dashboard (port 9091)
├── packages/
│   └── shared/        # Shared types + cn() utility (@simplestore/shared)
├── package.json       # npm workspaces config
└── turbo.json         # Turborepo pipeline (build/dev/lint/typecheck)
```

Both use Tailwind CSS, shadcn/ui, React Query, Axios, react-hook-form + zod. Shared types and `cn()` live in `frontend/packages/shared/` — imported as `@simplestore/shared` via tsconfig paths, no npm link needed.

| App | Port | Auth | Key Features |
|-----|------|------|-------------|
| **storefront** | 9090 | `localStorage` token + refresh token. 401 → redirect `/account/login`. | Products, cart, checkout, orders, subscriptions, account |
| **admin** | 9091 | `localStorage` `admin-token` key. Stores refresh token. Logout calls backend to revoke. | Dashboard, products CRUD, orders, users, inventory, subscription management |

**Commands:**
```bash
cd frontend && npm install             # Install all workspace deps
cd frontend && npx turbo typecheck     # TypeScript check all apps + packages
cd frontend && npx turbo build         # Build all apps (production)
cd frontend && npx turbo lint          # Lint all apps
cd frontend && npm run dev:storefront  # Dev server — storefront only (:9090)
cd frontend && npm run dev:admin       # Dev server — admin only (:9091)
```
