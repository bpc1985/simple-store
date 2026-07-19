---
phase: 15
title: "httpOnly Cookie JWT Storage"
status: pending
priority: P3
dependencies: []
effort: "2-3h"
---

# Phase 15: httpOnly Cookie JWT Storage

## Overview

Move JWT tokens from `localStorage` (XSS-stealable) to `httpOnly` secure cookies. Both storefront and admin store tokens in localStorage. `httpOnly` cookies prevent JavaScript access — XSS can't steal them.

## Requirements

- Functional: Login sets `httpOnly` cookie; API client reads cookie automatically; logout clears cookie
- Non-functional: Token refresh continues to work; no breaking change to API contract

## Architecture Decision

**Backend sets cookie with SameSite=Lax + Next.js proxy in dev.** identity-service's login endpoint sets `Set-Cookie` header with `SameSite=Lax`. Frontend API client uses `withCredentials: true`. In development (different ports: frontend :9090, backend :8080), use Next.js `rewrites` in `next.config.ts` to proxy `/api/*` to the gateway — same origin, cookies work without `SameSite=None`. In production, same-origin deployment means `SameSite=Lax` is sufficient.

## Related Code Files

- **Modify**: `identity-service/.../controller/IdentityController.java` — login response sets cookie
- **Modify**: `identity-service/.../config/SecurityConfig.java` — logout clears cookie
- **Modify**: `frontend/apps/storefront/src/lib/api.ts` — remove localStorage token, add `withCredentials`
- **Modify**: `frontend/apps/admin/src/lib/api.ts` — same
- **Modify**: `frontend/apps/storefront/src/lib/auth-context.tsx` — remove localStorage token state
- **Modify**: `frontend/apps/admin/src/lib/auth-context.tsx` — same
- **Modify**: `gateway/.../config/SecurityConfig.java` — ensure cookie forwarding

## Implementation Steps

### 1. identity-service — set cookie on login

```java
// IdentityController.java — login method
@PostMapping("/login")
public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
    TokenResponse tokens = identityService.login(request);
    
    ResponseCookie accessCookie = ResponseCookie.from("access_token", tokens.accessToken())
        .httpOnly(true)
        .secure(false)           // true in production (HTTPS)
        .sameSite("Lax")
        .path("/")
        .maxAge(Duration.ofMinutes(15))
        .build();
    
    ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", tokens.refreshToken())
        .httpOnly(true)
        .secure(false)
        .sameSite("Lax")
        .path("/api/v1/identity/refresh")
        .maxAge(Duration.ofDays(7))
        .build();
    
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
        .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
        .body(tokens);  // body stays same for backward compat
}
```

### 2. identity-service — clear cookie on logout

```java
ResponseCookie clearedCookie = ResponseCookie.from("access_token", "")
    .httpOnly(true).path("/").maxAge(0).build();
```

### 3. Frontend API client — remove localStorage, use withCredentials

```ts
// storefront/src/lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  withCredentials: true,    // send cookies
  timeout: 10000,
});
// Remove: const token = localStorage.getItem("token")
// Remove: config.headers.Authorization = `Bearer ${token}`
```

### 4. Frontend auth context — remove localStorage token

```ts
// auth-context.tsx
const logout = () => {
  // Remove: localStorage.removeItem("token")
  // Remove: localStorage.removeItem("refreshToken")
  api.post("/api/v1/identity/logout").finally(() => {
    setUser(null);
    router.push("/account/login");
  });
};
```

### 5. Token refresh

Refresh flow now works via cookie. `/api/v1/identity/refresh` reads `refresh_token` cookie, issues new cookies with fresh tokens. Frontend interceptor's 401 handler calls refresh endpoint — cookies auto-sent.

### 6. Next.js dev proxy — same-origin for cookies

Add to `next.config.ts` in both storefront and admin:
```ts
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8080/api/:path*',
    },
  ];
}
```

This makes `/api/v1/...` requests same-origin in dev, so `SameSite=Lax` cookies work without `SameSite=None; Secure`. In production, the reverse proxy (nginx/gateway) serves both frontend and API from same origin.

### 7. Gateway — ensure cookie forwarding

Cookies are standard HTTP headers — gateway forwards them by default. Verify no cookie-stripping filter exists.

## Success Criteria

- [ ] Login response includes `Set-Cookie: access_token`, `Set-Cookie: refresh_token`
- [ ] API client uses `withCredentials: true`, no `Authorization` header
- [ ] Token removed from localStorage on both apps
- [ ] Login/refresh/logout flow works end-to-end
- [ ] Cross-origin (different port) — CORS configured with explicit origins + `allowCredentials(true)` (Phase 5)
- [ ] `npx turbo typecheck && npx turbo build` passes
- [ ] `mvn clean install -DskipTests` passes

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| CORS + cookies + different ports | Phase 5 fixed CORS. `withCredentials` + explicit origins + `SameSite=None; Secure` for cross-origin dev |
| Mobile/native clients can't use cookies | Keep `Authorization: Bearer` header as fallback for non-browser clients (content negotiation or separate endpoint) |
| CSRF with cookie auth | `SameSite=Strict` blocks cross-site requests. Additional CSRF token not needed for SPA with `SameSite` |
| Token rotation during refresh | Cookies updated by refresh endpoint response |
