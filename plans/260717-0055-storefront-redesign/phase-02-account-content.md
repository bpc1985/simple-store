# Phase 2: Account & Content Pages

## 6. Login Page (/account/login)

### UX Problems Identified

1. **Bare card with form only** — No brand context, no hero, no value prop for creating account.
2. **No social login** — Email/password only. (Backend limitation — OK for reference app, but note it)
3. **No "Remember me"** — Token stored in localStorage always. No session persistence choice.
4. **No forgot password flow** — Dead end if password forgotten.
5. **No password visibility toggle** — Can't verify typed password.
6. **Redirect is always to "/"** — Should return to the page user came from (e.g., checkout → login → back to checkout).
7. **Error messages are generic** — "Invalid credentials" doesn't distinguish wrong email vs wrong password.
8. **No loading state on the card** — Full page skeleton is fine, but the form itself has no inline feedback during submit besides disabled button.

### Redesign

**UX Goals:** Reduce friction. Preserve user intent. Build trust. Make authentication feel secure.

**Layout — Mobile/Desktop (split layout):**
```
┌──────────────────────────────────────┐
│ ┌─────────────────┐ ┌──────────────┐ │
│ │                 │ │              │ │
│ │ SIMPLESTORE     │ │ Welcome back │ │
│ │                 │ │              │ │
│ │ [Brand imagery  │ │ Email        │ │
│ │  or pattern]    │ │ [_________]  │ │
│ │                 │ │              │ │
│ │                 │ │ Password     │ │
│ │                 │ │ [____ 👁]    │ │
│ │                 │ │              │ │
│ │                 │ │ [☑ Remember] │ │
│ │                 │ │              │ │
│ │                 │ │ [Login →]    │ │
│ │                 │ │              │ │
│ │                 │ │ Forgot pwd?  │ │
│ │                 │ │ ──────────── │ │
│ │                 │ │ New here?    │ │
│ │                 │ │ [Register →] │ │
│ └─────────────────┘ └──────────────┘ │
└──────────────────────────────────────┘
```

On mobile: brand section collapses to top bar, form takes full width.

### Key Improvements

1. **Split layout** — Brand/pattern on left, form on right. Gives visual weight and context.
2. **Password visibility toggle** — Eye icon in password field. Standard pattern.
3. **"Remember me" checkbox** — Controls token persistence. Off = sessionStorage (cleared on tab close). On = localStorage (current behavior).
4. **Return-to redirect** — Store `returnUrl` in query param. After login, redirect back to that URL (e.g., checkout, cart).
5. **Error differentiation** — "No account found with this email" vs "Incorrect password."
6. **Inline validation** — Validate email format on blur. Show specific hints.
7. **Loading state** — Button shows spinner + "Signing in..." text. Inputs stay enabled so user can edit if slow.
8. **Success state** — Brief checkmark animation, then redirect. Toast "Welcome back, [Name]!"

---

## 7. Register Page (/account/register)

### UX Problems Identified

1. **Same issues as login** — bare card, no brand context, no value prop.
2. **No password strength indicator** — User doesn't know if their password is weak.
3. **"Confirm Password" is below the fold** — On mobile, user must scroll to confirm. Validation delay.
4. **No terms/privacy checkbox** — Legal requirement in many jurisdictions.
5. **Auto-login after register** — Currently auto-logs in. Good for UX but user doesn't see "verify your email" step (if email verification added later).

### Redesign

**Same split layout as login.**

### Key Improvements

1. **Password strength meter** — Visual bar: red (weak), yellow (fair), green (strong). Checks length, mixed case, numbers, symbols.
2. **Real-time password match** — Show ✓ or ✗ next to confirm password as user types (after first character).
3. **Terms checkbox** — "I agree to the Terms of Service and Privacy Policy" with links. Required before submit.
4. **Value prop copy** — "Create an account to track orders, save favorites, and checkout faster."
5. **Inline validation** — Email format, password strength, name length — all on blur.
6. **Loading state** — "Creating your account..." spinner.
7. **Success state** — "Welcome to SimpleStore! 🎉" toast, redirect to home (or return URL).

---

## 8. Account Page (new — /account)

Currently no account overview page. User lands on /account/orders directly.

### New Page Design

**UX Goals:** Central hub for account management. Quick access to orders, saved items, settings.

**Layout — Mobile:**
```
┌────────────────────────────┐
│ My Account                 │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ 👤 John Doe            │ │ ← Profile card
│ │ john@example.com       │ │
│ │ [Edit Profile]         │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ Quick Links                │
│ ┌───────────────────────┐  │
│ │ 📦 My Orders      →  │  │
│ │ 💝 Wishlist        →  │  │
│ │ 📍 Addresses       →  │  │
│ │ ⚙️ Settings        →  │  │
│ └───────────────────────┘  │
├────────────────────────────┤
│ Recent Orders              │
│ ┌───────────────────────┐  │
│ │ #12345   $149.97     │  │
│ │ PENDING  3 items     │  │
│ └───────────────────────┘  │
│ [View All Orders →]        │
├────────────────────────────┤
│ [Logout]                   │
└────────────────────────────┘
```

### Key Features

1. **Profile card** — Name, email, edit button.
2. **Quick link grid** — 2×2 icon grid for Orders, Wishlist, Addresses, Settings.
3. **Recent orders preview** — Last 3 orders with status badges. "View All" link.
4. **Logout** — In settings section or bottom of page with confirmation dialog.
5. **Loading state** — Profile skeleton, order list skeletons (3 items).

---

## 9. Orders List (/account/orders) — Redesigned

### UX Problems Identified

1. **Table is not mobile-friendly** — 6 columns on mobile requires horizontal scroll.
2. **Cancel button is an X icon** — Not obvious. Must hover/learn to understand.
3. **Two-step cancel is clever but discoverable** — First-time users don't know clicking X reveals Confirm/Keep.
4. **No order filtering** — Can't filter by status (Pending, Confirmed, Cancelled).
5. **No order search** — Can't search by order ID.
6. **No pagination** — All orders load at once. OK for demo, bad for scale.
7. **Order ID is technical (numeric)** — Not user-friendly. Could show formatted ID.

### Redesign

**Mobile card layout:**
```
┌────────────────────────────┐
│ My Orders      [Filter ▼]  │
├────────────────────────────┤
│ Status tabs:               │
│ [All] Pending Confirmed    │
│    Cancelled               │
├────────────────────────────┤
│ Order #12345               │
│ ┌────────────────────────┐ │
│ │ PENDING · Jan 15, 2026 │ │
│ │ 3 items · $149.97      │ │
│ │ [View Details] [Cancel]│ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ Order #12344               │
│ ┌────────────────────────┐ │
│ │ CONFIRMED · Jan 10     │ │
│ │ 1 item · $49.99        │ │
│ │ [View Details]         │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Key Improvements

1. **Card layout on mobile** — Each order as a card with key info. Table on desktop for scanning.
2. **Status filter tabs** — Quick filter by status. Horizontal scroll tabs on mobile.
3. **Clear cancel action** — "Cancel" text button (not X icon). Confirmation dialog, not two-step inline.
4. **Loading state** — Skeleton cards matching final layout.
5. **Empty state** — "No orders yet" with "Start Shopping" CTA + product recommendations.
6. **Empty filter state** — "No [status] orders" with "Show all orders" link.

---

## 10. Order Detail (/account/orders/[id])

### UX Improvements

1. **Status timeline** — Visual progress: Pending → Confirmed → Shipped → Delivered. Shows where order is in process.
2. **Item cards with images** — Not table rows. Show product thumbnails.
3. **Shipping address card** — Separate card, clearly labeled.
4. **Order actions** — Cancel (if pending), Reorder (if delivered), Contact Support (always).
5. **Print/Download** — "Download Invoice" link (basic printable version).

---

## 11. Wishlist (new — /wishlist)

Currently doesn't exist. New feature.

### Design

**UX Goals:** Save items for later. Drive return visits. Enable sharing.

```
┌────────────────────────────┐
│ My Wishlist (5 items)      │
├────────────────────────────┤
│ Sort: [Date Added ▼]       │
├────────────────────────────┤
│ Product Grid (2/4 cols)    │
│ [Product Card] [Card]      │
│ with remove button +       │
│ Add to Cart overlay on     │
│ hover (desktop) / visible  │
│ button (mobile)            │
├────────────────────────────┤
│ [Add All to Cart]          │ ← Bulk action
└────────────────────────────┘
```

**Key features:**
- Heart icon in header nav (next to cart) to access wishlist
- Heart toggle on product cards and PDP
- Empty state: "Your wishlist is empty" + product recommendations
- Wishlist stored in localStorage (anonymous) or backend (authenticated)
- "Share Wishlist" link (copy URL)

---

## 12. 404 Page

### Current: None exists.

### Design

```
┌────────────────────────────┐
│                            │
│         🔍 (icon)          │
│                            │
│     Page Not Found         │
│                            │
│  The page you're looking   │
│  for doesn't exist or      │
│  has been moved.           │
│                            │
│  [Back to Home] [Shop]     │
│                            │
│  Popular Categories:       │
│  [Electronics] [Clothing]  │
│  [Home] [Sports]           │
│                            │
└────────────────────────────┘
```

Key: Provide clear path back to content. Category links reduce bounce.

---

## Summary of Phase 2 Changes

| Change | UX Impact | Complexity |
|--------|-----------|------------|
| Login/Register redesign | Medium | Low |
| Account hub page (new) | Medium | Medium |
| Orders card layout | Medium | Low |
| Order status timeline | Medium | Medium |
| Wishlist (new) | High | Medium |
| 404 page (new) | Low | Low |
| Return-to redirect after auth | High | Low |
| Password visibility/strength | Medium | Low |
