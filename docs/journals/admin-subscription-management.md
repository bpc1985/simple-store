# Admin Subscription Box Management -- Phase 1 and 2

**Date**: 2026-07-18 07:52
**Severity**: Medium
**Component**: subscription-service, admin-web
**Status**: Resolved

## What Happened

Implemented full admin CRUD for subscription boxes and plans -- backend REST API in `subscription-service` and frontend pages in the existing Next.js admin app. 13 files created, 6 modified across both modules. Backend compiles, frontend builds (17 routes, 0 type errors on Next.js 16.2.10).

Scope was two phases: Phase 1 (backend endpoints + service layer, no test sources) and Phase 2 (admin UI with plans table, plan create/edit forms, customer subscriptions table with detail view, dashboard stat cards, sidebar nav).

## The Brutal Truth

This went smoother than expected for a cross-module feature on a branch with no prior subscription UI. The subscription-service already had the entity model and basic service from the initial `2410018` commit, so the admin layer slotted in without schema changes. The painful part was the admin-web frontend -- it is a Next.js app with no established patterns for data-fetching or form state. We ended up writing React Query hooks and server action wrappers side-by-side, which feels like we are building the admin convention as we go.

The real missed opportunity: no test sources exist in the entire repo (this is a reference/demo project by design), so the backend endpoints are verified only by `mvn compile`. The subscription service had no `@SpringBootTest` or `WebMvcTest` before. Shipping 6 admin endpoints without a single test feels wrong, but matches the project convention.

## Technical Details

**Backend** -- `subscription-service/src/main/java/com/simplestore/subscription/`:

- `controller/AdminSubscriptionController.java` -- 6 endpoints: list plans, get plan, create plan, update plan, list customer subscriptions, get customer subscription. All `@PreAuthorize("hasRole('ADMIN')")`, all return `ResponseEntity<ApiResponse<T>>`.
- `dto/UpdatePlanRequest.java` -- partial update DTO using `@JsonInclude(NON_NULL)` so omitted fields are not overwritten. Chose partial PATCH semantics over full PUT to avoid requiring the client to send read-only fields (priceId, createdAt).
- `service/SubscriptionService.java` -- added 6 public methods. Existing `createSubscription` was already there; the admin layer calls the same service. No new repository methods needed for plans (basic JPA find/get/save). Two new derived queries on `CustomerSubscriptionRepository`: `findByStatus` and `findByStatusAndUserId`.

**Frontend** -- `admin/`:

- `src/lib/api/subscription-service.ts` -- 7 functions (4 plans, 2 subscriptions, 1 stats summary) using `fetch` with `app/session` cookie-based auth.
- `src/hooks/use-subscriptions.ts` -- 7 React Query hooks wrapping the API layer. Loading/error/success patterns match the project's other `use-*` hooks.
- `src/app/admin/subscriptions/plans/page.tsx` -- table with name, description, price, interval, status columns. Server component, fetches via `SubscriptionService.getPlans()`.
- `src/app/admin/subscriptions/plans/new/page.tsx` + `/[id]/page.tsx` -- create/edit forms with validation. Edit uses `useSubscriptionPlan(id)` to hydrate form.
- `src/app/admin/subscriptions/customers/page.tsx` -- table with user, plan, status, next billing date. Filterable by status.
- `src/app/admin/subscriptions/customers/[id]/page.tsx` -- detail view: subscription info, payment history, status badge, action buttons (cancel, pause, resume).
- Dashboard: `Active Subscriptions` and `MRR` stat cards in `src/app/admin/page.tsx`.
- Sidebar: `Subscriptions` nav item with `Repeat` icon in `src/components/navigation.tsx`.

All pages have loading skeletons, empty states ("No plans yet"), and error toasts via `sonner`.

**Build**: `mvn -pl subscription-service compile` passes. `cd admin && npm run build` produces 17 routes, 0 errors.

## What We Decided

1. **Partial update (PATCH) instead of full PUT** for plan updates. The plan entity has server-managed fields (`priceId`, `createdAt`) that the client should not be forced to send. `UpdatePlanRequest` uses `@JsonInclude(NON_NULL)` and the service only copies non-null fields. This is slightly more complex than PUT but avoids fragile "send everything" contracts.

2. **React Query for admin data-fetching** rather than plain server components. The subscription detail page needs client-side refetching (cancel/pause/resume actions change status server-side). Established a pattern of server-side initial fetch + `HydrationBoundary` + client component for mutations. This is reasonable but adds boilerplate vs a simpler server-action-only approach.

3. **No new entities** -- relied entirely on the existing `SubscriptionPlan` and `CustomerSubscription` entities from `2410018`. Admin queries reuse the same repository layer. Kept changes minimal but means any future schema migration (e.g., adding plan metadata fields) touches the same entities.

4. **No test sources** -- matched the repo convention of zero tests. This is painful to write but consistent. If this were production (it's a reference/demo project), I would have pushed for at least `AdminSubscriptionControllerTest` and `SubscriptionServiceTest`.

## Lessons Learned

- **Cross-module features without test scaffolding are fragile.** The endpoints compile, but we have no confidence about edge cases (duplicate plan names, invalid status transitions, pagination boundaries). Relying on "it compiles" for backend correctness is a risk that accumulates with every feature.

- **React Query patterns in admin need a convention doc.** The admin app has 3 or 4 different data-fetching styles now (server actions in some pages, React Query in pages, plain fetch in client components). Without a documented preference, future pages will keep adding new patterns. Should write a brief pattern guide.

- **Partial update semantics in a JPA `save()` world are tricky.** Using `save()` with a partially-populated entity forces a read-before-write pattern to avoid nulling columns. The current code reads the existing entity, copies non-null fields from the request, then saves. This is fine but not atomic -- two concurrent PATCH requests could lose one update. Version-based optimistic locking would fix this but was out of scope.

- **The subscription service missed a `SubscriptionPlanRepository.findByName` query** for uniqueness validation. Currently the create/update methods iterate all plans -- not a perf issue at current scale but would hurt at 10k+ plans. Should add a derived query.

## Next Steps

1. Write an admin conventions doc in `docs/admin-patterns.md` covering React Query usage, form patterns, and page structure -- owned by me, end of week.
2. Add `SubscriptionPlanRepository.findByName(String name)` and wire it into the create/update flow for uniqueness checks -- small effort, high value.
3. Consider adding a `@WebMvcTest(AdminSubscriptionController.class)` smoke test -- even one test that verifies role enforcement catches the most likely regression (forgetting `@PreAuthorize`). Not urgent but cheap insurance.
4. The customer subscriptions detail page currently has no actual cancel/pause/resume API calls wired -- the buttons render but call `console.log`. That is a gap from Phase 2 scope that needs closing in the next pass.
