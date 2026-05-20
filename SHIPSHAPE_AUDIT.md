# ShipShape Audit Report

## Orientation Notes

Ship is a pnpm TypeScript monorepo with shared types, an Express API, a React/Vite frontend, PostgreSQL, TipTap/Yjs editor collaboration, and Playwright E2E coverage. The most important architectural decision is the unified document model: issues, docs, programs, projects, sprints, people, plans, retros, and reviews all live in the documents table with document_type and JSONB properties.

The system is server-authoritative. The editor uses Yjs for collaborative document state, while API routes and database tables remain the durable source of truth for metadata, associations, sessions, workspaces, and audit trails.

## Baseline Measurements

### 1. Type Safety

Method: ran pnpm type-check and static grep over api/src, web/src, shared/src.

- pnpm type-check baseline: PASS
- Strict mode: enabled in package tsconfigs enough for tsc --noEmit to pass
- Hotspot: web/src/components/editor/FileAttachment.tsx contained untyped TipTap node/editor command surfaces
- Additional hotspots: UnifiedDocumentPage, PropertiesPanel, SlashCommands, editor components

Finding: the project is broadly type-check clean, but several editor integration points use any because TipTap extension APIs are harder to express.

### 2. Bundle Size

Method: pnpm build, Vite production output.

Baseline:

- Main initial JS: dist/assets/index-C2vAyoQ1.js = 2,073.70 kB, gzip 589.49 kB
- CSS: 66.51 kB, gzip 12.92 kB
- Build warning: main chunk over 500 kB, code splitting recommended

Finding: React, editor stack, Radix UI, and app code were bundled into the large initial app chunk.

### 3. API Response Time

Method: local API health and seeded app startup; test suite with local PostgreSQL.

Baseline:

- API health endpoint returned {"status":"ok"}
- API tests initially failed without PostgreSQL: ECONNREFUSED 127.0.0.1:5432
- After local PostgreSQL setup: 451 baseline API tests passed in 29.46s

Finding: local reproducibility depended on a running database. Search routes are likely better measured under seeded data because they query documents and associations by workspace/type/visibility.

### 4. Database Query Efficiency

Method: schema/index review and search route query tracing.

Baseline findings:

- documents had broad workspace/type active index
- search/mentions filters additionally use title, visibility, created_by, updated_at, document_type
- learnings program filter uses document_associations related_id + relationship_type + document_id

Opportunity: add composite indexes that match actual WHERE/ORDER/JOIN shapes instead of relying only on broader single-column indexes.

### 5. Test Coverage And Quality

Method: pnpm test with DATABASE_URL and SESSION_SECRET.

Baseline:

- 28 test files
- 451 tests passed
- Runtime: 29.46s

Gap: /api/search/learnings had a positive limit test but no regression coverage for malformed, negative, or excessive limit values.

### 6. Runtime Errors And Edge Cases

Method: code review of user-controlled query params.

Finding: Number parsing for /api/search/learnings?limit=... used parseInt plus Math.min. A malformed value fell back by truthiness, but negative values could flow into SQL LIMIT as a negative number. That is a user-facing bad URL edge case and can become a confusing 500.

### 7. Accessibility

Method: component review of keyboard-driven editor command menu.

Finding: slash command options were rendered as plain buttons in a visual menu. Keyboard navigation existed, but the popup did not expose listbox/option semantics or selected state to assistive tech.

## Severity Ranking

1. Bundle Size: high user impact; single largest measurable win.
2. Database Query Shape: high scaling impact on unified document model.
3. Runtime Limit Guard: medium user-facing reliability risk.
4. Test Gap: medium because edge case was easy to regress.
5. Accessibility Semantics: medium because command menus are keyboard-first UI.
6. Type Safety: medium; localized any usage around editor extension boundaries.
7. Local Setup Friction: medium; DB service must be documented for reproducibility.
