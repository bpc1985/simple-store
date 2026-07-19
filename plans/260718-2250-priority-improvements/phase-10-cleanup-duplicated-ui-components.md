---
phase: 10
title: "Cleanup Duplicated UI Components"
status: pending
priority: P2
dependencies: []
effort: "1h"
---

# Phase 10: Cleanup Duplicated UI Components

## Overview

`@simplestore/ui` package exists with shared shadcn/ui components. Both storefront and admin have local copies of the same components. Standardize: delete local duplicates, import from `@simplestore/ui`.

## Requirements

- Functional: Same visual output, shared components imported from `@simplestore/ui`
- Non-functional: No local duplicates of shared components

## Related Code Files

- **Check**: `frontend/packages/ui/src/` — list available shared components
- **Delete**: Local duplicates in `frontend/apps/storefront/src/components/ui/`
- **Delete**: Local duplicates in `frontend/apps/admin/src/components/ui/`
- **Modify**: Import statements in all consuming files

## Implementation Steps

### 1. Inventory shared components

Run: `ls frontend/packages/ui/src/`

Expected components: `button.tsx`, `input.tsx`, `card.tsx`, `skeleton.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `alert.tsx`, `badge.tsx`, `dialog.tsx`, `select.tsx`, `separator.tsx`, `table.tsx`

### 2. For each duplicated component

For each component that exists in both `@simplestore/ui` and a local `components/ui/`:
- Verify the shared version exports the same interface
- Update all local imports from `@/components/ui/X` to `@simplestore/ui`
- Delete the local file

### 3. Components likely shared (from audit)

Both apps import some from `@simplestore/ui` (Button, Input, Card, Skeleton, DropdownMenu, Sheet) but have local copies. Audit showed all 12 shadcn components are duplicated.

### 4. Verify build

```bash
cd frontend && npx turbo typecheck && npx turbo build
```

If any shared component has different customization (additional props/styles), keep the local version and document why.

## Success Criteria

- [ ] No component exists in both `@simplestore/ui` and local `components/ui/`
- [ ] All imports resolve to `@simplestore/ui` for shared components
- [ ] `npx turbo typecheck` passes with zero errors
- [ ] `npx turbo build` passes with zero errors
- [ ] Visual check: storefront and admin look identical to before

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Shared component has different default props | Check each component before deleting local copy |
| App-specific variants needed | Keep app-specific variants in app `components/ui/` with different filenames; shared base goes to `@simplestore/ui` |
| Circular dependency risk | `@simplestore/ui` has zero app deps — no circular risk |
