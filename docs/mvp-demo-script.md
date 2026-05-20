# ShipShape MVP Demo Script

## Opening

Hi, I am walking through the MVP state of my ShipShape audit for the Treasury Ship codebase.

The goal for this first checkpoint was not to ship production fixes yet. The goal was to establish a credible audit foundation: understand the assignment, clone and inspect the codebase, start collecting baseline measurements, and create documentation that can support the full Sunday submission.

## What Was Built So Far

So far, I built three audit artifacts in the repository.

First, I created `docs/shipshape-audit-report.md`. This is the working audit report. It contains polished methodology language for all seven required categories, plus the baseline numbers I was able to collect tonight.

Second, I created `scripts/audit-type-safety.mjs`. This script measures TypeScript escape hatches using the TypeScript compiler API instead of relying only on regex. It counts explicit `any` types, type assertions, non-null assertions, and `@ts-ignore` / `@ts-expect-error` directives across `web/src`, `api/src`, and `shared/src`.

Third, I created `docs/workstation-mvp-runbook.md`. This turns the architecture plan into a local workstation checklist: PostgreSQL 16 on localhost, the Express API on port 3000, the Vite React frontend on port 5173, and local audit tools for the remaining measurements.

## Type Safety Baseline

For type safety, I confirmed that strict mode is already enabled across the monorepo and that the recursive TypeScript type-check passes.

The baseline counts are:

- 260 explicit `any` types
- 691 type assertions
- 329 non-null assertions
- 1 TypeScript suppression directive

The most concentrated production files are API route files, especially `api/src/routes/weeks.ts`, `api/src/routes/projects.ts`, and `api/src/routes/issues.ts`.

My interpretation is that this is not a codebase with TypeScript turned off. The real issue is concentrated type escape pressure at important boundaries: request input, database rows, and response shaping.

## Bundle Size Baseline

For bundle size, I built the production frontend and measured the output.

The total `web/dist` size is about 3.35 MB. The largest emitted chunk is the main `index` JavaScript bundle at about 2.07 MB uncompressed and 589 KB gzip.

Vite also warned that this chunk is larger than 500 KB after minification. It specifically flagged dynamic imports that are being defeated because the same modules are also statically imported elsewhere.

My interpretation is that the bundle optimization target is clear: the app already creates many small chunks, but the initial application bundle is still too large. The likely improvement path is route-level or editor-level code splitting, especially around TipTap, Yjs, and editor-adjacent modules.

## Test Baseline

For tests, I confirmed that the repo has a large E2E test surface:

- 71 Playwright spec files
- 882 `test(...)` declarations under `e2e`

The API Vitest run discovered 451 tests, but they could not execute because PostgreSQL was not running locally at `::1:5432`.

The web Vitest run was also blocked in this environment because this machine is running Node 18.20.8, while the repo requires Node 20 or newer. The failure comes through the jsdom dependency chain, so I treated it as an environment blocker rather than a product bug.

## What Is Still Blocked

The remaining audit categories need a live app with a real database:

- API response time
- Database query efficiency
- Runtime error and edge-case handling
- Accessibility compliance

I deliberately did not fake those numbers. API latency without seeded data would be misleading. Query efficiency without Postgres logs would be guesswork. Runtime and accessibility findings need a running UI, authenticated flows, and browser evidence.

## Workstation Run Plan

The next step is to run the app locally on a workstation.

The clean local shape is:

- PostgreSQL 16 on `localhost:5432`
- Express API and WebSocket server on `localhost:3000`
- Vite React frontend on `localhost:5173`
- Browser-based audit tooling for Network traces, Lighthouse, axe, and runtime edge cases

The API needs `DATABASE_URL`, `SESSION_SECRET`, `CORS_ORIGIN`, and `APP_BASE_URL`. The frontend needs `VITE_API_URL` and `VITE_APP_ENV=development`.

Once the local stack is live, I can seed the database, trace the five required user flows, run API benchmarks, capture query logs and `EXPLAIN ANALYZE`, run Lighthouse and axe, and complete the remaining audit tables.

## Closing

The main value of this MVP is that it establishes a defensible audit foundation. I have real baseline numbers for type safety, bundle size, and test surface area, and I have clearly separated what is measured from what still requires a fully running local environment.

The next milestone is to get the workstation stack live, seed it, and finish the remaining four measurement-heavy categories with evidence instead of assumptions.
