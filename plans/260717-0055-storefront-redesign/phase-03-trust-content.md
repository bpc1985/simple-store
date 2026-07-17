# Phase 3: Trust, Content & Delight Pages

## 13. About Page (new — /about)

### Design

**UX Goals:** Build brand credibility. Humanize the store. Explain the mission.

```
┌──────────────────────────────────────┐
│ About SimpleStore                    │
├──────────────────────────────────────┤
│ Hero:                                │
│ "Quality goods, fairly priced."      │
│ [Large brand image/illustration]     │
├──────────────────────────────────────┤
│ Our Story                            │
│ [Text + image side-by-side]          │
├──────────────────────────────────────┤
│ Our Values                           │
│ 3-column icon grid:                  │
│ 🎨 Quality · 🌍 Sustainable · 🤝 Fair│
├──────────────────────────────────────┤
│ By the Numbers (optional counters)   │
│ 1,000+ Products · 50K+ Customers     │
├──────────────────────────────────────┤
│ [CTA: Browse Products]               │
└──────────────────────────────────────┘
```

---

## 14. Contact Page (new — /contact)

### Design

**UX Goals:** Make support accessible. Reduce anxiety. Set expectations.

```
┌──────────────────────────────────────┐
│ Contact Us                           │
├──────────────────┬───────────────────┤
│ Contact Form     │ Quick Help        │
│                  │                   │
│ Name [_______]   │ 📧 support@store  │
│ Email [______]   │ 📞 (555) 123-4567 │
│ Subject [____]   │ 🕐 M-F 9am-6pm    │
│ Message [____]   │                   │
│ [_____________]  │ FAQ Links:        │
│                  │ · Shipping        │
│ [Send Message]   │ · Returns         │
│                  │ · Orders          │
└──────────────────┴───────────────────┘
```

**Key features:**
- Form validation with inline errors
- Success: "Message sent! We'll reply within 24 hours." + email confirmation note
- Loading state on submit button
- Contact info always visible (not hidden behind form)
- FAQ quick links for self-service (deflect common questions)

---

## 15. FAQ Page (new — /faq)

### Design

**UX Goals:** Self-service support. Reduce support tickets. Build confidence.

```
┌──────────────────────────────────────┐
│ Frequently Asked Questions           │
├──────────────────────────────────────┤
│ [Search FAQs...              🔍]     │ ← Filter questions
├──────────────────────────────────────┤
│ Category Tabs:                       │
│ [Shipping] Orders Returns Payment    │
│      Account Products                │
├──────────────────────────────────────┤
│ ▶ How much is shipping?              │
│   Free on orders over $50. Standard  │
│   shipping $5.99 (3-5 business days).│
│                                      │
│ ▶ What's your return policy?         │
│   30-day returns. Free return label. │
│                                      │
│ ▶ How do I track my order?           │
│   Visit My Orders or check your      │
│   confirmation email.                │
│                                      │
│ ▶ Can I change my order?             │
│   Contact us within 1 hour of        │
│   placing your order.                │
├──────────────────────────────────────┤
│ Still have questions?                │
│ [Contact Us]                         │
└──────────────────────────────────────┘
```

**Key features:**
- Accordion/collapsible questions (only one open at a time, or all closable)
- Search-as-you-type filtering of questions
- Category tabs for quick navigation
- Smooth scroll to category on tab click
- "Still need help?" CTA at bottom

---

## 16. Help Center (new — /help)

### Design

More comprehensive than FAQ. Combines FAQ, shipping info, returns policy, size guides, etc. in one organized hub.

```
┌──────────────────────────────────────┐
│ Help Center                          │
├──────────────────────────────────────┤
│ [Search help articles...     🔍]     │
├──────────────────────────────────────┤
│ Popular Topics (icon grid)           │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 📦   │ │ ↩️   │ │ 💳   │ │ 👤   │ │
│ │Orders│ │Return│ │Payment│ │Account│ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 🚚   │ │ 📏   │ │ 🔒   │ │ 📱   │ │
│ │Ship  │ │Sizing│ │Privacy│ │App   │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
├──────────────────────────────────────┤
│ Recent Articles                      │
│ · Holiday Shipping Schedule          │
│ · How to Apply a Promo Code          │
│ · Gift Wrapping Options              │
├──────────────────────────────────────┤
│ [Contact Support]                    │
└──────────────────────────────────────┘
```

---

## 17. Interaction & Animation System

### Principles

1. **Purposeful motion** — Every animation communicates state change, hierarchy, or spatial relationship. No decorative-only animation.
2. **Fast and interruptible** — All animations respect `prefers-reduced-motion`. Users can interact during animations.
3. **Consistent easing** — One set of easing curves across the entire app.
4. **Performant properties** — Only animate `transform` and `opacity`. Never `width`, `height`, `top`, `left`.

### Micro-Interactions Catalog

| Interaction | Trigger | Animation | Duration |
|-------------|---------|-----------|----------|
| Button hover | Mouse enter | translateY(-1px), shadow increase | 150ms |
| Button press | Mouse down / touch | translateY(0), shadow reduce | 100ms |
| Card hover lift | Mouse enter | translateY(-2px), shadow increase | 200ms |
| Add to cart | Click | Button: scale(0.95)→scale(1) bounce + cart badge bounce | 300ms |
| Remove item | Click | Item slides right + fades out | 250ms |
| Drawer open | Toggle | Slides in from right (Sheet) | 300ms |
| Modal open | Trigger | Scale(0.95)+fade → Scale(1)+opaque | 200ms |
| Toast enter | Event | Slide up + fade in from bottom | 250ms |
| Toast exit | Timeout/dismiss | Fade out + slide down | 200ms |
| Skeleton → Content | Data loaded | Crossfade (skeleton out, content in) | 300ms |
| Filter apply | Checkbox click | Results fade transition (not layout shift) | 200ms |
| Page transition | Route change | Subtle fade (optional, keep fast) | 150ms |
| Focus ring | Tab to element | Ring appears instantly | 0ms (instant) |
| Accordion open | Click header | max-height transition + chevron rotate | 250ms |
| Quantity change | Click +/- | Number scales up briefly, settles | 150ms |

### Skeleton Loading Patterns

All skeletons must match the exact layout dimensions of the real content to prevent CLS:

```
Product Card Skeleton:     Product Grid Skeleton:
┌──────────────┐           ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ ░░░░░░░░░░░░ │           │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │
│ ░░░░░░░░░░░░ │           │░░░░░░│ │░░░░░░│ │░░░░░░│ │░░░░░░│
│ ░░░░░░░░░░░░ │ (image)   │░░░░░░│ │░░░░░░│ │░░░░░░│ │░░░░░░│
│ ░░░░░░░░░░░░ │           │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │
├──────────────┤           │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │
│ ░░░░░░░░░░░░ │ (title)   └──────┘ └──────┘ └──────┘ └──────┘
│ ░░░░░░░░     │ (price)
└──────────────┘
```

Use `animate-pulse` with `bg-muted`. Always match `aspect-ratio`, width, and text line widths exactly.

### Progressive Disclosure

1. **PDP** — Collapsible sections for Description, Specs, Shipping.
2. **Checkout** — Step-by-step with completed sections collapsed.
3. **Filters** — Show top 5 categories + "Show all" expand.
4. **FAQ** — Accordion pattern.

### Contextual Actions

1. **Product card** — Add to cart button always visible (not hover-only).
2. **Cart item** — Swipe to remove on mobile (optional enhancement).
3. **Order card** — Cancel action only on pending orders.

---

## 18. Ecommerce Conversion Optimizations

### Product Discovery

1. **Homepage search bar** — In hero section. With autocomplete dropdown (top 4 results as user types).
2. **Category cards with images** — Visual scanning faster than reading text pills.
3. **"Recently Viewed"** — Session-persistent (localStorage). Horizontal scroll section on homepage, PDP, cart.
4. **"You Might Also Like"** — Same-category recommendations on PDP and cart.
5. **"Frequently Bought Together"** — Cross-sell on PDP (if data allows).
6. **Bestsellers section** — Manually curated or based on order count.

### Filtering & Sorting

1. **Mobile filter sheet** — Bottom sheet with categories, price range, in-stock toggle.
2. **Desktop filter sidebar** — Persistent sidebar on product listing (768px+).
3. **Active filter chips** — Removable pills below search bar.
4. **"Clear all"** — Single action to reset all filters.
5. **Sort dropdown** — Relevance, Price ASC/DESC, Newest, Name.
6. **URL-persisted filters** — All filter/sort state in URL params. Shareable. Back-button friendly.

### Search

1. **Debounced instant search** — 300ms debounce. Update results and URL as user types.
2. **Search suggestions** — "Did you mean...?" for typos.
3. **Empty search state** — "No results for 'xyz'. Try: [similar terms]."
4. **Recent searches** — Stored in localStorage. Show below search input when focused.

### Trust & Credibility

1. **Trust bar** — Free shipping, secure checkout, easy returns. Persistent across key pages.
2. **Shipping estimate** — Inline on PDP and cart. No surprises at checkout.
3. **Return policy link** — Footer + PDP + checkout. Easy to find.
4. **Security badges** — SSL padlock, "Secure Checkout" on checkout page.
5. **Contact info** — Visible in footer. Support email and phone.

### Checkout Optimization

1. **Guest checkout** — No forced account creation.
2. **Progress indicator** — 3 clear steps.
3. **Sticky order summary** — Always visible on desktop.
4. **Autofill support** — Proper autocomplete attributes.
5. **Shipping before payment** — Natural order. Address first, then review, then pay.
6. **Order confirmation page** — Clear success, order number, next steps.

### CTA Best Practices

1. **One primary CTA per screen** — e.g., "Add to Cart" on PDP, "Proceed to Checkout" on cart.
2. **Primary CTA is always the most visually prominent** — Full-width on mobile, largest button.
3. **Secondary actions are outlined or ghost** — "Continue Shopping", "View Cart."
4. **CTAs use action-oriented copy** — "Add to Cart" not "Submit", "Place Order" not "Confirm."
5. **CTA buttons are minimum 44px height** — Touch target requirement.

---

## 19. Accessibility Implementation Checklist

### WCAG AA (Priority in implementation)

| Requirement | Implementation |
|-------------|---------------|
| Color contrast 4.5:1 | All text/background pairs verified. Use oklch with known contrast ratios. |
| Focus indicators | `focus-visible:ring-2 ring-primary outline-offset-2` on all interactive elements. Never `outline: none` without replacement. |
| Keyboard navigation | Tab order matches visual order. All interactive elements focusable. Skip-to-content link. |
| Screen reader labels | `aria-label` on icon buttons. `alt` text on images. `aria-live` for dynamic content (cart count, toasts). |
| Heading hierarchy | Single h1 per page. Sequential h2→h3. No skipped levels. |
| Form labels | Every input has visible `<label>`. Error messages linked via `aria-describedby`. |
| Touch targets | Minimum 44×44px. 8px spacing between adjacent targets. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all animations. |
| Semantic HTML | `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>` used correctly. |

---

## 20. Performance Strategy

### Core Web Vitals Targets

- **LCP < 2.5s** — Preload hero image. Use `next/image` with `priority` on hero. Font `display: swap`.
- **CLS < 0.1** — All skeletons match final layout dimensions exactly. Reserve space for async content. No late-loading content pushing layout.
- **INP < 200ms** — Debounce search input. Virtualize long lists (if needed later). Avoid heavy JS during interactions.

### Implementation Tactics

1. **`next/image`** — All product images through Next.js Image component. Automatic WebP/AVIF conversion, lazy loading, responsive sizes.
2. **Skeleton matching** — CSS Grid with same `gap`, `minmax`, and `aspect-ratio` as real content.
3. **Font optimization** — Already using `next/font/google` with `display: swap`. Good.
4. **Bundle splitting** — `next/dynamic` for non-critical components (cart drawer, modals, filter panel).
5. **TanStack Query stale times** — Already configured (60s staleTime). Good balance for ecommerce.

---

## Summary of Phase 3 Changes

| Change | UX Impact | Complexity |
|--------|-----------|------------|
| About page | Low | Low |
| Contact page | Medium | Low |
| FAQ page | Medium | Low |
| Help Center | Medium | Medium |
| Micro-interactions | High | Medium |
| Skeleton system | Medium | Low |
| Conversion optimizations | High | Medium |
| Accessibility pass | High | Medium |
| Performance optimization | Medium | Medium |
