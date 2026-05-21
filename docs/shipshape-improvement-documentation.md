# ShipShape Improvement Documentation

This document tracks the required before/after improvement proof for all seven assignment categories.

Current state: baseline measurements are complete enough for the audit gate, but not every implementation category has an after measurement yet. Do not present rows marked "Pending" as completed improvements.

## Category 1: Type Safety

Baseline:

- 260 explicit `any`
- 691 type assertions
- 329 non-null assertions
- 1 TypeScript suppression directive
- Strict type-check passed

Root cause:

Type escape hatches are concentrated in API routes that translate request input, JSONB database rows, and response objects. Examples include unstructured document content in `api/src/routes/documents.ts` and database row mapping in `api/src/routes/issues.ts`.

Target:

Eliminate 25% of type-safety violations while preserving behavior.

Implementation status:

Pending. Recommended first slice is to replace `row: any` and repeated `req.userId!` / `req.workspaceId!` route assumptions with narrowed helper types in `issues.ts`, `documents.ts`, and `weeks.ts`.

After measurement:

Pending.

## Category 2: Bundle Size

Baseline:

- Production `web/dist` excluding source maps: 3,444,935 bytes
- Largest JS chunk: `assets/index-C2vAyoQ1.js`, 2,073,741 bytes
- Main chunk gzip: 589.52 KB
- Top source-map contributors: `emoji-picker-react`, `highlight.js`, `react-router`, `yjs`, `prosemirror-view`

Root cause:

Editor/collaboration dependencies and some UI utilities are included in the initial chunk. Vite also reported dynamic imports that cannot split because the same modules are statically imported elsewhere.

Target:

Reduce total production bundle by 15%, or reduce initial-load bundle by 20% through code splitting.

Implementation status:

Pending. Recommended first slice is route/editor-level code splitting and removal of static imports that defeat lazy loading.

After measurement:

Pending.

## Category 3: API Response Time

Baseline:

Slowest local seeded P95 values at 50 concurrent workers:

- `/api/documents`: 418.76 ms
- `/api/issues`: 351.64 ms
- `/api/dashboard/my-work`: 164.60 ms
- `/api/weeks`: 160.00 ms
- `/api/auth/me`: 154.62 ms

Root cause:

`/api/documents` and `/api/issues` return larger payloads and run more route-level transformation work than the other measured endpoints. Representative SQL plans were fast locally, so the first hypothesis is payload size and route serialization rather than raw query execution.

Target:

Reduce P95 by 20% on at least two endpoints under identical benchmark conditions.

Implementation status:

Pending. Recommended first slice is response-shape pruning or pagination for list endpoints.

After measurement:

Pending.

## Category 4: Database Query Efficiency

Baseline:

- Document list flow: 89.48 ms API response, 151,638 bytes
- Issue list flow: 53.78 ms API response, 102,132 bytes
- Representative `EXPLAIN ANALYZE` plans completed in 0.039-0.542 ms locally

Root cause:

Local representative queries are fast on the seed dataset. The remaining weakness is instrumentation: local Postgres did not have `pg_stat_statements` enabled, so full query-count-per-flow evidence is not complete yet.

Target:

Reduce total query count by 20% on one flow, or improve slowest query by 50%.

Implementation status:

Pending. Before code changes, enable `pg_stat_statements` or `log_statement = 'all'` in the deployed database to identify the true target.

After measurement:

Pending.

## Category 5: Test Coverage and Quality

Baseline:

- API test run 1: 451 passed, 46.83s
- API test run 2: 451 passed, 47.30s
- API test run 3: 451 passed, 45.56s
- API flake count across 3 runs: 0
- API coverage: 40.34% statements, 33.44% branches, 40.90% functions, 40.52% lines
- Web Vitest: fails before execution with 16 `ERR_REQUIRE_ESM` environment errors

Root cause:

API tests are stable but route and service coverage is uneven. Web tests are blocked by a Node/jsdom/ESM environment mismatch before test files execute.

Target:

Add meaningful tests for three previously untested critical paths, or fix three flaky tests with root cause analysis.

Implementation status:

Pending. Recommended first slice is to fix web Vitest execution, then add targeted tests for offline/error handling and accessibility remediation.

After measurement:

Pending.

## Category 6: Runtime Error and Edge-Case Handling

Baseline:

- Normal authenticated navigation recorded 1 console warning/error
- 1 failed request was recorded during the browser capture
- Offline reload on `/docs` fell to `chrome-error://chromewebdata/`
- Slow 3G `/issues` loaded in 15.167s with visible content

Root cause:

The app can render under slow network, but an offline route reload does not provide an app-level recovery state. That can confuse users in a document-heavy collaboration tool.

Target:

Fix three error-handling gaps, with at least one real user-facing data-loss or confusion scenario.

Implementation status:

Pending. Recommended first slice is an offline/reconnect UI state for document routes plus explicit error recovery for failed list loads.

After measurement:

Pending.

## Category 7: Accessibility

Baseline:

- `/my-week`: 1 serious color-contrast violation, 18 nodes
- `/docs`: 0 axe violations
- `/issues`: 0 axe violations
- `/team/allocation`: 1 serious color-contrast violation, 1 node
- `/dashboard`: 1 serious color-contrast violation, 14 nodes

Root cause:

Small muted/accent text uses low-contrast color combinations on authenticated work pages.

Target:

Improve the lowest Lighthouse accessibility score by 10+ points, or fix all Critical/Serious violations on the three most important pages.

Implementation status:

Completed first measurable slice on May 21, 2026.

Changed files:

- `web/src/pages/MyWeekPage.tsx`
- `web/src/pages/TeamMode.tsx`
- `web/src/components/dashboard/DashboardVariantC.tsx`
- `web/src/components/DashboardSidebar.tsx`

Implementation notes:

- Replaced low-contrast accent text on dark accent-tinted badges with higher-contrast `text-blue-200` / `text-blue-300` pairings.
- Removed row-level `opacity-40` from future My Week daily update rows because it lowered contrast for every child text node.
- Raised muted index and helper labels from `text-muted/50` or `text-muted/60` to `text-muted`.

After measurement:

Evidence: `docs/audit-evidence/browser-accessibility-after-contrast.json`

Same command: `node scripts/audit-browser-accessibility.mjs`

- `/my-week`: 0 axe violations
- `/docs`: 0 axe violations
- `/issues`: 0 axe violations
- `/team/allocation`: 0 axe violations
- `/dashboard`: 0 axe violations

Result: all Critical/Serious axe violations on the audited authenticated pages were fixed. This satisfies the Category 7 improvement gate through the "fix all Critical/Serious violations on the three most important pages" path.
