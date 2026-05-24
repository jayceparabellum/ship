# ShipShape Demo Video Checklist

Required length: 3-5 minutes

This is a recording checklist, not the existing MVP demo script. The assignment requires a separate demo video that walks through audit findings and improvements, shows before/after measurements, and explains reasoning.

## Recording Setup

- Browser open to the running app at `http://localhost:5173`
- Editor open to `audit.md`
- File explorer or terminal ready to show `docs/audit-evidence/`
- Optional: terminal ready for `git log --oneline --decorate -n 10`

## Suggested Timing

### 0:00-0:30 Opening

State:

- This is the ShipShape audit and improvement sprint for Treasury Ship.
- The work focuses on measuring and improving a production TypeScript codebase.
- The audit covers seven required categories.

### 0:30-1:15 App Walkthrough

Show:

- Login page
- `/my-week`
- `/docs`
- `/issues`
- `/dashboard`

State:

- These authenticated pages were used for browser runtime and accessibility evidence.

### 1:15-2:30 Audit Findings

Show `audit.md`.

Call out:

- Type safety: strict type-check passes, but route files concentrate type escapes.
- Bundle size: main chunk is 2,073,741 bytes before gzip.
- API: `/api/documents` and `/api/issues` are slowest under 50 concurrent workers.
- DB: representative local plans are fast, but full query logging still needs deployed instrumentation.
- Tests: API suite passed 451 tests across three runs; web Vitest has an environment failure.
- Runtime: offline reload falls out of the app shell.
- Accessibility: serious color-contrast violations on three pages.

### 2:30-3:30 Evidence

Show `docs/audit-evidence/`.

Open:

- `api-benchmarks.json`
- `browser-accessibility.json`
- `api-test-runs.json`
- `bundle-analysis.json`

State:

- The report is backed by raw JSON evidence, not just prose.

### 3:30-4:30 Improvements / Current Status

Show `docs/shipshape-improvement-documentation.md`.

State clearly that all seven categories now have before/after proof:

- Category 1 clears the 25% reduction threshold: 1,281 -> 959 total violations.
- Category 3 clears the 20% P95 threshold on two endpoints.
- Category 6 covers three fixes: offline reload recovery, malformed document-ID validation, and throttled session activity writes.

### 4:30-5:00 Close

State:

- The audit gate is addressed with measured baselines across all seven categories.
- Raw evidence, improvement documentation, discovery write-up, AI cost analysis, and deployment links are ready.
- The video is the separate final artifact being recorded.

## Recording Reminder

The video itself must be submitted separately. This Markdown file is only a checklist for recording.
