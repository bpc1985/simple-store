---
title: "Add shared eslint-config and typescript-config packages"
status: completed
priority: P2
---

## Overview
Create `packages/typescript-config/` and `packages/eslint-config/` following the Turborepo basic example pattern. Both apps extend these instead of duplicating config.

## Approach
1. Extract common tsconfig options into `packages/typescript-config/base.json` + `nextjs.json` + `react-library.json`
2. Create `packages/eslint-config/` with shared Next.js ESLint rules
3. Update both apps' `tsconfig.json` to extend the shared config
4. Update both apps' `eslint.config.mjs` to use the shared config
5. Verify `turbo typecheck` and `turbo lint`

## Files
- Create: `packages/typescript-config/package.json`, `base.json`, `nextjs.json`, `react-library.json`
- Create: `packages/eslint-config/package.json`, `index.js`
- Modify: `apps/storefront/tsconfig.json`, `apps/admin/tsconfig.json`
- Modify: `apps/storefront/eslint.config.mjs`, `apps/admin/eslint.config.mjs`
