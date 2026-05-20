# Render MVP Deployment Notes

Goal: deploy `jayceparabellum/ship` to Render as a new project for the May 19 MVP audit.

## Recommended Render Services

1. PostgreSQL database
2. API web service
3. Web static site

The existing AWS deployment docs target CloudFront/S3, Elastic Beanstalk, and Aurora. For Render, use Render's native Node build/runtime instead of the root `Dockerfile`; that Dockerfile copies pre-built `shared/dist` and `api/dist`, which makes it awkward for Render's normal source-based build flow.

## API Web Service

Runtime: Node

Build command:

```bash
corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @ship/shared build && corepack pnpm --filter @ship/api build
```

Start command:

```bash
cd api && node dist/db/migrate.js && node dist/index.js
```

Required environment variables:

```text
NODE_ENV=production
PORT=10000
DATABASE_URL=<Render PostgreSQL internal connection string>
SESSION_SECRET=<strong random secret>
CORS_ORIGIN=<deployed Render static site URL>
APP_BASE_URL=<deployed Render static site URL>
```

Optional environment variables:

```text
AWS_REGION=us-east-1
S3_UPLOADS_BUCKET=
CDN_DOMAIN=
CAIA_ISSUER_URL=
CAIA_CLIENT_ID=
CAIA_CLIENT_SECRET=
```

## Web Static Site

Build command:

```bash
corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @ship/shared build && cd web && VITE_API_URL=<deployed API URL> corepack pnpm exec vite build
```

Publish directory:

```text
web/dist
```

Required environment variables:

```text
VITE_API_URL=<deployed API URL>
VITE_APP_ENV=production
```

If WebSocket collaboration is tested and the API URL does not convert cleanly to WebSocket URLs, add:

```text
VITE_WS_URL=<deployed API websocket URL>
```

## Post-Deploy Audit Steps

After the services are live:

1. Run migrations through the API start command or a Render shell.
2. Seed representative data with `corepack pnpm --filter @ship/api db:seed` using the Render `DATABASE_URL`.
3. Create or verify a test user.
4. Use the deployed web URL for Lighthouse, axe, runtime edge-case testing, and Network-tab endpoint selection.
5. Use the deployed API URL for `autocannon` benchmark runs.

## Risk Notes

- The local workstation used for this audit has Node 18.20.8; Render should be configured for Node 20+ to match `package.json`.
- The root package scripts call plain `pnpm` internally. Render build commands should use `corepack pnpm` directly or make sure pnpm is available on PATH.
- Production requires `SESSION_SECRET`; the API throws on startup without it.
- Production database connections use SSL with `rejectUnauthorized: false`, which should work with Render PostgreSQL connection strings.
