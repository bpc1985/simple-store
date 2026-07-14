---
phase: 0
title: "NextJS Storefront — Modern SPA replacing storefront-web"
status: pending
priority: P1
effort: "3d"
dependencies: []
---

# Plan: NextJS Storefront

Replace the Thymeleaf server-rendered `storefront-web` with a modern NextJS 14 (App Router) SPA using TailwindCSS, shadcn/ui, and TanStack React Query. All backend calls go through the existing Spring Cloud Gateway at `http://localhost:8080/api/v1/*`.

## Architecture

```
Browser → NextJS (localhost:3000)
        → Gateway (localhost:8080)
        → backend services (identity/catalog/cart/order)
```

- **Data fetching:** TanStack React Query for all API calls — automatic caching, refetching, optimistic updates
- **Auth:** JWT from identity-service stored in an httpOnly cookie (set by NextJS API route after login). Server components read cookie, pass token to server-side fetches. Client components use `useQuery` with the token from a React context.
- **Cart:** Anonymous users identified by UUID stored in localStorage (`X-Cart-Id` header). Authenticated users' cart keyed by userId. Cart merge on login.
- **Styling:** TailwindCSS + shadcn/ui components (Button, Card, Input, Badge, Sheet for cart drawer, DropdownMenu for account nav)

## Feature parity with storefront-web

| Page | Route | Key Data |
|------|-------|----------|
| Home | `/` | Featured products, categories |
| Products | `/products` | Product grid, category filter, search, pagination |
| Product Detail | `/products/[id]` | Single product + add to cart |
| Cart | `/cart` | Cart items CRUD, checkout button |
| Checkout | `/checkout` | Shipping form, cart summary, place order |
| Order Confirmation | `/orders/[id]` | Order details after checkout |
| My Orders | `/account/orders` | Order history list |
| Order Detail | `/account/orders/[id]` | Single order with items |
| Login | `/account/login` | Email/password form |
| Register | `/account/register` | Register form |

## Phases

### Phase 1: Project Bootstrap + API Layer

- `npx create-next-app@latest storefront --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- `npx shadcn-ui@latest init` (default style, neutral base, CSS variables)
- Install: `@tanstack/react-query`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`
- Create `src/lib/api.ts` — Axios instance with base URL from env `NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080`
- Create API service modules in `src/services/`:
  - `catalog-service.ts` — `getProducts(page, categoryId, search)`, `getProduct(id)`, `getCategories()`
  - `cart-service.ts` — `getCart(cartId)`, `addToCart(productId, qty, cartId)`, `updateItem(...)`, `removeItem(...)`, `clearCart(...)`, `mergeCart(anonId, userId)`
  - `identity-service.ts` — `login(email, password)`, `register(email, password, fullName)`, `logout(refreshToken)`, `getMe()`
  - `order-service.ts` — `createOrder(address, items)`, `getMyOrders()`
- Each service unwraps `ApiResponse<T>` → returns `.data`
- Create React Query hooks in `src/hooks/`:
  - `useProducts(page, categoryId, search)`, `useProduct(id)`, `useCategories()`
  - `useCart()`, `useAddToCart()`, `useUpdateCartItem()` (with optimistic updates), `useRemoveCartItem()`
  - `useLogin()`, `useRegister()`, `useLogout()`, `useMe()`
  - `useOrders()`, `useCreateOrder()`

### Phase 2: Layout + Auth System

- Root layout: `src/app/layout.tsx` — header nav, footer, cart drawer, auth provider
- Auth context: `src/lib/auth-context.tsx` — stores JWT token + user info in React state (persisted to cookie via server action)
- Auth flow:
  1. Login form → `POST /api/v1/identity/login` → get accessToken + refreshToken
  2. Store tokens in httpOnly cookie via NextJS API route (`src/app/api/auth/login/route.ts`)
  3. Middleware (`src/middleware.ts`) reads cookie, injects into Authorization header for server-side fetches
  4. Client fetches use `useMe()` — if 401, redirect to login
- Header component:
  - Logo + nav links (Products, Cart badge with count)
  - Auth dropdown (Login/Register vs My Orders/Logout)
  - Cart drawer (Sheet from shadcn) — opens from right, shows cart items, total, checkout button
- Responsive: mobile hamburger menu, cart accessible from all pages

### Phase 3: Pages — Public

**Home Page (`/`):**
- Hero banner with CTA
- Featured products grid (first 8 products, or filter by popular)
- Categories sidebar/list

**Products Page (`/products`):**
- Sidebar: category filter list (highlight active)
- Search bar
- Product grid (Card components with image, name, price, "Add to Cart" button)
- Pagination (page numbers, prev/next)
- Skeleton loading states while fetching

**Product Detail (`/products/[id]`):**
- Two-column layout: large image | details
- Product name, price, description, stock status badge
- Quantity selector + "Add to Cart" button
- Back link

### Phase 4: Pages — Cart + Checkout

**Cart (`/cart`):**
- Table: product thumbnail, name, quantity (editable), unit price, subtotal, remove
- Cart summary: total, "Proceed to Checkout" button
- Empty state with CTA to browse products
- Synchronized with cart drawer in layout

**Checkout (`/checkout`):**
- Shipping address form (react-hook-form + zod validation)
- Order summary sidebar (cart items, totals)
- "Place Order" button → `createOrder()` → redirect to order confirmation
- Redirect to login if not authenticated

### Phase 5: Pages — Account

**Login (`/account/login`):**
- Email + password form
- Error display for invalid credentials
- Link to register

**Register (`/account/register`):**
- Full name + email + password + confirm password
- Validation (zod schema)
- Auto-login on success, redirect to home

**My Orders (`/account/orders`):**
- Table: order ID, date, total, status badge, view link
- Empty state if no orders

**Order Detail (`/account/orders/[id]`):**
- Order info grid (ID, date, status, total, shipping address)
- Items table
- Back link

### Phase 6: Polish

- Toast notifications (sonner from shadcn) for cart actions, order placed, errors
- Loading skeletons for every data-fetching page
- Error boundaries for API failures
- Empty states for all list pages
- Mobile-responsive throughout
- Dark mode support (Tailwind dark class + shadcn theme)

## File Structure

```
storefront/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout + providers
│   │   ├── page.tsx                # Home
│   │   ├── products/
│   │   │   ├── page.tsx            # Product listing
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Product detail
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── checkout/
│   │   │   └── page.tsx
│   │   ├── account/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── layout.tsx          # Protected route layout
│   │   └── api/
│   │       └── auth/
│   │           ├── login/route.ts  # Set httpOnly cookie
│   │           └── logout/route.ts # Clear cookie
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   └── cart-drawer.tsx
│   │   ├── products/
│   │   │   ├── product-card.tsx
│   │   │   ├── product-grid.tsx
│   │   │   └── category-filter.tsx
│   │   ├── cart/
│   │   │   ├── cart-item.tsx
│   │   │   └── cart-summary.tsx
│   │   ├── orders/
│   │   │   ├── order-table.tsx
│   │   │   └── order-status-badge.tsx
│   │   └── auth/
│   │       ├── login-form.tsx
│   │       └── register-form.tsx
│   ├── hooks/
│   │   ├── use-products.ts
│   │   ├── use-cart.ts
│   │   ├── use-auth.ts
│   │   └── use-orders.ts
│   ├── lib/
│   │   ├── api.ts                  # Axios instance
│   │   ├── auth-context.tsx        # Auth provider
│   │   ├── cart-context.tsx        # Cart state
│   │   └── utils.ts
│   ├── services/
│   │   ├── catalog-service.ts
│   │   ├── cart-service.ts
│   │   ├── identity-service.ts
│   │   └── order-service.ts
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── public/
├── tailwind.config.ts
├── components.json                 # shadcn config
├── next.config.js
├── package.json
└── .env.local                      # NEXT_PUBLIC_GATEWAY_URL
```

## API Contract (from existing backend)

All endpoints return `ApiResponse<T>`: `{ success: boolean, message: string, data: T }`.

| Endpoint | Method | Auth | Response data |
|----------|--------|------|---------------|
| `/api/v1/catalog/products` | GET | No | `{ items: Product[], totalCount, page, pageSize }` |
| `/api/v1/catalog/products/{id}` | GET | No | `Product` |
| `/api/v1/catalog/categories` | GET | No | `{ items: Category[], totalCount, ... }` |
| `/api/v1/cart` | GET | No | `Cart` (auth via JWT or X-Cart-Id header) |
| `/api/v1/cart/items` | POST | No | `Cart` |
| `/api/v1/cart/items/{productId}` | PUT/DELETE | No | `Cart` |
| `/api/v1/cart` | DELETE | No | void |
| `/api/v1/cart/merge` | POST | Yes | void |
| `/api/v1/identity/login` | POST | No | `{ accessToken, refreshToken, expiresIn }` |
| `/api/v1/identity/register` | POST | No | `{ accessToken, refreshToken, expiresIn }` |
| `/api/v1/identity/me` | GET | Yes | `UserDto` |
| `/api/v1/identity/logout` | POST | Yes | void |
| `/api/v1/order/orders` | GET | Yes | `OrderDto[]` |
| `/api/v1/order/orders` | POST | Yes | `OrderDto` |

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Axios over fetch | Interceptors for auto-attaching Bearer token, ApiResponse unwrapping |
| JWT in httpOnly cookie (not localStorage) | Prevents XSS token theft. Server-side middleware reads cookie for SSR |
| Cart in localStorage + X-Cart-Id header | Backend already supports anonymous carts via X-Cart-Id. UUID generated client-side |
| Server Components for initial data | Products page uses SSR for SEO + fast first paint. Client components for interactivity |
| Optimistic updates for cart mutations | Instant UI feedback — rollback on error |
| shadcn/ui components | Pre-built accessible components, customizable via Tailwind, consistent design language |

## Verification

```bash
cd storefront
npm run dev
# Open http://localhost:3000
# 1. Home page loads products + categories
# 2. Filter by category works
# 3. Product detail shows stock + add to cart
# 4. Cart page allows quantity edit + remove
# 5. Register → login → cart persists (X-Cart-Id → userId)
# 6. Checkout creates order → redirects to confirmation
# 7. My Orders lists past orders
# 8. Mobile responsive at all breakpoints
```

## Risk

| Risk | Mitigation |
|------|-----------|
| CORS between localhost:3000 and :8080 | Gateway already has `globalcors: allowedOrigins: "*"`. NextJS API routes proxy to gateway if needed |
| Cart X-Cart-Id persistence across sessions | localStorage survives page reloads. Clear on logout, re-generate |
| React Query stale data after mutations | `queryClient.invalidateQueries` after every cart/order mutation |
| SEO for product pages | NextJS App Router Server Components render product data server-side |
