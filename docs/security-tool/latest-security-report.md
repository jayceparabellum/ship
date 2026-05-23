# ShipShape Security Tool Report

Generated: 2026-05-23T22:47:21.866Z

Branch: `ShipShape-Security-Tool`

Commit: `93ae088`

## Summary

| Metric | Count |
| --- | ---: |
| totalChecks | 13 |
| passed | 9 |
| failed | 4 |
| critical | 1 |
| high | 2 |
| medium | 1 |
| low | 0 |

## Findings

### CRITICAL - No hardcoded secrets or private keys

Category: secrets

Rule: `secrets.no-hardcoded-secrets`

Evidence:

- `api/scripts/create-test-user.ts:20` - password: '!Musicfun1$$',

Remediation: Move secrets to SSM/CI variables, rotate exposed credentials, and remove committed values from history when needed.

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
