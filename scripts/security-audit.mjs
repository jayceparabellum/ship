#!/usr/bin/env node
import { exec, execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const root = process.cwd();
const outDir = process.env.SECURITY_AUDIT_OUT_DIR || 'docs/security-tool';
const jsonOut = path.join(outDir, 'latest-security-report.json');
const markdownOut = path.join(outDir, 'latest-security-report.md');

const ignoredDirs = new Set([
  '.git',
  '.audit',
  '.cache',
  '.terraform',
  '.tools',
  'dist',
  'build',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const scanExtensions = new Set([
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ps1',
  '.sh',
  '.tf',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

function normalize(file) {
  return file.replaceAll(path.sep, '/');
}

function relative(file) {
  return normalize(path.relative(root, file));
}

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else {
      const ext = path.extname(entry.name);
      if (scanExtensions.has(ext) || entry.name.startsWith('.env')) files.push(full);
    }
  }
  return files;
}

function lineMatches(text, patterns) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        matches.push({
          file: pattern.file,
          line: index + 1,
          rule: pattern.id,
          text: line.trim().slice(0, 180),
        });
      }
    }
  }
  return matches;
}

function addCheck(checks, check) {
  checks.push({
    severity: check.severity,
    category: check.category,
    id: check.id,
    title: check.title,
    passed: check.passed,
    evidence: check.evidence || [],
    remediation: check.remediation || '',
  });
}

function has(text, pattern) {
  return pattern.test(text);
}

async function readIfExists(file) {
  try {
    return await readFile(path.join(root, file), 'utf8');
  } catch {
    return '';
  }
}

async function maybeRunPnpmAudit() {
  if (process.env.SECURITY_AUDIT_SKIP_DEPENDENCY_AUDIT === '1') {
    return { skipped: true, reason: 'SECURITY_AUDIT_SKIP_DEPENDENCY_AUDIT=1' };
  }

  try {
    const { stdout } = await execAsync('corepack pnpm audit --json', {
      cwd: root,
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 8,
    });
    return { skipped: false, exitCode: 0, raw: JSON.parse(stdout || '{}') };
  } catch (error) {
    const stdout = error.stdout?.toString() || '';
    return {
      skipped: false,
      exitCode: error.code ?? 1,
      error: stdout ? undefined : error.message,
      raw: stdout ? JSON.parse(stdout) : undefined,
    };
  }
}

function summarizeAudit(audit) {
  const advisories = audit?.raw?.advisories;
  if (advisories && typeof advisories === 'object') {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
    for (const advisory of Object.values(advisories)) {
      const severity = advisory.severity || 'info';
      counts[severity] = (counts[severity] || 0) + 1;
    }
    return counts;
  }

  const metadata = audit?.raw?.metadata?.vulnerabilities;
  if (metadata && typeof metadata === 'object') return metadata;

  return null;
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[severity] ?? 0;
}

function toMarkdown(payload) {
  const failing = payload.checks
    .filter((check) => !check.passed)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.id.localeCompare(b.id));

  const summaryRows = Object.entries(payload.summary)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n');

  const findingSections = failing.length
    ? failing.map((check) => {
        const evidence = check.evidence.length
          ? check.evidence.map((item) => {
              if (typeof item === 'string') return `- ${item}`;
              return `- \`${item.file}:${item.line ?? 1}\` ${item.text ? `- ${item.text}` : ''}`;
            }).join('\n')
          : '- No file-level evidence recorded.';

        return `### ${check.severity.toUpperCase()} - ${check.title}

Category: ${check.category}

Rule: \`${check.id}\`

Evidence:

${evidence}

Remediation: ${check.remediation || 'Review and document the accepted risk or apply a targeted fix.'}`;
      }).join('\n\n')
    : 'No failing checks.';

  return `# ShipShape Security Tool Report

Generated: ${payload.generatedAt}

Branch: \`${payload.git.branch}\`

Commit: \`${payload.git.commit}\`

## Summary

| Metric | Count |
| --- | ---: |
${summaryRows}

## Findings

${findingSections}
`;
}

async function main() {
  const files = await walk(root);
  const checks = [];
  const fileTexts = new Map();

  for (const file of files) {
    const fileStat = await stat(file);
    if (fileStat.size > 1024 * 1024) continue;
    fileTexts.set(relative(file), await readFile(file, 'utf8'));
  }

  const appTs = await readIfExists('api/src/app.ts');
  const rootPackageJson = JSON.parse(await readIfExists('package.json'));
  const apiPackageJson = JSON.parse(await readIfExists('api/package.json'));
  const packageText = JSON.stringify({ rootPackageJson, apiPackageJson });

  const secretPatterns = [
    { id: 'gitlab-pat', regex: /glpat-[A-Za-z0-9_.-]{20,}/ },
    { id: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/ },
    { id: 'private-key', regex: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ },
    { id: 'generic-secret-assignment', regex: /\b(?:password|passwd|secret|api[_-]?key|token)\b\s*[:=]\s*['"][^'"]{12,}['"]/i },
  ];
  const secretMatches = [];
  for (const [file, text] of fileTexts) {
    if (/^docs\/audit-evidence\//.test(file)) continue;
    if (/^docs\/security-tool\/latest-security-report\./.test(file)) continue;
    if (/pnpm-lock\.yaml$/.test(file)) continue;
    const matches = lineMatches(text, secretPatterns.map((pattern) => ({ ...pattern, file })))
      .filter((match) => {
        if (match.rule === 'generic-secret-assignment' && /\.(test|spec)\.[cm]?[tj]sx?$/.test(file)) return false;
        if (match.rule === 'private-key' && /^docs\//.test(file) && match.text.includes('...')) return false;
        if (match.rule === 'generic-secret-assignment' && match.text.includes('aws ssm get-parameter')) return false;
        return true;
      });
    secretMatches.push(...matches);
  }
  addCheck(checks, {
    id: 'secrets.no-hardcoded-secrets',
    category: 'secrets',
    severity: 'critical',
    title: 'No hardcoded secrets or private keys',
    passed: secretMatches.length === 0,
    evidence: secretMatches.slice(0, 20),
    remediation: 'Move secrets to SSM/CI variables, rotate exposed credentials, and remove committed values from history when needed.',
  });

  addCheck(checks, {
    id: 'express.helmet-enabled',
    category: 'api-hardening',
    severity: 'high',
    title: 'Helmet security headers are enabled',
    passed: has(packageText, /"helmet"/) && has(appTs, /app\.use\(helmet\(/),
    evidence: ['api/src/app.ts uses helmet middleware'],
    remediation: 'Install and apply helmet before API routes.',
  });

  addCheck(checks, {
    id: 'express.csrf-enabled',
    category: 'api-hardening',
    severity: 'high',
    title: 'Session-authenticated routes use CSRF protection',
    passed: has(packageText, /"csrf-sync"/) && has(appTs, /conditionalCsrf/) && has(appTs, /csrfSynchronisedProtection/),
    evidence: ['api/src/app.ts defines conditionalCsrf and applies it to state-changing route groups'],
    remediation: 'Apply CSRF protection to cookie-authenticated state-changing routes.',
  });

  addCheck(checks, {
    id: 'express.rate-limit-enabled',
    category: 'api-hardening',
    severity: 'medium',
    title: 'Login and API rate limiting are enabled',
    passed: has(packageText, /"express-rate-limit"/) && has(appTs, /loginLimiter/) && has(appTs, /apiLimiter/),
    evidence: ['api/src/app.ts defines loginLimiter and apiLimiter'],
    remediation: 'Add brute-force protection on login and a general API request limiter.',
  });

  addCheck(checks, {
    id: 'session.cookie-flags',
    category: 'session',
    severity: 'high',
    title: 'Session cookies use httpOnly, secure-in-production, and sameSite',
    passed: has(appTs, /httpOnly:\s*true/) && has(appTs, /secure:\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]/) && has(appTs, /sameSite:\s*['"]strict['"]/),
    evidence: ['api/src/app.ts session cookie includes httpOnly, secure, and sameSite'],
    remediation: 'Set httpOnly, secure in production, and strict or lax sameSite on session cookies.',
  });

  addCheck(checks, {
    id: 'session.production-secret-required',
    category: 'session',
    severity: 'high',
    title: 'SESSION_SECRET is required in production',
    passed: has(appTs, /NODE_ENV\s*===\s*['"]production['"][\s\S]{0,120}!process\.env\.SESSION_SECRET/),
    evidence: ['api/src/app.ts throws when SESSION_SECRET is absent in production'],
    remediation: 'Fail startup in production when SESSION_SECRET is missing.',
  });

  const cspUnsafeInline = lineMatches(appTs, [
    { file: 'api/src/app.ts', id: 'csp-unsafe-inline', regex: /unsafe-inline/ },
  ]);
  addCheck(checks, {
    id: 'csp.no-unsafe-inline',
    category: 'browser-hardening',
    severity: 'medium',
    title: 'CSP avoids unsafe-inline',
    passed: cspUnsafeInline.length === 0,
    evidence: cspUnsafeInline,
    remediation: 'Replace inline scripts/styles with nonce or hashed CSP entries where practical.',
  });

  const xssPatterns = [
    { id: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/ },
    { id: 'innerHTML-assignment', regex: /\.innerHTML\s*=/ },
    { id: 'eval', regex: /\beval\s*\(/ },
    { id: 'new-function', regex: /new Function\s*\(/ },
  ];
  const xssMatches = [];
  for (const [file, text] of fileTexts) {
    if (!/^(api|web)\/src\//.test(file)) continue;
    xssMatches.push(...lineMatches(text, xssPatterns.map((pattern) => ({ ...pattern, file }))));
  }
  addCheck(checks, {
    id: 'xss.no-unsafe-dom-sinks',
    category: 'browser-hardening',
    severity: 'high',
    title: 'No unsafe DOM injection sinks',
    passed: xssMatches.length === 0,
    evidence: xssMatches.slice(0, 30),
    remediation: 'Replace innerHTML/eval-style sinks with React rendering, DOM textContent, or a sanitizer with explicit allowlists.',
  });

  const authStorageMatches = [];
  for (const [file, text] of fileTexts) {
    if (!/^web\/src\//.test(file)) continue;
    const matches = lineMatches(text, [
      { file, id: 'auth-cache-localstorage', regex: /localStorage\.(?:setItem|getItem)\(['"][^'"]*(?:auth|token|session|user)[^'"]*/i },
    ]);
    authStorageMatches.push(...matches);
  }
  addCheck(checks, {
    id: 'browser.no-auth-cache-localstorage',
    category: 'browser-hardening',
    severity: 'medium',
    title: 'Authentication/session data is not cached in localStorage',
    passed: authStorageMatches.length === 0,
    evidence: authStorageMatches,
    remediation: 'Prefer httpOnly cookies for session state and avoid caching identity/session details in localStorage.',
  });

  const sslBypassMatches = [];
  for (const [file, text] of fileTexts) {
    if (!/^(api|web|scripts|terraform)\//.test(file)) continue;
    sslBypassMatches.push(...lineMatches(text, [
      { file, id: 'rejectUnauthorized-false', regex: /rejectUnauthorized:\s*false/ },
    ]));
  }
  addCheck(checks, {
    id: 'tls.no-reject-unauthorized-false',
    category: 'transport-security',
    severity: 'high',
    title: 'TLS verification is not disabled',
    passed: sslBypassMatches.length === 0,
    evidence: sslBypassMatches,
    remediation: 'Use trusted CA bundles or managed certificates instead of disabling TLS verification.',
  });

  const dockerFiles = Array.from(fileTexts.entries()).filter(([file]) => /^Dockerfile|^api\/Dockerfile|^web\/Dockerfile/.test(file));
  const dockerIssues = [];
  for (const [file, text] of dockerFiles) {
    if (/FROM\s+.*:latest\b/i.test(text)) dockerIssues.push({ file, line: 1, text: 'Uses latest tag' });
    if (!/^USER\s+\S+/im.test(text)) dockerIssues.push({ file, line: 1, text: 'No non-root USER directive found' });
  }
  addCheck(checks, {
    id: 'container.non-root-pinned-base',
    category: 'container',
    severity: 'medium',
    title: 'Dockerfiles avoid latest tags and declare a runtime user',
    passed: dockerIssues.length === 0,
    evidence: dockerIssues,
    remediation: 'Pin base image tags and run containers as a non-root user.',
  });

  const terraformText = Array.from(fileTexts.entries())
    .filter(([file]) => file.startsWith('terraform/') && file.endsWith('.tf'))
    .map(([, text]) => text)
    .join('\n');
  addCheck(checks, {
    id: 'terraform.encryption-signals',
    category: 'infrastructure',
    severity: 'medium',
    title: 'Terraform includes encryption-at-rest signals',
    passed: /storage_encrypted\s*=\s*true/.test(terraformText) && /server_side_encryption|sse_algorithm|kms_key/i.test(terraformText),
    evidence: ['Terraform should include Aurora storage encryption and S3/KMS encryption configuration'],
    remediation: 'Enable Aurora storage encryption and S3 server-side encryption with KMS where possible.',
  });

  const dependencyAudit = await maybeRunPnpmAudit();
  const vulnerabilitySummary = summarizeAudit(dependencyAudit);
  const highOrCritical = vulnerabilitySummary
    ? Number(vulnerabilitySummary.high || 0) + Number(vulnerabilitySummary.critical || 0)
    : null;
  addCheck(checks, {
    id: 'dependencies.no-high-critical-advisories',
    category: 'dependencies',
    severity: 'high',
    title: 'Dependency audit has no high or critical advisories',
    passed: highOrCritical === 0,
    evidence: dependencyAudit.skipped
      ? [dependencyAudit.reason]
      : vulnerabilitySummary
        ? [`pnpm audit vulnerability summary: ${JSON.stringify(vulnerabilitySummary)}`]
        : [dependencyAudit.error || 'pnpm audit did not return vulnerability metadata'],
    remediation: 'Run pnpm audit, upgrade affected packages, or document accepted risk with a patch plan.',
  });

  const failing = checks.filter((check) => !check.passed);
  const summary = {
    totalChecks: checks.length,
    passed: checks.length - failing.length,
    failed: failing.length,
    critical: failing.filter((check) => check.severity === 'critical').length,
    high: failing.filter((check) => check.severity === 'high').length,
    medium: failing.filter((check) => check.severity === 'medium').length,
    low: failing.filter((check) => check.severity === 'low').length,
  };

  const git = {
    branch: (await execFileAsync('git', ['branch', '--show-current'], { cwd: root })).stdout.trim(),
    commit: (await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root })).stdout.trim(),
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    tool: 'shipshape-security-audit',
    outDir: normalize(outDir),
    git,
    summary,
    dependencyAudit: {
      skipped: dependencyAudit.skipped,
      exitCode: dependencyAudit.exitCode,
      vulnerabilitySummary,
      error: dependencyAudit.error,
    },
    checks,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(markdownOut, toMarkdown(payload));

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${markdownOut}`);

  if (process.env.SECURITY_AUDIT_FAIL_ON_FINDINGS === '1' && failing.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
