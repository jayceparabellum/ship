# Agent Instructions

This repo is being prepared for the ShipShape audit and improvement submission.

## Mission

Follow the frozen Mission Blueprint in `.plan/`:

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

The project goal is a fresh full audit from the original baseline commit, followed by corrected implementation and evidence on the current repo.

## Team Model

Use `.plan/agent-roster.md` for the operating model:

- Supervisor roles protect mission, rubric, product demo, and quality.
- Orchestrators coordinate audit, implementation, demo, and evidence work.
- Worker roles handle scoped slices such as TypeScript, API performance, database, tests, runtime reliability, accessibility, documentation, and browser QA.

The Product Demo Supervisor must treat `PRESENTATION.md` as a demo contract. If the running app does not support a claimed feature, propose a fix or presentation revision before implementation.

## Six Sigma Quality System

Use `.plan/six-sigma-agent-system.md` as the quality operating model.

Every supervisor, orchestrator, and worker should preserve this chain:

`CTQ -> defect/risk -> measurement -> root cause -> approved improvement -> verification -> control`

Default workflow:

1. Define the requirement, CTQ, rubric item, or demo claim.
2. Measure the baseline/current state.
3. Analyze root cause and failure modes.
4. Improve only after required approval.
5. Control with tests, evidence, docs, checklists, or reusable learnings.

For medium/high-risk work, use FMEA-style thinking: severity, frequency, detectability, and risk priority. Use Pareto ranking when many defects compete for attention.

The team structure is visualized in `.plan/team-flowchart.md`.

## Required Skills

Use these skills when their trigger applies:

- `plan-mission`: scope, alignment, blueprint changes, and mission-level replanning.
- `ce-setup`: Compound Engineering environment diagnosis and setup.
- CE workflow family: approved implementation loops using Plan -> Work -> Review -> Compound. Agents may invoke `ce-plan`, `ce-work`, `ce-code-review`, `ce-proof`, `ce-compound`, `ce-test-browser`, and related CE skills when the task matches during implementation.
- `gstack`: browser QA, dogfooding, screenshots, and demo-flow verification.

The CE skill family is installed under `C:/Users/jayce/.codex/skills/ce-*` from the official EveryInc Compound Engineering plugin.

## Human Gate

Jayce is the required human gate for suggested updates.

Before implementing product behavior changes, feature-completeness fixes, deployment changes, or final submission actions:

1. Write a proposal under `.plan/proposals/`.
2. Include evidence, files likely touched, verification plan, rollback plan, and relevant Six Sigma fields.
3. Wait for Jayce to approve.

Read `.plan/human-gates.md` before acting on newly discovered product or demo gaps.

## Baseline Rules

- Baseline commit: `076a18371da0a09f88b5329bd59611c4bc9536bb`
- Baseline worktree: `C:/Users/jayce/OneDrive/Documents/ShipShape/ship-baseline-076a1837`
- Current working repo: `C:/Users/jayce/OneDrive/Documents/ShipShape/ship`

Use the baseline worktree only for before measurements. Do not make implementation changes there.

## Execution Rules

- Work from `.plan/tasks.json` unless the user changes scope.
- Keep changes scoped to the task and file areas being handled.
- Verify existing evidence before trusting it.
- Inspect the relevant repo slice before editing; for feature work, trace UI, API, shared types, seed data, tests, and docs.
- Use the Compound Engineering loop for implementation: plan the slice, work it, review it, then codify the learning.
- Invoke CE skills freely inside approved implementation work when they match the current phase: `ce-plan` for planning, `ce-work` for execution, `ce-code-review` for review, `ce-proof` for proof, and `ce-compound` for codifying controls.
- Use gstack or equivalent browser verification for demo-visible changes.
- Use DMAIC as the quality gate for audit, implementation, demo, evidence, and documentation work.
- Every final claim must point to a command, raw artifact, test, benchmark, or observed browser result.
- Do not add unrelated features or cosmetic-only changes.
- Treat Category 8 security work as optional/bonus unless the current user request makes it required.

## Required Verification Mindset

For each required category, preserve this chain:

`baseline measurement -> weakness/root cause -> implementation -> after measurement -> reproducibility command`

Required categories:

1. Type safety
2. Bundle size
3. API response time
4. Database query efficiency
5. Test coverage and quality
6. Runtime error and edge-case handling
7. Accessibility compliance

## Important Commands

```powershell
corepack pnpm --recursive run type-check
corepack pnpm --recursive run build
corepack pnpm --filter @ship/api test
corepack pnpm --filter @ship/web test
node scripts/audit-type-safety.mjs
node scripts/audit-bundle-map.mjs
node scripts/audit-api-benchmark.mjs
node scripts/audit-db-query-capture.mjs
node scripts/audit-browser-accessibility.mjs
```

Some commands require Docker, local env files, seeded PostgreSQL, or running API/web servers. If blocked by environment setup, document the blocker clearly and do not fake evidence.

## Final Bar

The repo is submission-ready only when `docs/shipshape-rubric-readiness-review.md` can honestly mark every required item as pass or explicit human action, with no stale or unsupported metric claims.

The demo is product-ready only when every feature claimed in `PRESENTATION.md` has a passing test, browser verification, fresh screenshot, or an approved presentation revision.
