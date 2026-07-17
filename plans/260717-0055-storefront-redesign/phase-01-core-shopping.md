# Phase 1: Core Shopping Flow Redesign

## 0. Design System Foundation

Before touching any page, establish unified design tokens and component library.

### Typography Scale

```
text-xs:    0.75rem (12px) — badges, captions, metadata
text-sm:    0.875rem (14px) — secondary text, labels, help text
text-base:  1rem (16px) — body copy, form inputs, product names
text-lg:    1.125rem (18px) — emphasized body, card titles
text-xl:    1.25rem (20px) — section headers
text-2xl:   1.5rem (24px) — page titles
text-3xl:   1.875rem (30px) — major page headings
text-4xl:   2.25rem (36px) — hero (mobile)
text-5xl:   3rem (48px) — hero (tablet)
text-6xl:   3.75rem (60px) — hero (desktop)
```

Keep Montserrat as single font family. Use weight hierarchy: 400 body, 500 labels/buttons, 600 headings. Add `font-feature-settings: "tnum"` for all prices (tabular numbers prevent layout shift on price changes).

### Spacing System (4px base)

```
space-0:   0
space-1:   0.25rem (4px)  — icon gaps, tight inline
space-2:   0.5rem (8px)   — related element gap
space-3:   0.75rem (12px) — card padding internal
space-4:   1rem (16px)    — standard component gap
space-6:   1.5rem (24px)  — section gap
space-8:   2rem (32px)    — major section separation
space-12:  3rem (48px)    — page section divider
space-16:  4rem (64px)    — hero/content separation
```

### Color Refinements

Current palette is solid. Key improvements:

- **Add semantic success/warning/info tokens** — currently using ad-hoc emerald classes
- **Define `--color-success`**, `--color-warning`, `--color-info` in both light and dark
- **Price color**: Use `--foreground` for prices (not green or primary). Green implies discount. Price is information, not action.
- **CTA color**: differentiate `--cta` from `--primary` (currently both #2563EB). CTA should be warmer/more urgent. Suggestion: keep primary as blue, CTA as slightly warmer blue or use accent amber for limited-time actions only.
- **Add `--color-surface-raised`**: slightly lighter than background for cards that need lift without full white

### Grid System

- Container: `max-w-7xl` (1280px) with 16px padding on mobile, 24px on tablet, 32px on desktop
- Product grid: 2 cols mobile (375-639), 3 cols tablet (640-1023), 4 cols desktop (1024+)
- Content pages: single column, max-w-3xl for readability (65ch)

### Elevation Scale

```
elevation-0: none (flat surfaces)
elevation-1: 0 1px 3px oklch(0.55 0.18 250 / 6%) — cards at rest
elevation-2: 0 4px 12px oklch(0.55 0.18 250 / 8%) — dropdowns, popovers
elevation-3: 0 8px 24px oklch(0.55 0.18 250 / 10%) — modals, sheets
elevation-4: 0 16px 48px oklch(0.55 0.18 250 / 12%) — highest priority (notifications)
```

All shadow hues match primary (blue 250).

### Motion Tokens

```
--duration-instant: 100ms (focus rings, state changes)
--duration-fast: 150ms (hover transitions, button color)
--duration-normal: 250ms (slide-ins, expand/collapse)
--duration-slow: 350ms (page transitions, drawer open)
--ease-out: cubic-bezier(0, 0, 0.2, 1) — entering elements
--ease-in: cubic-bezier(0.4, 0, 1, 1) — exiting elements
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1) — symmetric transitions
```

### Component Tokens (CSS custom properties)

```css
--button-height-sm: 2.25rem (36px)
--button-height-md: 2.75rem (44px) — primary touch target
--button-height-lg: 3.25rem (52px) — hero CTAs, checkout
--input-height: 2.75rem (44px)
--icon-size-sm: 1rem
--icon-size-md: 1.25rem
--icon-size-lg: 1.5rem
```

### Reusable Components to Build

| Component | Purpose | Priority |
|-----------|---------|----------|
| `QuantitySelector` | Reusable +/- quantity control | Phase 1 |
| `PriceDisplay` | Formatted price with currency, tabular nums | Phase 1 |
| `StockBadge` | In-stock/out-of-stock/low-stock badge | Phase 1 |
| `EmptyState` | Icon + message + CTA pattern | Phase 1 |
| `PageHeader` | Consistent page title + breadcrumb | Phase 1 |
| `SectionHeader` | Section title + optional "View all" link | Phase 1 |
| `TrustBadges` | Payment/security/shipping icons row | Phase 1 |
| `SearchInput` | Debounced search with icon + clear button | Phase 1 |
| `SortDropdown` | Sort options dropdown | Phase 1 |
| `FilterPanel` | Mobile-friendly filter sheet | Phase 2 |
| `ReviewStars` | Rating display component | Phase 2 |
| `Breadcrumbs` | Auto-generated breadcrumb trail | Phase 2 |
| `Toast` | Already using Sonner — keep | Already done |

---

## 1. Homepage

### UX Problems Identified

1. **Hero lacks visual depth** — Blue-50 background is flat, no product imagery, no brand expression. Looks like a wireframe, not a store.
2. **No value proposition** — "Well-made things, fair prices, no fuss" is generic. No trust signals, no differentiation.
3. **Featured products section has no "View All"** — Users must scroll back up or navigate manually.
4. **Categories section is just text pills** — No visual representation. Users can't scan by image.
5. **No personalization** — Same hero for returning visitors. No "Continue shopping" or "Recently viewed."
6. **Single static page** — No seasonal content, no new arrivals, no bestsellers sections.
7. **No social proof** — No review snippets, no "X customers bought this."
8. **Missing search bar** — Users must navigate to /products to search. Homepage should offer discovery.

### Redesign

**UX Goals:** Build trust immediately. Enable fast product discovery. Show brand personality. Reduce bounce.

**Layout — Mobile (375px):**
```
┌────────────────────────────┐
│ [Header — sticky]          │
├────────────────────────────┤
│ Hero Banner                │
│ [Large product image bg]   │
│ "Discover quality goods"   │
│ [Search bar]               │
│ [Shop All] [Categories ▼]  │
├────────────────────────────┤
│ New Arrivals (horizontal   │
│ scroll cards)              │
│ [Card] [Card] [Card] →     │
├────────────────────────────┤
│ Categories (2-col grid)    │
│ [Electronics] [Clothing]   │
│ [Home]        [Sports]     │
├────────────────────────────┤
│ Bestsellers (2-col grid)   │
│ [Card] [Card]              │
│ [Card] [Card]              │
│ [View All →]               │
├────────────────────────────┤
│ Trust Bar                  │
│ 🚚 Free Shipping           │
│ 🔒 Secure Checkout         │
│ ↩️ Easy Returns             │
├────────────────────────────┤
│ [Footer]                   │
└────────────────────────────┘
```

**Layout — Desktop (1280px):**
```
┌──────────────────────────────────────┐
│ [Header — sticky]                    │
├──────────────────────────────────────┤
│ Hero (2-col split)                   │
│ ┌─────────────────┐ ┌──────────────┐│
│ │ Headline        │ │              ││
│ │ Subheadline     │ │ Product hero ││
│ │ [Search bar]    │ │ image        ││
│ │ [CTA] [CTA 2]   │ │              ││
│ └─────────────────┘ └──────────────┘│
├──────────────────────────────────────┤
│ New Arrivals                         │
│ [Card] [Card] [Card] [Card] [View→] │
├──────────────────────────────────────┤
│ Bestsellers          Categories      │
│ [Card] [Card]        [Electronics]   │
│ [Card] [Card]        [Clothing]      │
│ [Card] [Card]        [Home]          │
│ [View All →]         [Sports]        │
├──────────────────────────────────────┤
│ Trust Bar (3 icons in a row)         │
│ [Footer]                             │
└──────────────────────────────────────┘
```

### Key Improvements

1. **Hero with lifestyle imagery** — Full-bleed product shot as background, dark overlay, white text. Alternatively, split-layout with image + copy side-by-side on desktop.
2. **Inline search bar in hero** — Debounced, shows quick results dropdown (top 4 products). "Press Enter for all results."
3. **Horizontal scroll sections** — New Arrivals and Bestsellers use horizontal scroll on mobile (with arrow buttons on desktop). CSS `scroll-snap-type: x mandatory`.
4. **Category cards with icons/images** — Replace text pills with visual cards. Each category gets a representative emoji-free SVG icon or product image.
5. **Trust bar** — 3 icons (free shipping, secure payment, easy returns) with short labels. Persistent across all pages in footer area.
6. **"Recently Viewed" section** — Appears if user has browsing history (stored in localStorage). Horizontal scroll.
7. **Loading state** — Skeleton cards in grid layout matching final layout (no layout shift).
8. **Empty state** — "No products available yet. Check back soon!" with illustration.

---

## 2. Product Listing Page (/products)

### UX Problems Identified

1. **Search is not debounced** — User must press Enter. No instant feedback. Search bar placement is inconsistent (top-right on desktop, full-width form on mobile).
2. **No sort options** — Products always in default order. No "Price: Low to High", "Newest", etc.
3. **No filter options besides category** — No price range, no in-stock toggle, no rating filter.
4. **Category pills wrap endlessly** — If many categories, the pill bar becomes a multi-line mess.
5. **Pagination is number-based only** — No "Show more" infinite scroll option. Numbered pagination requires mental math.
6. **No active filter summary** — User can't see what's applied at a glance. No "Clear all filters."
7. **No result count** — User doesn't know how many products match their search.
8. **Search bar disappears on mobile** — Small "Search products..." input is easily missed.
9. **No grid/list view toggle** — Single view mode. Some users prefer list view for comparison.
10. **"No products found" is dead-end** — No suggestions, no category links, no search tips.

### Redesign

**UX Goals:** Enable quick filtering. Show relevant results fast. Make search delightful. Reduce dead ends.

**Layout — Mobile:**
```
┌────────────────────────────┐
│ ← Products        [Filter] │ ← Sticky toolbar
├────────────────────────────┤
│ [🔍 Search products...    ]│ ← Persistent search bar
│ [Filter chips: scrollable] │ ← Active filters as removable chips
│ "24 results"               │ ← Result count
├────────────────────────────┤
│ Sort: [Relevance ▼]        │
├────────────────────────────┤
│ Product Grid (2 cols)      │
│ [Card] [Card]              │
│ [Card] [Card]              │
│ [Card] [Card]              │
├────────────────────────────┤
│ [Show More]                │ ← Load more button instead of pagination
└────────────────────────────┘
```

**Filter Sheet (from bottom on mobile):**
```
┌────────────────────────────┐
│ Filters              [Done]│
├────────────────────────────┤
│ Categories                 │
│ ☐ Electronics             │
│ ☐ Clothing                │
│ ☐ Home & Garden           │
├────────────────────────────┤
│ Price Range                │
│ [Min] ———[slider]——— [Max]│
├────────────────────────────┤
│ Availability               │
│ ☑ In Stock Only           │
├────────────────────────────┤
│ [Clear All Filters]        │
└────────────────────────────┘
```

### Key Improvements

1. **Sticky toolbar** — Search, filter button, result count, sort dropdown all in one sticky bar at top. Follows user as they scroll.
2. **Debounced search** — 300ms debounce. Show results as user types. URL updates without full page reload (shallow routing).
3. **Filter Sheet (mobile)** / **Filter Sidebar (desktop)** — Categories, price range slider, in-stock toggle. Filters persist in URL params.
4. **Active filter chips** — Each active filter shown as removable chip below search. "Clear all" link when any filter active.
5. **Result count** — Always visible: "Showing 24 of 156 products".
6. **Sort dropdown** — Options: Relevance, Price Low→High, Price High→Low, Newest, Name A-Z.
7. **"Load More" pagination** — Replace numbered pagination with "Show More" button. Preserves scroll position. Optional: keep numbered pagination as secondary option for power users.
8. **Empty state improvements** — "No products match your search." + suggestions: "Try broadening your search", "Browse categories", popular search terms, "Clear all filters" button.
9. **Error state** — Network error: "Couldn't load products. [Try Again]" button. Backend error: specific message from API.
10. **Loading state** — Skeleton grid matching 2/3/4 column layout. No layout shift between loading and loaded states.

---

## 3. Product Detail Page (/products/[id])

### UX Problems Identified

1. **Image is static** — No zoom, no gallery, no swipe for multiple images. Single image only.
2. **No image thumbnails** — Even with single image, could show different angles.
3. **Back button uses `router.back()`** — Breaks if user came from external link. Should link to /products with preserved filters.
4. **Add to cart opens cart drawer** — Disruptive. Should show inline confirmation + keep user on PDP for continued browsing.
5. **No product recommendations** — Missed cross-sell/upsell opportunity.
6. **No breadcrumbs** — User can lose sense of location.
7. **No shipping/return info** — User must guess shipping cost and return policy.
8. **Stock info is technical** — "In Stock (42 available)" could just say "In Stock" with low-stock warning when < 5.
9. **Quantity selector hidden when out of stock** — Shows nothing. Should show "Out of Stock" with "Notify Me" option.
10. **No social proof** — No reviews, no ratings, no "X people bought this."
11. **Description is plain text** — No formatting, no key features list, no specs table.

### Redesign

**Layout — Mobile:**
```
┌────────────────────────────┐
│ ← Back to Products         │ ← Breadcrumb
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │                        │ │
│ │   Product Image        │ │ ← Swipeable gallery
│ │   (full width)         │ │
│ │                        │ │
│ │ ● ● ● ○  (dot nav)     │ │ ← Image indicators
│ └────────────────────────┘ │
├────────────────────────────┤
│ Electronics                │ ← Category label
│ Product Name               │ ← H1
│ ★★★★☆ (24 reviews)        │ ← Rating + count
│ $49.99                     │ ← Price (tabular nums)
│ In Stock ✓                 │ ← Stock badge
├────────────────────────────┤
│ [−]  1  [+]  [Add to Cart]│ ← Sticky bottom bar
├────────────────────────────┤
│ Description                │ ← Collapsible sections
│ ▶ Key Features             │
│ ▶ Specifications           │
│ ▶ Shipping & Returns       │
├────────────────────────────┤
│ You Might Also Like        │ ← Horizontal scroll
│ [Card] [Card] [Card] →     │
├────────────────────────────┤
│ Recently Viewed            │
│ [Card] [Card] [Card] →     │
└────────────────────────────┘
```

### Key Improvements

1. **Image gallery** — Swipeable image carousel with dot indicators. Pinch-to-zoom on mobile. Click-to-zoom modal on desktop.
2. **Sticky Add to Cart bar** — Appears at bottom on mobile scroll, stays visible. Shows product name, price, quantity selector, Add to Cart button. One-thumb accessible.
3. **Inline add confirmation** — After adding, show a subtle inline confirmation with "View Cart" and "Continue Shopping" links. Don't auto-open cart drawer.
4. **Breadcrumbs** — Home > Category > Product Name. Clickable. Preserves filter state.
5. **Collapsible info sections** — Description, Features, Specs, Shipping each as expandable accordion sections. Progressive disclosure reduces cognitive load.
6. **Product recommendations** — "You Might Also Like" (same category), "Frequently Bought Together" (cross-sell). Horizontal scroll on mobile, grid on desktop.
7. **Shipping estimate** — Simple inline: "Free shipping over $50" or "Ships in 1-2 business days."
8. **Review stars** — Show average rating. Click to jump to reviews section.
9. **Price formatting** — Tabular numbers, no green color (price is neutral information). Sale prices in red/destructive with strikethrough original.
10. **Loading state** — Image skeleton (aspect-ratio preserved), text skeletons for name/price/description, Add to Cart skeleton.
11. **404 state** — "Product not found." illustration + "Browse all products" CTA.

---

## 4. Cart Page (/cart)

### UX Problems Identified

1. **Table layout is desktop-centric** — Breaks on mobile (horizontal scroll or cramped). Better as cards on mobile.
2. **No product images in table** — Can't visually verify items. Name-only identification.
3. **Quantity input is raw number input** — Small, hard to tap on mobile. Should use +/- stepper.
4. **No "Save for later"** — Remove is permanent. No undo.
5. **Order summary card is after items** — "Below the fold" on mobile with many items. Should be sticky.
6. **No cross-sell** — Empty space where recommendations could drive additional purchases.
7. **Loading: skeleton rows in table** — Shows empty table skeleton, then populated table. CLS risk.
8. **No estimated shipping/tax** — "Order Summary" shows only subtotal. Feels incomplete.

### Redesign

**Layout — Mobile:**
```
┌────────────────────────────┐
│ Cart (3 items)             │
├────────────────────────────┤
│ [Product card]             │
│ ┌──────┐ Product Name      │
│ │      │ $49.99            │
│ │ img  │ [−] 1 [+]  [🗑]   │
│ └──────┘                   │
├────────────────────────────┤
│ [Product card]             │
│ ...                        │
├────────────────────────────┤
│ [Product card]             │
│ ...                        │
├────────────────────────────┤
│ Order Summary (sticky)     │
│ Subtotal (3 items)  $149.97│
│ Shipping          Calculated│
│ at next step               │
│ ─────────────────────────  │
│ Total              $149.97 │
│ [Proceed to Checkout]      │
│ or [Continue Shopping →]   │
├────────────────────────────┤
│ You Might Also Like        │
│ [Card] [Card] [Card] →     │
└────────────────────────────┘
```

**Layout — Desktop:**
```
┌──────────────────────────────────────┐
│ Cart (3 items)                       │
├──────────────────────┬───────────────┤
│ Product cards        │ Order Summary │ ← Sticky sidebar
│ ┌─────┬────────────┐ │               │
│ │ img │ Name        │ │ Subtotal      │
│ │     │ $49.99      │ │ Shipping      │
│ │     │ [-][1][+] 🗑│ │ Tax           │
│ └─────┴────────────┘ │ ─────         │
│ ┌─────┬────────────┐ │ Total         │
│ │ ... │ ...        │ │               │
│ └─────┴────────────┘ │ [Checkout]    │
│                      │               │
│ [Continue Shopping]  │ Trust badges  │
└──────────────────────┴───────────────┘
│ You Might Also Like                  │
│ [Card] [Card] [Card] [Card]          │
└──────────────────────────────────────┘
```

### Key Improvements

1. **Card-based layout on mobile** — Each item as a card with image, name, price, QuantitySelector, remove button. No horizontal scroll.
2. **Use QuantitySelector component** — Consistent +/- buttons, not raw number input. Min 1, disabled at 1.
3. **Sticky order summary** — On desktop: sticky sidebar. On mobile: sticky bottom bar with total + checkout CTA.
4. **Cross-sell section** — "You might also like" based on cart contents. Horizontal scroll cards.
5. **Remove with undo** — On remove, show toast with "Undo" action (3-second window). Better than confirm dialog — less friction.
6. **Continue shopping link** — Prominent secondary action below checkout button.
7. **Trust badges in sidebar** — Small icons: secure checkout, free shipping over $X, easy returns.
8. **Empty state** — Shopping cart icon, "Your cart is empty", "Browse Products" CTA, recently viewed products section.
9. **Loading state** — Skeleton cards with image placeholder. Not table skeletons.

---

## 5. Checkout Page (/checkout)

### UX Problems Identified

1. **Two-stage state machine is confusing** — "Review Order" button looks like final submit, but it's just step 1 of 2. User may think they're done.
2. **No progress indicator** — User doesn't know they're in a multi-step flow.
3. **Shipping form is bare** — 4 fields. No address validation, no autocomplete hints, no saved addresses.
4. **"Review Order" CTA text is ambiguous** — Sounds like viewing, not committing. Should be "Continue to Review" or step indicator.
5. **Review step shows items as plain text** — No images, no organized layout. Hard to verify at a glance.
6. **No payment step** — No card/PayPal/etc. The "Confirm" button processes the order directly from shipping info. Payment is implied/skipped. This is a trust issue.
7. **No order confirmation page** — After order placed, user is redirected to /account/orders. No "Thank you" page. No order number display. No email confirmation mention.
8. **No guest checkout** — Forces login. Should allow guest with email.
9. **No shipping method selection** — No standard/express options. No cost display.

### Redesign

**Layout — Single page, 3 clear steps:**

```
┌──────────────────────────────────────┐
│ Checkout                             │
│ ● Shipping  ○ Review  ○ Confirmation │ ← Progress steps
├──────────────────────────────────────┤
│                                      │
│ STEP 1: Shipping Information         │
│ ┌──────────────────────────────────┐ │
│ │ Full Name    [_______________]   │ │
│ │ Email        [_______________]   │ │
│ │ Phone        [_______________]   │ │
│ │ Address      [_______________]   │ │
│ │ City         [_____] State [___] │ │
│ │ Zip          [_____]             │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Same as billing address ☑]          │
│                                      │
│ STEP 2: Shipping Method              │
│ ○ Standard (3-5 days) — Free        │
│ ○ Express (1-2 days) — $12.99       │
│                                      │
│ ──────────────────────────────────── │
│ Order Summary (sticky sidebar on     │
│ desktop, expandable on mobile)       │
│                                      │
│ [Continue to Review]                 │
└──────────────────────────────────────┘
```

**Step 2 — Review:**
```
┌──────────────────────────────────────┐
│ Checkout                             │
│ ○ Shipping  ● Review  ○ Confirmation │
├──────────────────────────────────────┤
│ Review Your Order                    │
│                                      │
│ Shipping to:                         │
│ John Doe                             │
│ 123 Main St, Austin, TX 78701        │
│ Standard Shipping (Free)             │
│ [Edit]                               │
│                                      │
│ Items:                               │
│ ┌──────┐ Product Name     $49.99    │
│ │ img  │ Qty: 1                     │
│ └──────┘                             │
│ ┌──────┐ Product Name     $99.99    │
│ │ img  │ Qty: 2          $199.98    │
│ └──────┘                             │
│                                      │
│ Payment Method:                      │
│ ○ Credit Card (coming soon)          │
│ ● Cash on Delivery                   │
│                                      │
│ Order Total: $249.97                 │
│                                      │
│ [← Back to Shipping]  [Place Order]  │
└──────────────────────────────────────┘
```

**Step 3 — Confirmation (new page):**
```
┌──────────────────────────────────────┐
│           ✓ (checkmark icon)         │
│                                      │
│       Order Confirmed!               │
│                                      │
│     Order #12345 has been placed.    │
│   We'll send updates to your email.  │
│                                      │
│     [View Order]  [Continue Shopping]│
│                                      │
│ Order Summary (collapsed by default) │
│ ▶ 3 items · $249.97                  │
└──────────────────────────────────────┘
```

### Key Improvements

1. **Progress indicator** — 3 visible steps (Shipping → Review → Confirmation). Completed steps are checkmarked. Current step highlighted.
2. **Single-page shipping** — All shipping fields on one screen. Better than splitting across cards.
3. **Autocomplete attributes** — `autocomplete="street-address"`, `autocomplete="address-level2"`, etc. Browser can fill from saved addresses.
4. **Shipping method selection** — Radio buttons for shipping options with price. Free threshold messaging.
5. **Review with images** — Show product thumbnails in review step. Visual verification reduces anxiety.
6. **Order confirmation page** — Dedicated confirmation screen with order number, summary, next steps. Not just redirect.
7. **Guest checkout** — If not authenticated, offer "Continue as guest" with email field. Create account optional at end.
8. **Form validation on blur** — Don't wait for submit. Validate each field as user leaves it.
9. **Error state** — If order fails: "We couldn't place your order. [Reason]. Please try again or contact support."
10. **Sticky order summary** — Desktop: sidebar. Mobile: collapsible panel at top, expandable.

---

## Summary of Phase 1 Changes

| Change | UX Impact | Complexity |
|--------|-----------|------------|
| Design system tokens | Foundation | Medium |
| Reusable components | High | Medium |
| Homepage redesign | High | Medium |
| Product listing filters + search | High | High |
| PDP gallery + sticky ATC | High | Medium |
| Cart card layout + undo | Medium | Low |
| Checkout 3-step flow | High | Medium |
| Order confirmation page | Medium | Low |
| Mobile-first responsive | High | Ongoing |

All existing business logic (API calls, auth flows, cart operations) preserved. Only UI/UX layer changes.
