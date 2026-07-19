---
phase: 6
title: "Add CI/CD Pipeline"
status: pending
priority: P1
dependencies: []
effort: "1-2h"
---

# Phase 6: Add CI/CD Pipeline

## Overview

Add GitHub Actions workflow for backend build + frontend typecheck/build. No tests to run yet (zero tests), but the pipeline validates compilation and establishes the foundation for future test steps.

## Requirements

- Functional: On push/PR to `main`, run `mvn install -DskipTests` + `npx turbo typecheck && npx turbo build`
- Non-functional: Cache Maven dependencies and node_modules for faster builds

## Related Code Files

- **Create**: `.github/workflows/ci.yml`
- **Modify**: None

## Implementation Steps

1. Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   jobs:
     backend:
       runs-on: ubuntu-latest
       services:
         postgres:
           image: postgres:16
           env:
             POSTGRES_DB: simplestore
             POSTGRES_USER: simplestore
             POSTGRES_PASSWORD: simplestore
           ports:
             - 5432:5432
         rabbitmq:
           image: rabbitmq:4-management
           ports:
             - 5672:5672
         redis:
           image: redis:7
           ports:
             - 6379:6379
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-java@v4
           with:
             java-version: '21'
             distribution: 'temurin'
             cache: 'maven'
         - run: mvn clean install -DskipTests

     frontend:
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: frontend
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         - run: npm ci
         - run: npx turbo typecheck
         - run: npx turbo build
   ```

2. Test: push branch to GitHub, verify CI runs
3. Add branch protection rules recommendation to `docs/` or plan notes

## Success Criteria

- [ ] `.github/workflows/ci.yml` exists
- [ ] Backend job: `mvn clean install -DskipTests` passes
- [ ] Frontend job: `npx turbo typecheck && npx turbo build` passes
- [ ] Maven and npm caching enabled
- [ ] Pipeline completes in under 10 minutes

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| No test stage (zero tests exist) | Pipeline structure ready for test stage — add `mvn test` when tests added |
| Docker Compose not used (too heavy for CI) | Use GitHub Actions `services:` for lightweight infra |
| Frontend build depends on backend running (API calls at build time?) | Verify Next.js build is static enough; if API calls at build time, skip backend dep |
