# Security Policy

Current canonical branch: `master`

This repository now includes the ShipShape Category 8 security tool in addition to the application security controls inherited from Ship. The current build supports static repository scanning, active live-app probing, AWS scheduled execution, and reviewer-facing security reports.

## Supported Version

| Version / Branch | Supported |
| --- | --- |
| `master` | Yes |

## Current Security Tool Status

Latest tracked evidence:

| Evidence | Location |
| --- | --- |
| Static scanner report | `docs/security-tool/latest-security-report.md` |
| Static scanner JSON | `docs/security-tool/latest-security-report.json` |
| Live-app probe report | `docs/security-tool/latest-probe-report.md` |
| Live-app probe JSON | `docs/security-tool/latest-probe-report.json` |
| AWS security-tool architecture | `docs/security-tool/aws-architecture.md` |
| Walkthrough document | `docs/security-tool/ShipShape Security Tool Walkthrough.docx` |

Latest tracked results:

```text
Static scanner: 13 passed / 0 failed
Active production probe: 17 passed / 0 failed
Target: https://d9o5hawnpdm4g.cloudfront.net
```

The production app also includes a security-tool results surface:

```text
https://d9o5hawnpdm4g.cloudfront.net/programs/security
```

## What The Security Tool Checks

Static scanner:

- Secret patterns: GitLab PATs, AWS access keys, private keys, generic token/password assignments.
- Express hardening: Helmet, CSRF, rate limiting, secure cookie settings, production `SESSION_SECRET`.
- Browser hardening: CSP posture, unsafe DOM sinks, and local-storage auth/session risks.
- TLS bypass patterns such as `rejectUnauthorized: false`.
- Dockerfile hardening: pinned images and non-root runtime users.
- Terraform encryption-at-rest signals.
- High/critical dependency advisories through `pnpm audit --json` when available.

Active live-app probe:

- Unauthenticated request rejection.
- Invalid-session rejection.
- Valid probe-account authentication.
- Session token entropy shape.
- CSRF enforcement on state-changing requests.
- Admin route role boundary.
- WebSocket auth and collaboration-room authorization.
- Oversized and malformed WebSocket message resilience.
- SQL-injection payload handling.
- Long-title validation.
- Stored-XSS title handling.
- Verbose error leakage.
- Hostile-origin CORS check.
- API health reachability.
- Dependency audit high/critical CVE check.

## Running Security Checks

Run the static scanner:

```bash
corepack pnpm security:audit
```

Run the active probe against a local stack:

```bash
corepack pnpm security:probe -- --api-url http://127.0.0.1:3000 --web-url http://127.0.0.1:5173 --email dev@ship.local --password admin123
```

Run the active probe against production with environment variables:

```powershell
$env:SECURITY_PROBE_API_URL='https://d9o5hawnpdm4g.cloudfront.net'
$env:SECURITY_PROBE_WEB_URL='https://d9o5hawnpdm4g.cloudfront.net'
$env:SECURITY_PROBE_EMAIL='<probe account email>'
$env:SECURITY_PROBE_PASSWORD='<probe account password>'
corepack pnpm security:probe
```

Optional controls:

| Variable | Purpose |
| --- | --- |
| `SECURITY_AUDIT_FAIL_ON_FINDINGS=1` | Make static scanner findings fail the command |
| `SECURITY_AUDIT_SKIP_DEPENDENCY_AUDIT=1` | Skip `pnpm audit` when offline or rate-limited |
| `SECURITY_PROBE_FAIL_ON_FINDINGS=1` | Make live-probe failures fail the command |
| `SECURITY_PROBE_API_URL` | API/base target for active probe |
| `SECURITY_PROBE_WEB_URL` | Web target for active probe |
| `SECURITY_PROBE_EMAIL` | Probe account email |
| `SECURITY_PROBE_PASSWORD` | Probe account password |

## AWS Security Automation

The production security tool runs through AWS:

| Resource | Current value |
| --- | --- |
| Lambda trigger | `ship-prod-security-tool-trigger` |
| CodeBuild runner | `ship-prod-security-tool` |
| Schedule | `rate(1 day)` |
| Report bucket | `ship-prod-security-tool-743737183156` |
| Latest report prefix | `s3://ship-prod-security-tool-743737183156/latest/` |

Probe credentials are stored in SSM Parameter Store as SecureString values. Do not commit probe credentials, AWS credentials, GitLab tokens, or generated secrets to this repository.

## Development Security Practices

Before committing or submitting:

```bash
corepack pnpm --filter @ship/api type-check
corepack pnpm --filter @ship/web type-check
corepack pnpm security:audit
corepack pnpm security:probe
```

The repository still includes a pre-commit compliance hook that attempts to run `comply opensource`. On this workstation the optional `comply` CLI may not be installed, so the hook warns and allows the commit to proceed. For stricter future parity, install it with:

```bash
pip install comply-cli
```

Do not use `git commit --no-verify` for normal work. If a scanner reports a false positive, document the false positive and update the appropriate ignore/configuration file instead of bypassing the check.

## Application Security Controls

The current build includes:

- Helmet-based HTTP header hardening.
- CSRF token enforcement on state-changing API routes.
- Session cookies with HTTP-only, SameSite, secure-in-production settings.
- 15-minute inactivity timeout and 12-hour absolute session timeout.
- Session activity write throttling to reduce hot-path database writes.
- Malformed document-ID validation before PostgreSQL UUID casts.
- WebSocket authentication and room-authorization checks.
- Offline app-shell recovery for authenticated frontend routes.
- AWS SSM Parameter Store for deployment/probe secrets.
- Encrypted Aurora and S3 storage in production.

## Reporting A Vulnerability

Do not create a public issue containing vulnerability details.

For this ShipShape project, report privately to the repository owner or project reviewer with:

- Vulnerability description.
- Reproduction steps.
- Impact assessment.
- Affected route, file, or AWS resource.
- Suggested fix, if known.
- Security-tool output, if the issue was detected by `security:audit` or `security:probe`.

## Post-Submission Security Cleanup

- Rotate the AWS access key used during setup.
- Keep probe credentials in SSM, not in source control.
- Re-run the AWS CodeBuild security tool after any production deployment.
- Keep `docs/security-tool/latest-*` reports current when the security posture changes.
