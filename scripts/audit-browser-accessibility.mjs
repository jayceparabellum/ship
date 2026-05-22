#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const requireFromRoot = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = requireFromRoot('@playwright/test');
const AxeBuilder = requireFromRoot('@axe-core/playwright').default;

const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';
const outDir = process.env.AUDIT_BROWSER_DIR || '.audit/browser';
const email = process.env.AUDIT_EMAIL || 'dev@ship.local';
const password = process.env.AUDIT_PASSWORD || 'admin123';

const pages = [
  { name: 'my week', path: '/my-week' },
  { name: 'docs', path: '/docs' },
  { name: 'issues', path: '/issues' },
  { name: 'team allocation', path: '/team/allocation' },
  { name: 'dashboard', path: '/dashboard' },
];

async function login(page) {
  await page.goto(`${webBaseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(my-week|docs|dashboard|issues|team)/, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function waitForOfflineShell(page) {
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { ready: false };
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        setTimeout(resolve, 3000);
      });
    }
    return { ready: Boolean(navigator.serviceWorker.controller) };
  }).catch(() => ({ ready: false }));
}

function summarizeViolations(scan) {
  return scan.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.length,
    targets: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
  }));
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleMessages = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
        location: message.location(),
      });
    }
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'unknown',
    });
  });

  await login(page);

  const scans = [];
  for (const target of pages) {
    await page.goto(`${webBaseUrl}${target.path}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${outDir}/${target.name.replaceAll(' ', '-')}.png`, fullPage: true });
    const axe = await new AxeBuilder({ page }).analyze();
    scans.push({
      ...target,
      violationCount: axe.violations.length,
      violations: summarizeViolations(axe),
    });
  }

  await page.goto(`${webBaseUrl}/docs`, { waitUntil: 'networkidle' });
  await waitForOfflineShell(page);
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await waitForOfflineShell(page);
  const beforeOfflineUrl = page.url();
  await context.setOffline(true);
  const offlineStarted = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);
  const offlineCapture = {
    page: beforeOfflineUrl,
    durationMs: Date.now() - offlineStarted,
    urlAfterReload: page.url(),
    visibleTextSample: (await page.locator('body').innerText().catch(() => '')).slice(0, 500),
    offlineBannerVisible: await page.getByText('Offline mode:', { exact: false }).isVisible().catch(() => false),
    consoleMessagesDuringRun: consoleMessages.length,
    failedRequestsDuringRun: failedRequests.length,
  };
  await context.setOffline(false);

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 400 * 1024 / 8,
    uploadThroughput: 400 * 1024 / 8,
  });
  const slowStarted = Date.now();
  await page.goto(`${webBaseUrl}/issues`, { waitUntil: 'networkidle' }).catch(() => {});
  const slow3gCapture = {
    path: '/issues',
    durationMs: Date.now() - slowStarted,
    visibleTextSample: (await page.locator('body').innerText().catch(() => '')).slice(0, 500),
  };
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    pages,
    consoleMessages,
    failedRequests,
    offlineCapture,
    slow3gCapture,
    axeScans: scans,
  };

  await writeFile(`${outDir}/browser-accessibility.json`, JSON.stringify(payload, null, 2));
  await browser.close();
  console.log(`Wrote ${outDir}/browser-accessibility.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
