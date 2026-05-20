# ShipShape MVP Demo Script

## Opening

Hi, I am walking through the current MVP for my ShipShape audit of the Treasury Ship codebase.

This MVP is not a feature build. It is the foundation for a production engineering audit: I have oriented around the repo, collected the first defensible baseline numbers, prepared the AWS deployment path, and documented exactly what still needs a live seeded environment before I claim the remaining measurements.

## What I Built

The first artifact is `docs/shipshape-audit-report.md`. This is the working audit report for all seven required categories. It includes the methodology, the baseline numbers I have already collected, the current findings, and a clear gap list for the categories that need the deployed app.

The second artifact is `scripts/audit-type-safety.mjs`. This is a repeatable TypeScript audit helper. Instead of relying only on regex, it uses the TypeScript compiler API to count actual syntax nodes: explicit `any` types, type assertions, non-null assertions, and TypeScript suppression comments.

The third artifact is `docs/aws-mvp-deployment-notes.md`, backed by `INFRASTRUCTURE.md`. These documents define the AWS deployment path: Terraform for infrastructure, Elastic Beanstalk for the Express API and WebSocket server, Aurora Serverless v2 PostgreSQL for the database, and S3 plus CloudFront for the React frontend.

I also patched the deployment scripts so they fit the current repo better. The infrastructure script now defaults to the `dev` environment, the API deployment script can use Corepack pnpm and no longer fails if a missing `vendor` folder is absent, and the frontend deployment script can use Corepack pnpm directly.

## Type Safety Baseline

For type safety, I confirmed that strict mode is enabled and that the recursive TypeScript type-check passes.

The baseline is:

- 260 explicit `any` types
- 691 type assertions
- 329 non-null assertions
- 1 TypeScript suppression directive

The highest-risk concentration is in API route files, especially `api/src/routes/weeks.ts`, `api/src/routes/projects.ts`, and `api/src/routes/issues.ts`.

My finding is not that TypeScript is broken in this repo. The important point is that type escape hatches are concentrated at the request, database, and response boundary, where type mistakes are most likely to become runtime bugs.

## Bundle Size Baseline

For bundle size, I built the production frontend and measured `web/dist`.

The total production output is about 3.35 MB. The largest JavaScript chunk is about 2.07 MB uncompressed, or about 589 KB gzip.

Vite also warned that the main chunk is larger than 500 KB after minification. It specifically identified modules where dynamic imports are not helping because those same modules are also statically imported elsewhere.

My finding is that the application already has some chunking, but the initial bundle is still too large. The most likely improvement path is route-level or editor-level code splitting, especially around TipTap, Yjs, and editor-adjacent modules.

## Test Baseline

For test coverage and quality, I counted the E2E test surface and attempted the API and web test suites.

The repo has:

- 71 Playwright spec files
- 882 E2E `test(...)` declarations
- 451 API Vitest tests discovered before setup failure

The API tests did not execute locally because PostgreSQL was not running at `::1:5432`. The web tests were blocked by the current workstation running Node 18.20.8 while the repo requires Node 20 or newer.

I treated those as environment blockers, not product defects. That distinction matters because the audit should not turn local setup mismatch into fake application findings.

## Deployment Status

The MVP deployment target is AWS.

The intended AWS architecture is:

- Route53 and ACM for domains and TLS
- ALB in public subnets
- Elastic Beanstalk in private subnets for the Express API and WebSocket server
- Aurora Serverless v2 PostgreSQL 16
- SSM Parameter Store for secrets
- S3 and CloudFront for the React static frontend

I prepared the repo for that path, but the app is not deployed yet. The blocker is AWS account access from this workstation. AWS CLI and Terraform are now available locally, but AWS credentials are not configured, so `sts get-caller-identity` fails with `Unable to locate credentials`.

## What Is Still Needed

The remaining four audit categories need a live seeded app:

- API response time
- Database query efficiency
- Runtime error and edge-case handling
- Accessibility compliance

I deliberately did not invent those numbers. API latency without seeded data would be misleading. Query efficiency without PostgreSQL logs would be guesswork. Runtime and accessibility findings need a running UI, authenticated flows, browser console evidence, and server logs.

Once AWS credentials are configured, the deployment sequence is:

```bash
./scripts/deploy-infrastructure.sh dev
./scripts/deploy-api.sh
./scripts/deploy-frontend.sh dev
```

After deployment, I will seed the database, trace the five required user flows, run `autocannon` benchmarks at 10, 25, and 50 concurrent connections, capture query logs and `EXPLAIN ANALYZE`, run Lighthouse and axe, and complete the audit tables.

## Closing

The value of this MVP is that it separates measured facts from unfinished work. I have real baselines for type safety, bundle size, and test surface area. I have a concrete AWS deployment path. And I have a clear list of the remaining evidence needed to pass the audit gate without bluffing.

The next milestone is AWS credential configuration, deployment, seeding, and then completing the four measurement-heavy categories from live evidence.
