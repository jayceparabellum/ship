# ShipShape Audit Evidence

This folder contains tracked copies of the raw audit JSON artifacts generated during the May 22, 2026 local baseline refresh, plus after-fix evidence for completed improvement slices.

The live working copies are generated under `.audit/`, which is ignored by git because it also contains logs and screenshots. These JSON files are copied here so the final submission includes reproducible raw data.

## Files

| File | Source | Purpose |
| --- | --- | --- |
| `type-safety.json` | `.audit/type-safety.json` | AST counts for `any`, assertions, non-null assertions, and TypeScript suppression directives |
| `type-safety-after-issues-route.json` | `node scripts/audit-type-safety.mjs` after Category 1 slice | After-fix type-safety counts showing the `issues.ts` route cleanup |
| `bundle-analysis.json` | `.audit/bundle-analysis.json` | Production bundle size, largest assets, and top sourcemap dependency contributors |
| `bundle-analysis-after-route-splitting.json` | Vite production build after route lazy-loading | Before/after initial chunk size evidence for Category 2 |
| `api-benchmarks.json` | `.audit/api-benchmarks.json` | P50/P95/P99 API benchmarks for five authenticated endpoints at 10/25/50 concurrency |
| `db-query-capture.json` | `.audit/db-query-capture.json` | Flow timings and representative `EXPLAIN ANALYZE` plans |
| `aurora-query-counts.json` | Aurora PostgreSQL 16 `pg_stat_statements` | Production query-count capture after authenticated CloudFront flows |
| `api-test-runs.json` | `.audit/api-test-runs.json` | Three-run API flake check |
| `web-test-run.json` | `.audit/web-test-run.json` | Web Vitest environment failure record |
| `api-coverage.json` | `.audit/api-coverage.json` | API coverage run metadata |
| `browser-accessibility.json` | `.audit/browser/browser-accessibility.json` | Browser console/network capture, offline/3G behavior, and axe scan output |
| `browser-accessibility-after-contrast.json` | `.audit/browser/browser-accessibility.json` after contrast fixes | Category 7 after-fix axe evidence |
| `lighthouse-summary.json` | `.audit/lighthouse-*.json` | Lighthouse accessibility scores for the authenticated major pages |
| `production-smoke-test.json` | AWS production smoke test | CloudFront, API proxy, EB health, login-page, and demo-credential status |

## Reproduction Commands

```bash
node scripts/audit-type-safety.mjs
corepack pnpm --filter @ship/shared build
$env:VITE_API_URL=''; corepack pnpm --filter @ship/web exec vite build --sourcemap
node scripts/audit-bundle-map.mjs
$env:AUDIT_REQUEST_DELAY_MS='3500'; node scripts/audit-api-benchmark.mjs
node scripts/audit-db-query-capture.mjs
# Production Aurora query-count capture requires the deployed AWS VPC runner and pg_stat_statements.
node scripts/audit-browser-accessibility.mjs
corepack pnpm --filter @ship/api test
corepack pnpm --filter @ship/api test:coverage
corepack pnpm dlx lighthouse http://localhost:5173/<route> --only-categories=accessibility
```

Screenshots from the browser capture are stored locally under `.audit/browser/*.png`; they are intentionally not tracked because the repository ignores generated PNG evidence globally.
