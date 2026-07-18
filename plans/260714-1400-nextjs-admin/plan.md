---
phase: 0
title: "NextJS Admin Dashboard — Modern SPA replacing admin-web"
status: completed
priority: P1
effort: "3d"
dependencies: []
---

# Plan: NextJS Admin Dashboard

Replace the Thymeleaf server-rendered `admin-web` with a modern NextJS 14 (App Router) admin dashboard using TailwindCSS, shadcn/ui, and TanStack React Query. All backend calls go through the existing Spring Cloud Gateway at `http://localhost:8080/api/v1/*`.

## Architecture

```
Browser → NextJS (localhost:3001)
        → Gateway (localhost:8080)
        → backend services (catalog/identity/order/inventory/payment)
```

- **Data fetching:** TanStack React Query for all API calls
- **Auth:** JWT from identity-service stored in httpOnly cookie. Login page → `POST /api/v1/identity/login` → store token in cookie via NextJS API route. Middleware checks cookie, redirects to `/login` if absent
- **Layout:** Sidebar navigation (collapsible) + top header bar + main content area
- **Styling:** TailwindCSS + shadcn/ui (Table, Card, Dialog, Form, Badge, Select, Input, Button, Sheet, DropdownMenu)
- **Tables:** TanStack Table for sortable/filterable data tables with pagination

## Feature parity with admin-web

| Page | Route | Data Sources |
|------|-------|-------------|
| Login | `/login` | `POST /api/v1/identity/login` |
| Dashboard | `/` | Aggregate stats from orders + catalog + users endpoints |
| Products List | `/products` | `GET /api/v1/catalog/products` (paginated) |
| Product Create | `/products/new` | Form → `POST /api/v1/catalog/products` |
| Product Edit | `/products/[id]/edit` | `GET /api/v1/catalog/products/{id}` → form → `PUT` |
| Categories | `/categories` | `GET /api/v1/catalog/categories` |
| Orders List | `/orders` | `GET /api/v1/order/admin/orders` (paginated) |
| Order Detail | `/orders/[id]` | `GET /api/v1/order/admin/orders/{id}` + status update form |
| Users List | `/users` | `GET /api/v1/identity/admin/users` (paginated) |
| Inventory | `/inventory` | `GET /api/v1/inventory/stock-levels` (paginated) + stock update form |

## Phases

### Phase 1: Project Bootstrap + API Layer

- Bootstrap NextJS + Tailwind + shadcn/ui
- Install: `@tanstack/react-query`, `@tanstack/react-table`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `recharts`, `sonner`
- `src/lib/api.ts` — Axios instance, base URL from env, auto-attach Bearer token from cookie
- API service modules in `src/services/`:
  - `identity-service.ts` — `login(email, password)`, `getUsers(page)`, `lockUser(id)`, `unlockUser(id)`
  - `catalog-service.ts` — `getProducts(page)`, `getProduct(id)`, `createProduct(data)`, `updateProduct(id, data)`, `deleteProduct(id)`, `getCategories()`
  - `order-service.ts` — `getOrders(page)`, `getOrder(id)`, `updateOrderStatus(id, status)`
  - `inventory-service.ts` — `getStockLevels(page)`, `updateStockLevel(productId, qty)`
- All services unwrap `ApiResponse<T>` → return `.data`. Error handling returns `ApiResponse` error messages
- React Query hooks: `useProducts`, `useProduct`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useCategories`, `useOrders`, `useOrder`, `useUpdateOrderStatus`, `useUsers`, `useLockUser`, `useUnlockUser`, `useStockLevels`, `useUpdateStockLevel`, `useLogin`, `useDashboardStats`

### Phase 2: Auth + Layout

- Auth flow:
  - Login page (`/login`) — email + password form. On success, set token cookie via API route, redirect to `/`
  - API route `src/app/api/auth/login/route.ts` — sets `token` httpOnly cookie
  - Middleware `src/middleware.ts` — redirects to `/login` if no token cookie, except for login page and static assets
  - Auth context provider — reads token from cookie, provides `logout()` that clears cookie
- Layout:
  - Sidebar: collapsible with icons + labels. Nav items: Dashboard, Products, Categories, Orders, Users, Inventory
  - Sidebar active state driven by `usePathname()`
  - Header bar: breadcrumb, user email display, logout button
  - Mobile: sidebar collapses to Sheet (hamburger menu)
- Dashboard stats cards:
  - Total Orders, Total Revenue, Pending Orders, Confirmed Orders
  - Charts: orders over time (simple bar chart with Recharts), top products
  - Stats fetched from multiple endpoints, aggregated client-side

### Phase 3: Products Management

**Products List (`/products`):**
- Data table (TanStack Table): ID, Name, Price, Stock, Category, Actions
- Column sorting + pagination (server-side via `page` param)
- "Add Product" button → `/products/new`
- Action buttons per row: Edit, Delete (with confirmation Dialog)
- Delete confirmation via AlertDialog from shadcn

**Product Create (`/products/new`):**
- Form: name, description, price, imageUrl, stock, categoryId (Select dropdown from categories)
- Validation: zod schema, react-hook-form
- On submit → `useCreateProduct` → invalidate products query → redirect to list
- Toast notification on success/failure

**Product Edit (`/products/[id]/edit`):**
- Pre-populated form from `useProduct(id)`
- Same form as Create, with pre-filled values
- On submit → `useUpdateProduct` → toast → redirect

### Phase 4: Orders + Categories Management

**Categories (`/categories`):**
- Simple table: ID, Name, Description
- Read-only for now (backend supports CRUD but admin-web only reads)

**Orders List (`/orders`):**
- Data table: ID, User ID, Date (formatted), Total ($), Status (colored badge), View action
- Pagination
- Status badge: PENDING=yellow, CONFIRMED=green, CANCELLED=red, SHIPPED=blue

**Order Detail (`/orders/[id]`):**
- Order info card: ID, User, Date, Total, Status, Shipping Address
- Items table: Product, Qty, Unit Price, Subtotal
- Status update form: Select dropdown (PENDING/CONFIRMED/CANCELLED/SHIPPED) + "Update" button
- On status update → `useUpdateOrderStatus` → toast → reload

### Phase 5: Users + Inventory Management

**Users List (`/users`):**
- Data table: ID, Email, Full Name, Roles, Locked (badge), Actions
- Pagination
- Lock/Unlock toggle button per row → `useLockUser`/`useUnlockUser` → toast

**Inventory (`/inventory`):**
- Data table: Product ID, Stock Level (color-coded: red if ≤ 10), Actions
- Pagination
- Inline stock update: number input + "Update" button per row
- Low stock items highlighted in red
- Toast on update

### Phase 6: Polish

- Loading skeletons for all data tables (shadcn Skeleton component)
- Toast notifications (sonner) for all CRUD operations
- Error handling: display error messages inline in forms, toasts for API failures
- Empty states for all tables ("No products yet" with CTA to create)
- Responsive: sidebar collapses to hamburger menu on mobile, tables scroll horizontally
- Dark mode support (Tailwind dark class + shadcn theme toggle)

## File Structure

```
admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with sidebar + auth provider
│   │   ├── page.tsx                # Dashboard
│   │   ├── login/
│   │   │   └── page.tsx            # Login form
│   │   ├── products/
│   │   │   ├── page.tsx            # Products list
│   │   │   ├── new/page.tsx        # Create product
│   │   │   └── [id]/
│   │   │       └── edit/page.tsx   # Edit product
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx            # Orders list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Order detail
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           └── login/route.ts  # Set httpOnly cookie
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── admin-layout.tsx
│   │   ├── dashboard/
│   │   │   ├── stats-cards.tsx
│   │   │   └── charts.tsx
│   │   ├── products/
│   │   │   ├── products-table.tsx
│   │   │   └── product-form.tsx
│   │   ├── orders/
│   │   │   ├── orders-table.tsx
│   │   │   └── order-status-badge.tsx
│   │   ├── users/
│   │   │   └── users-table.tsx
│   │   └── inventory/
│   │       └── inventory-table.tsx
│   ├── hooks/
│   │   ├── use-products.ts
│   │   ├── use-orders.ts
│   │   ├── use-users.ts
│   │   ├── use-inventory.ts
│   │   ├── use-auth.ts
│   │   └── use-dashboard.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth-context.tsx
│   │   └── utils.ts
│   ├── services/
│   │   ├── identity-service.ts
│   │   ├── catalog-service.ts
│   │   ├── order-service.ts
│   │   └── inventory-service.ts
│   └── types/
│       └── index.ts
├── public/
├── tailwind.config.ts
├── components.json
├── next.config.js
├── package.json
└── .env.local                      # NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080
```

## API Contract

| Endpoint | Method | Auth | Response data |
|----------|--------|------|---------------|
| `/api/v1/identity/login` | POST | No | `TokenResponse` |
| `/api/v1/identity/admin/users` | GET | Yes (ROLE_ADMIN) | `PagedResult<UserDto>` |
| `/api/v1/identity/admin/users/{id}/lock` | POST | Yes (ROLE_ADMIN) | `ApiResponse<Void>` |
| `/api/v1/identity/admin/users/{id}/unlock` | POST | Yes (ROLE_ADMIN) | `ApiResponse<Void>` |
| `/api/v1/catalog/products` | GET | No | `PagedResult<ProductDto>` |
| `/api/v1/catalog/products` | POST | Yes (ROLE_ADMIN) | `ProductDto` |
| `/api/v1/catalog/products/{id}` | GET | No | `ProductDto` |
| `/api/v1/catalog/products/{id}` | PUT | Yes (ROLE_ADMIN) | `void` |
| `/api/v1/catalog/products/{id}` | DELETE | Yes (ROLE_ADMIN) | `void` |
| `/api/v1/catalog/categories` | GET | No | `PagedResult<CategoryDto>` |
| `/api/v1/order/admin/orders` | GET | Yes (ROLE_ADMIN) | `PagedResult<OrderDto>` |
| `/api/v1/order/admin/orders/{id}` | GET | Yes (ROLE_ADMIN) | `OrderDto` |
| `/api/v1/order/admin/orders/{id}/status` | PATCH | Yes (ROLE_ADMIN) | `void` |
| `/api/v1/inventory/stock-levels` | GET | Yes (ROLE_ADMIN) | `PagedResult<StockLevelDto>` |
| `/api/v1/inventory/stock-levels/{productId}` | PUT | Yes (ROLE_ADMIN) | `StockLevelDto` |

PagedResult shape: `{ items: T[], page: number, pageSize: number, totalCount: number }`

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| JWT in httpOnly cookie | Admin credentials have high privilege — never expose token to JS |
| TanStack Table for all list pages | Consistent pagination, sorting, filtering across products/orders/users/inventory |
| shadcn AlertDialog for deletes | Prevents accidental deletions of products |
| Inline stock update (not separate page) | Faster workflow for inventory management |
| Dashboard stats from multiple endpoints | No `/api/v1/admin/stats` endpoint exists. Aggregate client-side from orders + products + users endpoints |
| All tables server-side paginated | Large datasets (100+ orders) shouldn't load all at once |

## Verification

```bash
cd admin
npm run dev
# Open http://localhost:3001
# 1. Login with admin@store.com / Admin123!
# 2. Dashboard shows stats cards
# 3. Products: list loads, create new, edit existing, delete with confirmation
# 4. Categories: list displays
# 5. Orders: list loads with status badges, click to detail, update status
# 6. Users: list loads, lock/unlock toggles work
# 7. Inventory: list loads, inline stock update works
# 8. Logout clears cookie, redirects to login
# 9. Mobile responsive at all breakpoints
# 10. Direct access to /admin while logged out → redirected to /login
```

## Risk

| Risk | Mitigation |
|------|-----------|
| Admin routes need ROLE_ADMIN JWT | Identity service validates roles. If token has only ROLE_USER, backend returns 403 — display "Unauthorized" message in UI |
| Token expiry during long admin sessions | React Query `onError` handler checks for 401 → redirect to login |
| Product delete cascading issues | Backend returns 409 CONFLICT if product has references. Show error toast with message |
| Large tables performance | Server-side pagination (pageSize=20) keeps payloads small. TanStack Table renders only visible rows |
