# System Architecture

SimpleStore — Spring Boot 3.4 microservices e-commerce reference architecture (Java 21).

## Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Turborepo)                         │
│       storefront (:3000)              admin (:3001)             │
│  (Next.js 15 + React Query + shadcn/ui)                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP / JWT Bearer
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Gateway :8080                                │
│           Spring Cloud Gateway + JWT validation                  │
│           Routes: /api/v1/<service>/*                           │
└──────┬───────┬───────┬───────┬───────┬───────┬───────┬─────────┘
       │       │       │       │       │       │       │
       ▼       ▼       ▼       ▼       ▼       ▼       ▼
┌─────────┐┌───────┐┌───────┐┌───────┐┌────────┐┌───────┐┌──────────────┐
│Identity ││Catalog││ Order ││ Cart  ││Inventory││Payment││Subscription  │
│ :8081   ││:8082  ││ :8084 ││ :8083 ││ :8085  ││:8087  ││ :8088        │
│  PG     ││  PG   ││  PG   ││ Redis ││  PG    ││  PG   ││  PG          │
└─────────┘└───────┘└───┬───┘└───────┘└────┬───┘└───┬───┘└──────┬───────┘
                        │                  │         │           │
                        ▼                  │         │           │
                 ┌──────────────┐          │         │           │
                 │  Checkout    │◄─────────┘         │           │
                 │  Saga        │◄───────────────────┘           │
                 │  (no HTTP)   │◄───────────────────────────────┘
                 │  :8086 (PG)  │   Event-driven via RabbitMQ
                 └──────────────┘
                        ▲
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│               Infrastructure (Docker Compose)                    │
│   PostgreSQL :5432    Redis :6379    RabbitMQ :5672             │
│   ELK: Elasticsearch :9200, Logstash :5000, Kibana :5601        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Stores

| Store | Used by | Pattern |
|-------|---------|---------|
| PostgreSQL 16 | identity, catalog, order, inventory, checkout, payment, subscription | One shared instance, disjoint table sets (no cross-service FKs), `ddl-auto: update` |
| Redis 7 | cart | Hash per cart, keyed by userId or `anon:<uuid>`, 30-day TTL |
| RabbitMQ 4 | all services | Fanout exchanges, Spring Cloud Stream bindings, consumer groups for durable subscriptions |

## Request Flow

```
Client → Gateway (:8080) → validates JWT → routes to backend by Path=/api/v1/<service>/**
       → Backend re-validates JWT (defense-in-depth) using shared HMAC-SHA256 secret
```

Public gateway routes: `identity/register|login|refresh`, `GET catalog/products|categories`, `cart/**`, `GET subscription/plans/**`. All others require JWT.

## Auth

HMAC-SHA256 symmetric JWT (not OAuth2 JWK). `identity-service` signs tokens; gateway + all backends validate with same secret via `jwt.secret: ${JWT_SECRET:<default>}`. Refresh tokens stored as SHA-256 hashes, rotated on refresh, revoked on logout. `JwtAuthenticationFilter` checks account lock/disabled status. `JwtAuthConverter` lives in `common/config/` (shared by all services).

## Checkout Saga

Event-driven state machine. `checkout-service` has no HTTP — pure RabbitMQ consumers.

```
OrderSubmitted → STARTED → RESERVING_STOCK → StockReserved → PROCESSING_PAYMENT
                    ↓ (fail)                   ↓ (fail)
             CANCELLED ←────────────── COMPENSATING → StockCancelled → CANCELLED
                    ↑ (success)
             CONFIRMED → OrderConfirmed
```

All 6 handlers are `@Transactional` with status-guard idempotency. Each step persists state before publishing the next event.

## Subscription Billing

Daily scheduler (2 AM) + event chain:

```
Scheduler → subscription-cycle-started → SubscriptionConsumer (creates PENDING cycle)
                                       → PaymentService (charges)
                                         → success → advanceCycle (advances billing)
                                         → failure → failCycle (marks PAYMENT_FAILED)
```

Initial subscription publishes cycle-started immediately; scheduler handles renewals only.

## Events (16 total)

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| OrderSubmitted | order | checkout |
| ReserveStockRequested | checkout | inventory |
| StockReserved | inventory | checkout |
| StockReservationFailed | inventory | checkout |
| StockReservationCancelled | inventory | checkout |
| ProcessPaymentRequested | checkout | payment |
| PaymentSucceeded | payment | checkout |
| PaymentFailed | payment | checkout |
| OrderConfirmed | checkout | order |
| OrderCancelled | checkout | order |
| StockLevelChanged | inventory | catalog |
| ProductUpdated | catalog | cart |
| SubscriptionCycleStarted | subscription | subscription, payment |
| SubscriptionPaymentSuccess | payment | subscription |
| SubscriptionPaymentFailed | payment | subscription |

## Frontend

Next.js 15 Turborepo monorepo at `frontend/`. npm workspaces with shared types and utilities.

```
frontend/
├── package.json          # workspaces: ["apps/*", "packages/*"]
├── turbo.json            # build, dev, lint, typecheck pipeline
├── apps/
│   ├── storefront/       # Customer SPA (port 3000)
│   └── admin/            # Admin dashboard (port 3001)
└── packages/
    └── shared/           # @simplestore/shared — types, cn() utility
```

| App | Tech | Auth |
|-----|------|------|
| storefront | Next.js 15, Tailwind, shadcn/ui, React Query, Axios | JWT in localStorage; 401 → redirect `/account/login` |
| admin | Next.js 15, Tailwind, shadcn/ui, React Query, Axios, Recharts | Separate `admin-token`; stores refresh token; backend logout |

**Commands:**
```bash
cd frontend && npm install && npx turbo typecheck && npx turbo build
```
