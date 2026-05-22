#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authMiddleware } from '../api/src/middleware/auth.js';
import { pool } from '../api/src/db/client.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), '..');
const outFile = resolve(repoRoot, process.env.AUDIT_AUTH_QUERY_OUT || 'docs/audit-evidence/auth-query-count-after.json');
const email = process.env.AUDIT_EMAIL || 'dev@ship.local';

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function classify(sql) {
  const normalized = normalizeSql(sql);

  if (normalized.includes('FROM sessions s') && normalized.includes('LEFT JOIN workspace_memberships')) {
    return 'auth.session_with_membership_lookup';
  }
  if (normalized === 'SELECT id FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2') {
    return 'auth.legacy_membership_fallback';
  }
  if (normalized === 'UPDATE sessions SET last_activity = $1 WHERE id = $2') {
    return 'auth.session_activity_update';
  }
  if (normalized.includes('SELECT id, email, name, is_super_admin FROM users')) {
    return 'auth.me_user_lookup';
  }
  if (normalized.includes('FROM workspaces w JOIN workspace_memberships wm')) {
    return 'auth.me_workspace_list';
  }
  if (normalized.includes('LEFT JOIN workspace_memberships wm') && normalized.includes('WHERE w.id = $1')) {
    return 'auth.me_legacy_current_workspace_lookup';
  }

  return 'route_or_other';
}

async function createAuditSession(originalQuery) {
  const userResult = await originalQuery.call(
    pool,
    'SELECT id, last_workspace_id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`Could not find audit user ${email}`);
  }

  const user = userResult.rows[0];
  const membershipResult = await originalQuery.call(
    pool,
    `SELECT workspace_id FROM workspace_memberships WHERE user_id = $1 ORDER BY created_at LIMIT 1`,
    [user.id]
  );
  const workspaceId = user.last_workspace_id || membershipResult.rows[0]?.workspace_id;

  if (!workspaceId) {
    throw new Error(`Audit user ${email} has no workspace`);
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  await originalQuery.call(
    pool,
    `INSERT INTO sessions (id, user_id, workspace_id, expires_at, last_activity, user_agent, ip_address)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW(), $4, $5)`,
    [sessionId, user.id, workspaceId, 'shipshape-auth-query-count', '127.0.0.1']
  );

  return sessionId;
}

function createMockResponse() {
  const response = {
    statusCode: 200,
    body: null,
    cookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
  };

  return response;
}

async function measureAuthMiddleware() {
  const originalQuery = pool.query;
  const sessionId = await createAuditSession(originalQuery);
  const queries = [];

  pool.query = async function countedQuery(sql, params, ...rest) {
    queries.push({
      sql: normalizeSql(sql),
      category: classify(sql),
      paramCount: Array.isArray(params) ? params.length : 0,
    });
    return originalQuery.call(this, sql, params, ...rest);
  };

  try {
    const req = {
      cookies: { session_id: sessionId },
      headers: {},
    };
    const res = createMockResponse();
    let nextCalled = false;

    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    return {
      flow: 'authMiddleware valid session',
      status: res.statusCode,
      ok: nextCalled && res.statusCode === 200,
      nextCalled,
      userIdAttached: Boolean(req.userId),
      workspaceIdAttached: Boolean(req.workspaceId),
      queryCount: queries.length,
      categoryCounts: queries.reduce((acc, query) => {
        acc[query.category] = (acc[query.category] || 0) + 1;
        return acc;
      }, {}),
      queries,
    };
  } finally {
    pool.query = originalQuery;
    await originalQuery.call(pool, 'DELETE FROM sessions WHERE id = $1', [sessionId]).catch(() => {});
  }
}

async function main() {
  const result = await measureAuthMiddleware();
  const beforeQueryCount = 3;
  const afterQueryCount = result.queryCount;

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'Direct authMiddleware invocation with pool.query instrumentation after auth/session middleware optimization',
    baselineSource: 'Pre-fix authMiddleware issued three queries for a valid non-admin session: session lookup, workspace membership validation, and session activity update.',
    targetFlow: 'authenticated request session validation',
    beforeQueryCount,
    afterQueryCount,
    reduction: {
      queriesRemoved: beforeQueryCount - afterQueryCount,
      percent: Number((((beforeQueryCount - afterQueryCount) / beforeQueryCount) * 100).toFixed(2)),
    },
    result,
  };

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${outFile}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
