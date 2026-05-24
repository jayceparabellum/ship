# ShipShape Discovery Write-up

## 1. The Unified Document Model Is the Center of the System

The most important architectural idea in Ship is that docs, issues, projects, weeks, people, weekly plans, and retros all share the `documents` table and are distinguished by `document_type`. That makes the product feel coherent because every work object can be linked, edited, converted, and surfaced through similar patterns.

Code references:

- `api/src/routes/documents.ts:38-68` defines the allowed document types and shared association inputs.
- `api/src/routes/documents.ts:93-142` lists documents from the unified table and filters by `document_type`.
- `api/src/routes/documents.ts:299-353` maps shared `document_associations` back into document responses.
- `docs/unified-document-model.md`
- `docs/document-model-conventions.md`

Reflection:

This is powerful but risky. A single document model keeps the product flexible, but it pushes complexity into route filtering, JSONB properties, associations, and TypeScript narrowing. That is why type safety and query efficiency are linked in this codebase: loose document shapes make it harder to prove both runtime behavior and SQL intent.

Future application:

In a future project, I would keep the unified model only if I also commit early to typed document-property schemas, association conventions, and route-level response contracts. The pattern is flexible, but it needs guardrails before the API surface grows.

## 2. Ship Values Boring Infrastructure but Sophisticated Product Behavior

The stack is intentionally familiar: React, Vite, Express, PostgreSQL, Docker, Terraform, and WebSockets. The product behavior is more advanced: collaborative editing, Yjs state persistence, CSRF/session handling, workspace visibility rules, and accountability workflows.

Code references:

- `api/src/app.ts:1-160` wires the Express app, security middleware, API routes, and request parsing.
- `api/src/collaboration/index.ts:346-389` validates WebSocket sessions from cookies.
- `api/src/collaboration/index.ts:606-679` upgrades authenticated WebSocket traffic and rejects unauthenticated or unauthorized rooms.
- `web/src/lib/api.ts:1-140` centralizes fetch, CSRF token handling, and session-expiration behavior.
- `docs/application-architecture.md`

Reflection:

The lesson is that "boring technology" does not mean simple software. The complexity is in the domain model and integration points, not in novelty for its own sake. The right improvements should respect that choice: simplify payloads, harden types, and improve observability before introducing new tools.

Future application:

I would choose familiar infrastructure again for a government-facing app, but I would threat-model the integration boundaries earlier: session cookies, CSRF, WebSocket upgrades, and realtime document authorization are where the boring stack becomes security-sensitive.

## 3. The Test Surface Is Large, but Test Reliability Depends on Environment Discipline

The repo has a large E2E footprint and a stable API suite under the local seeded database. The API suite passed three consecutive runs, which is a strong signal. The web unit suite initially failed before tests executed because of an environment/runtime mismatch around `jsdom` and ESM dependencies; after pinning the test environment, 151 web unit tests passed.

Code references:

- `api/src/test/setup.ts:1-24` configures the integration-test lifecycle.
- `web/package.json:13-14` defines the web Vitest commands.
- `web/package.json:75` pins `jsdom` for the fixed web test environment.
- `web/src/lib/document-tabs.test.ts:19-185` verifies tab routing and deep-link behavior.
- `web/src/hooks/useSessionTimeout.test.ts:29-714` covers session-timeout behavior and edge cases.

Reflection:

This changed how I read the assignment. It is not enough to count tests or point to a large E2E folder. Production readiness requires knowing whether the suite can be run repeatedly by another engineer under documented conditions. The deliverable needs the pass/fail story, the flake story, and the environment story.

Future application:

In future audits, I would run the test suite three times before touching implementation, then fix test-environment blockers before treating coverage as meaningful. A test that cannot start is not coverage; it is operational debt hiding behind a test folder.
