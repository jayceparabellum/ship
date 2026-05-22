# ShipShape Improvement Documentation

This document tracks the required before/after improvement proof for all seven assignment categories.

Current state: baseline measurements are complete for the audit gate, including production Aurora query-count evidence. Categories 1, 2, 3, 4, 5, and 7 now have before/after improvement proof. Category 6 has a scoped target but still needs after measurements before it should be presented as a completed Phase 2 improvement.

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

Completed first measurable slice on May 22, 2026.

Changed file:

- `api/src/routes/issues.ts`

Implementation notes:

- Replaced `row: any` in the issue response mapper with a typed `IssueRow` interface.
- Added `getAuthContext(req)` so authenticated route handlers use narrowed `userId` and `workspaceId` values instead of repeated non-null assertions.
- Replaced `any[]` query parameter arrays in touched update paths with `unknown[]`.
- Preserved route behavior and kept the recursive TypeScript check passing.

After measurement:

Evidence: `docs/audit-evidence/type-safety-after-issues-route.json`

Command:

```bash
node scripts/audit-type-safety.mjs > docs/audit-evidence/type-safety-after-issues-route.json
corepack pnpm --recursive run type-check
corepack pnpm --filter @ship/api test -- src/routes/issues.test.ts
```

Results:

- Total type-safety violations: 1,281 -> 1,239
- Explicit `any`: 260 -> 256
- Type assertions: 691 -> 690
- Non-null assertions: 329 -> 292
- `api/src/routes/issues.ts`: 49 -> 7 total violations
- `api/src/routes/issues.ts` no longer appears in the production top-10 violation-dense file list
- Recursive type-check: passed
- API route regression suite: 451 tests passed

Result: this completes a scoped Category 1 improvement slice by removing the highest-risk issue-route escape hatches. It does not yet satisfy the larger 25% whole-codebase reduction target; the next slices should apply the same pattern to `api/src/routes/weeks.ts` and `api/src/routes/projects.ts`.

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

Completed first measurable slice on May 22, 2026.

Changed file:

- `web/src/main.tsx`

Implementation notes:

- Replaced static route-page imports in the app entry with `React.lazy` named-export imports.
- Added a single `React.Suspense` route boundary so page bundles load on demand.
- Moved heavy document/editor paths, including Tiptap/Yjs/prosemirror dependencies, out of the initial app chunk.

After measurement:

Evidence: `docs/audit-evidence/bundle-analysis-after-route-splitting.json`

Commands:

```bash
corepack pnpm --filter @ship/web type-check
$env:VITE_API_URL=''; corepack pnpm --filter @ship/web exec vite build --sourcemap
node scripts/audit-bundle-map.mjs
```

Results:

- Initial `index` JS chunk: 2,073,742 bytes -> 470,513 bytes
- Initial chunk reduction: 1,603,229 bytes
- Initial chunk reduction percentage: 77.31%
- After-build largest JS chunk: `web/dist/assets/PropertyRow-C9gvJHDl.js`, 836,487 bytes
- After-build route/editor chunk: `web/dist/assets/UnifiedDocumentPage-EG3dQtKb.js`, 403,802 bytes
- Web type-check: passed
- Production preview smoke: `/login` rendered sign-in UI and `/docs` rendered a route shell from the built preview server

Result: this satisfies the Category 2 target through the initial-load bundle path. Total `dist` including sourcemaps stayed roughly flat because the same application code moved into lazy chunks rather than being deleted.

## Category 3: API Response Time

Baseline:

Local seeded P95 values at 50 concurrent workers:

- `/api/documents`: 285.01 ms
- `/api/issues`: 257.35 ms
- `/api/dashboard/my-work`: 150.61 ms
- `/api/weeks`: 144.89 ms
- `/api/auth/me`: 116.06 ms

Root cause:

List routes were returning more data than the first screen needs, especially full JSONB properties and issue content. Authenticated requests also paid for a separate workspace-membership lookup in middleware before each route handler ran. Representative SQL plans were fast locally, so the first implementation slice targeted payload size, route serialization, and repeated middleware round trips rather than raw query execution.

Target:

Reduce P95 by 20% on at least two endpoints under identical benchmark conditions.

Implementation status:

Completed first measurable slice on May 22, 2026.

Changed files:

- `api/src/routes/documents.ts`
- `api/src/routes/issues.ts`
- `api/src/routes/auth.ts`
- `api/src/middleware/auth.ts`

Implementation notes:

- Changed the document list query to select only the common scalar property fields used by list views instead of returning the full `properties` JSONB blob and remapping it in JavaScript.
- Removed full `content` from the issue list response and built a narrowed issue property object in SQL.
- Derived `/api/auth/me` `currentWorkspace` from the already-loaded workspace membership list instead of issuing a separate current-workspace query.
- Folded the workspace-membership validation in `authMiddleware` into the session lookup query, removing one database round trip from every authenticated request.

After measurement:

Evidence: `docs/audit-evidence/api-benchmarks-after-list-payload-trim.json`

Command:

```bash
$env:AUDIT_REQUEST_DELAY_MS='3500'
$env:AUDIT_BENCH_OUT='docs\audit-evidence\api-benchmarks-after-list-payload-trim.json'
node scripts\audit-api-benchmark.mjs
```

Results at 50 concurrent workers:

- `/api/weeks` P95: 144.89 ms -> 113.83 ms, 21.4% faster
- `/api/documents` P95: 285.01 ms -> 242.16 ms, 15.0% faster; P99: 407.15 ms -> 331.59 ms, 18.6% faster
- `/api/dashboard/my-work` P95: 150.61 ms -> 140.65 ms, 6.6% faster
- `/api/issues` P95: 257.35 ms -> 244.84 ms, 4.9% faster
- `/api/auth/me` P50: 53.63 ms -> 19.77 ms, 63.1% faster; P95 stayed effectively flat at 116.06 ms -> 113.62 ms

Result: this completes a defensible Category 3 improvement slice with real P50/P95/P99 after evidence. It does not fully satisfy the original two-endpoint 20% P95 stretch target; the next slice should add pagination or server-side summary endpoints for `/api/documents` and `/api/issues` to make the remaining gains less sensitive to benchmark variance.

## Category 4: Database Query Efficiency

Baseline:

- Document list flow: 89.48 ms API response, 151,638 bytes
- Issue list flow: 53.78 ms API response, 102,132 bytes
- Representative `EXPLAIN ANALYZE` plans completed in 0.039-0.542 ms locally
- Production Aurora `pg_stat_statements` capture after authenticated CloudFront flows is stored in `docs/audit-evidence/aurora-query-counts.json`
- Highest production statement counts were expected session middleware work: 153 session activity updates and 153 session auth lookups

Root cause:

Local representative queries are fast on the seed dataset, and the production Aurora sample did not expose a high-latency SQL bottleneck at current smoke volume. The clearest repeated pattern was authenticated request overhead: every valid session had a session lookup, a separate workspace-membership validation lookup, and a session activity update before the route handler ran.

Target:

Reduce total query count by 20% on one flow, or improve slowest query by 50%.

Implementation status:

Completed first measurable slice on May 22, 2026.

Changed files:

- `api/src/middleware/auth.ts`
- `scripts/audit-auth-query-count.mjs`

Implementation notes:

- Folded workspace-membership validation into the existing session lookup with a `LEFT JOIN workspace_memberships`.
- Preserved the revoked-access behavior: if a non-super-admin session has a workspace but no membership row, the middleware still deletes the session and returns 403.
- Kept a fallback for older test/mock rows that do not include `membership_id`, so existing unit tests continue to validate the legacy behavior shape.
- Added an audit script that instruments `pool.query` for a valid-session middleware invocation and writes query-count evidence.

After measurement:

Evidence: `docs/audit-evidence/auth-query-count-after.json`

Command:

```bash
corepack pnpm --dir api exec tsx ..\scripts\audit-auth-query-count.mjs
```

Results:

- Target flow: authenticated request session validation
- Before query count: 3
- After query count: 2
- Queries removed: 1
- Query-count reduction: 33.33%
- After categories observed: 1 combined session/membership lookup and 1 session activity update

Result: this satisfies the Category 4 target by reducing total query count by more than 20% on the authenticated session-validation flow. The remaining database work should focus on larger route-level query consolidation only if production traffic shows those routes dominating `pg_stat_statements`.

## Category 5: Test Coverage and Quality

Baseline:

- API test run 1: 451 passed, 46.83s
- API test run 2: 451 passed, 47.30s
- API test run 3: 451 passed, 45.56s
- API flake count across 3 runs: 0
- API coverage: 40.34% statements, 33.44% branches, 40.90% functions, 40.52% lines
- Web Vitest: fails before execution with 16 `ERR_REQUIRE_ESM` environment errors

Root cause:

API tests are stable but route and service coverage is uneven. Web tests were blocked by a Node/jsdom/ESM environment mismatch before test files executed. Once the environment was fixed, stale frontend tests surfaced around current document-tab behavior, the details editor extension schema, and session timeout API mocking.

Target:

Add meaningful tests for three previously untested critical paths, or fix three flaky tests with root cause analysis.

Implementation status:

Completed first measurable slice on May 22, 2026.

Changed files:

- `web/package.json`
- `pnpm-lock.yaml`
- `web/src/lib/document-tabs.test.ts`
- `web/src/components/editor/DetailsExtension.test.ts`
- `web/src/hooks/useSessionTimeout.test.ts`

Implementation notes:

- Pinned the web test environment to `jsdom@26.1.0`, avoiding the `jsdom@27` transitive ESM/CJS loader failure under the current local Node runtime.
- Updated document-tab tests to match the current route model: project/program use `weeks`, sprint documents have tabs, and the project default tab is `issues`.
- Updated details-extension tests to include the companion `DetailsSummary` and `DetailsContent` nodes required by the current TipTap schema.
- Mocked `apiPost` directly in session-timeout tests so reset/extend-session behavior is deterministic and does not accidentally hit CSRF/network paths.

After measurement:

Evidence: `docs/audit-evidence/web-test-run-after-jsdom-pin.json`

Command:

```bash
corepack pnpm --filter @ship/web test
```

Results:

- Before: web Vitest exited 1 before executing tests, with 16 worker startup errors and no test files run
- After: 16 web test files passed
- After: 151 web tests passed
- Failures: 0
- Runner exit code: 0

Result: this completes a Category 5 quality slice by restoring the entire web unit-test suite from “no tests execute” to a passing 151-test run. Remaining test-quality work should focus on reducing React `act(...)` warnings and adding new runtime/error-recovery tests for Category 6.

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
