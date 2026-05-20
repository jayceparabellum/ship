# ShipShape Early Submission

Date: 2026-05-20
Repo: https://github.com/jayceparabellum/ship
Local path: /home/jayce/projects/ship

## Executive Summary

This submission focuses on measurable, rubric-aligned improvements while preserving the existing product behavior. The work improves bundle delivery, search/query performance, runtime input handling, editor accessibility semantics, type safety in a file-upload hot path, and API test coverage.

## Local Run

Local PostgreSQL was used because Docker was not installed in this WSL distro.

```bash
sudo service postgresql start
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev pnpm db:migrate
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev pnpm db:seed
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev \
SESSION_SECRET=local-dev-session-secret-not-for-production \
CORS_ORIGIN=http://localhost:5173 pnpm dev:api
VITE_API_URL=http://localhost:3000 pnpm dev:web
```

Verified:

- API health: http://localhost:3000/health -> {"status":"ok"}
- Web: http://localhost:5173 -> HTTP 200
- Browser smoke: page title "Ship - Project Management & Documentation"
- Seeded login: dev@ship.local / admin123

## Verification

```bash
pnpm type-check
# PASS: shared, api, web

pnpm build
# PASS
# Before: initial app chunk index-C2vAyoQ1.js = 2,073.70 kB, gzip 589.49 kB
# After:  initial app chunk index-D_mqI7_d.js = 1,295.56 kB, gzip 338.59 kB
# Initial JS reduction: 778.14 kB minified, 250.90 kB gzip
# Percent reduction: 37.5% minified, 42.6% gzip

DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev \
SESSION_SECRET=local-dev-session-secret-not-for-production pnpm test
# PASS: 28 files, 453 tests, 31.15s
```

## Changes By Rubric Category

| Category | Change | Proof |
| --- | --- | --- |
| Type Safety | Replaced several editor file attachment any types with TipTap Editor / NodeViewProps / typed command chain. | pnpm type-check passes. |
| Bundle Size | Added Vite manualChunks for React, TipTap/Yjs/ProseMirror, and Radix UI. | Initial app chunk reduced 2,073.70 kB -> 1,295.56 kB. |
| API Response Time | Added indexed query paths used by search/mentions/learnings endpoints. | Schema/migration indexes applied locally; API tests pass. |
| Database Queries | Added composite active-document and association lookup indexes. | psql applied 3 CREATE INDEX statements. |
| Test Coverage | Added 2 meaningful tests for malformed/excessive search limit values. | API tests increased 451 -> 453 passing. |
| Runtime Errors | Guarded /api/search/learnings limit parsing to avoid LIMIT NaN / bad user URL 500s. | New regression tests pass. |
| Accessibility | Added listbox/option semantics, aria-label, aria-selected, and button type to editor slash command menu. | Type/build pass; semantics visible in code. |

## Files Changed

- api/src/db/schema.sql
- api/src/db/migrations/011_search_performance_indexes.sql
- api/src/routes/search.ts
- api/src/routes/search.test.ts
- web/vite.config.ts
- web/src/components/editor/FileAttachment.tsx
- web/src/components/editor/SlashCommands.tsx

## Known Follow-up For Final Submission

- Run full Playwright E2E/a11y suite after a longer browser pass.
- Produce Lighthouse/axe reports for the 3 most important pages.
- Add authenticated API load benchmarks with autocannon/k6 against seeded data.
- Deploy to AWS after local verification is stable.
