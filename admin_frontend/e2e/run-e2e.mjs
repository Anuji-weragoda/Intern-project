import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import http from 'node:http';
import process from 'node:process';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const ROOT = path.resolve(process.cwd());
const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS !== 'false';

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          res.resume(); // drain
          resolve(res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
      });
      if (ok) return true;
    } catch {}
    await delay(500);
  }
  return false;
}

async function run() {
  const portFromBase = (() => { try { return Number(new URL(BASE_URL).port) || 5173; } catch { return 5173; } })();

  // If something is already running on BASE_URL, fail fast to avoid testing the wrong app
  const alreadyUp = await waitForServer(BASE_URL, 1500);
  if (alreadyUp) {
    throw new Error(`Port ${portFromBase} is already in use at ${BASE_URL}.\n` +
      `Close the process using this port or set BASE_URL to a free URL (e.g., http://localhost:5174) before running.\n` +
      `PowerShell tip: Get-NetTCPConnection -LocalPort ${portFromBase} | ForEach-Object { Get-Process -Id $_.OwningProcess }`);
  }

  console.log(`Starting Vite preview at ${BASE_URL} ...`);
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(portFromBase), '--strictPort'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });

  const up = await waitForServer(BASE_URL);
  if (!up) {
    server.kill('SIGTERM');
    throw new Error('Preview server did not become ready in 60s');
  }

  // Load tests
  const { runHome } = await import('./tests/home.e2e.mjs');
  const { runUnauthorized } = await import('./tests/unauthorized.e2e.mjs');
  const { runPrivateRoutes } = await import('./tests/privateRoutes.e2e.mjs');
  const { runDashboard } = await import('./tests/dashboard.e2e.mjs');
  const { runProfile } = await import('./tests/profile.e2e.mjs');
  const { runAuditLog } = await import('./tests/auditLog.e2e.mjs');
  const { runUserManagement } = await import('./tests/userManagement.e2e.mjs');
  const { runSignInFlow } = await import('./tests/signin.flow.e2e.mjs');
  let runSignupExample = null;
  let runSignupTotpExample = null;
  try { ({ runSignupExample } = await import('./tests/signup.example.e2e.mjs')); } catch {}
  try { ({ runSignupTotpExample } = await import('./tests/signup.totp.example.e2e.mjs')); } catch {}

  const results = [];
  let failures = 0;

  // Small helper to run and record a test (with timestamps)
  async function runAndRecord(name, fn) {
    const start = Date.now();
    try {
      await fn();
      const stop = Date.now();
      const duration = (stop - start) / 1000;
      results.push({ name, status: 'passed', duration, start, stop });
    } catch (e) {
      const stop = Date.now();
      const duration = (stop - start) / 1000;
      results.push({ name, status: 'failed', duration, start, stop, errorMessage: e?.message || String(e), errorStack: e?.stack || '' });
      console.error(e);
      failures++;
    }
  }

  // Run tests sequentially
  await runAndRecord('Home', async () => runHome({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('Unauthorized', async () => runUnauthorized({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('PrivateRoutes', async () => runPrivateRoutes({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('Dashboard', async () => runDashboard({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('Profile', async () => runProfile({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('AuditLog', async () => runAuditLog({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('UserManagement', async () => runUserManagement({ baseUrl: BASE_URL, headless: HEADLESS }));
  await runAndRecord('SignInFlow', async () => runSignInFlow({ baseUrl: BASE_URL, headless: HEADLESS }));

  // Optional examples
  if (runSignupExample && process.env.SIGNUP_URL && process.env.MAILHOG_URL && process.env.SIGNUP_EMAIL && process.env.SIGNUP_PASSWORD) {
    await runAndRecord('SignupExample', async () => runSignupExample({ headless: HEADLESS }));
  } else {
    results.push({ name: 'SignupExample', status: 'skipped', duration: 0, errorMessage: 'Missing env vars (SIGNUP_URL, SIGNUP_EMAIL, SIGNUP_PASSWORD, MAILHOG_URL)' });
  }

  if (runSignupTotpExample && process.env.SIGNUP_URL && process.env.SIGNUP_EMAIL && process.env.SIGNUP_PASSWORD && process.env.TOTP_SECRET) {
    await runAndRecord('SignupTotpExample', async () => runSignupTotpExample({ headless: HEADLESS }));
  } else {
    results.push({ name: 'SignupTotpExample', status: 'skipped', duration: 0, errorMessage: 'Missing env vars (SIGNUP_URL, SIGNUP_EMAIL, SIGNUP_PASSWORD, TOTP_SECRET)' });
  }

  // Shutdown preview
  server.kill('SIGTERM');

  // Write reports (JSON, HTML, JUnit XML, Allure results)
  await writeReports(results);

  if (failures > 0) {
    console.error(`E2E tests completed with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('E2E tests passed.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function writeReports(results) {
  const reportsDir = path.join(ROOT, 'e2e', 'reports');
  await mkdir(reportsDir, { recursive: true });

  // JSON report
  const jsonPath = path.join(reportsDir, 'e2e-report.json');
  await writeFile(jsonPath, JSON.stringify({
    suite: 'admin-frontend-e2e',
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
  }, null, 2), 'utf8');

  // Simple HTML report
  const htmlPath = path.join(reportsDir, 'index.html');
  const rows = results.map(r => `
    <tr class="${r.status}">
      <td>${escapeHtml(r.name)}</td>
      <td>${r.status}</td>
      <td>${(r.duration || 0).toFixed(2)}s</td>
      <td>${r.errorMessage ? escapeHtml(r.errorMessage) : ''}</td>
    </tr>`).join('\n');
  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>E2E Report - admin-frontend</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; margin: 24px; }
      h1 { margin-bottom: 8px; }
      .meta { color: #555; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f6f6f6; text-align: left; }
      tr.passed { background: #f0fff4; }
      tr.failed { background: #fff5f5; }
      .summary { margin: 12px 0; }
      code { background: #f6f8fa; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>admin-frontend E2E Report</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()} • Base URL: <code>${escapeHtml(BASE_URL)}</code></div>
    <div class="summary">Total: <b>${results.length}</b> • Passed: <b>${results.filter(r=>r.status==='passed').length}</b> • Failed: <b>${results.filter(r=>r.status==='failed').length}</b></div>
    <table>
      <thead>
        <tr><th>Test</th><th>Status</th><th>Duration</th><th>Error</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
  </html>`;
  await writeFile(htmlPath, html, 'utf8');

  // JUnit XML report
  const junitPath = path.join(reportsDir, 'junit.xml');
  const tests = results.length;
  const failures = results.filter(r => r.status === 'failed').length;
  const time = results.reduce((acc, r) => acc + (r.duration || 0), 0).toFixed(2);
  const testcases = results.map(r => {
    const tc = `    <testcase name="${xmlEscape(r.name)}" time="${(r.duration || 0).toFixed(2)}">` + (r.status === 'failed'
      ? `\n      <failure message="${xmlEscape(r.errorMessage || 'Error')}">${xmlEscape(r.errorStack || r.errorMessage || '')}</failure>\n    `
      : '') + `</testcase>`;
    return tc;
  }).join('\n');
  const junit = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="admin-frontend-e2e" tests="${tests}" failures="${failures}" time="${time}">\n${testcases}\n</testsuite>\n`;
  await writeFile(junitPath, junit, 'utf8');

  // Allure results (write minimal test result files compatible with Allure)
  try {
    const allureDir = path.join(reportsDir, 'allure-results');
    await mkdir(allureDir, { recursive: true });
    const executor = {
      name: 'admin-frontend-e2e',
      type: 'node',
      buildName: `run-${Date.now()}`,
      url: BASE_URL,
    };
    await writeFile(path.join(allureDir, 'executor.json'), JSON.stringify(executor, null, 2), 'utf8');
    for (const r of results) {
      const uuid = `${r.name}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      const statusMap = { passed: 'passed', failed: 'failed', skipped: 'skipped' };
      const testResult = {
        uuid,
        name: r.name,
        status: statusMap[r.status] || 'unknown',
        stage: 'finished',
        start: (r.start ? r.start : Date.now() - Math.floor((r.duration || 0) * 1000)),
        stop: (r.stop ? r.stop : Date.now()),
        steps: [],
        attachments: [],
        parameters: [],
        labels: [
          { name: 'suite', value: 'admin-frontend-e2e' },
          { name: 'framework', value: 'selenium-webdriver' },
          { name: 'language', value: 'javascript' }
        ],
        statusDetails: r.status === 'failed' ? {
          message: r.errorMessage || 'Error',
          trace: r.errorStack || r.errorMessage || ''
        } : undefined
      };
      await writeFile(path.join(allureDir, `${uuid}-result.json`), JSON.stringify(testResult, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('Allure result writing failed (non-fatal):', err?.message || String(err));
  }

  console.log(`E2E reports written to ${reportsDir}`);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
  function xmlEscape(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
  }
}
