# ShipShape Discovery Write-up

## 1. The Unified Document Model Is the Center of the System

The most important architectural idea in Ship is that docs, issues, projects, weeks, people, weekly plans, and retros all share the `documents` table and are distinguished by `document_type`. That makes the product feel coherent because every work object can be linked, edited, converted, and surfaced through similar patterns.

Code references:

- `api/src/routes/documents.ts`
- `api/src/routes/issues.ts`
- `api/src/routes/weeks.ts`
- `docs/unified-document-model.md`
- `docs/document-model-conventions.md`

Reflection:

This is powerful but risky. A single document model keeps the product flexible, but it pushes complexity into route filtering, JSONB properties, associations, and TypeScript narrowing. That is why type safety and query efficiency are linked in this codebase: loose document shapes make it harder to prove both runtime behavior and SQL intent.

## 2. Ship Values Boring Infrastructure but Sophisticated Product Behavior

The stack is intentionally familiar: React, Vite, Express, PostgreSQL, Docker, Terraform, and WebSockets. The product behavior is more advanced: collaborative editing, Yjs state persistence, CSRF/session handling, workspace visibility rules, and accountability workflows.

Code references:

- `api/src/app.ts`
- `api/src/collaboration/index.ts`
- `web/src/components/UnifiedEditor.tsx`
- `web/src/lib/api.ts`
- `docs/application-architecture.md`

Reflection:

The lesson is that "boring technology" does not mean simple software. The complexity is in the domain model and integration points, not in novelty for its own sake. The right improvements should respect that choice: simplify payloads, harden types, and improve observability before introducing new tools.

## 3. The Test Surface Is Large, but Test Reliability Depends on Environment Discipline

The repo has a large E2E footprint and a stable API suite under the local seeded database. The API suite passed three consecutive runs, which is a strong signal. The web unit suite, however, currently fails before tests execute because of an environment/runtime mismatch around `jsdom` and ESM dependencies.

Code references:

- `api/src/routes/*.test.ts`
- `api/src/collaboration/__tests__/collaboration.test.ts`
- `e2e/accessibility-remediation.spec.ts`
- `web/src/lib/accountability.test.ts`
- `api/src/test/setup.ts`

Reflection:

This changed how I read the assignment. It is not enough to count tests or point to a large E2E folder. Production readiness requires knowing whether the suite can be run repeatedly by another engineer under documented conditions. The deliverable needs the pass/fail story, the flake story, and the environment story.
