---
phase: 12
title: "Add Admin API Timeout & Error Handling"
status: pending
priority: P2
dependencies: []
effort: "30m"
---

# Phase 12: Add Admin API Timeout & Error Handling

## Overview

Admin API client (`frontend/apps/admin/src/lib/api.ts`) is bare-bones: no timeout, no network error handling, no token refresh. Bring it to parity with the storefront API client.

## Requirements

- Functional: Admin API requests timeout after 10s, show user-friendly error on network failure
- Non-functional: Axios interceptor pattern matching storefront

## Related Code Files

- **Modify**: `frontend/apps/admin/src/lib/api.ts`
- **Reference**: `frontend/apps/storefront/src/lib/api.ts` — correct pattern

## Implementation Steps

### 1. Add timeout

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});
```

### 2. Add network error handling in response interceptor

```ts
api.interceptors.response.use(
  (response) => {
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || "Request failed");
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timed out. Please try again.");
    }
    if (!error.response) {
      throw new Error("Network error. Please check your connection.");
    }
    // existing 401 handling
    if (error.response?.status === 401) { /* ... */ }
    throw new Error(
      error.response?.data?.message || "An unexpected error occurred"
    );
  }
);
```

### 3. Keep existing 401 logout behavior

Admin intentionally doesn't refresh tokens — keep that. Just add the timeout and network error message.

## Success Criteria

- [ ] `timeout: 10000` set on axios instance
- [ ] `ECONNABORTED` → user-friendly "Request timed out" message
- [ ] No `error.response` → "Network error" message
- [ ] Error messages passed to `error.message` for `isError` handlers (Phase 11)
- [ ] `npx turbo typecheck` passes in admin
- [ ] Existing admin functionality unchanged

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Timeout too short for slow endpoints | 10s matches storefront; configurable via env |
| Token refresh intentionally absent | Admin users re-login on 401 — acceptable UX for admin tool |
