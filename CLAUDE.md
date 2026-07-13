# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SimpleStore — Spring Boot 3.4 microservices e-commerce reference architecture (Java 21), ported from a .NET project. Maven multi-module: 1 shared lib + 1 gateway + 7 backend services + 2 Thymeleaf BFFs. Backed by PostgreSQL, Redis, RabbitMQ, and an ELK observability stack, all via Docker Compose.

## Commands

All Maven commands run from repo root.

```bash
# Build every module (parent pom drives the reactor)
mvn clean install -DskipTests

# Build a single module (builds common + that module only)
mvn -pl catalog-service -am clean install -DskipTests

# Run a service locally against Dockerized infra (infra must be up first)
docker-compose up -d postgres redis rabbitmq
mvn -pl <module> spring-boot:run        # e.g. catalog-service

# Run everything via Docker (build JARs first, then compose)
mvn clean install -DskipTests
docker-compose up -d
docker-compose ps                       # status
docker-compose logs -f <service>        # tail one service
docker-compose down -v                  # stop + wipe volumes (resets DBs)

# Reset a flaky environment
docker-compose down -v && docker-compose up -d
```

### Running single modules

Each backend service is a standard `spring-boot:run` app. Module names (Maven artifact dirs): `common`, `gateway`, `identity-service`, `catalog-service`, `cart-service`, `order-service`, `inventory-service`, `checkout-service`, `payment-service`, `storefront-web`, `admin-web`.

### Tests

There is currently no test source (`src/test` is empty across modules). When adding tests, follow Spring Boot conventions (`@SpringBootTest`, Testcontainers from the parent POM's `testcontainers.version`).

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
| storefront-web | 8080 | 8090 | — |
| admin-web | 8080 | 8091 | — |

In Docker, every service listens on container port 8080 and is mapped to a unique host port. Locally (`spring-boot:run`), the service's own `application.yml` sets `server.port` to its host port (e.g. catalog=8082, checkout=8083). **Note:** checkout-service's `application.yml` says `server.port: 8083` but README maps it to 8086 — in Docker the compose port mapping wins; locally it boots on 8083. Check the service's yml before assuming a port.

Swagger UI per service (via gateway): `http://localhost:8080/api/v1/<service>/swagger-ui.html`. Each service's yml sets `springdoc.swagger-ui.path` prefixed with its gateway route.

Kibana (logs/traces/metrics): `http://localhost:5601`. RabbitMQ mgmt UI: `http://localhost:15672` (`simplestore`/`simplestore`).

Seeded users: admin `admin@store.com` / `Admin123!`, user `user@store.com` / `User123!`.

## Architecture

### Request path — gateway is the only public API entry

```
Browser → storefront-web/admin-web (Thymeleaf BFF)
        → gateway (8080, Spring Cloud Gateway, validates JWT)
        → backend service (catalog/order/cart/inventory/payment/identity)
```

The two web apps are **Backend-For-Frontend** shells: Thymeleaf server-rendered, no business logic. They call the gateway over HTTP using `RestTemplate` + `GatewayAuthInterceptor`, which attaches the user's JWT (kept in the server-side session) as a `Bearer` header on each outbound call. Any new web-facing page goes through a `*ClientService` in the web module, not directly to a backend.

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

Events are Java records in `common/src/main/java/com/simplestore/common/event/` (note: a duplicate `events/` package exists — use `event/`, the singular form, which the code imports). Publishers use `StreamBridge.send("binding-name", event)`; consumers expose `@Bean Consumer<Event>` and declare them in `spring.cloud.stream.function.definition`.

Binding-name → RabbitMQ destination mapping lives in each service's `application.yml` under `spring.cloud.stream.bindings.<bean>-in-0.destination`. Exchanges are `fanout`. Consumer groups (e.g. `group: checkout-service`) give durable subscriptions. The full event list and publishers/consumers are in the README "Events" table.

When adding an event: define the record in `common/event/`, add a binding in both publisher's and consumer's yml, register the `Consumer` bean. Do not inline event classes in a service — `common` is the contract.

### Inventory — CQRS-lite

`inventory-service` separates writes (`StockReservation` rows, status `RESERVED`/`CANCELLED`) from the read model (`StockEntry.available`). Reserve = insert reservation + decrement available in **one transaction**; compensate = flip reservation to `CANCELLED` + increment available. After any change it publishes `StockLevelChangedEvent`, which `catalog-service` consumes to update its own cached stock (eventual consistency — inventory is the source of truth). Admin direct stock updates go through `InventoryController`, not the saga path.

### Data stores

- PostgreSQL 16: one shared instance, six services own disjoint table sets (no cross-service FKs). `spring.jpa.hibernate.ddl-auto=update` everywhere — schema is derived from entities, no Flyway/Liquibase. Seeders (`CatalogSeeder`, `InventorySeeder`, `PaymentSeeder`) run as `CommandLineRunner` on first boot.
- Redis 7: `cart-service` only. Carts keyed by session cookie (anon) or userId (authed); stored as Redis hashes.
- RabbitMQ 4: event bus, fanout exchanges.

### Observability — ELK

Every service has `logstash-logback-encoder` (JSON logs → Logstash TCP :5000 → Elasticsearch), `spring-boot-starter-actuator` (health/metrics on `/actuator/health`), and `apm-agent-attach` (Elastic APM auto-instruments HTTP, JDBC, RabbitMQ). `logstash.conf` at repo root is the Logstash pipeline. APM gives distributed traces keyed so the saga `correlationId` is followable across services in Kibana APM.

## Conventions

- Package root: `com.simplestore.<service>` (e.g. `com.simplestore.catalog`). Subpackages: `config`, `controller`, `service`, `model` or `domain`, `dto`, `repository`, `consumer` (when messaging).
- Entities use Lombok (`@Data`/`@Builder`/`@NoArgsConstructor`) + JPA. DTOs are Lombok builders. Events are Java records.
- JPA repositories extend `JpaRepository`. No custom query DSL.
- `common` module is a dependency of every service — shared DTOs (`ApiResponse`, `PagedResult`), events, and OpenAPI config. Never duplicate an event schema across services.
- File naming: Java PascalCase for classes; service modules are kebab-case dirs (`catalog-service`).
- When adding a new service: add it to the parent `pom.xml` `<modules>`, give it a `Dockerfile` (copy the existing `eclipse-temurin:21-jre-alpine` 5-liner), wire it into `docker-compose.yml` with the same env block pattern (datasource/rabbit/JWT_SECRET/APM/LOGSTASH), and add a gateway route if it needs HTTP exposure.
