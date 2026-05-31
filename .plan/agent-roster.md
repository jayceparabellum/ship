# ShipShape Agent Roster

Mission ID: `shipshape-fresh-audit-perfect-submission`

This roster defines the team structure for executing ShipShape to a polished, defensible final state. It is intentionally review-heavy because the goal is to decrease the margin of error before any suggested update reaches the codebase.

All supervisors, orchestrators, and workers must follow the Six Sigma operating model in `.plan/six-sigma-agent-system.md`. The default work loop is DMAIC: Define, Measure, Analyze, Improve, Control.

## Human Gate

**Jayce: Final Product Owner and Human Gate**

- Reviews proposed updates before implementation.
- Approves, rejects, or redirects scope.
- Decides final demo/social/deployment submission actions.
- Owns irreversible external actions such as posting, publishing, pushing to protected remotes, or submitting final links.

No agent should treat a suggested product change as approved until Jayce signs off.

## Supervisor Layer

### Mission Supervisor

Purpose: protect the full mission outcome.

Six Sigma ownership: CTQ alignment and scope control.

Responsibilities:

- Keep the work aligned to `.plan/mission.md`.
- Enforce the baseline/current split.
- Prevent category work from drifting into unrelated product scope.
- Escalate scope changes to Jayce.
- Confirm each work item is tied to a CTQ, defect, demo claim, or approved proposal.

### Rubric Supervisor

Purpose: make the grader's review path obvious.

Six Sigma ownership: defect register, Pareto prioritization, and pass/fail integrity.

Responsibilities:

- Maintain the category-by-category rubric matrix.
- Confirm every claim has evidence.
- Mark weak claims as risk until proof exists.
- Ensure demo/video/social/deployment requirements are handled honestly.
- Rank defects by severity, frequency, and detectability before choosing repair order.

### Product Demo Supervisor

Purpose: make sure the demo product matches `PRESENTATION.md`.

Six Sigma ownership: voice-of-customer translation into demo CTQs.

Responsibilities:

- Treat `PRESENTATION.md` as the demo contract.
- Check that visible app behavior matches the screenshots and feature claims.
- Track feature-completeness gaps before suggesting fixes.
- Preserve a coherent proof-of-concept story for delivery.
- Convert every demo claim into a verifiable pass/fail check.

### Quality Supervisor

Purpose: keep implementation changes production-grade.

Six Sigma ownership: FMEA, verification quality, and control plans.

Responsibilities:

- Require tests or browser checks for user-facing changes.
- Watch for accessibility, performance, security, and regression risks.
- Confirm no cosmetic-only changes are counted as audit improvements.
- Run or request final verification.
- Require root-cause notes and controls for high-risk or repeated defects.

## Orchestrator Layer

### Audit Orchestrator

Coordinates baseline evidence from `ship-baseline-076a1837`, current-state evidence from `ship`, and final audit documentation.

Six Sigma gate: Define category CTQ, Measure baseline/current state, Analyze evidence gaps, Control through evidence index.

### Implementation Orchestrator

Turns approved proposals into scoped implementation tasks, assigns worker roles, and keeps changes small enough to review.

Six Sigma gate: no Improve step until Measure and Analyze are complete and Jayce approval is recorded when needed.

### Demo Orchestrator

Coordinates end-to-end demo verification for:

- Programs list
- Sprint planning timeline
- Sprint planning view
- Daily standups
- Sprint review
- Project retrospective
- Observer dashboard
- OpenAPI documentation

Uses `gstack` for browser QA and screenshot-backed evidence when the app is running.

Six Sigma gate: each demo feature must have a CTQ, current-state observation, defect decision, and control artifact.

### Evidence Orchestrator

Maintains raw evidence, reproduction commands, screenshots, and before/after artifacts under `docs/audit-evidence/`.

Six Sigma gate: measurement system integrity. Evidence must include command, environment, data state, and output path when practical.

### Compound Engineering Orchestrator

Coordinates approved implementation loops using:

`Plan -> Work -> Review -> Compound`

Responsibilities:

- Create an implementation plan for each approved proposal.
- Keep work slices small and verifiable.
- Ensure review happens before claiming completion.
- Codify reusable learnings into `AGENTS.md`, `.plan/`, tests, or docs.

Six Sigma mapping: Plan = Define/Measure/Analyze, Work = Improve, Review/Compound = Control.

Installed CE skills available to agents during implementation:

- `ce-plan`
- `ce-work`
- `ce-code-review`
- `ce-proof`
- `ce-compound`
- `ce-test-browser`
- `ce-demo-reel`
- `ce-debug`
- `ce-simplify-code`
- `ce-optimize`

## Worker Roles

### Repository Cartographer

Reads and inventories the repo in slices. Produces maps of features, routes, data types, tests, scripts, docs, and screenshots. Does not implement.

### Baseline Measurement Worker

Runs before measurements from `076a1837`; records setup friction and raw evidence.

### Current-State Verification Worker

Verifies current `master` claims against raw evidence, app behavior, and tests.

### TypeScript Worker

Handles Category 1 type-safety improvements. Must avoid superficial replacements that do not model real data.

### Frontend Performance Worker

Handles Category 2 bundle size and route-loading checks.

### API Performance Worker

Handles Category 3 response-time improvements and benchmark reproducibility.

### Database Worker

Handles Category 4 query counts, indexes, EXPLAIN ANALYZE, and migration safety.

### Test Reliability Worker

Handles Category 5 and makes the rubric mapping unambiguous: three meaningful tests or three flaky-test fixes with root cause.

### Runtime Reliability Worker

Handles Category 6 error handling, offline behavior, malformed input, and confusing failure states.

### Accessibility Worker

Handles Category 7 axe/Lighthouse, keyboard behavior, semantic roles, and color contrast.

### Demo Feature Worker

Checks and fixes product behavior promised by `PRESENTATION.md`, but only after Jayce approves a proposed update.

### Documentation Worker

Updates audit, improvement, discovery, final package, and submission docs from verified facts only.

### Browser QA Worker

Runs local app flows and screenshots for proof-of-concept delivery. Uses the in-app browser or Playwright where appropriate.

Primary skill: `gstack`.

### Compound Learning Worker

Captures reusable patterns, decisions, failures, and prevention rules after a verified work slice.

Primary CE skills: `ce-setup` for environment checks, then `ce-compound` and equivalent CE workflow skills during implementation.

### Release Readiness Worker

Runs final verification and prepares a concise readiness report. Does not push or submit without Jayce.

## Review Flow

1. Worker discovers a gap or improvement opportunity.
2. Orchestrator writes a proposal with evidence, risk, files likely touched, and verification plan.
3. Supervisor reviews for mission/rubric/product fit.
4. Jayce approves before implementation.
5. Worker implements the approved change.
6. Quality Supervisor verifies.
7. Documentation Worker records the evidence.

## Proposal Template

Each proposed update should include:

- Title
- Problem
- Evidence
- User/demo impact
- Files likely touched
- Risk level
- Verification plan
- Rollback plan
- Human decision needed

For medium/high-risk updates, also include:

- CTQ affected
- Failure mode
- Root cause
- Control plan
