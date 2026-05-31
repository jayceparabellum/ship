# Execution Contract

Mission ID: `shipshape-fresh-audit-perfect-submission`

## Golden Rules

- Do not change the baseline worktree except to generate local ignored evidence.
- Use `076a1837` as the before state and current/fixed `master` as the after state.
- Every category claim must point to raw evidence and a reproduction command.
- Do not make cosmetic changes unless they directly support a measurable category or required deliverable.
- Preserve existing functionality. Broken tests must be fixed with justification or the change reverted.
- Keep Category 8 security work as an optional extension; do not let it obscure the seven required categories.
- Treat demo video and social post as required human-facing deliverables unless the user says otherwise.

## Roster

- `audit-lead`: setup, orientation, baseline scope, and audit narrative.
- `measurement-engineer`: raw metric collection and reproducibility.
- `typescript-engineer`: Category 1 type safety.
- `frontend-performance-engineer`: Category 2 bundle size.
- `api-performance-engineer`: Category 3 API latency.
- `database-performance-engineer`: Category 4 query efficiency.
- `test-engineer`: Category 5 tests and reliability.
- `runtime-reliability-engineer`: Category 6 runtime/error handling.
- `accessibility-engineer`: Category 7 accessibility.
- `technical-writer`: final docs and rubric mapping.
- `verification-lead`: final validation and readiness review.

## State Locations

- Blueprint: `.plan/`
- Current repo: `C:/Users/jayce/OneDrive/Documents/ShipShape/ship`
- Baseline worktree: `C:/Users/jayce/OneDrive/Documents/ShipShape/ship-baseline-076a1837`
- Raw tracked evidence: `docs/audit-evidence/`
- Generated local evidence: `.audit/`

## Verification Bar

The work is not done until `docs/shipshape-rubric-readiness-review.md` can honestly mark all required items as pass or explicit human action, and the final package has no stale or unsupported metric claims.
