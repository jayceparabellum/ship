# Proposal: Skill-Driven Execution Loop

State: `proposed`

## Problem

ShipShape now has a broader execution goal: verify the full audit submission and ensure the demo product supports the features claimed in `PRESENTATION.md`. Without a disciplined workflow, implementation could drift into unreviewed changes or unsupported claims.

## Evidence

- `.plan/tasks.json` now includes audit, demo-feature audit, approved demo repair, documentation, and final validation tasks.
- `PRESENTATION.md` claims visible product flows that need browser-level verification.
- Jayce requested supervisor/orchestrator/worker roles and human approval before pushing suggested updates through.

## Suggested Update

Use two execution skill families as standing workflow tools:

- `ce-setup` and installed CE workflow skills: Plan -> Work -> Review -> Compound for each approved implementation slice.
- `gstack`: browser QA/dogfooding for demo-visible product behavior and screenshot-backed evidence.
- Six Sigma agent system: Define -> Measure -> Analyze -> Improve -> Control for every defect-prone workstream.

## User/Demo Impact

This reduces the chance of unreviewed changes, stale evidence, or demo claims that do not match the running app.

## Files Likely Touched

- `AGENTS.md`
- `SKILLS.md`
- `.plan/agent-roster.md`
- `.plan/human-gates.md`
- `.plan/demo-contract.md`
- Future proposal files under `.plan/proposals/`

## Risk Level

Low. This changes workflow docs only, not product behavior.

## Six Sigma Fields

- CTQ: final claims are accurate, verified, and reviewable.
- Defect/risk: unreviewed changes or stale evidence reach final submission.
- Root cause: execution workflow lacks explicit quality gates.
- Control plan: enforce `.plan/human-gates.md`, `.plan/six-sigma-agent-system.md`, and `.plan/team-flowchart.md`.

## Verification Plan

- Confirm `ce-setup` exists at `C:/Users/jayce/.codex/skills/ce-setup/SKILL.md`.
- Confirm `ce-work` and `ce-compound` exist under `C:/Users/jayce/.codex/skills/`.
- Confirm `gstack` exists at `C:/Users/jayce/.codex/skills/gstack/SKILL.md`.
- Confirm `AGENTS.md` and `SKILLS.md` mention both skills and preserve Jayce as human gate.
- Confirm `.plan/six-sigma-agent-system.md` and `.plan/team-flowchart.md` exist.

## Rollback Plan

Remove the skill references from `AGENTS.md`, `SKILLS.md`, and `.plan/agent-roster.md`.

## Human Decision Needed

Approve using the installed `ce-setup` skill from the official EveryInc Compound Engineering plugin, or provide a preferred GitLab URL for replacement.
