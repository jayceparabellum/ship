# ShipShape Security Tool Report

Generated: 2026-05-23T20:43:14.952Z

Branch: `ShipShape-Security-Tool`

Commit: `281642a`

## Summary

| Metric | Count |
| --- | ---: |
| totalChecks | 13 |
| passed | 8 |
| failed | 5 |
| critical | 1 |
| high | 3 |
| medium | 1 |
| low | 0 |

## Findings

### CRITICAL - No hardcoded secrets or private keys

Category: secrets

Rule: `secrets.no-hardcoded-secrets`

Evidence:

- `api/scripts/create-test-user.ts:20` - password: '!Musicfun1$$',

Remediation: Move secrets to SSM/CI variables, rotate exposed credentials, and remove committed values from history when needed.

### HIGH - Dependency audit has no high or critical advisories

Category: dependencies

Rule: `dependencies.no-high-critical-advisories`

Evidence:

- pnpm audit vulnerability summary: {"critical":2,"high":30,"moderate":39,"low":4,"info":0}

Remediation: Run pnpm audit, upgrade affected packages, or document accepted risk with a patch plan.

### HIGH - TLS verification is not disabled

Category: transport-security

Rule: `tls.no-reject-unauthorized-false`

Evidence:

- `api/scripts/check-db-user.ts:10` - ssl: { rejectUnauthorized: false }
- `api/scripts/check-db-user.ts:19` - ssl: { rejectUnauthorized: false }
- `api/scripts/create-test-user.ts:35` - ssl: { rejectUnauthorized: false },
- `api/scripts/migrate-shadow.ts:32` - ssl: { rejectUnauthorized: false },
- `api/src/db/migrate.ts:32` - ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
- `api/src/db/seed.ts:44` - ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

Remediation: Use trusted CA bundles or managed certificates instead of disabling TLS verification.

### HIGH - No unsafe DOM injection sinks

Category: browser-hardening

Rule: `xss.no-unsafe-dom-sinks`

Evidence:

- `api/src/routes/admin-credentials.ts:310` - badge.innerHTML = '<span>✓ Configured</span>';
- `api/src/routes/admin-credentials.ts:313` - badge.innerHTML = '<span>○ Not Configured</span>';
- `api/src/routes/admin-credentials.ts:322` - btn.innerHTML = '<span class="spinner"></span>Saving...';
- `api/src/routes/admin-credentials.ts:390` - btn.innerHTML = '<span class="spinner"></span>Testing...';
- `web/src/components/editor/AIScoringDisplay.tsx:181` - container.innerHTML = `
- `web/src/components/editor/AIScoringDisplay.tsx:206` - container.innerHTML = `
- `web/src/components/editor/CommentDisplay.tsx:85` - container.innerHTML = `
- `web/src/components/editor/CommentDisplay.tsx:110` - container.innerHTML = `
- `web/src/components/editor/CommentDisplay.tsx:179` - container.innerHTML = `

Remediation: Replace innerHTML/eval-style sinks with React rendering, DOM textContent, or a sanitizer with explicit allowlists.

### MEDIUM - CSP avoids unsafe-inline

Category: browser-hardening

Rule: `csp.no-unsafe-inline`

Evidence:

- `api/src/app.ts:117` - scriptSrc: ["'self'", "'unsafe-inline'"], // Admin credentials page uses inline scripts
- `api/src/app.ts:118` - styleSrc: ["'self'", "'unsafe-inline'"], // TipTap editor needs inline styles

Remediation: Replace inline scripts/styles with nonce or hashed CSP entries where practical.
