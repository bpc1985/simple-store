---
phase: 14
title: "Flyway Database Migrations"
status: pending
priority: P3
dependencies: []
effort: "3-4h"
---

# Phase 14: Flyway Database Migrations

## Overview

Replace `ddl-auto: update` with Flyway migrations across all 7 services that use JPA. Each service gets its own migration directory. High effort because of existing data and shared database.

## Requirements

- Functional: Schema changes version-controlled in Flyway SQL migrations
- Non-functional: Existing data preserved; services can run with `ddl-auto: validate`

## Architecture Decision

7 services share one PostgreSQL database with disjoint table sets. Flyway per-service approach: each service manages its own tables via separate migration directories. Tables are scoped by service (no cross-service FKs), so this works cleanly.

## Related Code Files

- **Modify**: `*/pom.xml` in all 7 JPA services — add flyway dependency
- **Modify**: `*/src/main/resources/application.yml` — add flyway config, change `ddl-auto` to `validate`
- **Create**: `*/src/main/resources/db/migration/` directories with baseline migrations

## Implementation Steps

### 1. Add Flyway dependency to parent POM (managed version)

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<!-- PostgreSQL support included in flyway-core -->
```

Add to each JPA service's `pom.xml` (or parent `dependencyManagement`):
- identity-service
- catalog-service
- order-service
- inventory-service
- checkout-service
- payment-service
- subscription-service

### 2. Configure per-service

```yaml
# Each service's application.yml
spring:
  jpa:
    hibernate:
      ddl-auto: validate          # was: update
  flyway:
    enabled: true
    locations: classpath:db/migration/${spring.application.name}
    baseline-on-migrate: true     # skip existing tables
    baseline-version: 1
```

`baseline-on-migrate: true` — Flyway treats existing tables as V1 baseline, only applies future migrations.

### 3. Generate baseline DDL from current schema

Option A: Dump each service's current tables via `pg_dump --schema-only`, split by table ownership.
Option B: Let `ddl-auto: update` create tables, then `baseline-on-migrate` captures them.

Recommend Option B — simpler. Set `ddl-auto: none`, enable Flyway with `baseline-on-migrate`, deploy. Flyway successfully baselines against existing tables.

### 4. Migration naming convention

```
db/migration/{service-name}/
  V1__baseline.sql          # (empty — baseline-on-migrate handles existing)
  V2__add_column_xyz.sql    # future: new columns
```

### 5. Rollout order

1. identity-service (least dependent)
2. catalog-service
3. inventory-service
4. payment-service
5. order-service
6. checkout-service
7. subscription-service

Each service can be migrated independently since tables don't overlap.

## Success Criteria

- [ ] All 7 services run with `ddl-auto: validate`
- [ ] Flyway migrations directory exists in each service
- [ ] `baseline-on-migrate` successfully marks existing tables as V1
- [ ] New column addition creates `V2__*.sql` instead of auto-DDL
- [ ] `mvn clean install -DskipTests` passes
- [ ] `docker compose up --build -d` — all services start, tables match schema

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `baseline-on-migrate` fails if Flyway detects existing schema changes | Run Flyway in clean DB first, verify baseline works |
| Service startup order matters during migration | Each service migrates own tables only — no cross-service dependency |
| Breaking existing data | No schema changes in this phase — only tooling change. `ddl-auto: validate` is stricter than `update` — verify current entities match DB schema exactly |
| `validate` mode fails due to missing column in DB | May need to add `hibernate.hbm2ddl.auto: none` temporarily, run Flyway baseline, then switch to `validate` |
