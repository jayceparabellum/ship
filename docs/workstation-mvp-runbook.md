# Workstation MVP Runbook

Goal: run Ship locally on a workstation so the ShipShape audit can collect real baseline measurements without waiting on cloud deployment.

## Local Stack

- React frontend: Vite on `http://localhost:5173`
- Express API: Node on `http://localhost:3000`
- WebSockets: API server on `ws://localhost:3000/collaboration`
- Database: PostgreSQL 16 on `localhost:5432`
- Database name: `ship_dev`

## Prerequisites

- Node.js 20+
- Corepack
- PostgreSQL 16
- Chrome or Chromium for manual testing, Lighthouse, axe, and Network tab tracing

## Environment

Use this local database URL:

```text
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev
```

Use these local app settings:

```text
SESSION_SECRET=dev-only-secret
CORS_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173
VITE_API_URL=
VITE_APP_ENV=development
```

## Setup

Install dependencies:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

Create the local database and user if they do not already exist:

```sql
CREATE USER ship WITH PASSWORD 'ship_dev_password';
CREATE DATABASE ship_dev OWNER ship;
```

Run migrations:

```bash
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev corepack pnpm --filter @ship/api db:migrate
```

Seed data:

```bash
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev corepack pnpm --filter @ship/api db:seed
```

## Run Locally

Terminal 1, API:

```bash
DATABASE_URL=postgresql://ship:ship_dev_password@localhost:5432/ship_dev \
SESSION_SECRET=dev-only-secret \
CORS_ORIGIN=http://localhost:5173 \
APP_BASE_URL=http://localhost:5173 \
corepack pnpm --filter @ship/api dev
```

Terminal 2, frontend:

```bash
VITE_API_URL= VITE_APP_ENV=development corepack pnpm --filter @ship/web dev
```

Open:

```text
http://localhost:5173
```

## Audit Commands

Type safety:

```bash
node scripts/audit-type-safety.mjs
corepack pnpm --recursive run type-check
```

Bundle size:

```bash
corepack pnpm --filter @ship/shared build
VITE_API_URL= corepack pnpm --filter @ship/web exec vite build
```

API tests:

```bash
corepack pnpm --filter @ship/api test
```

Web tests:

```bash
corepack pnpm --filter @ship/web test
```

E2E tests:

```bash
corepack pnpm test:e2e
```

## Measurement Checklist

After the app is running locally:

1. Trace five critical user flows in the browser Network tab.
2. Benchmark the corresponding API endpoints with `autocannon`.
3. Enable PostgreSQL query logging and capture query counts per flow.
4. Run `EXPLAIN ANALYZE` on the slowest queries.
5. Test runtime edge cases with the browser console and server logs open.
6. Run Lighthouse and axe on the major pages.
7. Record all raw outputs in the audit report.

## Notes

- The previous AWS plan is not the MVP path anymore.
- Cloud deployment can come later if the final submission still requires a public URL.
- The local audit should use Node 20+ because the repo declares Node `>=20.0.0`.
