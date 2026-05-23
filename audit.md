# ShipShape Audit Report

Repository: `jayceparabellum/ship`  
Audit date: May 22, 2026  
Final deadline: Sunday, May 24, 2026 at 10:59 PM CT

## Executive Summary

This audit now has live baseline evidence for all seven required audit categories, plus a Category 8 security-tool extension. The local ShipShape stack was run with a seeded PostgreSQL database, authenticated browser flows, API load tests, source-map bundle analysis, TypeScript AST counts, repeated API test runs, API coverage, runtime capture, axe scans, Lighthouse accessibility reports, static security scanning, and an active live-app security probe.

The strongest engineering signals are the strict TypeScript configuration, a stable API suite across three consecutive runs, fast database plans on the seeded local dataset, and clean axe/Lighthouse results after the contrast remediation. The weakest signals are the high concentration of type escape hatches in API route files, the 2.07 MB main frontend chunk, missing frontend unit-test execution due a `jsdom`/ESM environment failure, and weak offline reload behavior.

Raw evidence lives under `.audit/` locally, and submission-ready JSON summaries are mirrored under `docs/audit-evidence/`. Category 8 security-tool evidence lives under `docs/security-tool/`. The most important files are `docs/audit-evidence/api-benchmarks.json`, `docs/audit-evidence/db-query-capture.json`, `docs/audit-evidence/aurora-query-counts.json`, `docs/audit-evidence/browser-accessibility.json`, `docs/audit-evidence/lighthouse-summary.json`, `docs/audit-evidence/bundle-analysis.json`, `docs/audit-evidence/type-safety.json`, `docs/audit-evidence/api-test-runs.json`, `docs/audit-evidence/api-coverage.json`, `docs/security-tool/latest-security-report.json`, and `docs/security-tool/latest-probe-report.json`.

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
3. Seeded local database plans are fast on the tested flows: representative `EXPLAIN ANALYZE` plans completed in 0.046-0.736 ms.

### Three Weakest Areas

1. Type escape pressure is concentrated in high-risk API route handlers.
2. The web app ships a very large main chunk: `index-BXwX_FdO.js` is 2,073,742 bytes before gzip.
3. Offline reload behavior falls out to Chrome's network error page instead of a recoverable in-app offline state.

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
| Production `web/dist` excluding source maps | 3,445,084 bytes |
| Non-source-map asset count | 301 |
| Largest JS chunk | `assets/index-BXwX_FdO.js`, 2,073,742 bytes |
| Main chunk gzip from Vite output | 589.56 KB |
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
| `/api/auth/me` | 10 | 3.0 | 25.78 ms | 85.84 ms | 98.38 ms | 0 |
| `/api/auth/me` | 25 | 7.5 | 23.02 ms | 57.27 ms | 63.17 ms | 0 |
| `/api/auth/me` | 50 | 15.0 | 53.63 ms | 116.06 ms | 123.32 ms | 0 |
| `/api/documents` | 10 | 3.0 | 26.47 ms | 85.95 ms | 113.27 ms | 0 |
| `/api/documents` | 25 | 7.5 | 27.17 ms | 184.81 ms | 247.57 ms | 0 |
| `/api/documents` | 50 | 15.0 | 28.69 ms | 285.01 ms | 407.15 ms | 0 |
| `/api/issues` | 10 | 3.0 | 24.80 ms | 61.64 ms | 72.80 ms | 0 |
| `/api/issues` | 25 | 7.5 | 23.71 ms | 172.36 ms | 212.86 ms | 0 |
| `/api/issues` | 50 | 15.0 | 28.89 ms | 257.35 ms | 303.44 ms | 0 |
| `/api/weeks` | 10 | 3.0 | 24.86 ms | 38.19 ms | 42.52 ms | 0 |
| `/api/weeks` | 25 | 7.5 | 37.76 ms | 65.07 ms | 74.23 ms | 0 |
| `/api/weeks` | 50 | 15.0 | 24.51 ms | 144.89 ms | 160.59 ms | 0 |
| `/api/dashboard/my-work` | 10 | 3.0 | 24.89 ms | 36.66 ms | 39.63 ms | 0 |
| `/api/dashboard/my-work` | 25 | 7.5 | 36.71 ms | 91.60 ms | 98.52 ms | 0 |
| `/api/dashboard/my-work` | 50 | 15.0 | 47.77 ms | 150.61 ms | 157.33 ms | 0 |

### Finding

`/api/documents` and `/api/issues` show the highest P95/P99 growth under 50 concurrent workers. That lines up with the larger response bodies and route complexity. These should be the first endpoints measured again after Phase 2 fixes.

Severity: Medium on seeded local data; re-test on AWS/Aurora.

## Category 4: Database Query Efficiency

### Methodology

I ran five authenticated local flows and captured response timing plus representative `EXPLAIN (ANALYZE, BUFFERS)` plans with `scripts/audit-db-query-capture.mjs`. I then enabled `pg_stat_statements` on the deployed Aurora PostgreSQL 16 cluster, reset the counters, exercised six authenticated production flows through CloudFront, and captured the top server-side statement counts from inside the VPC.

Command:

```bash
node scripts/audit-db-query-capture.mjs
```

### Baseline

| Flow | Endpoint | Status | Response time | Response bytes |
| --- | --- | ---: | ---: | ---: |
| Document list | `/api/documents` | 200 | 32.99 ms | 151,633 |
| Issue list | `/api/issues` | 200 | 16.33 ms | 102,132 |
| Week list | `/api/weeks` | 200 | 12.62 ms | 4,350 |
| Dashboard my work | `/api/dashboard/my-work` | 200 | 16.66 ms | 6,895 |
| Mention search | `/api/search/mentions?q=dev` | 200 | 14.15 ms | 373 |

Representative plans:

| Query | Execution time |
| --- | ---: |
| Documents list visibility filter | 0.736 ms |
| Issue list joins | 0.325 ms |
| Session auth lookup | 0.046 ms |

Production Aurora `pg_stat_statements` sample:

| Statement family | Calls | Rows | Total exec time |
| --- | ---: | ---: | ---: |
| Session activity update | 153 | 153 | 8.684 ms |
| Session auth lookup | 153 | 153 | 5.848 ms |
| Mention document search | 25 | 25 | 3.453 ms |
| Workspace role lookup | 125 | 125 | 2.040 ms |
| Sprint/project inference query | 6 | 0 | 1.406 ms |
| Document list visibility filter | 25 | 50 | 0.718 ms |

Production flow coverage: `/api/auth/me`, `/api/documents`, `/api/issues`, `/api/weeks`, `/api/dashboard/my-work`, and `/api/search/mentions?q=dev`, each returning 25/25 HTTP 200 responses with the temporary audit session.

### Finding

On the seeded local dataset and the deployed Aurora production environment, the representative plans and statement totals are fast. The highest-call statements are expected session middleware work: one auth lookup and one `last_activity` update per authenticated request. The production sample also shows repeated workspace role lookups, which is not urgent at this data size but is the clearest future optimization target if traffic increases.

Severity: Low on current seed and production smoke volume.

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
| API test run 1 | 451 passed, 43.66s |
| API test run 2 | 451 passed, 43.52s |
| API test run 3 | 451 passed, 43.97s |
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
| Slow 3G `/issues` load | Loaded in 15.197s with visible issue content |

### Finding

The slow-network path eventually renders usable content, but the offline reload path is weak: the app does not present a recoverable in-app offline state when the document route is reloaded offline. That is a user-facing resilience gap for a collaborative tool.

Severity: Medium.

## Category 7: Accessibility

### Methodology

I ran axe scans on five authenticated pages through Playwright, then ran Lighthouse accessibility reports against the same authenticated routes. Evidence: `docs/audit-evidence/browser-accessibility.json` and `docs/audit-evidence/lighthouse-summary.json`.

Command:

```bash
node scripts/audit-browser-accessibility.mjs
corepack pnpm dlx lighthouse http://localhost:5173/<route> --only-categories=accessibility
```

### Baseline

| Page | Axe violations | Lighthouse accessibility |
| --- | ---: | ---: |
| `/my-week` | 0 | 100 |
| `/docs` | 0 | 100 |
| `/issues` | 0 | 100 |
| `/team/allocation` | 0 | 100 |
| `/dashboard` | 0 | 100 |

### Finding

The prior color-contrast failures have been remediated for the five scanned authenticated pages. Axe reports zero violations on all five routes, and Lighthouse reports a 100 accessibility score on those same routes. Lighthouse still emitted a Windows temp-directory cleanup error after writing JSON output; the generated JSON reports are complete and parsed in `docs/audit-evidence/lighthouse-summary.json`.

Severity: Low after remediation; keep these scans in the regression checklist.

## Category 8: Security Tool

### Methodology

I built a repo-native security tool with two complementary runners:

1. `scripts/security-audit.mjs` performs static checks across source, Docker, Terraform, and dependency metadata.
2. `scripts/security-probe.mjs` runs an authenticated active probe against a live ShipShape app.

The active probe logs in with the seeded audit account, exercises session and CSRF boundaries, verifies WebSocket authentication behavior, submits adversarial input payloads, checks dependency high/critical CVEs through `pnpm audit --json`, and validates CORS/error-handling behavior. Evidence is written to `docs/security-tool/latest-security-report.json`, `docs/security-tool/latest-security-report.md`, `docs/security-tool/latest-probe-report.json`, and `docs/security-tool/latest-probe-report.md`.

Commands:

```bash
corepack pnpm security:audit
corepack pnpm security:probe -- --api-url http://127.0.0.1:3000 --web-url http://127.0.0.1:5173 --email dev@ship.local --password admin123
```

The AWS deployment design is documented in `docs/security-tool/aws-architecture.md` and implemented in `terraform/security-tool.tf`: EventBridge schedules Lambda, Lambda starts CodeBuild, CodeBuild runs the scanner/probe, probe credentials are read from SSM Parameter Store, and reports are written to S3.

### Latest Result

| Metric | Result |
| --- | ---: |
| Active live-app checks | 17 |
| Passed | 17 |
| Failed | 0 |
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| High/Critical dependency CVEs | 0 |

### Coverage Map

| Security surface | Evidence |
| --- | --- |
| Authentication boundary | Unauthenticated and invalid-session `/api/auth/me` requests rejected |
| Session strength | Session token shape checked for 64-character high-entropy hex value |
| CSRF | State-changing `/api/issues` request without CSRF token rejected |
| Authorization | Admin user endpoint checked against the current super-admin role boundary |
| WebSocket auth | Unauthenticated `/events` and collaboration WebSocket attempts rejected |
| WebSocket robustness | Oversized WebSocket message does not take down `/health` |
| Input validation | HTML tag characters in issue titles rejected; long title and script-like payload behavior checked |
| Dependency risk | `pnpm audit --json` reports zero high/critical advisories after dependency overrides |
| Browser/server hardening | Static scanner checks Helmet, CSRF, rate limiting, session cookie flags, CSP signals, TLS bypass patterns, Docker runtime signals, and Terraform encryption-at-rest signals |
| AWS automation | Lambda + CodeBuild + SSM + S3 report pipeline documented and represented in Terraform |

### Findings

The initial active probe found three issues: an oversized WebSocket message could make follow-up `/health` unavailable, the dependency audit reported high/critical advisories, and the issue-title endpoint accepted an XSS-style title payload. The fixes added WebSocket error handlers, hardened issue-title validation against HTML tag characters, added a regression test, and updated `pnpm` dependency overrides. The rerun result is now 17 passed and 0 failed.

Severity: Low after remediation; keep both `security:audit` and `security:probe` in the final regression checklist. The remaining follow-up is to run the same active probe against the deployed AWS URL once the production probe account is confirmed in that environment.

## Evidence Index

| Artifact | Purpose |
| --- | --- |
| `docs/audit-evidence/type-safety.json` | Type escape counts by package/file |
| `.audit/type-check.log` | Recursive strict type-check output |
| `docs/audit-evidence/bundle-analysis.json` | Dist size, largest assets, top source-map dependency contributors |
| `docs/audit-evidence/api-benchmarks.json` | API P50/P95/P99 under 10/25/50 concurrent workers |
| `docs/audit-evidence/db-query-capture.json` | Flow timings and `EXPLAIN ANALYZE` output |
| `docs/audit-evidence/aurora-query-counts.json` | Production Aurora `pg_stat_statements` query-count output |
| `docs/audit-evidence/api-test-runs.json` | Three-run API flake evidence |
| `docs/audit-evidence/web-test-run.json` | Web Vitest environment failure |
| `docs/audit-evidence/api-coverage.json` | API coverage summary from Node 24 run |
| `docs/audit-evidence/browser-accessibility.json` | Console, failed request, offline, throttled network, and axe scan evidence |
| `docs/audit-evidence/lighthouse-summary.json` | Lighthouse accessibility scores for authenticated major pages |
| `docs/security-tool/latest-security-report.json` | Static Category 8 security scanner output |
| `docs/security-tool/latest-probe-report.json` | Active Category 8 live-app probe output |
| `docs/security-tool/aws-architecture.md` | AWS Lambda/CodeBuild security-tool architecture |
| `.audit/browser/*.png` | Local browser screenshots for scanned pages |

## Recommendation

This baseline is now strong enough to pass the measurement side of the audit gate and includes a working Category 8 security-tool extension. The first implementation fixes should target frontend test environment repair, bundle splitting around editor/collaboration dependencies, an app-level offline recovery state for document reloads, and wiring the security probe into the deployed AWS environment.
