# Doc Manifest

Mission ID: `shipshape-fresh-audit-perfect-submission`

## Assignment Inputs

- `C:/Users/jayce/OneDrive/Gauntlet Ai/Week 4/GFA Week 4 - ShipShape.pdf`
- `C:/Users/jayce/OneDrive/Gauntlet Ai/Week 4/ShipShape — Kickoff.pdf`

## Repositories And Worktrees

- Current working repo: `C:/Users/jayce/OneDrive/Documents/ShipShape/ship`
- Baseline worktree: `C:/Users/jayce/OneDrive/Documents/ShipShape/ship-baseline-076a1837`
- Baseline commit: `076a18371da0a09f88b5329bd59611c4bc9536bb`
- Current fork remote: `https://github.com/jayceparabellum/ship`

## Existing Submission Docs To Review

- `PRESENTATION.md`
- `audit.md`
- `SHIPSHAPE_AUDIT.md`
- `SHIPSHAPE_IMPROVEMENTS.md`
- `SHIPSHAPE_DISCOVERY.md`
- `docs/shipshape-audit-report.md`
- `docs/shipshape-improvement-documentation.md`
- `docs/shipshape-discovery-writeup.md`
- `docs/shipshape-ai-cost-analysis.md`
- `docs/shipshape-demo-video-checklist.md`
- `docs/shipshape-social-post-draft.md`
- `docs/shipshape-submission-checklist.md`
- `docs/shipshape-final-submission-package.md`
- `docs/shipshape-rubric-readiness-review.md`

## Planning And Coordination Docs

- `.plan/mission.md`
- `.plan/tasks.json`
- `.plan/doc-manifest.md`
- `.plan/CLAUDE.md`
- `.plan/verification-plan.md`
- `.plan/agent-roster.md`
- `.plan/human-gates.md`
- `.plan/demo-contract.md`
- `.plan/six-sigma-agent-system.md`
- `.plan/team-flowchart.md`
- `AGENTS.md`
- `SKILLS.md`

## Evidence Corpus

- `docs/audit-evidence/README.md`
- `docs/audit-evidence/type-safety.json`
- `docs/audit-evidence/type-safety-after-auth-context.json`
- `docs/audit-evidence/bundle-analysis.json`
- `docs/audit-evidence/bundle-analysis-after-route-splitting.json`
- `docs/audit-evidence/api-benchmarks.json`
- `docs/audit-evidence/api-benchmarks-after-session-touch-throttle.json`
- `docs/audit-evidence/db-query-capture.json`
- `docs/audit-evidence/auth-query-count-after.json`
- `docs/audit-evidence/api-test-runs.json`
- `docs/audit-evidence/web-test-run.json`
- `docs/audit-evidence/web-test-run-after-jsdom-pin.json`
- `docs/audit-evidence/browser-accessibility.json`
- `docs/audit-evidence/browser-accessibility-after-contrast.json`
- `docs/audit-evidence/browser-runtime-after-offline-shell.json`
- `docs/audit-evidence/lighthouse-summary.json`

## Audit Scripts

- `scripts/audit-type-safety.mjs`
- `scripts/audit-bundle-map.mjs`
- `scripts/audit-api-benchmark.mjs`
- `scripts/audit-db-query-capture.mjs`
- `scripts/audit-auth-query-count.mjs`
- `scripts/audit-browser-accessibility.mjs`

## Code Areas Most Likely To Matter

- `api/src/middleware/auth.ts`
- `api/src/utils/auth-context.ts`
- `api/src/routes/documents.ts`
- `api/src/routes/issues.ts`
- `api/src/routes/weeks.ts`
- `api/src/routes/dashboard.ts`
- `api/src/routes/search.ts`
- `api/src/db/schema.sql`
- `api/src/db/migrations/**`
- `web/src/main.tsx`
- `web/src/pages/**`
- `web/src/components/**`
- `web/public/offline-sw.js`
- `web/package.json`
- `api/package.json`

## Important Assumptions

- Category 8 security work is valuable but optional relative to the provided seven-category assignment brief.
- Current checked-in evidence must be verified before it is trusted.
- Baseline evidence should come from `076a1837`; after evidence should come from current/fixed `master`.
- Demo video and social post are required unless the user explicitly decides to exclude them or has a waiver.
- `PRESENTATION.md` is a demo contract. Claimed product features must be verified against the current app or revised before final delivery.
- Jayce is the human gate for newly suggested product/demo updates before implementation.
