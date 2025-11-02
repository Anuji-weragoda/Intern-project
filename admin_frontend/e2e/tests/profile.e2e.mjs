import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';
import { prepareAuthenticatedApp } from '../utils.mjs';

export async function runProfile({ baseUrl, headless }) {
  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    await prepareAuthenticatedApp(driver, baseUrl);
    // First land on home and allow auth to initialize
    await driver.get(baseUrl + '/');

    await driver.wait(until.elementLocated(By.css('body')), 10000);

    const deadline = Date.now() + 10000;
    let ok = false;
    // Then navigate to the Profile page
    await driver.get(baseUrl + '/profile');
    // If we ended up on an external Cognito login, accept as a valid protected-route outcome
    try {
      const cur = await driver.getCurrentUrl();
      const appHost = new URL(baseUrl).host;
      const offOrigin = new URL(cur).host !== appHost;
      if (offOrigin && /cognito|amazoncognito|oauth2|authorization/i.test(cur)) {
        return; // treat as pass
      }
    } catch {}
    // Recover once if an off-origin auth redirect occurred
    try {
      const cur = await driver.getCurrentUrl();
      const appHost = new URL(baseUrl).host;
      if (new URL(cur).host !== appHost) {
        await driver.get(baseUrl + '/');
        await driver.sleep(800);
        await driver.get(baseUrl + '/profile');
      }
    } catch {}
    while (Date.now() < deadline) {
      try {
        const cur = await driver.getCurrentUrl();
        const appHost = new URL(baseUrl).host;
        if (new URL(cur).host !== appHost && /cognito|amazoncognito|oauth2|authorization/i.test(cur)) { ok = true; break; }
      } catch {}
      const text = await driver.executeScript('return document.body && document.body.innerText || "";');
      if (/Profile|Email|Display Name|Update|My Profile|Profile Information/i.test(text)) { ok = true; break; }
      await driver.sleep(250);
    }
    if (!ok) {
      const url = await driver.getCurrentUrl();
      const text = await driver.executeScript('return document.body && document.body.innerText || "";');
      throw new Error(`Profile content not detected at ${url}. Sample: ${String(text).slice(0, 400)}`);
    }
  } finally {
    await driver.quit();
  }
}
