# ShipShape Active Security Probe Report

Generated: 2026-05-23T23:51:11.217Z

Target API: https://d9o5hawnpdm4g.cloudfront.net

Target Web: https://d9o5hawnpdm4g.cloudfront.net

## Summary

| Metric | Count |
| --- | ---: |
| totalChecks | 17 |
| passed | 17 |
| failed | 0 |
| critical | 0 |
| high | 0 |
| medium | 0 |
| low | 0 |
| info | 0 |

## Category 8 Metrics

| Metric | Result |
| --- | --- |
| securityProbeToolRunnable | true |
| authSessionVulnerabilitiesFound | None |
| websocketValidationFailures | None |
| inputSanitizationFailures | None |
| highCriticalDependencyCves | 0 |
| corsCspMisconfiguration | None |
| secretsExposureRisk | Covered by static security:audit scanner; active client-bundle secret probing is a follow-up. |
| rateLimitingAbsentOnEndpoints | None |
| verboseErrorLeakage | false |

## Findings

### PASS - Unauthenticated session endpoint is rejected

Surface: authentication and session handling

Rule: `auth.unauthenticated-me-rejected`

Details: GET /api/auth/me without cookies returned HTTP 401

Reproduction:

- curl -i https://d9o5hawnpdm4g.cloudfront.net/api/auth/me

Remediation: Require auth middleware on session/user endpoints.

### PASS - Invalid session cookie is rejected

Surface: authentication and session handling

Rule: `auth.invalid-session-rejected`

Details: GET /api/auth/me with fake session_id returned HTTP 401

Reproduction:

- curl -i -H "Cookie: session_id=security-probe-invalid-session" https://d9o5hawnpdm4g.cloudfront.net/api/auth/me

Remediation: Reject unknown or expired session identifiers.

### PASS - Session token has expected high-entropy shape

Surface: authentication and session handling

Rule: `auth.session-token-entropy-shape`

Details: session_id length is 64; expected 64 hex characters

Reproduction:

- Log in through /api/auth/login and inspect the Set-Cookie session_id value shape.

Remediation: Use cryptographically random 256-bit session identifiers.

### PASS - State-changing session request requires CSRF token

Surface: authentication and session handling

Rule: `auth.csrf-required-for-state-change`

Details: POST /api/issues without x-csrf-token returned HTTP 403

Reproduction:

- Log in, then POST /api/issues with the session cookie but without x-csrf-token.

Remediation: Apply CSRF protection to cookie-authenticated state-changing routes.

### PASS - Admin-only user list follows the current role boundary

Surface: authentication and session handling

Rule: `auth.admin-route-role-boundary`

Details: Probe account is super-admin; /api/admin/users returned HTTP 200

Reproduction:

- Log in as the probe user and request /api/admin/users.

Remediation: Require explicit super-admin checks for admin routes.

### PASS - Unauthenticated events WebSocket is rejected

Surface: WebSocket message validation

Rule: `websocket.unauthenticated-events-rejected`

Details: Attempted /events WebSocket connection without cookies.

Reproduction:

- Connect to wss://d9o5hawnpdm4g.cloudfront.net/events without Cookie header.

Remediation: Validate session cookies before accepting WebSocket upgrades.

### PASS - Unauthorized collaboration document room is rejected

Surface: WebSocket message validation

Rule: `websocket.unauthorized-document-room-rejected`

Details: Attempted authenticated connection to non-existent/random collaboration room wiki:00000000-0000-4000-8000-000000000000.

Reproduction:

- Log in, then connect to wss://d9o5hawnpdm4g.cloudfront.net/collaboration/wiki:00000000-0000-4000-8000-000000000000 with Cookie header.

Remediation: Verify workspace and document access before WebSocket room join.

### PASS - SQL injection payload in issue filter does not break query

Surface: input sanitization

Rule: `input.sql-injection-filter-is-parameterized`

Details: GET /api/issues?state=' OR 1=1-- returned HTTP 200

Reproduction:

- curl -i 'https://d9o5hawnpdm4g.cloudfront.net/api/issues?state=%27%20OR%201%3D1--' with authenticated Cookie header.

Remediation: Use parameterized SQL and schema validation for all query filters.

### PASS - Oversized WebSocket message is rejected without taking down API health

Surface: WebSocket message validation

Rule: `websocket.oversized-message-rejected`

Details: Sent an 11MB payload to authenticated /events socket; follow-up /health returned HTTP 200.

Reproduction:

- Log in, connect to /events, send an 11MB message, then request /health.

Remediation: Set maxPayload and close oversized WebSocket messages with code 1009 without crashing the HTTP server.

### PASS - Events WebSocket survives malformed and unexpected message types

Surface: WebSocket message validation

Rule: `websocket.malformed-events-message-survives`

Details: Sent invalid JSON and an unexpected event type over an authenticated /events socket.

Reproduction:

- Log in, connect to /events with Cookie header, send `not-json`, then send `{ "type": "unexpected_security_probe_type" }`.

Remediation: Reject malformed messages without crashing and ignore or close on unsupported message types.

### PASS - Excessively long issue title is rejected

Surface: input sanitization

Rule: `input.excessively-long-title-rejected`

Details: POST /api/issues with 10k-character title returned HTTP 400

Reproduction:

- Log in and POST /api/issues with a 10,000-character title.

Remediation: Enforce explicit length limits on all user-facing string fields.

### PASS - Malformed ID error does not leak stack traces or SQL

Surface: manual review: error message verbosity

Rule: `manual.verbose-error-leakage`

Details: GET /api/documents/not-a-uuid returned HTTP 500

Reproduction:

- Log in and request /api/documents/not-a-uuid.

Remediation: Return generic validation errors and log detailed stack traces server-side only.

### PASS - CORS does not allow arbitrary hostile origin

Surface: manual review: CORS and CSP configuration

Rule: `manual.cors-restricts-arbitrary-origin`

Details: OPTIONS with Origin https://evil.example returned Access-Control-Allow-Origin: https://d9o5hawnpdm4g.cloudfront.net

Reproduction:

- curl -i -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET' https://d9o5hawnpdm4g.cloudfront.net/api/auth/me

Remediation: Restrict CORS to the deployed frontend origin and do not reflect arbitrary origins.

### PASS - Probe can reach live API health endpoint

Surface: setup

Rule: `probe.api-health`

Details: GET /health returned HTTP 200

Reproduction:

- curl https://d9o5hawnpdm4g.cloudfront.net/health

Remediation: Start the API or set SECURITY_PROBE_API_URL / --api-url to a reachable app instance.

### PASS - Valid session can access authenticated user endpoint

Surface: authentication and session handling

Rule: `auth.valid-session-accepted`

Details: GET /api/auth/me with authenticated cookie returned HTTP 200

Reproduction:

- Log in, then request /api/auth/me with the returned session cookie.

Remediation: Investigate login/session middleware if this fails.

### PASS - Stored XSS payload handling on issue title

Surface: input sanitization

Rule: `input.stored-xss-payload-handling`

Details: Issue title rejected an HTML event-handler payload.

Reproduction:

- Log in and POST /api/issues with a title containing `<img src=x onerror=alert(...)>`.

Remediation: Reject or sanitize HTML-bearing user text at trust boundaries, and keep React output escaped.

### PASS - Dependency audit high/critical CVE count

Surface: dependency vulnerabilities

Rule: `dependencies.high-critical-cves`

Details: pnpm audit reported 0 critical and 0 high advisories.

Reproduction:

- Run `corepack pnpm audit --json` from the repository root.

Remediation: Upgrade vulnerable packages or document accepted risk with feature impact and mitigation.
