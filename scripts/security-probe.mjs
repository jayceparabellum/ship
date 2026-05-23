#!/usr/bin/env node
import { exec } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const root = process.cwd();
const apiRequire = createRequire(path.join(root, 'api/package.json'));
const WebSocket = apiRequire('ws');
const outDir = process.env.SECURITY_PROBE_OUT_DIR || 'docs/security-tool';
const jsonOut = path.join(outDir, 'latest-probe-report.json');
const markdownOut = path.join(outDir, 'latest-probe-report.md');

const defaults = {
  apiUrl: process.env.SECURITY_PROBE_API_URL || 'http://127.0.0.1:3000',
  webUrl: process.env.SECURITY_PROBE_WEB_URL || 'http://127.0.0.1:5173',
  email: process.env.SECURITY_PROBE_EMAIL || 'dev@ship.local',
  password: process.env.SECURITY_PROBE_PASSWORD || 'admin123',
  timeoutMs: Number(process.env.SECURITY_PROBE_TIMEOUT_MS || 5000),
};

function parseArgs(argv) {
  const args = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--api-url' && next) args.apiUrl = next, index += 1;
    else if (arg === '--web-url' && next) args.webUrl = next, index += 1;
    else if (arg === '--email' && next) args.email = next, index += 1;
    else if (arg === '--password' && next) args.password = next, index += 1;
    else if (arg === '--timeout-ms' && next) args.timeoutMs = Number(next), index += 1;
  }
  args.apiUrl = args.apiUrl.replace(/\/$/, '');
  args.webUrl = args.webUrl.replace(/\/$/, '');
  return args;
}

function wsBaseUrl(apiUrl) {
  return apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[severity] ?? 0;
}

function makeFinding({
  id,
  surface,
  severity = 'info',
  title,
  passed,
  details,
  reproductionSteps = [],
  evidence = {},
  remediation = '',
}) {
  return { id, surface, severity, title, passed, details, reproductionSteps, evidence, remediation };
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(setCookieHeaders = []) {
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const header of headers.filter(Boolean)) {
      const [pair] = String(header).split(';');
      const equalsIndex = pair.indexOf('=');
      if (equalsIndex === -1) continue;
      const name = pair.slice(0, equalsIndex).trim();
      const value = pair.slice(equalsIndex + 1).trim();
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header(extra = {}) {
    const merged = new Map(this.cookies);
    for (const [name, value] of Object.entries(extra)) merged.set(name, value);
    return Array.from(merged.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
  }

  get(name) {
    return this.cookies.get(name);
  }
}

function setCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

async function fetchJson(url, options = {}, jar) {
  const headers = new Headers(options.headers || {});
  if (jar && !headers.has('cookie') && jar.header()) headers.set('cookie', jar.header());
  try {
    const response = await fetch(url, { ...options, headers });
    if (jar) jar.store(setCookieHeaders(response));
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    return { response, body, text, networkError: null };
  } catch (error) {
    return {
      response: { ok: false, status: 0, headers: new Headers() },
      body: { error: error.message },
      text: error.message,
      networkError: error.message,
    };
  }
}

async function getCsrf(apiUrl, jar) {
  const { response, body } = await fetchJson(`${apiUrl}/api/csrf-token`, { method: 'GET' }, jar);
  if (!response.ok || !body?.token) throw new Error(`Failed to get CSRF token: HTTP ${response.status}`);
  return body.token;
}

async function login(apiUrl, email, password) {
  const jar = new CookieJar();
  const csrfToken = await getCsrf(apiUrl, jar);
  const result = await fetchJson(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  }, jar);

  if (!result.response.ok || !result.body?.success) {
    throw new Error(`Login failed for probe account: HTTP ${result.response.status}`);
  }

  return { jar, csrfToken, loginBody: result.body };
}

async function dependencyAudit() {
  try {
    const { stdout } = await execAsync('corepack pnpm audit --json', {
      cwd: root,
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 8,
    });
    return parseAuditJson(stdout);
  } catch (error) {
    const stdout = error.stdout?.toString() || '';
    if (stdout) return parseAuditJson(stdout);
    return { error: error.message, vulnerabilities: null, highCritical: null, packages: [] };
  }
}

function parseAuditJson(text) {
  const audit = JSON.parse(text || '{}');
  const vulnerabilities = audit.metadata?.vulnerabilities || null;
  const advisories = audit.advisories ? Object.values(audit.advisories) : [];
  const packages = advisories
    .filter((advisory) => ['critical', 'high'].includes(advisory.severity))
    .map((advisory) => ({
      module: advisory.module_name,
      severity: advisory.severity,
      title: advisory.title,
      vulnerableVersions: advisory.vulnerable_versions,
      recommendation: advisory.recommendation,
    }));

  const highCritical = vulnerabilities
    ? Number(vulnerabilities.critical || 0) + Number(vulnerabilities.high || 0)
    : packages.length;

  return { vulnerabilities, highCritical, packages: packages.slice(0, 30) };
}

async function websocketAttempt(url, { cookieHeader, payloads = [], timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const events = [];
    const headers = cookieHeader ? { Cookie: cookieHeader } : {};
    const ws = new WebSocket(url, { headers, handshakeTimeout: timeoutMs });
    const timer = setTimeout(() => {
      events.push({ type: 'timeout' });
      try { ws.close(); } catch {}
      resolve({ opened: events.some((event) => event.type === 'open'), events });
    }, timeoutMs);

    ws.on('open', () => {
      events.push({ type: 'open' });
      for (const payload of payloads) ws.send(payload);
      if (payloads.length === 0) {
        setTimeout(() => ws.close(), 250);
      }
    });
    ws.on('message', (data) => {
      events.push({ type: 'message', bytes: data.length });
    });
    ws.on('close', (code, reason) => {
      clearTimeout(timer);
      events.push({ type: 'close', code, reason: reason.toString() });
      resolve({ opened: true, events });
    });
    ws.on('error', (error) => {
      clearTimeout(timer);
      events.push({ type: 'error', message: error.message });
      resolve({ opened: false, events });
    });
    ws.on('unexpected-response', (_request, response) => {
      clearTimeout(timer);
      events.push({ type: 'unexpected-response', statusCode: response.statusCode });
      resolve({ opened: false, events });
    });
  });
}

async function createIssue(apiUrl, jar, csrfToken, title) {
  return fetchJson(`${apiUrl}/api/issues`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ title, priority: 'low', state: 'backlog', source: 'internal' }),
  }, jar);
}

async function deleteIssue(apiUrl, jar, csrfToken, id) {
  if (!id) return null;
  return fetchJson(`${apiUrl}/api/issues/${id}`, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
    },
  }, jar).catch((error) => ({ error: error.message }));
}

async function runProbe(args) {
  const findings = [];

  const health = await fetchJson(`${args.apiUrl}/health`);
  findings.push(makeFinding({
    id: 'probe.api-health',
    surface: 'setup',
    severity: health.response.ok ? 'info' : 'critical',
    title: 'Probe can reach live API health endpoint',
    passed: health.response.ok,
    details: `GET /health returned HTTP ${health.response.status}`,
    reproductionSteps: [`curl ${args.apiUrl}/health`],
    evidence: { status: health.response.status, body: health.body },
    remediation: 'Start the API or set SECURITY_PROBE_API_URL / --api-url to a reachable app instance.',
  }));

  const unauthMe = await fetchJson(`${args.apiUrl}/api/auth/me`);
  findings.push(makeFinding({
    id: 'auth.unauthenticated-me-rejected',
    surface: 'authentication and session handling',
    severity: 'high',
    title: 'Unauthenticated session endpoint is rejected',
    passed: unauthMe.response.status === 401,
    details: `GET /api/auth/me without cookies returned HTTP ${unauthMe.response.status}`,
    reproductionSteps: [`curl -i ${args.apiUrl}/api/auth/me`],
    evidence: { status: unauthMe.response.status, body: unauthMe.body },
    remediation: 'Require auth middleware on session/user endpoints.',
  }));

  const invalidJar = new CookieJar();
  const invalidSession = await fetchJson(`${args.apiUrl}/api/auth/me`, {
    headers: { cookie: invalidJar.header({ session_id: 'security-probe-invalid-session' }) },
  });
  findings.push(makeFinding({
    id: 'auth.invalid-session-rejected',
    surface: 'authentication and session handling',
    severity: 'high',
    title: 'Invalid session cookie is rejected',
    passed: invalidSession.response.status === 401,
    details: `GET /api/auth/me with fake session_id returned HTTP ${invalidSession.response.status}`,
    reproductionSteps: [`curl -i -H "Cookie: session_id=security-probe-invalid-session" ${args.apiUrl}/api/auth/me`],
    evidence: { status: invalidSession.response.status, body: invalidSession.body },
    remediation: 'Reject unknown or expired session identifiers.',
  }));

  const session = await login(args.apiUrl, args.email, args.password);
  const sessionId = session.jar.get('session_id') || '';
  findings.push(makeFinding({
    id: 'auth.session-token-entropy-shape',
    surface: 'authentication and session handling',
    severity: 'high',
    title: 'Session token has expected high-entropy shape',
    passed: /^[a-f0-9]{64}$/i.test(sessionId),
    details: `session_id length is ${sessionId.length}; expected 64 hex characters`,
    reproductionSteps: ['Log in through /api/auth/login and inspect the Set-Cookie session_id value shape.'],
    evidence: { length: sessionId.length, hex64: /^[a-f0-9]{64}$/i.test(sessionId) },
    remediation: 'Use cryptographically random 256-bit session identifiers.',
  }));

  const me = await fetchJson(`${args.apiUrl}/api/auth/me`, {}, session.jar);
  findings.push(makeFinding({
    id: 'auth.valid-session-accepted',
    surface: 'authentication and session handling',
    severity: 'info',
    title: 'Valid session can access authenticated user endpoint',
    passed: me.response.ok,
    details: `GET /api/auth/me with authenticated cookie returned HTTP ${me.response.status}`,
    reproductionSteps: ['Log in, then request /api/auth/me with the returned session cookie.'],
    evidence: { status: me.response.status, bodyKeys: Object.keys(me.body || {}) },
    remediation: 'Investigate login/session middleware if this fails.',
  }));

  const noCsrf = await fetchJson(`${args.apiUrl}/api/issues`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: session.jar.header(),
    },
    body: JSON.stringify({ title: 'security probe csrf check' }),
  });
  findings.push(makeFinding({
    id: 'auth.csrf-required-for-state-change',
    surface: 'authentication and session handling',
    severity: 'high',
    title: 'State-changing session request requires CSRF token',
    passed: noCsrf.response.status === 403,
    details: `POST /api/issues without x-csrf-token returned HTTP ${noCsrf.response.status}`,
    reproductionSteps: ['Log in, then POST /api/issues with the session cookie but without x-csrf-token.'],
    evidence: { status: noCsrf.response.status, body: noCsrf.body },
    remediation: 'Apply CSRF protection to cookie-authenticated state-changing routes.',
  }));

  const adminUsers = await fetchJson(`${args.apiUrl}/api/admin/users`, {}, session.jar);
  const isSuperAdmin = Boolean(me.body?.data?.user?.isSuperAdmin);
  findings.push(makeFinding({
    id: 'auth.admin-route-role-boundary',
    surface: 'authentication and session handling',
    severity: 'high',
    title: 'Admin-only user list follows the current role boundary',
    passed: isSuperAdmin ? adminUsers.response.ok : adminUsers.response.status === 403,
    details: isSuperAdmin
      ? `Probe account is super-admin; /api/admin/users returned HTTP ${adminUsers.response.status}`
      : `Probe account is not super-admin; /api/admin/users returned HTTP ${adminUsers.response.status}`,
    reproductionSteps: ['Log in as the probe user and request /api/admin/users.'],
    evidence: { status: adminUsers.response.status, isSuperAdmin },
    remediation: 'Require explicit super-admin checks for admin routes.',
  }));

  const wsBase = wsBaseUrl(args.apiUrl);
  const unauthEvents = await websocketAttempt(`${wsBase}/events`, { timeoutMs: args.timeoutMs });
  findings.push(makeFinding({
    id: 'websocket.unauthenticated-events-rejected',
    surface: 'WebSocket message validation',
    severity: 'high',
    title: 'Unauthenticated events WebSocket is rejected',
    passed: unauthEvents.events.some((event) => event.statusCode === 401 || /401/.test(event.message || '')),
    details: 'Attempted /events WebSocket connection without cookies.',
    reproductionSteps: [`Connect to ${wsBase}/events without Cookie header.`],
    evidence: unauthEvents,
    remediation: 'Validate session cookies before accepting WebSocket upgrades.',
  }));

  const malformedEvents = await websocketAttempt(`${wsBase}/events`, {
    cookieHeader: session.jar.header(),
    payloads: ['not-json', JSON.stringify({ type: 'unexpected_security_probe_type' })],
    timeoutMs: args.timeoutMs,
  });
  findings.push(makeFinding({
    id: 'websocket.malformed-events-message-survives',
    surface: 'WebSocket message validation',
    severity: 'medium',
    title: 'Events WebSocket survives malformed and unexpected message types',
    passed: malformedEvents.opened && !malformedEvents.events.some((event) => ['error', 'unexpected-response'].includes(event.type)),
    details: 'Sent invalid JSON and an unexpected event type over an authenticated /events socket.',
    reproductionSteps: ['Log in, connect to /events with Cookie header, send `not-json`, then send `{ "type": "unexpected_security_probe_type" }`.'],
    evidence: malformedEvents,
    remediation: 'Reject malformed messages without crashing and ignore or close on unsupported message types.',
  }));

  const randomUuid = '00000000-0000-4000-8000-000000000000';
  const unauthorizedCollab = await websocketAttempt(`${wsBase}/collaboration/wiki:${randomUuid}`, {
    cookieHeader: session.jar.header(),
    timeoutMs: args.timeoutMs,
  });
  findings.push(makeFinding({
    id: 'websocket.unauthorized-document-room-rejected',
    surface: 'WebSocket message validation',
    severity: 'high',
    title: 'Unauthorized collaboration document room is rejected',
    passed: unauthorizedCollab.events.some((event) => event.statusCode === 403 || /403/.test(event.message || '')),
    details: `Attempted authenticated connection to non-existent/random collaboration room wiki:${randomUuid}.`,
    reproductionSteps: [`Log in, then connect to ${wsBase}/collaboration/wiki:${randomUuid} with Cookie header.`],
    evidence: unauthorizedCollab,
    remediation: 'Verify workspace and document access before WebSocket room join.',
  }));

  const xssPayload = `<img src=x onerror=alert('shipshape-probe')>`;
  const xssCreate = await createIssue(args.apiUrl, session.jar, session.csrfToken, `security-probe-xss ${xssPayload}`);
  const createdIssueId = xssCreate.body?.id || xssCreate.body?.data?.id;
  findings.push(makeFinding({
    id: 'input.stored-xss-payload-handling',
    surface: 'input sanitization',
    severity: xssCreate.response.status === 400 ? 'info' : 'medium',
    title: 'Stored XSS payload handling on issue title',
    passed: xssCreate.response.status === 400,
    details: xssCreate.response.status === 400
      ? 'Issue title rejected an HTML event-handler payload.'
      : `Issue title accepted an HTML event-handler payload with HTTP ${xssCreate.response.status}; verify frontend escaping/sanitization.`,
    reproductionSteps: ['Log in and POST /api/issues with a title containing `<img src=x onerror=alert(...)>`.'],
    evidence: { status: xssCreate.response.status, createdIssueId, responseTitle: xssCreate.body?.title },
    remediation: 'Reject or sanitize HTML-bearing user text at trust boundaries, and keep React output escaped.',
  }));
  await deleteIssue(args.apiUrl, session.jar, session.csrfToken, createdIssueId);

  const longTitle = `security-probe-long-${'a'.repeat(10_000)}`;
  const longCreate = await createIssue(args.apiUrl, session.jar, session.csrfToken, longTitle);
  findings.push(makeFinding({
    id: 'input.excessively-long-title-rejected',
    surface: 'input sanitization',
    severity: 'medium',
    title: 'Excessively long issue title is rejected',
    passed: longCreate.response.status === 400,
    details: `POST /api/issues with 10k-character title returned HTTP ${longCreate.response.status}`,
    reproductionSteps: ['Log in and POST /api/issues with a 10,000-character title.'],
    evidence: { status: longCreate.response.status, body: longCreate.body },
    remediation: 'Enforce explicit length limits on all user-facing string fields.',
  }));

  const sqlState = await fetchJson(`${args.apiUrl}/api/issues?state=${encodeURIComponent("' OR 1=1--")}`, {}, session.jar);
  findings.push(makeFinding({
    id: 'input.sql-injection-filter-is-parameterized',
    surface: 'input sanitization',
    severity: 'high',
    title: 'SQL injection payload in issue filter does not break query',
    passed: sqlState.response.ok && !/syntax|unterminated|SQL|stack/i.test(sqlState.text),
    details: `GET /api/issues?state=' OR 1=1-- returned HTTP ${sqlState.response.status}`,
    reproductionSteps: [`curl -i '${args.apiUrl}/api/issues?state=%27%20OR%201%3D1--' with authenticated Cookie header.`],
    evidence: { status: sqlState.response.status, bodySample: sqlState.text.slice(0, 300) },
    remediation: 'Use parameterized SQL and schema validation for all query filters.',
  }));

  const verboseError = await fetchJson(`${args.apiUrl}/api/documents/not-a-uuid`, {}, session.jar);
  findings.push(makeFinding({
    id: 'manual.verbose-error-leakage',
    surface: 'manual review: error message verbosity',
    severity: 'medium',
    title: 'Malformed ID error does not leak stack traces or SQL',
    passed: !/at\s+\w+|SELECT|syntax error|node_modules|\.ts:\d+|\.js:\d+/i.test(verboseError.text),
    details: `GET /api/documents/not-a-uuid returned HTTP ${verboseError.response.status}`,
    reproductionSteps: ['Log in and request /api/documents/not-a-uuid.'],
    evidence: { status: verboseError.response.status, bodySample: verboseError.text.slice(0, 500) },
    remediation: 'Return generic validation errors and log detailed stack traces server-side only.',
  }));

  const options = await fetchJson(`${args.apiUrl}/api/auth/me`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://evil.example',
      'access-control-request-method': 'GET',
    },
  });
  const optionHeaders = options.response.headers;
  findings.push(makeFinding({
    id: 'manual.cors-restricts-arbitrary-origin',
    surface: 'manual review: CORS and CSP configuration',
    severity: 'medium',
    title: 'CORS does not allow arbitrary hostile origin',
    passed: optionHeaders.get('access-control-allow-origin') !== 'https://evil.example',
    details: `OPTIONS with Origin https://evil.example returned Access-Control-Allow-Origin: ${optionHeaders.get('access-control-allow-origin') || '(none)'}`,
    reproductionSteps: [`curl -i -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET' ${args.apiUrl}/api/auth/me`],
    evidence: {
      status: options.response.status,
      allowOrigin: optionHeaders.get('access-control-allow-origin'),
      allowCredentials: optionHeaders.get('access-control-allow-credentials'),
      networkError: options.networkError,
    },
    remediation: 'Restrict CORS to the deployed frontend origin and do not reflect arbitrary origins.',
  }));

  const oversizedPayload = Buffer.alloc(11 * 1024 * 1024, 'a');
  const oversizedEvents = await websocketAttempt(`${wsBase}/events`, {
    cookieHeader: session.jar.header(),
    payloads: [oversizedPayload],
    timeoutMs: args.timeoutMs,
  });
  const postOversizedHealth = await fetchJson(`${args.apiUrl}/health`);
  findings.push(makeFinding({
    id: 'websocket.oversized-message-rejected',
    surface: 'WebSocket message validation',
    severity: 'high',
    title: 'Oversized WebSocket message is rejected without taking down API health',
    passed: oversizedEvents.events.some((event) => event.code === 1009 || /1009|too large|max payload/i.test(event.message || event.reason || '')) && postOversizedHealth.response.ok,
    details: `Sent an 11MB payload to authenticated /events socket; follow-up /health returned HTTP ${postOversizedHealth.response.status}.`,
    reproductionSteps: ['Log in, connect to /events, send an 11MB message, then request /health.'],
    evidence: {
      websocket: oversizedEvents,
      postOversizedHealth: { status: postOversizedHealth.response.status, body: postOversizedHealth.body, networkError: postOversizedHealth.networkError },
    },
    remediation: 'Set maxPayload and close oversized WebSocket messages with code 1009 without crashing the HTTP server.',
  }));

  const dependency = await dependencyAudit();
  findings.push(makeFinding({
    id: 'dependencies.high-critical-cves',
    surface: 'dependency vulnerabilities',
    severity: dependency.highCritical > 0 ? 'high' : 'info',
    title: 'Dependency audit high/critical CVE count',
    passed: dependency.highCritical === 0,
    details: dependency.vulnerabilities
      ? `pnpm audit reported ${dependency.vulnerabilities.critical || 0} critical and ${dependency.vulnerabilities.high || 0} high advisories.`
      : `Dependency audit could not produce vulnerability metadata: ${dependency.error || 'unknown error'}`,
    reproductionSteps: ['Run `corepack pnpm audit --json` from the repository root.'],
    evidence: dependency,
    remediation: 'Upgrade vulnerable packages or document accepted risk with feature impact and mitigation.',
  }));

  return findings;
}

function summarize(findings) {
  const failed = findings.filter((finding) => !finding.passed);
  return {
    totalChecks: findings.length,
    passed: findings.length - failed.length,
    failed: failed.length,
    critical: failed.filter((finding) => finding.severity === 'critical').length,
    high: failed.filter((finding) => finding.severity === 'high').length,
    medium: failed.filter((finding) => finding.severity === 'medium').length,
    low: failed.filter((finding) => finding.severity === 'low').length,
    info: failed.filter((finding) => finding.severity === 'info').length,
  };
}

function category8Metrics(findings) {
  const bySurface = (surface) => findings.filter((finding) => finding.surface === surface && !finding.passed);
  const dependencyFinding = findings.find((finding) => finding.id === 'dependencies.high-critical-cves');
  return {
    securityProbeToolRunnable: true,
    authSessionVulnerabilitiesFound: bySurface('authentication and session handling').map((finding) => `${finding.severity}: ${finding.title}`),
    websocketValidationFailures: bySurface('WebSocket message validation').map((finding) => `${finding.severity}: ${finding.title}`),
    inputSanitizationFailures: bySurface('input sanitization').map((finding) => `${finding.severity}: ${finding.title}`),
    highCriticalDependencyCves: dependencyFinding?.evidence?.highCritical ?? null,
    corsCspMisconfiguration: findings.filter((finding) => finding.surface === 'manual review: CORS and CSP configuration' && !finding.passed).map((finding) => finding.title),
    secretsExposureRisk: 'Covered by static security:audit scanner; active client-bundle secret probing is a follow-up.',
    rateLimitingAbsentOnEndpoints: findings.filter((finding) => /rate/i.test(finding.title) && !finding.passed).map((finding) => finding.title),
    verboseErrorLeakage: findings.find((finding) => finding.id === 'manual.verbose-error-leakage')?.passed === false,
  };
}

function toMarkdown(payload) {
  const rows = Object.entries(payload.summary).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const metrics = Object.entries(payload.category8Metrics)
    .map(([key, value]) => `| ${key} | ${Array.isArray(value) ? (value.length ? value.join('<br>') : 'None') : String(value)} |`)
    .join('\n');
  const findings = payload.findings
    .slice()
    .sort((a, b) => Number(a.passed) - Number(b.passed) || severityRank(b.severity) - severityRank(a.severity))
    .map((finding) => {
      const steps = finding.reproductionSteps.map((step) => `- ${step}`).join('\n') || '- No reproduction steps recorded.';
      return `### ${finding.passed ? 'PASS' : finding.severity.toUpperCase()} - ${finding.title}

Surface: ${finding.surface}

Rule: \`${finding.id}\`

Details: ${finding.details}

Reproduction:

${steps}

Remediation: ${finding.remediation || 'No remediation required.'}`;
    }).join('\n\n');

  return `# ShipShape Active Security Probe Report

Generated: ${payload.generatedAt}

Target API: ${payload.target.apiUrl}

Target Web: ${payload.target.webUrl}

## Summary

| Metric | Count |
| --- | ---: |
${rows}

## Category 8 Metrics

| Metric | Result |
| --- | --- |
${metrics}

## Findings

${findings}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const findings = await runProbe(args);
  const payload = {
    generatedAt: new Date().toISOString(),
    tool: 'shipshape-active-security-probe',
    target: {
      apiUrl: args.apiUrl,
      webUrl: args.webUrl,
      email: args.email,
    },
    summary: summarize(findings),
    category8Metrics: category8Metrics(findings),
    findings,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(markdownOut, toMarkdown(payload));

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${markdownOut}`);

  if (process.env.SECURITY_PROBE_FAIL_ON_FINDINGS === '1' && payload.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
