# AI Cost Analysis

## Tools Used

- Codex for codebase orientation, setup, implementation, and documentation drafting.
- Browser automation for local smoke verification.

## Effective Uses

- Rapidly translating the project PDFs into an actionable rubric checklist.
- Identifying the highest-leverage early wins: bundle chunking, search indexes, runtime guard, test coverage, and accessibility semantics.
- Keeping verification commands tied to deliverable evidence.

## Limits Observed

- Local environment setup still required hands-on debugging: WSL distro mismatch, missing Node, Corepack pnpm signature issue, missing Docker, and local PostgreSQL setup.
- Automated edits need tight verification. A malformed escape sequence was caught by type-check and fixed immediately.

## Reflection

AI was most useful as an engineering coordinator: maintaining the rubric map, executing repetitive verification, and turning raw command output into submission-ready documentation. It was least useful where local machine state mattered, because environment drift requires direct inspection.

Approximate direct spend: tracked outside the repo if provider billing export is available. For this early submission, the meaningful cost note is that AI reduced orientation/setup/documentation latency, but correctness still came from deterministic checks: type-check, build, tests, local API/web smoke.
