---
phase: 13
title: "Add Docker Restart Policies & Resource Limits"
status: pending
priority: P2
dependencies: []
effort: "30m"
---

# Phase 13: Add Docker Restart Policies & Resource Limits

## Overview

docker-compose.yml has no restart policies (crashed containers stay down) and no resource limits (OOM risk, noisy neighbor). Add restart policies to all services and resource limits to microservices.

## Requirements

- Functional: Containers auto-restart on crash; resource usage bounded
- Non-functional: Sensible defaults — not production-hardened, just safe

## Related Code Files

- **Modify**: `docker-compose.yml`

## Implementation Steps

### 1. Add restart policies

All microservices + infrastructure:
```yaml
services:
  gateway:
    restart: unless-stopped

  postgres:
    restart: unless-stopped
  redis:
    restart: unless-stopped
  rabbitmq:
    restart: unless-stopped
  elasticsearch:
    restart: unless-stopped
  logstash:
    restart: unless-stopped
  kibana:
    restart: unless-stopped
  apm-server:
    restart: unless-stopped
```

`unless-stopped` — restart on crash but respect explicit `docker compose stop`.

### 2. Add resource limits to microservices

```yaml
services:
  gateway:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
```

Apply same pattern to all 8 microservices + gateway. Skip infrastructure (postgres, redis, rabbitmq, elasticsearch) — they have their own memory management.

### 3. Current infrastructure already has healthchecks

Postgres, redis, rabbitmq already have `healthcheck:` blocks. `depends_on` with `condition: service_healthy` already exists. No changes needed there.

### 4. Add volumes for Redis and RabbitMQ

```yaml
redis:
  volumes:
    - redis-data:/data

rabbitmq:
  volumes:
    - rabbitmq-data:/var/lib/rabbitmq

volumes:
  redis-data:
  rabbitmq-data:
```

Prevents data loss on restart.

## Success Criteria

- [ ] All 16 services have `restart: unless-stopped`
- [ ] All 9 microservices have `deploy.resources.limits.memory` set
- [ ] Redis and RabbitMQ have persistent volumes
- [ ] `docker compose up -d` succeeds
- [ ] `docker compose down && docker compose up -d` — Redis and RabbitMQ data persists
- [ ] `docker stats` shows memory limits

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Resource limits too restrictive | 512M per JVM service is generous for this codebase |
| Volume data incompatible after RabbitMQ upgrade | Dev-only volumes — `docker compose down -v` resets if needed |
