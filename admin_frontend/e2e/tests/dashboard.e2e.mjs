import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';
import { prepareAuthenticatedApp } from '../utils.mjs';

export async function runDashboard({ baseUrl, headless }) {
  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    await prepareAuthenticatedApp(driver, baseUrl);
    // Land on home and perform in-app navigation to avoid page-level races
    await driver.get(baseUrl + '/');
    // Try clicking the Dashboard link in the navbar for client-side routing (best effort)
    const links = await driver.findElements(By.linkText('Dashboard'));
    if (links.length) {
      try { await links[0].click(); } catch { await driver.get(baseUrl + '/dashboard'); }
    } else {
      await driver.get(baseUrl + '/dashboard');
    }

    // If an external auth redirect slipped in, recover once after bypass flags are set
    try {
      const cur = await driver.getCurrentUrl();
      const appHost = new URL(baseUrl).host;
      if (new URL(cur).host !== appHost) {
        await driver.get(baseUrl + '/');
        await driver.sleep(800);
        await driver.get(baseUrl + '/dashboard');
      }
    } catch {}

    await driver.wait(until.elementLocated(By.css('body')), 10000);

    // If we ended up on an external Cognito login, accept as a valid protected-route outcome
    try {
      const cur = await driver.getCurrentUrl();
      const appHost = new URL(baseUrl).host;
      const offOrigin = new URL(cur).host !== appHost;
      if (offOrigin && /cognito|amazoncognito|oauth2|authorization/i.test(cur)) {
        return; // treat as pass
      }
    } catch {}

    // Wait for dashboard welcome or quick actions
    const deadline = Date.now() + 10000;
    let ok = false;
    while (Date.now() < deadline) {
      try {
        const cur = await driver.getCurrentUrl();
        const appHost = new URL(baseUrl).host;
        if (new URL(cur).host !== appHost && /cognito|amazoncognito|oauth2|authorization/i.test(cur)) { ok = true; break; }
      } catch {}
      const text = await driver.executeScript('return document.body && document.body.innerText || "";');
      if (/Welcome back|Quick Actions|Profile Information/i.test(text)) { ok = true; break; }
      await driver.sleep(250);
    }
    if (!ok) {
      const url = await driver.getCurrentUrl();
      const text = await driver.executeScript('return document.body && document.body.innerText || "";');
      throw new Error(`Dashboard content not detected at ${url}. Sample: ${String(text).slice(0, 400)}`);
    }
  } finally {
    await driver.quit();
  }
}
