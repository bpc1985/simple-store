---
name: SimpleStore Storefront
description: Reference e-commerce storefront demonstrating Spring Boot microservices with a clean Next.js UI
colors:
  primary: "#2563EB"
  background: oklch(0.98 0.005 250)
  foreground: oklch(0.18 0.02 260)
  card: oklch(1 0 0)
  card-foreground: oklch(0.18 0.02 260)
  muted: oklch(0.95 0.003 250)
  muted-foreground: oklch(0.42 0.01 260)
  secondary: oklch(0.95 0.005 250)
  secondary-foreground: oklch(0.18 0.02 260)
  accent: oklch(0.85 0.06 80)
  accent-foreground: oklch(0.22 0.02 260)
  destructive: oklch(0.55 0.2 20)
  border: oklch(0.88 0.01 250)
  input: oklch(0.88 0.01 250)
  ring: oklch(0.55 0.18 250)
  success: oklch(0.55 0.12 145)
  success-foreground: oklch(1 0 0)
  warning: oklch(0.7 0.1 80)
  warning-foreground: oklch(0.22 0.02 260)
  info: oklch(0.55 0.05 250)
  info-foreground: oklch(1 0 0)
  surface-raised: oklch(0.99 0.003 250)
typography:
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: normal
  heading:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  caption:
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: "0.01em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: 0.75rem
    fontFeature: "tabular-nums"
rounded:
  sm: "calc(0.75rem * 0.6)"
  md: "calc(0.75rem * 0.8)"
  lg: 0.75rem
  xl: "calc(0.75rem * 1.4)"
  full: 9999px
spacing:
  section: 4rem
  card-inner: 1rem
  form-gap: 0.5rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: oklch(0.55 0.18 250)
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.full}"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.full}"
  badge-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.full}"
  category-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
  category-pill-active:
    backgroundColor: "{colors.primary}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.full}"
---

# Design System: SimpleStore Storefront

## 1. Overview

**Creative North Star: "The Honest Blueprint"**

SimpleStore is a reference architecture, not a real brand. The interface earns trust through clarity: every interaction hits a real backend, every component uses shared tokens, every page loads without decorative theater. Clean, functional, and trustworthy — the interface proves the patterns work by being invisible enough to read the code behind them.

The system uses a single sans-serif family (Montserrat) at a fixed-rem scale. One blue accent carries primary actions and current selection. The palette is Restrained: tinted cool neutrals with the accent on ≤10% of any given screen. No glassmorphism, no grain overlays, no orchestrated motion. What remains after stripping all decoration is the architecture itself — and that is the point.

**Key Characteristics:**
- Single sans family, fixed rem scale for product UI predictability
- Restrained blue accent on primary actions only
- Flat-by-default surfaces; shadows tinted with the brand hue, never pure black
- State-driven motion only (100–350ms transitions); no choreographed sequences
- Every color, radius, and shadow pulls from design tokens; nothing is hard-coded
- 12 reusable components built on shadcn/ui primitives
- Full dark mode support with independently-verified contrast
- WCAG AA: skip link, focus rings, tabular-nums, 44px touch targets
- Motion tokens define duration (instant/fast/normal/slow) and easing (out/in/standard)

## 2. Colors

A restrained cool-tinted palette. One accent, used for primary actions, current selection, and focus indicators. Neutrals carry a subtle blue tint (0.005 chroma at hue 250) so they read cool and clean, never warm or creamy. Six state colors cover success, warning, info, and destructive contexts.

### Primary
- **Electric Blue** (#2563EB / oklch(0.55 0.18 250)): Primary buttons, active nav states, focus rings, selected category pills. Used on ≤10% of any given screen.

### Neutral
- **Near-White Background** (oklch(0.98 0.005 250)): Page background. Cool-tinted white, never warm cream.
- **Ink** (oklch(0.18 0.02 260)): Body text, headings, primary content. 4.5:1 contrast against background.
- **Card White** (oklch(1 0 0)): Card and popover surfaces. Pure white for maximum contrast against the tinted background.
- **Soft Gray** (oklch(0.95 0.003 250)): Muted backgrounds, secondary surfaces, hover states.
- **Quiet Text** (oklch(0.42 0.01 260)): Secondary text, helper copy, placeholders. Passes WCAG AA ≥4.5:1 against near-white.
- **Warm Accent** (oklch(0.85 0.06 80)): Decorative accent for badges and subtle highlights. Never a second call-to-action color.
- **Hairline Border** (oklch(0.88 0.01 250)): Card borders, input strokes, dividers.
- **Surface Raised** (oklch(0.99 0.003 250)): Slightly elevated surfaces above background, below card white.

### Semantic
- **Destructive Red** (oklch(0.55 0.2 20)): Delete actions, error text, cancel confirmations.
- **Success Green** (oklch(0.55 0.12 145)): Confirmation states, in-stock badges, order placed.
- **Warning Amber** (oklch(0.7 0.1 80)): Low-stock warnings, caution states.
- **Info Blue** (oklch(0.55 0.05 250)): Informational states, hints.

### Named Rules
**The One Accent Rule.** Blue is the only call-to-action color on the page. The warm accent is decorative only — it never appears on a primary button, a link, or any element the user is meant to click. If an element needs emphasis, it uses weight, size, or the blue primary. Never a second competing color.

**The Price Neutrality Rule.** Prices use foreground color (Ink), not green or primary. Green implies a discount; price is neutral information. Only sale prices use destructive red with strikethrough original.

## 3. Typography

**Font:** Montserrat (with system-ui, sans-serif fallback). One family in five weights (300, 400, 500, 600, 700) covers the entire UI. Order IDs use `ui-monospace` with tabular figures.

**Character:** A geometric sans with open apertures and a friendly, technical feel. Clean enough for data tables, warm enough for marketing copy. One family eliminates pairing drift.

### Hierarchy
- **Hero** (600, text-4xl to text-6xl, line-height 1.1): Home page hero headline only. `text-wrap: balance`. Max 6rem at largest breakpoint.
- **Heading** (600, text-2xl to text-4xl, line-height 1.15): Page titles, section headers. Letter-spacing -0.015em.
- **Body** (400, text-base / 1rem, line-height 1.6): All prose, descriptions, form labels. Minimum 16px. Capped at 65ch.
- **Caption** (500, text-xs / 0.75rem, letter-spacing 0.01em): Badge text, table metadata, timestamps.
- **Mono** (system-ui monospace, text-xs): Order IDs only. `font-variant-numeric: tabular-nums` for alignment. All prices use tabular-nums via `[data-slot="price"]`.

### Named Rules
**The One Family Rule.** Everything is Montserrat. Hierarchy comes from weight (400 → 500 → 600) and size, not from font changes. A second font is forbidden.

**The Fixed Scale Rule.** Font sizes use fixed `rem` values, not fluid `clamp()`. Only the hero headline scales with breakpoints.

**The Tabular Money Rule.** All monetary values (`[data-slot="price"]`) use `font-variant-numeric: tabular-nums` to prevent layout shift when prices change.

## 4. Elevation

Flat-by-default. Surfaces rest at level 0 with a hairline border. Elevation is used sparingly and only to signal state change (hover lift) or interactive priority (dropdown above content). All shadows carry the primary blue hue (250), never pure black at low opacity.

### Shadow Vocabulary
- **Card Rest** (`0 1px 3px oklch(0.55 0.18 250 / 6%), 0 1px 2px oklch(0.55 0.18 250 / 4%)`): Subtle tinted lift. Used on all cards and popovers.
- **Card Hover** (`0 4px 12px oklch(0.55 0.18 250 / 8%)`): Deepened shadow on card hover with 2px vertical lift. Signals interactivity.
- **Button Hover** (`transform: translateY(-1px)`): Subtle lift on hover. No shadow added — the translation alone conveys the interaction.

### Named Rules
**The Tinted Shadow Rule.** Every shadow carries the primary hue (blue 250). A shadow at `oklch(0 0 0 / 6%)` reads gray and generic; at `oklch(0.55 0.18 250 / 6%)` it reads as part of the brand.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state: hover lift on cards, dropdown elevation on menus, focus rings on inputs. A surface that never changes state casts no shadow.

## 5. Components

### Buttons
- **Shape:** Rounded at `--radius-lg` (0.75rem). Neither sharp nor pill-shaped.
- **Primary:** Blue background (#2563EB), white text, 12px 24px padding. Hover: slightly darker blue + 1px lift. Active: returns flat. Focus: 2px blue outline at 2px offset. Disabled: 50% opacity.
- **Ghost:** Transparent, ink text. Hover fills with muted gray. For icon buttons (cart, user menu).
- **Destructive:** Red text on hover. Inherits ghost base.
- **Motion:** `transition: transform 150ms, box-shadow 150ms, background-color 150ms`. All disabled when `prefers-reduced-motion: reduce`.

### Cards
- **Shape:** Rounded at `--radius-lg` (0.75rem). Hairline border (0.5px, 6% black). Tinted shadow at rest. White background.
- **Hover:** Translates -2px vertically, shadow deepens. Signals interactivity.
- **Internal padding:** 1rem (16px). No backdrop blur, no transparency.
- **Product card image:** 4:5 aspect ratio. Inset shadow for depth. Hover: image scales 1.02x.

### Inputs
- **Shape:** Rounded at `--radius-lg`, bordered with `--color-muted`. Transparent background. Height: 44px minimum (touch target compliance).
- **Focus:** Border shifts to primary blue with a 2px blue ring at 15% opacity.
- **Error:** Border and ring shift to destructive red. Error text below in destructive red, 0.75rem.
- **Search variant:** Search icon inside input (left), clear button (right) when text present. 300ms debounced onChange.
- **Disabled:** Reduced opacity, no focus response.

### Navigation
- **Header:** 72px height, sticky with backdrop blur on scroll. Logo: Montserrat 600, tracking-widest, uppercase. Nav links: 14px medium uppercase with slide-in underline animation (0.35s ease). Cart icon with count badge (primary circle, 18px). Auth: user icon dropdown (My Account, My Orders, Logout).
- **Mobile:** Sheet drawer from the right (280px). Same link structure, stacked vertically with separators between groups.
- **Footer:** 4-column grid (Brand, Shop, Support, Company) on desktop. Copyright line. All links use muted-foreground hover to foreground.

### Badges
- **Style:** Pill-shaped (`--radius-full` / 9999px). 12px medium, letter-spacing 0.01em. Padding: 2px 10px. Icons: 12px with 4px gap.
- **Variants:** Default (primary bg), Secondary (muted bg), Destructive (red bg), Outline (transparent + border).
- **Stock badges:** Uses semantic variant + contextual icon. In-stock (success, checkmark), Low stock (warning, alert triangle), Out-of-stock (destructive, X).

### Chips / Pills
- **Category pills (LinkPill):** Rounded-full. White card bg with hairline border at rest. Hover: 10% blue tint + primary text. Active: full primary fill, white text.

### Tables
- **Style:** Standard shadcn/ui table. Header: muted background, 12px medium uppercase. Rows: 48px min-height, bottom-border separation. Data: 14px. Numeric columns right-aligned with tabular-nums. Hover row: muted background.
- **Mobile:** Tables become card layouts. Order tables become stacked cards with key info visible at a glance.

### Reusable Components (12 total, built on shadcn/ui)
- **QuantitySelector:** +/- button group with min/max guards. Rounded-full border. 44px touch targets. `aria-live` for screen readers.
- **PriceDisplay:** Formatted price with tabular-nums. Regular: foreground. Sale: destructive with strikethrough original.
- **EmptyState:** Centered icon + title + description + optional CTA link. Consistent pattern across cart, orders, search, wishlist.
- **PageHeader:** Title + optional description + breadcrumb trail. Breadcrumbs preserve filter state through hrefs.
- **SectionHeader:** Title + optional "View All" link with arrow.
- **StockBadge:** 3-tier semantic badge. In Stock (green), Low Stock ≤5 (amber), Out of Stock (red). Each with icon.
- **SearchInput:** Controlled input with 300ms debounce, search icon, clear button. Emits onChange when debounce fires.
- **SortDropdown:** Select component with sort options (Relevance, Price ASC/DESC, Newest, Name A-Z).
- **TrustBadges:** Icon + label + description row. Defaults: Free Shipping, Secure Checkout, Easy Returns.
- **FilterPanel:** Mobile sheet (left) + desktop sidebar. Categories, price range, in-stock toggle. Active filter indication.
- **StyledLink:** Next.js Link styled as primary or outline button. Replaces inline `<Link>` with duplicated classes.
- **LinkPill:** Rounded-full category filter link with active/inactive states.

## 6. Do's and Don'ts

### Do:
- **Do** use design tokens (`text-foreground`, `bg-primary`, `border-border`) for every color. No hard-coded hex or Tailwind color names.
- **Do** use Montserrat as the only font family on the page. No serif pairing.
- **Do** use `font-semibold` (600) for headings, `font-medium` (500) for labels and interactive text, `font-normal` (400) for body.
- **Do** tint shadows with the primary blue hue (oklch with 250 hue). Never pure black at low opacity.
- **Do** use `text-wrap: balance` on h1-h3 elements for even line wrapping.
- **Do** respect `prefers-reduced-motion`: disable all transforms and transitions globally.
- **Do** use tabular-nums for all prices (`data-slot="price"`) to prevent CLS.
- **Do** provide `aria-label` on all icon-only buttons.
- **Do** use visible focus rings (`outline: 2px solid primary/40%` with 2px offset) on all interactive elements.
- **Do** provide a skip-to-content link for keyboard users.
- **Do** use `touch-action: manipulation` to eliminate 300ms tap delay.
- **Do** use StyledLink for any link styled as a button. No inline `<Link>` duplicating button styles.
- **Do** use EmptyState component for all empty content areas for visual consistency.

### Don't:
- **Don't** use backdrop-filter, blur, grain textures, or glassmorphism. The surface is flat and solid.
- **Don't** add a second accent color. Amber/accent is decorative only; it never appears on CTAs or interactive elements.
- **Don't** use `font-bold` (700). The system max is `font-semibold` (600).
- **Don't** center-align hero content. Left-aligned hero text with tinted background is the default, or full-bleed image + centered text on homepage.
- **Don't** add orchestrated page-load animations, staggered reveals, or scroll-driven sequences. Motion is state-driven only.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards.
- **Don't** set body text below 16px. Captions at 12px are the only exception.
- **Don't** use gradient text (`background-clip: text` with gradient background).
- **Don't** invent new shared components without checking whether shadcn/ui or the existing 12-custom-component library already provides them.
- **Don't** use green for regular prices. Price is neutral (foreground color). Green means sale.
- **Don't** ship interactive elements without hover, focus, active, and disabled states.
- **Don't** omit empty, loading, or error states from any data-driven page. Every page must handle all three.
- **Don't** use e-commerce clichés: countdown timers, fake urgency, upsell modals, fake social proof. The storefront proves the backend works — it doesn't pretend to be a real store.
