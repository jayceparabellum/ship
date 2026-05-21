# ShipShape Audit Report

Repository: `jayceparabellum/ship`
Audit date: May 19, 2026
Final deadline: Sunday, May 24, 2026 at 10:59 PM CT

## Executive Summary

This audit evaluates Ship across the seven required categories from the ShipShape brief: type safety, production bundle size, API response time, database query efficiency, test coverage and quality, runtime error handling, and accessibility compliance. The purpose of the audit is diagnostic, not cosmetic. Every measurement is tied to a reproducible command, a concrete artifact, or a manual test scenario that can be repeated under the same conditions.

The strongest early signal is that the TypeScript configuration is already strict across the monorepo and the recursive type-check passes. The largest technical risk identified so far is not a single failing feature; it is the amount of type escape pressure concentrated in API route files and the very large initial frontend bundle chunk. The local audit environment also exposed setup risks: the repo declares Node 20+, while this workstation is currently running Node 18.20.8, and database-backed tests cannot run without PostgreSQL on `::1:5432`.

## Audit Environment

- OS/shell: Windows / PowerShell
- Node: `v18.20.8`
- pnpm: `10.27.0` through Corepack
- Repository package engine: Node `>=20.0.0`, pnpm `>=9.0.0`
- Dependency install: `corepack pnpm install --frozen-lockfile`

Environment caveat: the repo explicitly asks for Node 20+. Any runtime/test failures caused by Node 18 are treated as environment blockers, not application defects, unless they reproduce on the required Node version.

## Category 1: Type Safety

### Methodology

I measured explicit `any` types, type assertions, non-null assertions, and `@ts-ignore` / `@ts-expect-error` directives across `web/src`, `api/src`, and `shared/src`. I used a TypeScript AST-based helper rather than plain text matching for the main counts so the scan counts actual TypeScript syntax nodes instead of incidental strings. The helper lives at `scripts/audit-type-safety.mjs`.

I also inspected the package `tsconfig.json` files and ran the recursive type-check.

Commands:

```bash
node scripts/audit-type-safety.mjs
corepack pnpm --recursive run type-check
```

### Baseline

| Metric | Baseline |
| --- | ---: |
| Total explicit `any` types | 260 |
| Total type assertions | 691 |
| Total non-null assertions | 329 |
| Total `@ts-ignore` / `@ts-expect-error` directives | 1 |
| Strict mode enabled? | Yes |
| Strict mode error count | 0; recursive type-check passed |

Breakdown by package:

| Package | `any` | Type assertions | Non-null assertions | TS directives |
| --- | ---: | ---: | ---: | ---: |
| `web` | 33 | 372 | 33 | 1 |
| `api` | 227 | 317 | 296 | 0 |
| `shared` | 0 | 2 | 0 | 0 |

Top production violation-dense files:

| File | Total | `any` | Type assertions | Non-null assertions |
| --- | ---: | ---: | ---: | ---: |
| `api/src/routes/weeks.ts` | 85 | 11 | 26 | 48 |
| `api/src/routes/projects.ts` | 51 | 15 | 10 | 26 |
| `api/src/routes/issues.ts` | 49 | 4 | 8 | 37 |
| `web/src/pages/UnifiedDocumentPage.tsx` | 37 | 0 | 36 | 1 |
| `api/src/db/seed.ts` | 35 | 0 | 0 | 35 |

### Findings

The codebase is configured with strict TypeScript, and the strict type-check currently passes. That is a meaningful strength: the project is not operating with strict mode disabled or hiding broad compiler failure.

The weakness is concentrated type escape pressure. The API package contains 227 explicit `any` types and 296 non-null assertions, with the densest production files clustered in route handlers. This matters because route files sit at the boundary between untrusted request input, database rows, and shared response types. Type escape hatches in that layer make it easier for malformed request payloads or nullable database values to pass through as if they were safe.

I am not treating every `any` as a defect. Some boundary values are legitimately unknown until parsed. The problem is the concentration of un-narrowed values in files that make authorization, validation, and persistence decisions.

Severity: High for the API route clusters; Medium for frontend assertion-heavy components; Low for the shared package.

## Category 2: Bundle Size

### Methodology

I built the production frontend and measured `web/dist`. The repo's web build script uses POSIX-style environment assignment, which fails in PowerShell, so I ran the equivalent Windows-safe command after the shared package built.

Commands:

```bash
corepack pnpm --filter @ship/shared build
$env:VITE_API_URL=''; corepack pnpm --filter @ship/web exec vite build
Get-ChildItem -Recurse -File web/dist | Measure-Object -Property Length -Sum
Get-ChildItem -Recurse -File web/dist/assets | Sort-Object Length -Descending | Select-Object -First 10 Name,Length
```

### Baseline

| Metric | Baseline |
| --- | ---: |
| Total production `web/dist` size | 3,432,324 bytes / 3,352 KB |
| JS/CSS asset count | 262 |
| Largest chunk | `assets/index-C2vAyoQ1.js`, 2,073.70 KB / gzip 589.49 KB |
| Main CSS asset | `assets/index-DJeYp5na.css`, 66.51 KB / gzip 12.92 KB |

Largest emitted assets:

| Asset | Size |
| --- | ---: |
| `index-C2vAyoQ1.js` | 2,073,698 bytes |
| `index-DJeYp5na.css` | 66,512 bytes |
| `ProgramWeeksTab-BzbUWlt4.js` | 16,761 bytes |
| `WeekReviewTab-DmxN07T1.js` | 12,644 bytes |
| `StandupFeed-BjJLDai5.js` | 9,648 bytes |

### Findings

The production build succeeds, but Vite warns that the main application chunk exceeds 500 KB after minification. The largest chunk is roughly 2.07 MB uncompressed, which dominates the frontend payload. The build also reports ineffective dynamic imports: `upload.ts` and `FileAttachment.tsx` are dynamically imported from `SlashCommands.tsx` but also statically imported elsewhere, so those modules cannot move into separate lazy chunks.

This is a strong optimization target because the application already emits many small split chunks, yet the initial `index` bundle remains oversized. The first implementation pass should focus on route-level or editor-level code splitting, especially around TipTap/Yjs/editor functionality and static imports that defeat existing dynamic imports.

Severity: High for initial-load performance.

## Category 3: API Response Time

### Methodology

Target methodology: seed the database to the brief's required volume, identify the five highest-value endpoints from real frontend flows, and benchmark each endpoint at 10, 25, and 50 concurrent connections with `autocannon -c <N> -d 30`.

The intended endpoint set is:

| Flow | Candidate endpoint |
| --- | --- |
| Main page/dashboard load | TBD after Network tab trace |
| View document | TBD after Network tab trace |
| List issues | TBD after Network tab trace |
| Load sprint/week board | TBD after Network tab trace |
| Search content | TBD after Network tab trace |

### Baseline

Pending. Local API benchmarks require a running PostgreSQL database and a running API. The current local environment does not have Docker available and PostgreSQL is not listening on `::1:5432`.

### Findings

The audit cannot honestly report API latency from an empty database or from failed local setup. The next valid measurement point is the AWS deployment with seeded Aurora data.

Severity: Measurement blocked; not yet scored.

## Category 4: Database Query Efficiency

### Methodology

Target methodology: enable PostgreSQL query logging, run the five common user flows, count total queries per flow, and run `EXPLAIN ANALYZE` on the slowest queries.

### Baseline

Pending. Requires a running PostgreSQL instance with query logging enabled.

### Findings

This category must be measured from database logs, not inferred from API timing. The local test run confirms the app expects PostgreSQL at `::1:5432`; without that service, query-count and `EXPLAIN ANALYZE` evidence would be fabricated.

Severity: Measurement blocked; not yet scored.

## Category 5: Test Coverage and Quality

### Methodology

I inspected the test layout and attempted both API and web test suites. I also counted E2E spec files and test declarations to estimate test surface area before a full Playwright run.

Commands:

```bash
corepack pnpm --filter @ship/api test
corepack pnpm --filter @ship/web test
rg --files e2e -g "*.spec.ts"
rg "\btest\(" e2e -g "*.spec.ts"
```

### Baseline

| Metric | Baseline |
| --- | ---: |
| E2E spec files | 71 |
| E2E `test(...)` declarations | 882 |
| API Vitest discovered tests | 451 skipped before execution |
| API suite runtime before setup failure | 49.13s |
| Web Vitest result | 16 environment errors before tests executed |

### Findings

The repository has a large E2E surface, with 71 Playwright spec files and 882 `test(...)` declarations under `e2e`. That supports the brief's claim that this is an E2E-heavy codebase.

The local test baseline is currently blocked by environment setup. API tests fail at setup because PostgreSQL is unavailable at `::1:5432`. Web tests fail before execution because the Node 18 environment hits an ESM/CommonJS incompatibility through `jsdom@27` and `html-encoding-sniffer`. Because the repo declares Node 20+, I do not treat the web Vitest error as a product bug until it is reproduced under the required Node version.

I deliberately did not add line-coverage tooling during this pass. For an E2E-heavy application, hurried line coverage would be a weak proxy for user-flow quality. The stronger audit move is to map critical flows to actual tests and then add targeted tests for uncovered risk.

Severity: High setup risk for repeatable test execution; coverage quality still pending manual mapping.

## Category 6: Runtime Error and Edge Case Handling

### Methodology

Target methodology: exercise normal flows with browser console monitoring, then test network disconnect/reconnect during collaborative editing, malformed input, concurrent editing, and throttled-network behavior.

### Baseline

Pending. Requires a running app instance, seeded data, and at least one authenticated user.

### Findings

Runtime error handling cannot be audited from static source alone. The most important scenarios are user-facing: whether edits survive a collaboration disconnect, whether malformed input is rejected visibly, and whether slow-network states fail silently.

Severity: Measurement blocked; not yet scored.

## Category 7: Accessibility Compliance

### Methodology

Target methodology: run Lighthouse accessibility audits and axe scans on major pages, then manually verify keyboard navigation, focus order, screen-reader structure, and color contrast.

### Baseline

Pending. Requires a running app instance and representative authenticated pages.

### Findings

The repo includes accessibility E2E files, including `e2e/accessibility.spec.ts` and `e2e/accessibility-remediation.spec.ts`, which suggests accessibility has been considered. That is not a substitute for current Lighthouse/axe evidence. The audit still needs page-level scores and violation counts from the deployed app.

Severity: Measurement blocked; not yet scored.

## Immediate MVP Gap List

To pass the audit gate tonight, the remaining required work is:

1. Deploy the app to AWS with PostgreSQL and seeded data.
2. Capture API benchmark numbers for five endpoints at 10, 25, and 50 concurrency.
3. Enable query logging and capture query counts plus `EXPLAIN ANALYZE` for the five user flows.
4. Run browser-based runtime error scenarios and record console/server evidence.
5. Run Lighthouse/axe on major pages and record accessibility scores/violations.
6. Map critical user flows to existing E2E test names and identify zero-coverage gaps.

## Recommendation

For tonight's MVP, prioritize passing the audit gate before implementation work. Early implementation proof is useful only after the baseline is complete; without baseline numbers, any improvement claim is vulnerable. The best sequence is: deploy/provision, seed, measure all seven categories, finish the audit report, then use the clearest high-impact findings to choose Friday's fixes.
