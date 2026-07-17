# Implementation Roadmap

## Priority Tiers

| Priority | Criteria |
|----------|----------|
| **P0 — Immediate** | Blocks other work. Foundation. |
| **P1 — High ROI** | Direct conversion/UX impact. Low complexity. |
| **P2 — Medium ROI** | Important but can follow P1. |
| **P3 — Delight** | Nice-to-have. Polish. |

---

## Phase 1: Foundation + Core Shopping (Week 1-2)

### P0: Design System Foundation

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Add semantic color tokens (success/warning/info) | Foundation | 1h | — |
| Create spacing/motion/radius CSS variables | Foundation | 1h | — |
| Build `QuantitySelector` component | High | 2h | Tokens |
| Build `PriceDisplay` component | Medium | 1h | Tokens |
| Build `EmptyState` component | Medium | 1h | — |
| Build `PageHeader` component | Low | 1h | — |
| Build `SectionHeader` component | Low | 1h | — |
| Build `StockBadge` component | Medium | 1h | — |
| Build `SearchInput` component | High | 2h | — |
| Build `SortDropdown` component | Medium | 1h | — |

### P1: Homepage

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Redesign hero with search bar | High | 3h | SearchInput |
| Add horizontal-scroll New Arrivals section | Medium | 2h | ProductCard |
| Add category cards with icons/images | Medium | 2h | — |
| Add trust bar section | Medium | 1h | — |
| Add "Recently Viewed" section | Medium | 2h | ProductCard |

### P1: Product Listing

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Add debounced search (300ms) | High | 2h | SearchInput |
| Add sort dropdown | High | 1h | SortDropdown |
| Add filter sheet (mobile) + sidebar (desktop) | High | 4h | — |
| Active filter chips + Clear All | High | 2h | — |
| Result count display | Medium | 0.5h | — |
| Replace pagination with Load More | Medium | 2h | — |
| Sticky toolbar | Medium | 1h | — |
| Improve empty/error states | Medium | 1h | EmptyState |

### P1: Product Detail

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Image gallery with dot navigation | High | 3h | — |
| Sticky Add to Cart bar (mobile) | High | 2h | QuantitySelector |
| Inline add confirmation (no cart drawer) | Medium | 1h | — |
| Collapsible info sections (accordion) | Medium | 2h | — |
| Breadcrumbs | Medium | 1h | — |
| "You Might Also Like" section | Medium | 2h | ProductCard |
| Fix back button to use /products link | Low | 0.5h | — |

### P1: Cart

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Card layout on mobile | High | 2h | QuantitySelector |
| Sticky order summary (mobile + desktop) | High | 1h | — |
| Remove with undo toast | Medium | 1h | — |
| "You Might Also Like" section | Medium | 2h | ProductCard |
| Trust badges in sidebar | Low | 0.5h | — |

### P1: Checkout

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| 3-step progress indicator | High | 2h | — |
| Combine shipping fields into single form | Medium | 1h | — |
| Add autocomplete attributes | Medium | 0.5h | — |
| Product thumbnails in review step | Medium | 1h | — |
| Order confirmation page (new) | High | 2h | — |
| Shipping method selector | Medium | 1h | — |

---

## Phase 2: Account & Content (Week 3)

### P1: Auth Pages

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Redesign login/register with split layout | Medium | 3h | — |
| Password visibility toggle | Medium | 0.5h | — |
| Password strength meter (register) | Medium | 1h | — |
| Terms checkbox (register) | Low | 0.5h | — |
| Return-to redirect after login | High | 1h | — |
| Remember me checkbox | Low | 0.5h | — |

### P1: Account Pages

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Account hub page (new) | Medium | 3h | — |
| Orders card layout (mobile) | Medium | 2h | — |
| Order status timeline | Medium | 2h | — |
| Order status filter tabs | Medium | 1h | — |
| Cancel with confirmation dialog | Low | 1h | — |

### P2: Wishlist

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Wishlist page + localStorage persistence | High | 3h | ProductCard |
| Heart toggle on product cards + PDP | Medium | 2h | — |
| Wishlist link in header nav | Low | 0.5h | — |
| Share wishlist | Low | 1h | — |

### P2: 404 Page

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| 404 page with category links | Low | 1h | — |

---

## Phase 3: Trust & Delight (Week 4)

### P2: Content Pages

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| About page | Low | 2h | — |
| Contact page with form | Medium | 2h | — |
| FAQ page with accordion + search | Medium | 3h | — |
| Help Center hub | Medium | 3h | — |

### P2: Interaction Polish

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Skeleton loading pass (all pages) | Medium | 3h | — |
| Micro-interaction pass (buttons, cards, toasts) | Medium | 3h | — |
| Page transitions (subtle fade) | Low | 1h | — |
| Add-to-cart animation (button + badge bounce) | Medium | 1h | — |
| Pull-to-refresh disable | Low | 0.5h | — |
| Reduced-motion pass | High | 2h | — |

### P3: Accessibility Audit

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| Keyboard navigation audit | High | 2h | — |
| Screen reader testing | High | 2h | — |
| Contrast check (all pages) | High | 1h | — |
| Focus indicator audit | High | 1h | — |
| Skip-to-content link | Medium | 0.5h | — |
| ARIA labels on icon buttons | Medium | 1h | — |
| Form error aria-describedby links | Medium | 1h | — |

### P3: Performance

| Task | Impact | Effort | Depends On |
|------|--------|--------|------------|
| next/image for all product images | High | 2h | — |
| next/dynamic for cart drawer, modals | Medium | 1h | — |
| CLS audit (skeleton vs content match) | Medium | 1h | — |
| Font preload optimization | Low | 0.5h | — |

---

## Total Effort Estimate

| Phase | Tasks | Est. Hours |
|-------|-------|------------|
| Phase 1 (Foundation + Core) | 35 | 60-70h |
| Phase 2 (Account + Content) | 17 | 25-30h |
| Phase 3 (Trust + Delight) | 18 | 25-30h |
| **Total** | **70** | **110-130h** |

---

## Quick Wins (Highest ROI / Lowest Effort)

These can ship in the first 2-3 days for immediate impact:

1. **Debounced search** (2h) — Single biggest UX improvement for product discovery
2. **Sticky Add to Cart on PDP** (2h) — Direct conversion impact on mobile
3. **Card layout for cart on mobile** (2h) — Fixes broken mobile experience
4. **Return-to redirect after login** (1h) — Reduces checkout abandonment
5. **Add-to-cart inline confirmation** (1h) — Reduces disruption during browsing
6. **Order confirmation page** (2h) — Critical trust signal post-purchase
7. **Password visibility toggle** (0.5h) — Standard UX expectation
8. **Result count on product listing** (0.5h) — Sets expectations immediately
9. **Empty state improvements** (1h) — Reduces dead-end frustration
10. **Focus indicators pass** (1h) — WCAG compliance, helps keyboard users

**10 quick wins = ~13 hours for massive UX improvement.**
