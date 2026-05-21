#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const databaseUrl = process.env.DATABASE_URL || 'postgresql://ship:ship_dev_password@127.0.0.1:5432/ship_dev';
const outFile = process.env.AUDIT_DB_OUT || '.audit/db-query-capture.json';
const email = process.env.AUDIT_EMAIL || 'dev@ship.local';

const flows = [
  { name: 'document list', path: '/api/documents' },
  { name: 'issue list', path: '/api/issues' },
  { name: 'week list', path: '/api/weeks' },
  { name: 'dashboard my work', path: '/api/dashboard/my-work' },
  { name: 'mention search', path: '/api/search/mentions?q=dev' },
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

async function createAuditSession(pool) {
  const userResult = await pool.query('SELECT id, last_workspace_id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (userResult.rows.length === 0) {
    throw new Error(`Could not find audit user ${email}`);
  }

  const user = userResult.rows[0];
  const membershipResult = await pool.query(
    `SELECT workspace_id FROM workspace_memberships WHERE user_id = $1 ORDER BY created_at LIMIT 1`,
    [user.id]
  );
  const workspaceId = user.last_workspace_id || membershipResult.rows[0]?.workspace_id;
  if (!workspaceId) {
    throw new Error(`Audit user ${email} has no workspace`);
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (id, user_id, workspace_id, expires_at, last_activity, user_agent, ip_address)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW(), $4, $5)`,
    [sessionId, user.id, workspaceId, 'shipshape-audit-db-capture', '127.0.0.1']
  );

  return {
    sessionId,
    jar: new Map([['session_id', sessionId]]),
  };
}

async function main() {
  const requireFromApi = createRequire(new URL('../api/package.json', import.meta.url));
  const { Pool } = requireFromApi('pg');
  const pool = new Pool({ connectionString: databaseUrl });
  await mkdir('.audit', { recursive: true });

  const { sessionId, jar } = await createAuditSession(pool);
  const statsBefore = await pool.query(`
    SELECT query, calls, total_exec_time, mean_exec_time, rows
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
  `).catch(() => null);

  const results = [];
  for (const flow of flows) {
    const started = performance.now();
    const response = await fetch(`${apiBaseUrl}${flow.path}`, {
      headers: { Cookie: cookieHeader(jar) },
    });
    const body = await response.text();
    results.push({
      ...flow,
      status: response.status,
      ok: response.ok,
      responseMs: Number((performance.now() - started).toFixed(2)),
      responseBytes: Buffer.byteLength(body),
    });
  }

  const statsAfter = await pool.query(`
    SELECT query, calls, total_exec_time, mean_exec_time, rows
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
    ORDER BY total_exec_time DESC
    LIMIT 25
  `).catch(() => null);

  const explainTargets = [
    {
      name: 'documents list visibility filter',
      sql: `
        SELECT id, workspace_id, document_type, title, parent_id, position,
               ticket_number, properties, created_at, updated_at, created_by, visibility
        FROM documents
        WHERE workspace_id = (SELECT workspace_id FROM sessions WHERE id = $1)
          AND archived_at IS NULL
          AND deleted_at IS NULL
        ORDER BY position ASC, created_at DESC
      `,
      params: [sessionId],
    },
    {
      name: 'issue list joins',
      sql: `
        SELECT d.id, d.title, d.properties, d.ticket_number,
               u.name as assignee_name
        FROM documents d
        LEFT JOIN users u ON (d.properties->>'assignee_id')::uuid = u.id
        WHERE d.workspace_id = (SELECT workspace_id FROM sessions WHERE id = $1)
          AND d.document_type = 'issue'
          AND d.archived_at IS NULL
          AND d.deleted_at IS NULL
        ORDER BY d.updated_at DESC
      `,
      params: [sessionId],
    },
    {
      name: 'session auth lookup',
      sql: `
        SELECT s.id, s.user_id, s.workspace_id, s.expires_at, u.email, u.name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1 AND s.expires_at > NOW()
      `,
      params: [sessionId],
    },
  ];

  const explains = [];
  for (const target of explainTargets) {
    const explained = await pool.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${target.sql}`,
      target.params
    );
    explains.push({
      name: target.name,
      plan: explained.rows.map((row) => row['QUERY PLAN']),
    });
  }

  await pool.end();
  const payload = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    note: statsBefore && statsAfter
      ? 'pg_stat_statements was available; top query deltas are included.'
      : 'pg_stat_statements was not available in this local Postgres. Flow-level API timings and EXPLAIN ANALYZE plans are included instead.',
    flows: results,
    pgStatStatementsAvailable: Boolean(statsBefore && statsAfter),
    topStatements: statsAfter?.rows || [],
    explains,
  };

  await writeFile(outFile, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
