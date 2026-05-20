# Ship - Workstation Architecture Plan

Local-first deployment for running and auditing the Express API + React frontend on a workstation.

## Architecture Overview

```text
+---------------------------------------------------------------------+
| Developer Workstation                                               |
|                                                                     |
|  Browser                                                            |
|    |                                                                |
|    | http://localhost:5173                                          |
|    v                                                                |
|  Vite Dev Server (React frontend)                                   |
|    |                                                                |
|    | /api, /events, /collaboration proxy                            |
|    v                                                                |
|  Express API + WebSocket Server                                     |
|    | http://localhost:3000                                          |
|    v                                                                |
|  PostgreSQL 16                                                      |
|    | localhost:5432                                                 |
|    v                                                                |
|  Local database: ship_dev                                           |
|                                                                     |
|  Audit tools: pnpm, TypeScript, Vitest, Playwright, autocannon, axe |
+---------------------------------------------------------------------+
```

## Goals

- Run the full app locally without AWS, Render, or GitLab deployment dependency.
- Make audit measurements repeatable on one workstation.
- Keep the production architecture out of the critical path for the MVP audit.
- Use the same application codepaths as production wherever possible: Express API, Vite frontend, PostgreSQL, WebSockets, migrations, and seed data.

## Required Local Services

| Service | Local Role | Default |
| --- | --- | --- |
| Node.js | Runtime for API, Vite, tests, scripts | Node 20+ |
| pnpm | Workspace package manager | `10.27.0` via Corepack |
| PostgreSQL | Application database | PostgreSQL 16 on `localhost:5432` |
| Browser | Manual QA, Lighthouse, axe, Network tab tracing | Chrome/Chromium |

## Local URLs

| Component | URL |
| --- | --- |
| Web app | `http://localhost:5173` |
| API | `http://localhost:3000` |
| WebSocket collaboration | `ws://localhost:3000/collaboration` |
| Server-sent events | `http://localhost:3000/events` |
| PostgreSQL | `postgresql://ship:ship_dev_password@localhost:5432/ship_dev` |

## Directory Structure

```text
ship/
|-- api/
|   |-- src/
|   |   |-- index.ts              # API entry point
|   |   |-- app.ts                # Express app setup
|   |   |-- db/
|   |   |   |-- schema.sql        # Database schema
|   |   |   |-- migrate.ts        # Migration runner
|   |   |   `-- seed.ts           # Seed data
|   |   `-- collaboration/        # WebSocket + Yjs collaboration
|   `-- package.json
|
|-- web/
|   |-- src/                      # React frontend
|   |-- vite.config.ts            # Dev proxy to API
|   `-- package.json
|
|-- shared/
|   `-- src/                      # Shared TypeScript types/constants
|
|-- e2e/                          # Playwright E2E tests
|-- docker-compose.yml            # Optional local PostgreSQL
|-- docker-compose.local.yml      # Optional full local stack
`-- scripts/
    |-- dev.sh                    # Unix local dev helper
    |-- audit-type-safety.mjs     # Type-safety audit helper
    `-- watch-tests.sh            # Test helper
```

## Local Setup Order

1. Install Node 20+.
2. Enable Corepack and install dependencies.
3. Start PostgreSQL 16 locally.
4. Create the `ship_dev` database/user if needed.
5. Run migrations.
6. Seed realistic audit data.
7. Start the API.
8. Start the web app.
9. Run audit measurements against the local app.

## Commands

### Install Dependencies

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

### Database

Use native PostgreSQL 16 when possible. Docker is optional if it is available on the workstation.

Native connection target:

```text
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev
```

Optional Docker database:

```bash
docker compose up -d postgres
```

Run migrations and seed data:

```bash
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev corepack pnpm --filter @ship/api db:migrate
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev corepack pnpm --filter @ship/api db:seed
```

### Start API

```bash
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev \
SESSION_SECRET=dev-only-secret \
CORS_ORIGIN=http://localhost:5173 \
APP_BASE_URL=http://localhost:5173 \
corepack pnpm --filter @ship/api dev
```

### Start Web

```bash
VITE_API_URL= \
VITE_APP_ENV=development \
corepack pnpm --filter @ship/web dev
```

The Vite dev server proxies `/api`, `/events`, and `/collaboration` to the API port configured in `web/vite.config.ts`.

## Audit Measurement Workflow

### Type Safety

```bash
node scripts/audit-type-safety.mjs
corepack pnpm --recursive run type-check
```

### Bundle Size

```bash
corepack pnpm --filter @ship/shared build
VITE_API_URL= corepack pnpm --filter @ship/web exec vite build
```

### API Response Time

1. Use the browser Network tab to identify the endpoints used by the five required flows.
2. Benchmark each endpoint locally with the seeded database.

```bash
autocannon -c 10 -d 30 http://localhost:3000/api/<endpoint>
autocannon -c 25 -d 30 http://localhost:3000/api/<endpoint>
autocannon -c 50 -d 30 http://localhost:3000/api/<endpoint>
```

### Database Query Efficiency

Enable PostgreSQL query logging locally, run the five flows, then inspect query counts and slow queries. Run `EXPLAIN ANALYZE` directly against `ship_dev`.

### Tests

```bash
corepack pnpm --filter @ship/api test
corepack pnpm --filter @ship/web test
corepack pnpm test:e2e
```

### Runtime Error Handling

Use the local app to test:

- Normal usage with console open
- Network disconnect/reconnect during collaborative editing
- Empty, long, special-character, and script-like input
- Concurrent editing from two browser sessions
- Slow-network behavior through browser throttling

### Accessibility

Run Lighthouse and axe against `http://localhost:5173` pages after the app is seeded and authenticated.

## Key Decisions

### Why Workstation-First?

- It removes cloud setup from the MVP critical path.
- It lets benchmarks run under controlled hardware and data conditions.
- It makes the audit reproducible without waiting on DNS, certificates, load balancers, or cloud credentials.
- It keeps the focus on codebase comprehension and measurement, which is the core assignment.

### Why Native PostgreSQL?

- The assignment requires realistic data and query logging.
- Native PostgreSQL makes `log_statement`, `EXPLAIN ANALYZE`, and local inspection straightforward.
- Docker remains optional, but the audit should not depend on Docker being installed.

### Why Keep Vite Proxying?

- The app already expects Vite to proxy API, event, and WebSocket routes in development.
- That preserves the local browser experience while keeping the API and frontend as separate processes.

## Cloud Deployment Status

AWS infrastructure remains a future deployment option, but it is no longer the MVP path. The current MVP path is local workstation execution with reproducible local measurements.
