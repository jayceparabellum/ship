# ShipShape Audit Report

Repository: `jayceparabellum/ship`  
Audit date: May 21, 2026  
Final deadline: Sunday, May 24, 2026 at 10:59 PM CT

## Executive Summary

This audit now has live baseline evidence for all seven required categories. The local ShipShape stack was run with a seeded PostgreSQL database, authenticated browser flows, API load tests, source-map bundle analysis, TypeScript AST counts, repeated API test runs, API coverage, runtime capture, and axe accessibility scans.

The strongest engineering signals are the strict TypeScript configuration, a stable API suite across three consecutive runs, and fast database plans on the seeded local dataset. The weakest signals are the high concentration of type escape hatches in API route files, the 2.07 MB main frontend chunk, missing frontend unit-test execution due a `jsdom`/ESM environment failure, and serious color-contrast violations on three authenticated pages.

Evidence lives under `.audit/`. The most important files are `.audit/api-benchmarks.json`, `.audit/db-query-capture.json`, `.audit/browser/browser-accessibility.json`, `.audit/bundle-analysis.json`, `.audit/type-safety.json`, `.audit/api-test-runs.json`, and `.audit/api-coverage-node24.log`.

## Orientation

### Setup Steps Used

1. Install dependencies with `corepack pnpm install --frozen-lockfile`.
2. Configure `api/.env.local` with local Postgres: `postgresql://ship:ship_dev_password@127.0.0.1:5432/ship_dev`.
3. Run `corepack pnpm --filter @ship/api db:migrate`.
4. Run `corepack pnpm --filter @ship/api db:seed`.
5. Start API on `http://localhost:3000` and web on `http://localhost:5173`.
6. Log in with `dev@ship.local` / `admin123`.
7. Run audit scripts from the repo root.

### Package Architecture Map

| Package | Role |
| --- | --- |
| `api` | Express API, session auth, CSRF, route handlers, PostgreSQL access, WebSocket/collaboration services |
| `web` | React + Vite frontend, authenticated app shell, editor UI, workflow pages, API client |
| `shared` | Shared constants/types and pure utilities used by both API and web |
| `e2e` | Playwright user-flow tests |
| `terraform` | AWS infrastructure for the government-compliant deployment plan |
| `scripts` | Deployment and audit automation |

### Request Flow Trace

The browser calls `web/src/lib/api.ts`, which handles CSRF/session behavior at `ensureCsrfToken` and `apiGet` (`web/src/lib/api.ts:54`, `web/src/lib/api.ts:118`). API routes are mounted in `api/src/app.ts`: CSRF token at `api/src/app.ts:160`, documents at `api/src/app.ts:183`, issues at `api/src/app.ts:186`, weeks at `api/src/app.ts:190`, and dashboard at `api/src/app.ts:209`.

For an authenticated list flow, the browser requests `/api/documents`; Express routes through `authMiddleware`; the route reads `req.userId!` and `req.workspaceId!` and queries PostgreSQL with visibility filtering (`api/src/routes/documents.ts:94`, `api/src/routes/documents.ts:97`, `api/src/routes/documents.ts:98`).

### TypeScript Pattern Citations

The strict compiler posture is real, but the escape hatches cluster at risk boundaries:

| Pattern | Citation | Risk |
| --- | --- | --- |
| Unstructured editor content | `api/src/routes/documents.ts:44`, `api/src/routes/documents.ts:53` | `z.any()` allows document payloads to cross API boundaries without shape validation |
| Database row escape | `api/src/routes/issues.ts:82` | `row: any` hides nullable/JSONB assumptions in issue mapping |
| Auth assumptions | `api/src/routes/issues.ts:118`, `api/src/routes/issues.ts:119` | Non-null assertions assume middleware invariants in route code |
| Frontend session handling | `web/src/lib/api.ts:35`, `web/src/lib/api.ts:54` | Centralized behavior is good, but redirect/throw paths need runtime coverage |

### Three Strongest Areas

1. Strict TypeScript is enabled and recursive type-check passes.
2. API tests are stable across three runs: 451 tests passed each time.
3. Seeded local database plans are fast on the tested flows: representative `EXPLAIN ANALYZE` plans completed in 0.039-0.542 ms.

### Three Weakest Areas

1. Type escape pressure is concentrated in high-risk API route handlers.
2. The web app ships a very large main chunk: `index-C2vAyoQ1.js` is 2,073,741 bytes before gzip.
3. Accessibility has serious color-contrast violations on `/my-week`, `/team/allocation`, and `/dashboard`.

## Category 1: Type Safety

### Methodology

I ran the AST-based helper `scripts/audit-type-safety.mjs` against `web/src`, `api/src`, and `shared/src`, then ran the recursive strict type-check.

Commands:

```bash
node scripts/audit-type-safety.mjs
corepack pnpm --recursive run type-check
rg -n "@ts-ignore|@ts-expect-error" web/src api/src shared/src
```

### Baseline

| Metric | Baseline |
| --- | ---: |
| Explicit `any` types | 260 |
| Type assertions | 691 |
| Non-null assertions | 329 |
| `@ts-ignore` / `@ts-expect-error` | 1 |
| Strict type-check | Passed |

| Package | `any` | Type assertions | Non-null assertions | TS directives |
| --- | ---: | ---: | ---: | ---: |
| `web` | 33 | 372 | 33 | 1 |
| `api` | 227 | 317 | 296 | 0 |
| `shared` | 0 | 2 | 0 | 0 |

Top production files:

| File | Total | `any` | Assertions | Non-null |
| --- | ---: | ---: | ---: | ---: |
| `api/src/routes/weeks.ts` | 85 | 11 | 26 | 48 |
| `api/src/routes/projects.ts` | 51 | 15 | 10 | 26 |
| `api/src/routes/issues.ts` | 49 | 4 | 8 | 37 |
| `web/src/pages/UnifiedDocumentPage.tsx` | 37 | 0 | 36 | 1 |
| `api/src/db/seed.ts` | 35 | 0 | 0 | 35 |

### Finding

Strict mode is not the problem; concentrated escape hatches are. The API routes are the highest-risk area because they sit between untrusted request input, JSONB database rows, authorization checks, and response serialization.

Severity: High for API route clusters.

## Category 2: Bundle Size

### Methodology

I built the production frontend with sourcemaps and parsed emitted source maps to identify the largest dependency contributors. Evidence: `.audit/bundle-analysis.json`.

Commands:

```bash
corepack pnpm --filter @ship/shared build
$env:VITE_API_URL=''; corepack pnpm --filter @ship/web exec vite build --sourcemap
node scripts/audit-bundle-map.mjs
```

### Baseline

| Metric | Baseline |
| --- | ---: |
| Production `web/dist` excluding source maps | 3,444,935 bytes |
| JS/CSS asset count | 262 |
| Largest JS chunk | `assets/index-C2vAyoQ1.js`, 2,073,741 bytes |
| Main chunk gzip from Vite output | 589.52 KB |
| Main sourcemap | 8,079,404 bytes |

Top dependency contributors by source-map source bytes:

| Dependency | Bytes |
| --- | ---: |
| `emoji-picker-react` | 407,996 |
| `highlight.js` | 385,448 |
| `react-router` | 355,026 |
| `yjs` | 299,468 |
| `prosemirror-view` | 242,455 |

### Finding

The production build succeeds, but the initial chunk is too large. The strongest targets are editor/collaboration dependencies and modules whose dynamic imports are defeated by static imports, which Vite called out during build.

Severity: High for initial load.

## Category 3: API Response Time

### Methodology

I benchmarked five authenticated endpoints for 30 seconds each at 10, 25, and 50 concurrent workers using `scripts/audit-api-benchmark.mjs`. The database was seeded before the run. The script uses an audit session and a 3,500 ms worker delay so the benchmark stays below Ship's dev rate limiter; all recorded responses were HTTP 200.

Command:

```bash
$env:AUDIT_REQUEST_DELAY_MS='3500'; node scripts/audit-api-benchmark.mjs
```

### Baseline

| Endpoint | Concurrency | RPS | P50 | P95 | P99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/api/auth/me` | 10 | 3.0 | 21.58 ms | 73.35 ms | 106.83 ms | 0 |
| `/api/auth/me` | 25 | 7.5 | 27.30 ms | 80.47 ms | 90.97 ms | 0 |
| `/api/auth/me` | 50 | 15.0 | 31.04 ms | 154.62 ms | 163.85 ms | 0 |
| `/api/documents` | 10 | 3.0 | 23.85 ms | 99.13 ms | 139.24 ms | 0 |
| `/api/documents` | 25 | 7.5 | 27.54 ms | 271.04 ms | 351.36 ms | 0 |
| `/api/documents` | 50 | 15.0 | 28.21 ms | 418.76 ms | 592.18 ms | 0 |
| `/api/issues` | 10 | 3.0 | 23.92 ms | 80.22 ms | 116.48 ms | 0 |
| `/api/issues` | 25 | 7.5 | 25.62 ms | 208.91 ms | 250.88 ms | 0 |
| `/api/issues` | 50 | 15.0 | 22.57 ms | 351.64 ms | 416.76 ms | 0 |
| `/api/weeks` | 10 | 3.0 | 21.05 ms | 32.97 ms | 40.59 ms | 0 |
| `/api/weeks` | 25 | 7.5 | 37.43 ms | 90.14 ms | 104.82 ms | 0 |
| `/api/weeks` | 50 | 15.0 | 25.89 ms | 160.00 ms | 175.77 ms | 0 |
| `/api/dashboard/my-work` | 10 | 3.0 | 26.88 ms | 54.39 ms | 60.21 ms | 0 |
| `/api/dashboard/my-work` | 25 | 7.5 | 45.74 ms | 99.20 ms | 114.85 ms | 0 |
| `/api/dashboard/my-work` | 50 | 15.0 | 72.06 ms | 164.60 ms | 177.09 ms | 0 |

### Finding

`/api/documents` and `/api/issues` show the highest P95/P99 growth under 50 concurrent workers. That lines up with the larger response bodies and route complexity. These should be the first endpoints measured again after Phase 2 fixes.

Severity: Medium on seeded local data; re-test on AWS/Aurora.

## Category 4: Database Query Efficiency

### Methodology

I ran five authenticated flows and captured response timing plus representative `EXPLAIN (ANALYZE, BUFFERS)` plans with `scripts/audit-db-query-capture.mjs`. Local `pg_stat_statements` was not enabled, so the report uses flow-level evidence and explicit plans instead of claiming server-side statement totals.

Command:

```bash
node scripts/audit-db-query-capture.mjs
```

### Baseline

| Flow | Endpoint | Status | Response time | Response bytes |
| --- | --- | ---: | ---: | ---: |
| Document list | `/api/documents` | 200 | 89.48 ms | 151,638 |
| Issue list | `/api/issues` | 200 | 53.78 ms | 102,132 |
| Week list | `/api/weeks` | 200 | 18.63 ms | 4,349 |
| Dashboard my work | `/api/dashboard/my-work` | 200 | 14.97 ms | 6,895 |
| Mention search | `/api/search/mentions?q=dev` | 200 | 15.79 ms | 373 |

Representative plans:

| Query | Execution time |
| --- | ---: |
| Documents list visibility filter | 0.542 ms |
| Issue list joins | 0.239 ms |
| Session auth lookup | 0.039 ms |

### Finding

On the seeded local dataset, the representative plans are fast and do not expose an obvious slow query. The higher API latency for `/api/documents` appears more related to route work and payload size than raw SQL execution time. The next audit iteration should enable `pg_stat_statements` or Postgres `log_statement` in the deployed database for full query-count-per-flow evidence.

Severity: Low on local seed; instrumentation gap remains for production-grade query counts.

## Category 5: Test Coverage and Quality

### Methodology

I ran the API suite three times, attempted the web suite, counted E2E surface area, and ran API coverage under Node 24 using the Vitest V8 provider.

Commands:

```bash
corepack pnpm --filter @ship/api test
corepack pnpm --filter @ship/web test
node ../node_modules/vitest/vitest.mjs run --coverage
rg --files e2e -g "*.spec.ts"
rg "\btest\(" e2e -g "*.spec.ts"
```

### Baseline

| Metric | Baseline |
| --- | ---: |
| API test run 1 | 451 passed, 46.83s |
| API test run 2 | 451 passed, 47.30s |
| API test run 3 | 451 passed, 45.56s |
| API flake signal | 0 failures across 3 runs |
| API coverage | 40.34% statements, 33.44% branches, 40.90% functions, 40.52% lines |
| E2E spec files | 71 |
| E2E `test(...)` declarations | 882 |
| Web Vitest | Fails before execution with 16 `ERR_REQUIRE_ESM` environment errors |

### Finding

The API suite is stable and now has real coverage numbers. The weakest quality gap is frontend unit-test execution: web Vitest does not reach tests because `jsdom@27` pulls an ESM dependency through a CommonJS path under the current workstation Node/Corepack path. The E2E surface is large, but the audit still needs a critical-flow-to-spec map before claiming flow coverage.

Severity: High for web test environment; Medium for API coverage gaps.

## Category 6: Runtime Error and Edge-Case Handling

### Methodology

I used Playwright against the running local app to log browser console warnings/errors, failed network requests, screenshots, offline reload behavior, and throttled-network behavior. Evidence: `.audit/browser/browser-accessibility.json` and screenshots under `.audit/browser/`.

Command:

```bash
node scripts/audit-browser-accessibility.mjs
```

### Baseline

| Scenario | Result |
| --- | --- |
| Normal authenticated navigation | 1 console warning/error recorded |
| Failed requests during run | 1 failed request recorded |
| Offline reload on `/docs` | Browser fell to `chrome-error://chromewebdata/`; no app-level offline state rendered |
| Slow 3G `/issues` load | Loaded in 15.167s with visible issue content |

### Finding

The slow-network path eventually renders usable content, but the offline reload path is weak: the app does not present a recoverable in-app offline state when the document route is reloaded offline. That is a user-facing resilience gap for a collaborative tool.

Severity: Medium.

## Category 7: Accessibility

### Methodology

I ran axe scans on five authenticated pages through Playwright. Evidence: `.audit/browser/browser-accessibility.json`.

Command:

```bash
node scripts/audit-browser-accessibility.mjs
```

### Baseline

| Page | Axe violations | Severity |
| --- | ---: | --- |
| `/my-week` | 1 | Serious color contrast; 18 nodes |
| `/docs` | 0 | None found |
| `/issues` | 0 | None found |
| `/team/allocation` | 1 | Serious color contrast; 1 node |
| `/dashboard` | 1 | Serious color contrast; 14 nodes |

### Finding

The main accessibility issue is color contrast on small muted/accent text. `/docs` and `/issues` passed the axe scan with zero violations, which gives a good comparison point for remediation. Lighthouse was not run in this pass; axe evidence is complete for the scanned pages, and Lighthouse remains a follow-up artifact for the deployed build.

Severity: High for WCAG AA compliance on affected pages.

## Evidence Index

| Artifact | Purpose |
| --- | --- |
| `.audit/type-safety.json` | Type escape counts by package/file |
| `.audit/type-check.log` | Recursive strict type-check output |
| `.audit/bundle-analysis.json` | Dist size, largest assets, top source-map dependency contributors |
| `.audit/api-benchmarks.json` | API P50/P95/P99 under 10/25/50 concurrent workers |
| `.audit/db-query-capture.json` | Flow timings and `EXPLAIN ANALYZE` output |
| `.audit/api-test-runs.json` | Three-run API flake evidence |
| `.audit/web-test-run.json` | Web Vitest environment failure |
| `.audit/api-coverage-node24.log` | API coverage table |
| `.audit/browser/browser-accessibility.json` | Console, failed request, offline, throttled network, and axe scan evidence |
| `.audit/browser/*.png` | Browser screenshots for scanned pages |

## Recommendation

This baseline is now strong enough to pass the measurement side of the audit gate, with two honest caveats: full database query counts need `pg_stat_statements` or Postgres statement logging enabled in the deployed database, and Lighthouse still needs to be added beside axe for the deployed frontend. The first implementation fixes should target color contrast, frontend test environment repair, and bundle splitting around editor/collaboration dependencies.
