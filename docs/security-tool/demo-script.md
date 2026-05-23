# ShipShape Security Tool Demo Script

Target length: 3-5 minutes

## Opening

Today I am demoing the Category 8 security tool for ShipShape. This work lives on the `ShipShape-Security-Tool` branch and adds a repo-native scanner plus an active live-app probe.

The goal is not just to produce a static report. The tool checks real application behavior: auth boundaries, CSRF protection, WebSocket authentication, malicious input handling, dependency advisories, CORS behavior, and whether malformed WebSocket traffic can destabilize the API.

## Show the Branch and Files

Show:

```bash
git branch --show-current
```

Expected:

```text
ShipShape-Security-Tool
```

Then point to:

- `scripts/security-audit.mjs`
- `scripts/security-probe.mjs`
- `docs/security-tool/latest-security-report.md`
- `docs/security-tool/latest-probe-report.md`
- `docs/security-tool/aws-architecture.md`
- `terraform/security-tool.tf`

Speaking notes:

The scanner has two layers. `security:audit` is the static and configuration scanner. `security:probe` is the active probe that logs into a running app and tries real security-relevant behavior.

## Static Security Audit

Run:

```bash
corepack pnpm security:audit
```

Show the generated outputs:

```text
docs/security-tool/latest-security-report.json
docs/security-tool/latest-security-report.md
```

Speaking notes:

The static audit checks hardcoded secret patterns, Express hardening signals, browser hardening signals, TLS bypass patterns, Dockerfile runtime signals, Terraform encryption-at-rest signals, and dependency advisory metadata from `pnpm audit`.

This gives us a repeatable baseline. The important part is that it is runnable from the repo, so another reviewer can run the same command and inspect the same report format.

## Active Live-App Probe

Run against the local app:

```bash
corepack pnpm security:probe -- --api-url http://127.0.0.1:3000 --web-url http://127.0.0.1:5173 --email dev@ship.local --password admin123
```

Show:

```text
docs/security-tool/latest-probe-report.md
```

Call out the current result:

```text
17 checks
17 passed
0 failed
```

Speaking notes:

This probe is intentionally active. It does not just inspect code. It performs unauthenticated requests, invalid-session requests, authenticated CSRF checks, WebSocket authentication checks, oversized WebSocket payload checks, malicious input submissions, dependency audit checks, and CORS/error-handling checks.

The latest run passes all 17 checks with zero failures.

## Improvements Driven by the Probe

Speaking notes:

The first active probe run found three meaningful problems.

First, an oversized WebSocket message could close the connection in a way that made a follow-up `/health` check unavailable. I fixed that by adding WebSocket error handlers so malformed or oversized WebSocket traffic does not destabilize the API.

Second, the dependency audit reported high and critical advisories. I added focused `pnpm` overrides and refreshed the lockfile so high and critical dependency CVEs are now zero.

Third, an XSS-style issue title payload was accepted. I hardened issue-title validation to reject HTML tag characters and added a regression test so that behavior stays fixed.

The result is that the tool now both detects risk and proves the remediation.

## AWS Architecture

Show:

```text
docs/security-tool/aws-architecture.md
terraform/security-tool.tf
```

Speaking notes:

The AWS design lets the same repo-native security tool run on a schedule.

The flow is:

1. EventBridge triggers a scheduled run.
2. Lambda starts the CodeBuild security runner.
3. CodeBuild clones the `ShipShape-Security-Tool` branch.
4. CodeBuild runs `corepack pnpm security:audit`.
5. If probe URLs and credentials are configured, it also runs `corepack pnpm security:probe`.
6. SSM Parameter Store provides probe credentials without committing secrets.
7. S3 stores both immutable run reports and the latest report.
8. CloudWatch Logs captures execution logs.

This matches the deployed AWS architecture while keeping the security runner separate from the application runtime.

## Close

Speaking notes:

The final Category 8 deliverable is a runnable security tool, not just a written checklist. It has static scanning, active live-app probing, AWS automation design, and report artifacts checked into `docs/security-tool/`.

The current evidence is:

```text
Static audit report: docs/security-tool/latest-security-report.md
Active probe report: docs/security-tool/latest-probe-report.md
Latest active probe: 17 passed, 0 failed
AWS design: docs/security-tool/aws-architecture.md and terraform/security-tool.tf
```

The production runner now executes the same probe through AWS Lambda and CodeBuild. The latest reports are stored at `s3://ship-prod-security-tool-743737183156/latest/`.
