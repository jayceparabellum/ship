# ShipShape Security Tool

This branch adds a repo-native security audit runner for the ShipShape project.

## Run

```bash
corepack pnpm security:audit
```

Outputs:

- `docs/security-tool/latest-security-report.json`
- `docs/security-tool/latest-security-report.md`

## Active Probe

Run against a live local or deployed app:

```bash
corepack pnpm security:probe -- --api-url http://127.0.0.1:3000 --web-url http://127.0.0.1:5173 --email dev@ship.local --password admin123
```

Environment variable equivalents:

- `SECURITY_PROBE_API_URL`
- `SECURITY_PROBE_WEB_URL`
- `SECURITY_PROBE_EMAIL`
- `SECURITY_PROBE_PASSWORD`
- `SECURITY_PROBE_FAIL_ON_FINDINGS=1`

Outputs:

- `docs/security-tool/latest-probe-report.json`
- `docs/security-tool/latest-probe-report.md`

AWS deployment design:

- `docs/security-tool/aws-architecture.md`
- `terraform/environments/prod/security-tool.tf`

## What It Checks

- Hardcoded secret patterns, including GitLab PATs, AWS access keys, private keys, and generic secret assignments.
- Express hardening signals: Helmet, CSRF protection, rate limiting, session cookie flags, and production `SESSION_SECRET` enforcement.
- Browser hardening signals: CSP `unsafe-inline`, unsafe DOM sinks, and auth/session-like values cached in `localStorage`.
- TLS bypass patterns such as `rejectUnauthorized: false`.
- Dockerfile signals for pinned images and non-root runtime users.
- Terraform encryption-at-rest signals.
- `pnpm audit --json` dependency advisory summary when the local environment can run it.

## CI Behavior

By default the tool writes findings without failing the process, which makes it useful during discovery.

To make findings fail CI:

```bash
SECURITY_AUDIT_FAIL_ON_FINDINGS=1 corepack pnpm security:audit
```

To skip dependency advisory lookup in an offline environment:

```bash
SECURITY_AUDIT_SKIP_DEPENDENCY_AUDIT=1 corepack pnpm security:audit
```
