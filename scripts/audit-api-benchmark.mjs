#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const durationMs = Number(process.env.AUDIT_BENCH_DURATION_MS || 30000);
const requestDelayMs = Number(process.env.AUDIT_REQUEST_DELAY_MS || 0);
const outFile = process.env.AUDIT_BENCH_OUT || '.audit/api-benchmarks.json';
const email = process.env.AUDIT_EMAIL || 'dev@ship.local';
const password = process.env.AUDIT_PASSWORD || 'admin123';
const databaseUrl = process.env.DATABASE_URL || 'postgresql://ship:ship_dev_password@127.0.0.1:5432/ship_dev';

const endpoints = [
  { name: 'session identity', method: 'GET', path: '/api/auth/me' },
  { name: 'document list', method: 'GET', path: '/api/documents' },
  { name: 'issue list', method: 'GET', path: '/api/issues' },
  { name: 'week list', method: 'GET', path: '/api/weeks' },
  { name: 'dashboard my work', method: 'GET', path: '/api/dashboard/my-work' },
];

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const cookie = headers.get('set-cookie');
  return cookie ? [cookie] : [];
}

function mergeCookies(existing, headers) {
  const jar = new Map(existing);
  for (const raw of getSetCookies(headers)) {
    const first = raw.split(';')[0];
    const index = first.indexOf('=');
    if (index > 0) {
      jar.set(first.slice(0, index), first.slice(index + 1));
    }
  }
  return jar;
}

function cookieHeader(jar) {
  return Array.from(jar.entries()).map(([key, value]) => `${key}=${value}`).join('; ');
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}, jar = new Map()) {
  const headers = {
    ...(options.headers || {}),
    ...(jar.size ? { Cookie: cookieHeader(jar) } : {}),
  };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return {
    response,
    jar: mergeCookies(jar, response.headers),
  };
}

async function login() {
  let jar = new Map();
  const csrf = await request('/api/csrf-token', {}, jar);
  jar = csrf.jar;
  const csrfBody = await csrf.response.json();

  const loggedIn = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfBody.token,
    },
    body: JSON.stringify({ email, password }),
  }, jar);

  if (!loggedIn.response.ok) {
    throw new Error(`Login failed: ${loggedIn.response.status} ${await loggedIn.response.text()}`);
  }

  return loggedIn.jar;
}

async function createAuditSession() {
  try {
    const requireFromApi = createRequire(new URL('../api/package.json', import.meta.url));
    const { Pool } = requireFromApi('pg');
    const pool = new Pool({ connectionString: databaseUrl });
    const userResult = await pool.query('SELECT id, last_workspace_id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userResult.rows.length === 0) {
      await pool.end();
      return login();
    }

    const user = userResult.rows[0];
    const membershipResult = await pool.query(
      `SELECT workspace_id FROM workspace_memberships WHERE user_id = $1 ORDER BY created_at LIMIT 1`,
      [user.id]
    );
    const workspaceId = user.last_workspace_id || membershipResult.rows[0]?.workspace_id;
    const sessionId = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO sessions (id, user_id, workspace_id, expires_at, last_activity, user_agent, ip_address)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW(), $4, $5)`,
      [sessionId, user.id, workspaceId, 'shipshape-audit-api-benchmark', '127.0.0.1']
    );
    await pool.end();
    return new Map([['session_id', sessionId]]);
  } catch {
    return login();
  }
}

async function hit(endpoint, jar) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${endpoint.path}`, {
      method: endpoint.method,
      headers: { Cookie: cookieHeader(jar) },
    });
    await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      ms: performance.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runLoad(endpoint, concurrency, jar) {
  const deadline = performance.now() + durationMs;
  const latencies = [];
  const statusCounts = {};
  let completed = 0;
  let errors = 0;

  async function worker() {
    while (performance.now() < deadline) {
      const result = await hit(endpoint, jar);
      latencies.push(result.ms);
      completed += 1;
      statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
      if (!result.ok) errors += 1;
      if (requestDelayMs > 0) {
        await sleep(requestDelayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const seconds = durationMs / 1000;

  return {
    concurrency,
    durationSeconds: seconds,
    requests: completed,
    requestsPerSecond: Number((completed / seconds).toFixed(2)),
    errors,
    statusCounts,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    maxMs: percentile(latencies, 100),
  };
}

async function main() {
  await mkdir('.audit', { recursive: true });
  const jar = await createAuditSession();
  const results = [];

  for (const endpoint of endpoints) {
    for (const concurrency of [10, 25, 50]) {
      const metrics = await runLoad(endpoint, concurrency, jar);
      results.push({ ...endpoint, ...metrics });
      console.log(`${endpoint.path} c=${concurrency} p95=${metrics.p95Ms}ms rps=${metrics.requestsPerSecond}`);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    durationMs,
    requestDelayMs,
    endpoints,
    results,
  };
  await writeFile(outFile, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
