# Mission Blueprint: ShipShape Fresh Audit And Perfected Submission

Mission ID: `shipshape-fresh-audit-perfect-submission`

## What It Is

Run ShipShape as a fresh production-codebase audit and implementation sprint. The original pre-ShipShape baseline is commit `076a18371da0a09f88b5329bd59611c4bc9536bb`, checked out locally at `C:/Users/jayce/OneDrive/Documents/ShipShape/ship-baseline-076a1837`. The working target is current `master` in `C:/Users/jayce/OneDrive/Documents/ShipShape/ship`.

The goal is not to invent a new feature set. The goal is to make the ShipShape submission unusually rigorous: every audit claim has raw evidence, every improvement has before/after proof under comparable conditions, and every rubric item is easy for a grader to verify.

## Who It Is For

Primary audience: Gauntlet/GFA evaluators deciding Austin admission. They are evaluating production engineering judgment under time pressure.

What "good" means to them:

- The codebase was understood before changes were made.
- Baseline measurements exist for all required categories.
- Improvements are measurable, technically meaningful, and preserve behavior.
- Evidence is reproducible through commands and checked-in artifacts.
- Documentation is clear enough that another engineer can follow the reasoning.
- Git history and final submission materials are disciplined.

Standout opportunity: make the grader's review path almost frictionless. The final package should include a rubric traceability matrix, a raw evidence index, and concise improvement docs that tie metric -> root cause -> fix -> after metric -> command.

## Goals And End State

1. Fresh baseline audit anchored to commit `076a1837`, covering the seven required categories:
   - Type safety
   - Bundle size
   - API response time
   - Database query efficiency
   - Test coverage and quality
   - Runtime error and edge-case handling
   - Accessibility compliance
2. Corrected implementation on current `master`, preserving useful existing ShipShape work while repairing weak or stale evidence.
3. Before/after proof for every category using tracked JSON/log artifacts under `docs/audit-evidence/`.
4. Final documentation package:
   - `audit.md`
   - `docs/shipshape-audit-report.md`
   - `docs/shipshape-improvement-documentation.md`
   - `docs/shipshape-discovery-writeup.md`
   - `docs/shipshape-ai-cost-analysis.md`
   - `docs/shipshape-submission-checklist.md`
   - `docs/shipshape-final-submission-package.md`
   - `docs/shipshape-rubric-readiness-review.md`
5. Demo-video checklist and social-post draft are updated, with final user action clearly separated if posting/recording happens outside the repo.
6. Final validation passes: type-check, builds, relevant tests, audit scripts, browser evidence, and final rubric review.
7. Product demo completeness against `PRESENTATION.md`, including Programs, sprint/week planning, standups, reviews, retrospectives, Observer Dashboard, and OpenAPI docs.

## Initial Problems And Risks

- Current `master` already contains ShipShape deliverables, so stale or self-referential evidence must not be accepted blindly.
- Baseline and after measurements must be separated: baseline from `ship-baseline-076a1837`, after from current/fixed `ship`.
- Some current rubric language is risk-prone:
  - Category 5 is described as "likely pass, wording-sensitive" because restored web tests may not obviously equal "3 meaningful tests" or "3 flaky tests fixed."
  - Demo video and social post were previously excluded, but the brief lists them as submission requirements.
  - Category 8 security work exists, but the provided assignment brief requires seven categories. Category 8 can be a bonus/extension, not a substitute for any required category.
- Local setup may require Docker, Node 20+, pnpm/corepack, environment files, and possibly deployment credentials.
- Performance and database measurements are sensitive to data volume, hardware, concurrency, and request pacing. The plan must record conditions precisely.

## Journey

1. Prepare baseline and current workspaces.
2. Re-run or verify baseline audit evidence on `076a1837`.
3. Re-run or verify after evidence on current `master`.
4. Compare every existing improvement claim against assignment thresholds.
5. Fix the weakest categories first, especially any evidence or rubric wording gaps.
6. Regenerate documentation from the verified evidence set.
7. Run final validation and update final submission materials.

## Approach And Tools

Use the repository's existing scripts and package commands wherever possible:

- `node scripts/audit-type-safety.mjs`
- `corepack pnpm --filter @ship/shared build`
- `corepack pnpm --filter @ship/web exec vite build --sourcemap`
- `node scripts/audit-bundle-map.mjs`
- `node scripts/audit-api-benchmark.mjs`
- `node scripts/audit-db-query-capture.mjs`
- `corepack pnpm --dir api exec tsx ..\scripts\audit-auth-query-count.mjs`
- `node scripts/audit-browser-accessibility.mjs`
- `corepack pnpm --filter @ship/api test`
- `corepack pnpm --filter @ship/web test`
- `corepack pnpm --recursive run type-check`
- `corepack pnpm --recursive run build`

Use browser verification for runtime and accessibility evidence. Use the baseline worktree for before measurements only; do not implement fixes there.

## Creativity And Optionality

Be creative in evidence packaging, not scope. Add or strengthen:

- A rubric traceability matrix.
- A final evidence index with exact files and commands.
- A short "how to reproduce the audit" section.
- Clear caveat handling for demo/social/deployment status.

Do not add unrelated product features unless they directly support a measured category or required deliverable.

For demo-product polish, treat `PRESENTATION.md` as a contract. If a promised feature is missing or broken in the current app, create a proposal for Jayce before implementing the fix.

## Autonomy Mode And Human Setup

Autonomy mode: hands-off for planning and evidence review, surface-on-blocker for Docker, credentials, deployment, demo video, and social posting.

Human setup likely needed:

- Docker Desktop running for local PostgreSQL.
- `api/.env.local` and `web/.env` configured.
- Confirmation of final submission destination: GitHub, Labs GitLab, or both.
- Deployment credentials if production proof must be regenerated.
- Final decision on whether demo video and social post are in scope for this work session.

## Frozen Scope

This blueprint freezes the planning scope for the next execution pass. Scope changes should trigger a re-plan rather than ad hoc edits.
