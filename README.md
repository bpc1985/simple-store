# SimpleStore — Spring Boot 3 Microservices

A **production-grade microservices reference architecture** built with **Spring Boot 3.4**, **Spring Cloud**, **Spring Data JPA**, **PostgreSQL**, **Redis**, **RabbitMQ**, and **Thymeleaf**.

> **Based on:** The .NET SimpleStore by [daohainam](https://github.com/daohainam/simple-store), ported to Java Spring Boot 3.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
│            (PostgreSQL + Redis + RabbitMQ)                   │
└──────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌────────────────┐
│   Gateway    │◄──│  Storefront Web  │   │   Admin Web    │
│ (SC Gateway  │◄──│  (Thymeleaf BFF) │   │ (Thymeleaf BFF)│
│   + JWT)     │   └──────────────────┘   └────────────────┘
└──────┬───────┘
       │ Routes /api/v1/<service>/*
       │
       ├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
       ▼          ▼          ▼          ▼          ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│ Identity ││ Catalog  ││  Order   ││   Cart   ││Inventory ││ Payment  │
│ Service  ││ Service  ││ Service  ││ Service  ││ Service  ││ Service  │
└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
                                                     │
                  ┌──────────────────────────────────┘
                  ▼
          ┌──────────────┐
          │  Checkout    │  ← Saga Orchestrator (no HTTP)
          │  Service     │
          └──────────────┘
```

## Saga Flow

```
OrderSubmitted → RESERVING_STOCK → StockReserved → PROCESSING_PAYMENT
                       ↓ (failure)                   ↓ (failure)
                OrderCancelled              COMPENSATING → StockCancelled
                                                             ↓
                                                      OrderCancelled
                       ↓ (success)
                CONFIRMED → OrderConfirmed
```


## Services

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| **gateway** | 8080 | — | Spring Cloud Gateway + JWT validation |
| **identity-service** | 8081 | PostgreSQL | Auth (JWT), registration, user management |
| **catalog-service** | 8082 | PostgreSQL | Products & categories CRUD |
| **cart-service** | 8083 | Redis | Shopping cart (anonymous + authenticated) |
| **order-service** | 8084 | PostgreSQL | Order creation & management |
| **inventory-service** | 8085 | PostgreSQL | Stock levels + CQRS reservations |
| **checkout-service** | 8086 | PostgreSQL | Saga orchestrator (event-driven only) |
| **payment-service** | 8087 | PostgreSQL | Payment accounts & transactions |
| **storefront-web** | 8090 | — | Customer storefront (Thymeleaf BFF) |
| **admin-web** | 8091 | — | Admin dashboard (Thymeleaf BFF) |

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.4, Spring Cloud 2024.0 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Messaging | RabbitMQ 4 + Spring Cloud Stream |
| Gateway | Spring Cloud Gateway |
| Security | Spring Security + OAuth2 JWT |
| Frontend | Thymeleaf |
| Build | Maven 3.9+ |
| Container | Docker Compose |

## How to Run

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Java | 21+ | `java -version` |
| Maven | 3.9+ | `mvn -version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2+ | `docker-compose --version` |

---

### Option 1: Docker Compose (all-in-one) 🚀

Easiest way — start everything with one command:

```bash
cd simple-store

# 1. Build all JARs
mvn clean install -DskipTests

# 2. Start infrastructure + all 10 services
docker-compose up -d

# 3. Wait ~30 seconds for services to be ready, then check status
docker-compose ps

# 4. View logs (optional)
docker-compose logs -f            # all services
docker-compose logs -f catalog-service   # single service
```

**Access after startup:**

| App | URL | Description |
|-----|-----|-------------|
| Storefront | http://localhost:8090 | Customer shopping site |
| Admin Dashboard | http://localhost:8091 | Admin management panel |
| Gateway (API) | http://localhost:8080 | API entry point |
| RabbitMQ Management | http://localhost:15672 | Message broker UI (`simplestore` / `simplestore`) |

**Swagger UI** (per service via gateway):

| Service | URL |
|---------|-----|
| Identity | http://localhost:8080/api/v1/identity/swagger-ui.html |
| Catalog | http://localhost:8080/api/v1/catalog/swagger-ui.html |
| Cart | http://localhost:8080/api/v1/cart/swagger-ui.html |
| Order | http://localhost:8080/api/v1/order/swagger-ui.html |
| Inventory | http://localhost:8080/api/v1/inventory/swagger-ui.html |
| Payment | http://localhost:8080/api/v1/payment/swagger-ui.html |

**Stop everything:**

```bash
docker-compose down          # stop containers
docker-compose down -v       # stop + delete volumes (reset data)
```

---

### Option 2: Docker (infra) + Local (services) 🔧

Run infrastructure in Docker, services in your IDE/terminal — best for development:

```bash
# 1. Start only PostgreSQL, Redis, RabbitMQ
docker-compose up -d postgres redis rabbitmq

# 2. Run all services from project root (each in a separate terminal):
mvn -pl identity-service spring-boot:run     # Terminal 1 — port 8081
mvn -pl catalog-service spring-boot:run      # Terminal 2 — port 8082
mvn -pl cart-service spring-boot:run         # Terminal 3 — port 8083
mvn -pl order-service spring-boot:run        # Terminal 4 — port 8084
mvn -pl inventory-service spring-boot:run    # Terminal 5 — port 8085
mvn -pl checkout-service spring-boot:run     # Terminal 6 — port 8086
mvn -pl payment-service spring-boot:run      # Terminal 7 — port 8087
mvn -pl gateway spring-boot:run              # Terminal 8 — port 8080
mvn -pl storefront-web spring-boot:run       # Terminal 9 — port 8090
mvn -pl admin-web spring-boot:run            # Terminal 10 — port 8091
```

Or use `tmux` / `screen` to manage multiple terminals.

---

### Option 3: Run a single service (dev mode) 💻

Work on one service while infrastructure handles the rest:

```bash
# Start dependencies
docker-compose up -d postgres redis rabbitmq

# Run just the service you're working on
cd catalog-service
mvn spring-boot:run

# Or from project root:
mvn -pl catalog-service spring-boot:run
```

The service will auto-connect to infrastructure via default environment variables (`localhost`).

---

### Option 4: Manual (no Docker) 🔨

If you have PostgreSQL, Redis, and RabbitMQ installed natively:

```bash
# Ensure these are running locally:
# - PostgreSQL on localhost:5432 (database: simplestore, user: simplestore, pass: simplestore)
# - Redis on localhost:6379
# - RabbitMQ on localhost:5672 (user: simplestore, pass: simplestore)

# Build and run
mvn clean install -DskipTests
mvn -pl identity-service spring-boot:run &
mvn -pl catalog-service spring-boot:run &
# ... etc
```

---

### Quick API Test

```bash
# Register a new user
curl -X POST http://localhost:8080/api/v1/identity/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","fullName":"Test User"}'

# Login as admin
curl -X POST http://localhost:8080/api/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@store.com","password":"Admin123!"}'

# Response includes accessToken — use it for authenticated calls:
# export TOKEN="<accessToken from response>"

# Browse products (public)
curl http://localhost:8080/api/v1/catalog/products

# View your cart (authenticated)
curl http://localhost:8080/api/v1/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | `lsof -i :8080` to find the process, then kill it |
| Docker containers won't start | `docker-compose down -v && docker-compose up -d` (full reset) |
| Services can't connect to DB | Check `docker-compose ps` — ensure `postgres` is `healthy` |
| Build fails | `mvn clean install -DskipTests -U` (clean + force update snapshots) |
| Lombok errors | Ensure you're using Java 21+ and Lombok 1.18.46+ |
| RabbitMQ connection refused | Wait 10s after RabbitMQ starts — it takes time to initialize |

## Default Users

Seeded automatically on first startup:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@store.com` | `Admin123!` |
| User | `user@store.com` | `User123!` |

## Project Structure

```
simple-store/
├── pom.xml                 # Parent POM
├── docker-compose.yml      # Infrastructure + services
├── common/                 # Shared events & DTOs
├── gateway/                # API Gateway
├── identity-service/       # Auth service
├── catalog-service/        # Product catalog
├── cart-service/           # Shopping cart (Redis)
├── order-service/          # Order management
├── inventory-service/      # Stock (CQRS)
├── checkout-service/       # Saga orchestrator
├── payment-service/        # Payments
├── storefront-web/         # Customer UI
└── admin-web/              # Admin dashboard
```

## Events

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| `OrderSubmittedEvent` | Order | Checkout |
| `ReserveStockRequestedEvent` | Checkout | Inventory |
| `StockReservedEvent` | Inventory | Checkout |
| `StockReservationFailedEvent` | Inventory | Checkout |
| `ProcessPaymentRequestedEvent` | Checkout | Payment |
| `PaymentSucceededEvent` | Payment | Checkout |
| `PaymentFailedEvent` | Payment | Checkout |
| `OrderConfirmedEvent` | Checkout | Order |
| `OrderCancelledEvent` | Checkout | Order |
| `StockLevelChangedEvent` | Inventory | Catalog |
| `ProductUpdatedEvent` | Catalog | Cart |

## License

MIT License
