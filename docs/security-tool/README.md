# ShipShape Security Tool

Current branch: `ShipShape-Security-Tool`

Current deployed app: `https://d9o5hawnpdm4g.cloudfront.net`

This security tool is now both a repo-native scanner and an AWS-backed live-app probe. It supports Category 8 by producing repeatable security evidence for the ShipShape codebase, deployed API, WebSocket surfaces, browser hardening posture, dependency advisory status, and AWS report pipeline.

## Current Build Status

Latest tracked reports:

- Static scanner: `docs/security-tool/latest-security-report.md`
- Static scanner JSON: `docs/security-tool/latest-security-report.json`
- Active live-app probe: `docs/security-tool/latest-probe-report.md`
- Active live-app probe JSON: `docs/security-tool/latest-probe-report.json`
- AWS architecture: `docs/security-tool/aws-architecture.md`
- Walkthrough document: `docs/security-tool/ShipShape Security Tool Walkthrough.docx`

Latest active production probe:

```text
Target: https://d9o5hawnpdm4g.cloudfront.net
Checks: 17
Passed: 17
Failed: 0
```

Latest static scanner:

```text
Checks: 13
Passed: 13
Failed: 0
```

The app also exposes the current security-tool output in the production portal:

- `https://d9o5hawnpdm4g.cloudfront.net/programs/security`

## What It Checks

Static scanner:

- Hardcoded secret patterns, including GitLab PATs, AWS access keys, private keys, and generic secret assignments.
- Express hardening signals: Helmet, CSRF protection, rate limiting, session cookie flags, and production `SESSION_SECRET` enforcement.
- Browser hardening signals: CSP `unsafe-inline`, unsafe DOM sinks, and auth/session-like values cached in `localStorage`.
- TLS bypass patterns such as `rejectUnauthorized: false`.
- Dockerfile signals for pinned images and non-root runtime users.
- Terraform encryption-at-rest signals.
- `pnpm audit --json` high/critical dependency advisory count when the environment can run it.

Active live-app probe:

- Unauthenticated and invalid-session rejection.
- Valid session acceptance through `/api/auth/me`.
- Session token entropy shape.
- CSRF enforcement on state-changing requests.
- Admin route role boundary.
- Unauthenticated WebSocket rejection.
- Unauthorized collaboration-room rejection.
- Oversized WebSocket message handling.
- Malformed WebSocket message resilience.
- SQL-injection filter handling.
- Long-title validation.
- Stored-XSS title handling.
- Verbose error leakage check.
- CORS hostile-origin check.
- API health reachability.
- Dependency audit high/critical CVE check.

## Local Usage

Run the static scanner:

```bash
corepack pnpm security:audit
```

Run the active probe against a local stack:

```bash
corepack pnpm security:probe -- --api-url http://127.0.0.1:3000 --web-url http://127.0.0.1:5173 --email dev@ship.local --password admin123
```

Run the active probe against production by using environment variables:

```bash
$env:SECURITY_PROBE_API_URL='https://d9o5hawnpdm4g.cloudfront.net'
$env:SECURITY_PROBE_WEB_URL='https://d9o5hawnpdm4g.cloudfront.net'
$env:SECURITY_PROBE_EMAIL='<probe account email>'
$env:SECURITY_PROBE_PASSWORD='<probe account password>'
corepack pnpm security:probe
```

Optional environment variables:

- `SECURITY_AUDIT_FAIL_ON_FINDINGS=1`
- `SECURITY_AUDIT_SKIP_DEPENDENCY_AUDIT=1`
- `SECURITY_PROBE_FAIL_ON_FINDINGS=1`
- `SECURITY_PROBE_API_URL`
- `SECURITY_PROBE_WEB_URL`
- `SECURITY_PROBE_EMAIL`
- `SECURITY_PROBE_PASSWORD`

## AWS Deployment

The security tool is deployed as an AWS automation path:

- Lambda trigger: `ship-prod-security-tool-trigger`
- CodeBuild runner: `ship-prod-security-tool`
- EventBridge schedule: `rate(1 day)`
- S3 report bucket: `ship-prod-security-tool-743737183156`
- Latest report prefix: `s3://ship-prod-security-tool-743737183156/latest/`

The AWS runner executes the security scripts, writes Markdown and JSON reports, and uploads the latest report bundle to S3. The production app can read and display those outputs through the security-tool results surface.

Infrastructure references:

- `terraform/environments/prod/security-tool.tf`
- `docs/security-tool/aws-architecture.md`

## Report Outputs

Local and AWS runs produce:

- `latest-security-report.json`
- `latest-security-report.md`
- `latest-probe-report.json`
- `latest-probe-report.md`

Repository copies live under `docs/security-tool/`. AWS copies live under:

```text
s3://ship-prod-security-tool-743737183156/latest/
```

## Submission Notes

Category 8 is complete for the final package:

- Static scanner is runnable and currently passes 13/13 checks.
- Active live-app probe is runnable and currently passes 17/17 checks.
- AWS Lambda/CodeBuild automation is deployed.
- S3 report storage is configured.
- The deployed app includes a security-tool results page.
- The walkthrough Word document is included for reviewer-facing explanation.

Post-submission cleanup: rotate the AWS access key used during setup.
