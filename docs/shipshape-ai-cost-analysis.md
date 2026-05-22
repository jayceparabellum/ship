# ShipShape AI Cost Analysis

## Summary

AI assistance was most useful for codebase orientation, audit harness creation, report synthesis, and keeping the deliverables aligned with the assignment rubric. It was least useful where the assignment required live evidence: benchmarks, browser scans, tests, and deployment checks still had to be run locally.

## Tool Use

| Area | AI Role | Human / Local Verification |
| --- | --- | --- |
| Assignment interpretation | Extracted requirements from the PDF and converted them into a checklist | Compared against the PDF deliverable table and category rubrics |
| Codebase orientation | Helped map packages, routes, request flow, and TypeScript risk areas | Verified with `rg`, source reads, and existing docs |
| Audit scripts | Generated repeatable scripts for type safety, bundle analysis, API benchmarks, DB plans, and browser/axe capture | Ran each script locally and inspected outputs |
| Report writing | Turned raw results into polished audit language | Checked that claims point to raw evidence files |
| Debugging | Helped diagnose rate limiter effects, missing Playwright browsers, missing coverage provider, AWS/VPC access, Aurora instrumentation, and local seed cleanup | Re-ran commands after fixes |

## Estimated Dev Spend

| Workstream | Approximate Time |
| --- | ---: |
| PDF/rubric review | 0.5 hours |
| Local environment verification and seed recovery | 1.0 hour |
| Audit harness creation and debugging | 2.0 hours |
| Running benchmarks/scans/tests/coverage | 2.5 hours |
| AWS deployment and production smoke checks | 2.0 hours |
| Report and deliverable packaging | 2.0 hours |
| Total | 10.0 hours |

## What AI Accelerated

AI was effective at maintaining the big-picture rubric while working through many small details. The most valuable acceleration was turning "we need evidence" into repeatable audit scripts and then using those scripts to refresh the report.

Examples:

- `scripts/audit-api-benchmark.mjs` captures repeatable latency percentiles.
- `scripts/audit-db-query-capture.mjs` captures flow timings and representative plans.
- `scripts/audit-browser-accessibility.mjs` captures console/network/runtime evidence and axe scans.
- `scripts/audit-bundle-map.mjs` uses source maps to identify dependency contributors instead of guessing from `package.json`.

## Where AI Was Not Enough

The assignment rewards measured proof, not plausible prose. AI could not replace:

- Running the app locally
- Seeding PostgreSQL
- Capturing real benchmark data
- Running Playwright and axe
- Running tests three times
- Recording the required demo video
- Deploying the app with real AWS credentials
- Capturing production Aurora query counts from inside the VPC

## Reflection

The most important lesson is that AI is strongest as an audit assistant when it is forced to use local evidence. The workflow that worked best was: read the requirement, run the command, capture the artifact, then write the finding. The weakest workflow would have been letting AI produce a polished report before the measurements existed.
