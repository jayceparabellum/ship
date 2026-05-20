# ShipShape Discovery Write-up

## 1. Unified Document Model

Where: api/src/db/schema.sql, docs/unified-document-model.md

What: The app models issues, wiki pages, projects, programs, sprints, people, weekly plans, retros, standups, and reviews as rows in one documents table. Type-specific data lives in JSONB properties, while relationships live in document_associations.

Why it matters: This makes cross-cutting features like search, backlinks, visibility, audit history, and collaboration reusable across product objects. The tradeoff is that query design and indexing matter much more because many flows converge on one table.

Future use: I would use this pattern when product objects share lifecycle, permissions, and collaboration behavior, but I would pair it with strict discriminated TypeScript types and carefully designed indexes from day one.

## 2. Server-authoritative Realtime Collaboration

Where: api/src/collaboration, web/src/components/editor, docs/claude-reference/architecture.md

What: The editor uses Yjs for collaborative state, but the server remains the persistence and authorization authority. Reconnect behavior depends on server-side Yjs state and document content fallback.

Why it matters: CRDTs solve concurrent editing, but production correctness still depends on auth, persistence, recovery, and source-of-truth boundaries.

Future use: I would treat collaborative editing as a distributed systems feature, not a UI widget. The key design question is not just "does sync work?" but "what survives reconnect, auth expiry, and partial failure?"

## 3. Rubric-friendly Measurement Discipline

Where: package scripts, Vite output, Vitest output, database schema/migrations

What: The project rewards changes that produce concrete before/after evidence: build output, test counts, index diffs, and local run proof.

Why it matters: Measurement turns a subjective cleanup into an engineering argument. The bundle split is a good example: the code change is small, but the before/after numbers make its value obvious.

Future use: I would keep a measurement log during every performance or quality sprint so final documentation is assembled from facts, not reconstructed memory.
