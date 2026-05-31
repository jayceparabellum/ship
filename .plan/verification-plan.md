# Verification Plan

Mission ID: `shipshape-fresh-audit-perfect-submission`

## Global Checks

- `corepack pnpm --recursive run type-check`
- `corepack pnpm --recursive run build`
- `corepack pnpm --filter @ship/api test`
- `corepack pnpm --filter @ship/web test`
- JSON evidence parses successfully.
- Final docs contain no unsupported "pass" claims.

## Category 1: Type Safety

Command:

```powershell
node scripts/audit-type-safety.mjs
```

Pass signal:

- Baseline total and after total are both recorded.
- After total is at least 25% lower.
- `corepack pnpm --recursive run type-check` passes.

## Category 2: Bundle Size

Commands:

```powershell
corepack pnpm --filter @ship/shared build
$env:VITE_API_URL=''; corepack pnpm --filter @ship/web exec vite build --sourcemap
node scripts/audit-bundle-map.mjs
```

Pass signal:

- After evidence shows 15% total production bundle reduction or 20% initial-load reduction.
- Route-level lazy loading still renders expected pages in browser QA.

## Category 3: API Response Time

Command:

```powershell
$env:AUDIT_REQUEST_DELAY_MS='3500'; node scripts/audit-api-benchmark.mjs
```

Pass signal:

- Five important authenticated endpoints are measured at 10, 25, and 50 concurrency.
- At least two endpoints show 20%+ P95 improvement under comparable baseline/after conditions.

## Category 4: Database Query Efficiency

Commands:

```powershell
node scripts/audit-db-query-capture.mjs
corepack pnpm --dir api exec tsx ..\scripts\audit-auth-query-count.mjs
```

Pass signal:

- At least one flow shows 20% fewer queries, or the slowest query improves by 50%.
- EXPLAIN ANALYZE or direct query instrumentation supports the claim.

## Category 5: Test Coverage And Quality

Commands:

```powershell
corepack pnpm --filter @ship/api test
corepack pnpm --filter @ship/web test
```

Pass signal:

- Final docs explicitly identify three meaningful critical-path tests added, or three flaky tests fixed with root cause.
- Evidence includes pass/fail counts and runtime.
- Any environment fix is framed as enabling real tests, not as a substitute for meaningful coverage unless justified.

## Category 6: Runtime Errors And Edge Cases

Command:

```powershell
node scripts/audit-browser-accessibility.mjs
```

Pass signal:

- Three runtime/error gaps have before behavior, fix, after behavior, and evidence.
- At least one scenario is user-facing data loss or confusing failure recovery.
- Browser evidence includes screenshots or JSON witness markers.

## Category 7: Accessibility

Commands:

```powershell
node scripts/audit-browser-accessibility.mjs
corepack pnpm dlx lighthouse http://localhost:5173/my-week --only-categories=accessibility
```

Pass signal:

- Critical/Serious axe violations are fixed on the three most important pages, or the lowest Lighthouse page improves by 10+ points.
- Keyboard and semantic risks are documented if relevant.

## Documentation And Submission

Pass signal:

- `audit.md` includes methodology, baselines, findings, severity, and final results.
- `docs/shipshape-improvement-documentation.md` maps every category to before/root cause/fix/after/evidence.
- `docs/shipshape-discovery-writeup.md` includes three discoveries with code references and reflection.
- `docs/shipshape-final-submission-package.md` lists links/files and remaining human actions.
- `docs/shipshape-rubric-readiness-review.md` is updated after verification.
