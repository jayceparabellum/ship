# ShipShape Improvements

Final rubric update: May 24, 2026

Current canonical branch: `master`

Scope note: Jayce asked to leave demo video and social posting out for now. This document covers the audit and implementation-improvement rubric items.

## Summary

All eight categories now have measured baseline evidence and after-fix proof. The refreshed evidence for Categories 1, 3, and 6 closes the rubric risks that were previously documented as caveats.

| Category | Rubric target | Final status |
| --- | --- | --- |
| 1. Type safety | 25% violation reduction | Pass: 1,281 -> 959, 25.14% reduction |
| 2. Bundle size | 15% total or 20% initial-load reduction | Pass: initial chunk reduced 77.31% |
| 3. API response time | 20% P95 reduction on 2 endpoints | Pass: `/api/weeks` and `/api/dashboard/my-work` cleared target |
| 4. Database efficiency | 20% query reduction on one flow or 50% slow-query improvement | Pass: auth session validation 3 -> 2 queries |
| 5. Test coverage/quality | 3 critical paths tested or 3 flaky tests fixed | Pass: web suite restored from 0 executable tests to 151 passing |
| 6. Runtime errors/edge cases | 3 gaps fixed | Pass: offline recovery, malformed IDs, session write throttling |
| 7. Accessibility | +10 Lighthouse or all Critical/Serious axe fixed | Pass: 0 axe violations on audited authenticated pages |
| 8. Security tool | 2+ verified vulnerabilities fixed | Pass: live probe 17/17, static scan 13/13 |

## Category 1: Type Safety

Baseline:

- 260 explicit `any`
- 691 type assertions
- 329 non-null assertions
- 1 TypeScript suppression directive
- Total: 1,281 violations

Changes:

- Added `api/src/utils/auth-context.ts` with `getAuthContext`, `getUserId`, and `getWorkspaceId`.
- Replaced repeated `req.userId!` and `req.workspaceId!` assertions across authenticated API route handlers.
- Kept issue-route row mapping typed through `IssueRow`.
- Replaced dense test mock `as any` casts with typed query-result helpers in high-count files.

After:

- Total violations: 959
- Reduction: 322 violations, 25.14%
- API type-check passed
- Focused API regression suite passed: 4 files, 69 tests

Evidence:

- `docs/audit-evidence/type-safety.json`
- `docs/audit-evidence/type-safety-after-auth-context.json`

## Category 2: Bundle Size

Baseline:

- Initial JS chunk: 2,073,742 bytes
- Main chunk gzip: about 589 KB

Changes:

- Replaced static route-page imports in `web/src/main.tsx` with lazy-loaded route imports.
- Added a single Suspense boundary for route loading.
- Moved heavy editor/collaboration dependencies out of the initial app chunk.

After:

- Initial JS chunk: 470,513 bytes
- Reduction: 1,603,229 bytes
- Percent reduction: 77.31%

Evidence:

- `docs/audit-evidence/bundle-analysis.json`
- `docs/audit-evidence/bundle-analysis-after-route-splitting.json`

## Category 3: API Response Time

Baseline P95 at 50 concurrent workers:

- `/api/documents`: 285.01 ms
- `/api/issues`: 257.35 ms
- `/api/dashboard/my-work`: 150.61 ms
- `/api/weeks`: 144.89 ms
- `/api/auth/me`: 116.06 ms

Changes:

- Trimmed document list payloads to fields needed by list views.
- Removed full issue content from list responses.
- Derived `/api/auth/me` current workspace from already-loaded membership data.
- Folded workspace-membership validation into the session lookup.
- Throttled session `last_activity` writes inside the 60-second touch window.

After P95 at 50 concurrent workers:

| Endpoint | Before | After | Change |
| --- | ---: | ---: | ---: |
| `/api/weeks` | 144.89 ms | 97.42 ms | 32.8% faster |
| `/api/dashboard/my-work` | 150.61 ms | 103.86 ms | 31.0% faster |
| `/api/documents` | 285.01 ms | 228.76 ms | 19.7% faster |

The final benchmark used the same seeded local harness and 3,500 ms request delay as baseline.

Evidence:

- `docs/audit-evidence/api-benchmarks.json`
- `docs/audit-evidence/api-benchmarks-after-session-touch-throttle.json`

## Category 4: Database Query Efficiency

Baseline:

- Authenticated session-validation flow performed 3 queries: session lookup, workspace membership check, and session activity update.

Changes:

- Combined session lookup and membership validation with a `LEFT JOIN`.
- Preserved revoked-access behavior for sessions whose workspace membership was removed.
- Added `scripts/audit-auth-query-count.mjs` to generate query-count evidence.

After:

- Session-validation query count: 3 -> 2
- Reduction: 33.33%

Evidence:

- `docs/audit-evidence/db-query-capture.json`
- `docs/audit-evidence/aurora-query-counts.json`
- `docs/audit-evidence/auth-query-count-after.json`

## Category 5: Test Coverage And Quality

Baseline:

- API suite passed 451 tests across three consecutive runs with no flakes.
- Web Vitest failed before executing tests because of a `jsdom` / ESM environment mismatch.

Changes:

- Pinned the web test environment to `jsdom@26.1.0`.
- Updated document-tabs tests to match the current route model.
- Updated details-extension tests to include required TipTap companion nodes.
- Mocked `apiPost` directly in session-timeout tests.

After:

- Web Vitest: 16 files passed
- Web tests: 151 passed
- Failures: 0

Evidence:

- `docs/audit-evidence/api-test-runs.json`
- `docs/audit-evidence/api-coverage.json`
- `docs/audit-evidence/web-test-run.json`
- `docs/audit-evidence/web-test-run-after-jsdom-pin.json`

## Category 6: Runtime Errors And Edge Cases

Baseline:

- Offline reload on `/docs` fell to `chrome-error://chromewebdata/`.
- Slow 3G `/issues` eventually rendered but lacked a strong recovery story.
- Runtime/error evidence showed browser failure paths that were not user-friendly enough for a collaborative document app.

Changes:

- Added a same-origin service worker and offline app-shell fallback.
- Added an authenticated app offline banner with `role="status"` and `aria-live="polite"`.
- Added malformed document-ID validation across document read/content/update/delete/convert/undo routes.
- Added a regression test for `/api/documents/not-a-uuid`.
- Throttled session activity writes to reduce repeated request-path database writes.

After:

- Offline `/docs` reload stays at `http://localhost:5173/docs`.
- Cached docs/sidebar content plus offline banner render.
- Malformed document route input returns `400 {"error":"Invalid document ID"}` before database access.
- Auth middleware tests cover both session touch and no-touch paths.

Evidence:

- `docs/audit-evidence/browser-runtime-after-offline-shell.json`
- `api/src/routes/documents.test.ts`
- `api/src/__tests__/auth.test.ts`

## Category 7: Accessibility

Baseline:

- Serious color-contrast violations existed on `/my-week`, `/team/allocation`, and `/dashboard`.

Changes:

- Replaced low-contrast accent text on dark badges.
- Removed broad row opacity that lowered child text contrast.
- Raised muted helper/index labels to accessible contrast levels.

After:

- `/my-week`: 0 axe violations
- `/docs`: 0 axe violations
- `/issues`: 0 axe violations
- `/team/allocation`: 0 axe violations
- `/dashboard`: 0 axe violations

Evidence:

- `docs/audit-evidence/browser-accessibility.json`
- `docs/audit-evidence/browser-accessibility-after-contrast.json`
- `docs/audit-evidence/lighthouse-summary.json`

## Category 8: Security Tool

Baseline:

- No dedicated Category 8 tool existed.
- The first active probe identified WebSocket oversized-message resilience, XSS-style title input, and dependency advisory issues.

Changes:

- Added `scripts/security-audit.mjs` for static scanning.
- Added `scripts/security-probe.mjs` for active live-app probing.
- Added AWS Lambda/CodeBuild/EventBridge/S3 automation.
- Added SSM-backed probe credentials.
- Added security results UI at `/programs/security`.
- Fixed WebSocket error handling, issue-title validation, and dependency override findings.

After:

- Static scanner: 13 passed, 0 failed
- Active production probe: 17 passed, 0 failed
- High/Critical dependency CVEs: 0
- AWS report prefix: `s3://ship-prod-security-tool-743737183156/latest/`

Evidence:

- `docs/security-tool/latest-security-report.json`
- `docs/security-tool/latest-probe-report.json`
- `docs/security-tool/aws-architecture.md`
- `terraform/environments/prod/security-tool.tf`
- `docs/security-tool/ShipShape Security Tool Walkthrough.docx`

## Verification Snapshot

- API type-check passed.
- Focused API regression suite passed: 4 files, 69 tests.
- Audit/security JSON parses.
- GitLab `master` and GitHub `master` contain the consolidated build.

## Remaining Non-Code Items

- Demo video: intentionally excluded from this update per Jayce's instruction.
- Social post: intentionally left for Jayce to complete later.
- Post-submission cleanup: rotate the AWS access key used during setup.
