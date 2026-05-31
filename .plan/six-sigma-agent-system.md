# Six Sigma Agent Operating System

Mission ID: `shipshape-fresh-audit-perfect-submission`

This project uses Six Sigma foundations to reduce avoidable defects in the final ShipShape audit, implementation, demo, and submission package. The purpose is not ceremony. The purpose is a lower error margin through explicit definitions, measured baselines, root-cause discipline, human tollgates, and verified control.

## Core Principles

### Voice Of Customer

Customer: Gauntlet/GFA evaluators, with the Department of the Treasury product context as the implied professional bar.

Voice of customer signals:

- Prove you understood the inherited system.
- Measure before changing.
- Improve all required categories.
- Preserve working product behavior.
- Show reproducible before/after evidence.
- Make final review easy and trustworthy.

### Critical To Quality

CTQs are the non-negotiable quality characteristics:

- Every required rubric item is covered.
- Every metric claim is backed by raw evidence.
- Every improvement has a root cause and after measurement.
- Every demo feature claimed in `PRESENTATION.md` works or is revised.
- Every code change has an appropriate verification signal.
- Every final human-facing action is surfaced to Jayce.

### Defect Definition

A defect is any condition that could cause the final submission or demo to be wrong, unverifiable, misleading, unstable, or incomplete.

Examples:

- Stale evidence used as a final proof.
- A claimed demo feature that does not work in the current app.
- A performance comparison run under mismatched conditions.
- A test fix that does not satisfy the test-quality rubric wording.
- A product change made without Jayce's approval.
- A doc that says "pass" without a raw artifact or command.

### DMAIC Loop

Use DMAIC for audit, product, demo, and documentation work:

1. Define: what requirement, CTQ, or demo claim is being handled?
2. Measure: what baseline, current behavior, or evidence proves the state?
3. Analyze: what is the root cause or likely failure mode?
4. Improve: what is the smallest approved change that removes the defect?
5. Control: what verification, doc update, or guard prevents recurrence?

### DMADV For New Design

Use DMADV only when creating a new workflow or demo capability:

1. Define the user/evaluator need.
2. Measure CTQs and constraints.
3. Analyze alternatives.
4. Design the minimal solution.
5. Verify with tests, browser evidence, and human review.

## Supervisor Responsibilities

### Mission Supervisor

Six Sigma role: owns CTQ alignment.

- Maintains the CTQ list.
- Rejects work that is not tied to a rubric item, demo contract, evidence gap, or approved product need.
- Ensures scope changes return to planning.

### Rubric Supervisor

Six Sigma role: owns defect accounting.

- Maintains a defect register for rubric risks.
- Uses Pareto thinking to focus on highest-impact failure modes first.
- Requires raw evidence before marking a category as pass.

### Product Demo Supervisor

Six Sigma role: owns voice-of-customer translation for the demo.

- Converts `PRESENTATION.md` claims into CTQs.
- Defines pass/fail criteria for visible product flows.
- Requires browser evidence, screenshots, tests, or approved presentation edits.

### Quality Supervisor

Six Sigma role: owns process capability and control.

- Requires verification before completion.
- Uses FMEA for risky changes.
- Confirms control plans exist for repeated failure modes.

## Orchestrator Responsibilities

### Audit Orchestrator

DMAIC focus:

- Define audit category and rubric threshold.
- Measure baseline and current state.
- Analyze evidence gaps.
- Improve docs/scripts only after proof exists.
- Control by updating evidence index and reproduction commands.

### Implementation Orchestrator

DMAIC focus:

- Define approved proposal scope.
- Measure current defect.
- Analyze root cause and failure modes.
- Improve with the smallest safe change.
- Control with tests, browser checks, and docs.

### Demo Orchestrator

DMAIC focus:

- Define each demo claim.
- Measure current app behavior.
- Analyze missing UI/API/data/test support.
- Improve only after Jayce approves.
- Control with screenshots, smoke flows, and presentation edits.

### Evidence Orchestrator

DMAIC focus:

- Define the proof required.
- Measure with repeatable commands.
- Analyze mismatches or flaky evidence.
- Improve scripts or instructions.
- Control by storing raw artifacts and command notes.

### Compound Engineering Orchestrator

DMAIC focus:

- Uses Plan -> Work -> Review -> Compound as the working cadence.
- Treats "Compound" as the Control phase: learned prevention rules must be written down when useful.

## Worker Expectations

Each worker must preserve this Six Sigma evidence chain:

`CTQ -> defect/risk -> measurement -> root cause -> approved improvement -> verification -> control`

Workers should use:

- SIPOC to understand process boundaries before changing a flow.
- FMEA to rank failure modes for risky areas.
- 5 Whys for simple root cause analysis.
- Fishbone categories when the cause is unclear: people, process, tools, code, data, environment.
- Pareto ranking to handle the few defects most likely to hurt the final result.
- Poka-yoke/error-proofing where possible: scripts, tests, type checks, validation, docs.
- Control plans for repeated risks: evidence indexes, checklists, final readiness review.

## Tollgates

### Gate 1: Define

Question: Is the requirement or defect clearly stated?

Exit criteria:

- CTQ or demo claim is named.
- Owner role is identified.
- Human approval need is known.

### Gate 2: Measure

Question: Do we have trustworthy evidence of the current state?

Exit criteria:

- Baseline/current measurement exists, or blocker is documented.
- Measurement conditions are recorded.

### Gate 3: Analyze

Question: Do we know why the issue exists?

Exit criteria:

- Root cause or likely failure mode is written.
- Risk level is assigned.
- Verification strategy is known.

### Gate 4: Improve

Question: Has Jayce approved the proposed fix when approval is required?

Exit criteria:

- Proposal exists for product/demo changes.
- Jayce approval is recorded before implementation.
- Change is scoped to the approved fix.

### Gate 5: Control

Question: Can this defect stay fixed through final review?

Exit criteria:

- Test, browser evidence, benchmark, screenshot, or doc control exists.
- Final docs point to the proof.
- Learning is captured when it prevents recurrence.

## Defect Register Template

Use this shape in proposal or review docs:

```markdown
## Defect

- CTQ:
- Source:
- Severity:
- Frequency:
- Detectability:
- Risk priority:
- Evidence:
- Root cause:
- Proposed improvement:
- Verification:
- Control:
- Human gate:
```

## Control Plan

Final readiness requires:

- `docs/shipshape-rubric-readiness-review.md` updated from verified facts.
- `docs/audit-evidence/README.md` maps artifacts to commands.
- `PRESENTATION.md` claims either verified or revised.
- `.plan/proposals/` records approval history for product/demo changes.
- `AGENTS.md` and `SKILLS.md` remain accurate for future agents.
