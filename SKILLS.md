# Project Skills

This repo uses Codex skills to keep planning and execution disciplined.

## Active Skill: `plan-mission`

Use `plan-mission` before implementation work that changes ShipShape scope, audit strategy, verification standards, or final submission packaging.

Skill location:

`C:/Users/jayce/.codex/skills/plan-mission/SKILL.md`

Current mission blueprint:

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

## How To Use It In This Repo

1. Read `.plan/mission.md` for the human-readable contract.
2. Read `.plan/tasks.json` for the frozen work graph.
3. Use `.plan/verification-plan.md` as the acceptance bar.
4. Use `.plan/agent-roster.md` to pick the right supervisor, orchestrator, and worker roles.
5. Use `.plan/human-gates.md` before implementing newly suggested updates.
6. Use `.plan/demo-contract.md` to verify `PRESENTATION.md` claims against the running product.
7. Use `.plan/six-sigma-agent-system.md` for DMAIC gates, CTQs, defect definitions, root cause, FMEA, and control plans.
8. Use `.plan/team-flowchart.md` to understand or edit the agent team.
9. Keep baseline measurements tied to commit `076a18371da0a09f88b5329bd59611c4bc9536bb`.
10. Keep implementation and corrected evidence on the current working repo.

## Guardrails

- Do not treat current checked-in ShipShape evidence as true until it is verified.
- Do not modify the baseline worktree except to generate ignored local evidence.
- Do not add unrelated product scope unless it directly improves a required audit category or deliverable.
- Every final claim should point to a command, raw artifact, or reproducible observation.
- Do not implement a new suggested product/demo update before Jayce reviews and approves the proposal.

## Compound Engineering Setup Skill: `ce-setup`

Use `ce-setup` to diagnose and configure the Compound Engineering environment before relying on CE workflows.

Skill location:

`C:/Users/jayce/.codex/skills/ce-setup/SKILL.md`

Source installed from:

`https://github.com/EveryInc/compound-engineering-plugin/tree/main/plugins/compound-engineering/skills/ce-setup`

Project use:

1. Run `/ce-setup` or its health check before using the CE workflow family.
2. Keep `.compound-engineering/config.local.example.yaml` committed as the shared example.
3. Keep `.compound-engineering/config.local.yaml` local/private if created.
4. Use the installed CE family for approved implementation loops: `ce-plan`, `ce-work`, `ce-code-review`, `ce-proof`, and `ce-compound`.

## Compound Engineering Workflow

Use the CE workflow family to execute approved work in a loop:

`Plan -> Work -> Review -> Compound`

Installed implementation-phase skills include:

- `ce-plan`: implementation planning for approved slices.
- `ce-work`: execution of an approved plan.
- `ce-code-review`: review of changed code.
- `ce-proof`: proof and verification pass.
- `ce-compound`: codify learnings and controls after work.
- `ce-test-browser`: browser verification when applicable.
- `ce-demo-reel`: demo artifact support when finalizing presentation evidence.

Project use:

1. Create a proposal or implementation plan before changing product code.
2. Work one scoped slice at a time.
3. Review the result against tests, browser checks, and rubric/demo requirements.
4. Compound the learning into `AGENTS.md`, `.plan/`, tests, or docs when it will make future work easier.
5. Agents may invoke these CE skills during implementation whenever their current task matches the skill trigger, while still respecting Jayce's human gate for product/demo changes.

## QA Skill: `gstack`

Use `gstack` for fast browser QA and dogfooding once the app is running locally or deployed.

Skill location:

`C:/Users/jayce/.codex/skills/gstack/SKILL.md`

Project use:

- Verify `PRESENTATION.md` demo flows.
- Capture browser evidence and screenshots for product/demo gaps.
- Check responsive behavior, forms, dialogs, route loading, and authenticated flows.
- Produce bug evidence before proposing or implementing fixes.
