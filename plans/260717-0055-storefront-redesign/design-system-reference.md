# Complete Design System Reference

## Design Philosophy

**"The Honest Blueprint"** — extended with conversion-optimized ecommerce patterns. Clean, trustworthy, fast. Every design decision serves usability or conversion. No decoration without function.

**Key characteristics:**
- Single font family (Montserrat), weight hierarchy for visual structure
- One blue accent (≤10% of any screen), CTA can differ when conversion context demands
- Flat-by-default, elevation only signals state change
- Motion is purposeful (150-300ms), not decorative
- Mobile-first, touch-optimized (44px minimum targets)
- WCAG AA compliant throughout

---

## Typography

### Font Stack

```
Primary: Montserrat (Google Font, variable)
Weights: 300, 400, 500, 600, 700
Fallback: system-ui, -apple-system, sans-serif
Code: ui-monospace, SFMono-Regular, Menlo, monospace
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-hero` | 3.75rem (60px) | 600 | 1.1 | Homepage hero only |
| `text-display` | 2.25rem (36px) | 600 | 1.15 | Major page titles |
| `text-heading` | 1.5rem (24px) | 600 | 1.2 | Section headers |
| `text-title` | 1.125rem (18px) | 500 | 1.3 | Card titles, form sections |
| `text-body` | 1rem (16px) | 400 | 1.6 | Body copy, descriptions |
| `text-body-sm` | 0.875rem (14px) | 400 | 1.5 | Secondary info, labels |
| `text-caption` | 0.75rem (12px) | 500 | 1.4 | Badges, metadata, timestamps |
| `text-mono` | 0.75rem (12px) | 400 | 1.4 | Order IDs, codes |

### Named Rules

1. **Single family** — All Montserrat. Hierarchy from weight + size, not font changes.
2. **Tabular numbers for prices** — `font-variant-numeric: tabular-nums` on all monetary values.
3. **Line length** — Body text max 65ch. Headings use `text-wrap: balance`.
4. **No bold** — Max weight 600 (semibold). Bold (700) reserved for nothing.

---

## Colors

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(0.98 0.005 250)` | Page background |
| `--foreground` | `oklch(0.18 0.02 260)` | Body text, headings |
| `--card` | `oklch(1 0 0)` | Card surfaces |
| `--card-foreground` | `oklch(0.18 0.02 260)` | Text on cards |
| `--primary` | `#2563EB` | Primary buttons, focus rings, active states |
| `--primary-foreground` | `oklch(1 0 0)` | Text on primary |
| `--secondary` | `oklch(0.95 0.005 250)` | Secondary surfaces |
| `--secondary-foreground` | `oklch(0.18 0.02 260)` | Text on secondary |
| `--muted` | `oklch(0.95 0.003 250)` | Muted backgrounds, hover states |
| `--muted-foreground` | `oklch(0.42 0.01 260)` | Secondary text, placeholders |
| `--accent` | `oklch(0.85 0.06 80)` | Decorative badges only |
| `--accent-foreground` | `oklch(0.22 0.02 260)` | Text on accent |
| `--cta` | `#2563EB` | Primary CTA buttons (same as primary for consistency) |
| `--cta-foreground` | `oklch(1 0 0)` | Text on CTA |
| `--destructive` | `oklch(0.55 0.2 20)` | Delete, errors, cancel |
| `--destructive-foreground` | `oklch(1 0 0)` | Text on destructive |
| `--success` | `oklch(0.55 0.12 145)` | Success states, in-stock |
| `--success-foreground` | `oklch(1 0 0)` | Text on success |
| `--warning` | `oklch(0.7 0.1 80)` | Warning states |
| `--warning-foreground` | `oklch(0.22 0.02 260)` | Text on warning |
| `--info` | `oklch(0.55 0.05 250)` | Info states |
| `--info-foreground` | `oklch(1 0 0)` | Text on info |
| `--border` | `oklch(0.88 0.01 250)` | Borders, dividers |
| `--input` | `oklch(0.88 0.01 250)` | Input borders |
| `--ring` | `oklch(0.55 0.18 250)` | Focus rings |
| `--surface-raised` | `oklch(0.99 0.003 250)` | Slightly elevated surfaces |

### Dark Mode

All tokens have `.dark` equivalents. Key differences:
- Background: `oklch(0.15 0.02 260)` (dark blue-black)
- Card: `oklch(0.18 0.02 260)`
- Primary: `oklch(0.62 0.18 250)` (lighter blue for contrast)
- Borders: semi-transparent white (8-12%) instead of solid colors

### Color Rules

1. **The One Accent Rule** — Blue is the only CTA color. Accent (amber) is decorative only.
2. **Price is neutral** — Use `--foreground` for regular prices, `--destructive` for sale prices only.
3. **Tinted shadows** — All shadows carry primary hue (250), never pure black at low opacity.
4. **Semantic tokens only** — Never hardcode `text-green-600` or `text-red-500`. Use `--success`, `--destructive`.

---

## Spacing

### Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0 | No gap |
| `space-1` | 4px | Icon-to-text gap, inline tight |
| `space-2` | 8px | Related elements gap, touch spacing minimum |
| `space-3` | 12px | Card internal padding |
| `space-4` | 16px | Standard component gap |
| `space-5` | 20px | Medium section gap |
| `space-6` | 24px | Section gap |
| `space-8` | 32px | Major section separation |
| `space-10` | 40px | Large section gap |
| `space-12` | 48px | Page section divider |
| `space-16` | 64px | Hero/content separation |

### Layout Spacing

- **Page gutters**: 16px mobile, 24px tablet, 32px desktop
- **Section vertical rhythm**: 48px (mobile), 64px (tablet), 80px (desktop)
- **Card grid gap**: 16px (mobile), 20px (tablet), 24px (desktop)
- **Form field gap**: 16px between fields, 24px between groups

---

## Grid System

### Breakpoints

| Breakpoint | Min Width | Columns | Gutters |
|------------|-----------|---------|---------|
| `xs` (mobile) | 375px | 4 | 16px |
| `sm` (mobile wide) | 640px | 6 | 16px |
| `md` (tablet) | 768px | 8 | 24px |
| `lg` (desktop) | 1024px | 12 | 24px |
| `xl` (desktop wide) | 1280px | 12 | 32px |

### Product Grid

| Breakpoint | Columns | Card Aspect |
|------------|---------|-------------|
| Mobile (375-639px) | 2 | 4:5 |
| Tablet (640-1023px) | 3 | 4:5 |
| Desktop (1024px+) | 4 | 4:5 |

### Content Pages

Single column, `max-w-3xl` (768px, ~65ch), centered. Full-width for product grids and hero sections.

---

## Elevation

### Shadow Scale

| Level | Value | Usage |
|-------|-------|-------|
| 0 | `none` | Flat surfaces (default) |
| 1 | `0 1px 3px oklch(0.55 0.18 250 / 6%), 0 1px 2px oklch(0.55 0.18 250 / 4%)` | Cards at rest |
| 2 | `0 4px 12px oklch(0.55 0.18 250 / 8%)` | Dropdowns, popovers |
| 3 | `0 8px 24px oklch(0.55 0.18 250 / 10%)` | Modals, sheets |
| 4 | `0 16px 48px oklch(0.55 0.18 250 / 12%)` | Highest priority |

### Elevation Rules

1. **Flat by default** — Surfaces rest at level 0 with hairline border.
2. **Shadow = state change** — Only appears on hover, focus, or overlay.
3. **Tinted, never black** — All shadows carry primary hue.
4. **Hover lift** — Buttons lift 1px, cards lift 2px. TranslateY only.

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.45rem (7.2px) | Small elements: badges, chips |
| `--radius-md` | 0.6rem (9.6px) | Inputs, small cards |
| `--radius-lg` | 0.75rem (12px) | **Default**: buttons, cards, modals |
| `--radius-xl` | 1.05rem (16.8px) | Large cards, hero sections |
| `--radius-2xl` | 1.35rem (21.6px) | Hero images, featured cards |
| `--radius-full` | 9999px | Pills, badges, toggle buttons |

---

## Motion

### Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `duration-instant` | 100ms | Focus rings, checkbox toggles |
| `duration-fast` | 150ms | Hover transitions, color changes |
| `duration-normal` | 250ms | Expand/collapse, slide-in panels |
| `duration-slow` | 350ms | Page transitions, drawer open |

### Easing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering (decelerating) |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting (accelerating) |
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric transitions |

### Motion Rules

1. **Purpose only** — Every animation communicates state change.
2. **Performance properties** — Only `transform` and `opacity`. Never `width`/`height`.
3. **Respect reduced motion** — `@media (prefers-reduced-motion: reduce)` kills all transitions.
4. **Exit faster than enter** — Exit duration ~60-70% of enter duration.

---

## Component Specifications

### Buttons

**Variants:**

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| Primary | `--primary` | `--primary-foreground` | none | Main CTA |
| Secondary | `--secondary` | `--secondary-foreground` | none | Alternative action |
| Outline | transparent | `--foreground` | `--border` | Less important actions |
| Ghost | transparent | `--foreground` | none | Icon buttons, nav |
| Destructive | `--destructive` | white | none | Delete, cancel |
| Link | transparent | `--primary` | none | Inline text links |

**Sizes:**

| Size | Height | Padding X | Font | Usage |
|------|--------|-----------|------|-------|
| `icon-xs` | 28px | 0 | — | Inline icon actions |
| `icon-sm` | 36px | 0 | — | Compact icon buttons |
| `icon` | 44px | 0 | — | Standard icon buttons |
| `sm` | 36px | 16px | 0.875rem | Compact buttons |
| `md` (default) | 44px | 20px | 0.875rem | Standard buttons |
| `lg` | 52px | 24px | 1rem | Hero CTAs, checkout |

**States:**
- **Rest**: flat, no shadow
- **Hover**: translateY(-1px), slightly darker bg
- **Active/press**: translateY(0), return to rest
- **Focus**: 2px primary ring at 2px offset
- **Disabled**: 50% opacity, no pointer events, no hover lift
- **Loading**: Replace text with spinner, maintain width

**All buttons require:**
- `cursor-pointer`
- `font-medium`
- `rounded-lg`
- `transition-all duration-fast`
- Minimum 44×44px touch area

### Inputs

**Spec:**
- Height: 44px (md), 36px (sm)
- Border: 1px `--border` (rest), `--primary` (focus)
- Background: transparent
- Border radius: `--radius-lg`
- Padding: 12px 16px
- Font: 16px (prevents iOS zoom)
- Label: visible above input, 14px medium
- Error: red border + error text below, 12px

**States:**
- **Rest**: bordered with muted color
- **Hover**: border darkens slightly
- **Focus**: border turns primary, 2px primary ring at 15% opacity
- **Error**: border + ring turn destructive, error text below
- **Disabled**: 50% opacity, not-allowed cursor
- **Read-only**: different background (subtle gray), no focus ring

**Types:**
- Text, Email, Password (with toggle), Number, Search (with icon + clear), Select

### Cards

**Spec:**
- Background: `--card`
- Border: 0.5px solid black at 6% opacity
- Shadow: elevation-1
- Border radius: `--radius-lg`
- Padding: 16px internal

**Product Card:**
- Image aspect: 4:5
- Image overlay: subtle inset shadow for depth
- Content padding: 12px (top), 12px (bottom), 8px (sides)
- Title: 16px medium, line-clamp-2
- Price: 14px medium, tabular-nums
- Add button: always visible, sm size

**Variants:**
- Default: white background, hairline border, tinted shadow
- Interactive (hover): lift 2px, shadow increases to elevation-2
- Selected: primary border, slight blue background tint
- Flat: no shadow, subtle border only

### Navigation

**Header:**
- Height: 72px
- Sticky with backdrop blur on scroll
- Logo: Montserrat 600, tracking-widest, uppercase
- Nav links: 14px medium uppercase, underline animation on hover
- Cart: icon button with count badge (primary circle, 18px)
- Auth: user icon dropdown or login/register links

**Mobile Nav:**
- Sheet from right, 280px width
- Items: Shop, Categories, Account links, Login/Register, Logout
- Separator between nav groups

**Footer:**
- Background: `--secondary`
- 4-column grid (desktop), 2-column (tablet), stacked (mobile)
- Sections: Brand, Shop, Support, Legal
- Copyright line at bottom

### Badges

**Variants:**
- Default: primary bg, white text
- Secondary: muted bg, muted-foreground text
- Success: success bg, white text
- Destructive: destructive bg, white text
- Outline: transparent, border, foreground text

**Spec:**
- Border radius: `--radius-full` (pill)
- Font: 12px medium, letter-spacing 0.01em
- Padding: 2px 10px
- Icons: 12px, gap 4px

### Tags / Chips

**Spec:**
- Border radius: `--radius-full`
- Font: 14px medium
- Padding: 6px 14px
- Background: `--secondary`
- Border: 1px `--border`
- Interactive (filter chips): removable with X icon
- Active: `--primary` bg, white text

### Tables

**Spec:**
- Header: `--muted` background, 12px medium uppercase
- Rows: 48px min-height, bottom border separator
- Data: 14px, numeric columns right-aligned with tabular-nums
- Hover: `--muted` background on row (for clickable rows)
- Mobile: card layout instead of table (horizontal scroll as fallback)

### Forms

**Layout:**
- Single column, max 480px for simple forms (login, contact)
- Full width for complex forms (checkout)
- Fields grouped logically with visual separation
- Labels: 14px medium, above input, 4px gap to input
- Helper text: 12px, muted, below input
- Error text: 12px, destructive, below input
- Required: asterisk after label text, muted color

**Accessibility:**
- Every input has `label` with `htmlFor`
- Errors linked via `aria-describedby`
- Required fields marked with asterisk + `aria-required`
- Error summary at top for multi-error forms

### Alerts

**Variants:**
- Info: blue bg (10% opacity), blue border, blue text
- Success: green bg, green border, green text
- Warning: amber bg, amber border, amber text
- Error: red bg, red border, red text

**Spec:**
- Border radius: `--radius-lg`
- Padding: 16px
- Icon + title + description + optional action
- Dismissible with X button

### Toasts (Sonner)

Already using Sonner with `richColors`. Keep. Position: bottom-right.

**Rules:**
- Auto-dismiss: 4s (standard), 6s (with action)
- Show: slide-up + fade-in (250ms)
- Hide: fade-out + slide-down (200ms)
- Max 3 visible at once
- Action: "Undo" for destructive, "View" for confirmations

### Dialogs

**Spec:**
- Max width: 480px
- Border radius: `--radius-xl`
- Background: `--card`
- Overlay: black at 50% opacity, backdrop blur
- Animation: scale(0.95)→scale(1) + fade overlay (200ms)
- Close: X button (top-right) + click overlay + Escape key
- Focus trap: contained within dialog

### Drawers (Sheets)

Already using shadcn/ui Sheet. Keep.

**Spec:**
- Side: right (cart, mobile nav), left (filters on tablet)
- Width: 380px (cart), 280px (nav), 320px (filters)
- Animation: slide from side (300ms)
- Overlay: black at 40% opacity

### Skeleton Loading

**Spec:**
- Background: `--muted` with `animate-pulse`
- Border radius: `--radius-lg`
- Must match exact dimensions of real content (aspect-ratio, width, line count)
- Product card: 4:5 image + 2 text lines + 1 button
- Text: single line = full width, multi-line mimics real content shape
- Page load: enough skeletons to fill viewport

---

## Icon System

**Library:** Lucide React (already installed)

**Icon sizes:**
- 12px (size-3): badges, inline
- 14px (size-3.5): compact buttons
- 16px (size-4): standard buttons, nav
- 18px (size-[18px]): header icons
- 20px (size-5): section headers
- 24px (size-6): empty state illustrations

**Icon rules:**
- Consistent stroke width (1.5px default)
- `aria-hidden="true"` for decorative icons
- `aria-label` for standalone icon buttons
- No emoji as icons
- Match icon style to context (outline vs solid)

---

## Responsive Behavior

### Mobile (375-639px)
- Single column content
- Bottom-anchored CTAs (sticky)
- Full-width cards
- Horizontal scroll for product rows
- Bottom sheet for filters
- Hamburger/sheet navigation

### Tablet (640-1023px)
- 2-3 column product grid
- Side-by-side where beneficial (PDP, checkout)
- Persistent search visible
- Filter sidebar optional (drawer still fine)

### Desktop (1024px+)
- 4 column product grid
- Full navigation visible
- Persistent filter sidebar on listing
- 2-column PDP layout
- Sticky sidebar for cart/checkout summary
- Max-width container (1280px)

### Responsive Rules

1. **Mobile-first** — Base styles for mobile, `md:` and `lg:` for enhancement
2. **No horizontal scroll** — Content always fits viewport width
3. **`min-h-dvh`** not `100vh` for full-screen layouts
4. **Touch-friendly** — Larger tap targets on mobile (44px minimum everywhere)
5. **No content hidden by sticky bars** — Account for header (72px) and bottom CTAs
