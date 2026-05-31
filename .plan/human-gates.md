# Human Gate Workflow

Jayce is the required human gate for new suggested updates before they move into implementation.

## Gate States

- `discovered`: A possible issue or opportunity was found.
- `proposed`: A written proposal exists.
- `approved`: Jayce approved the proposal.
- `implemented`: Code/docs/evidence changed.
- `verified`: The change passed its verification plan.
- `rejected`: Jayce rejected or deferred the proposal.

## What Requires Approval

Approval is required before:

- Adding or removing product features.
- Changing demo behavior promised in `PRESENTATION.md`.
- Reworking user flows, information architecture, or seeded demo data.
- Changing deployment infrastructure.
- Pushing to a remote branch.
- Creating or updating final submission links.
- Treating demo video or social post as excluded from scope.

Approval is not required for:

- Read-only repo inspection.
- Running local verification commands.
- Creating planning docs.
- Drafting proposals.
- Fixing typos inside planning docs, as long as claims do not change.
- Installing or documenting execution skills from approved public sources, unless the source is unknown or private.

## Proposal Storage

Use `.plan/proposals/` for suggested updates that need review. Each proposal should be a Markdown file named:

`YYYYMMDD-short-title.md`

## Proposal Acceptance Criteria

A proposal is ready for Jayce when it states:

- The exact problem.
- The evidence that the problem exists.
- Why it matters for the rubric, demo, or delivery.
- The smallest reasonable fix.
- Files likely to change.
- Verification commands or browser flows.
- Rollback plan.
- Six Sigma fields when relevant: CTQ, defect/risk, root cause, risk priority, and control plan.

## Current Gate Decision

Approved:

- Create the planning blueprint.
- Create project-level `SKILLS.md`.
- Create project-level `AGENTS.md`.
- Create this agent roster and human-gate workflow.
- Install and document `ce-setup` from the official EveryInc Compound Engineering plugin.
- Use `gstack` for read-only browser QA and evidence capture once the app is running.

Pending:

- Any implementation changes to product behavior.
- Any updates to make `PRESENTATION.md` features match the running app.
- Any final push or submission action.
