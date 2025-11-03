import { buildDriver } from '../driver.mjs';
import { performInteractiveLogin } from '../utils.mjs';

export async function runSignInFlow({ baseUrl, headless }) {
  const driver = await buildDriver({ headless, preferred: process.env.PREFERRED_BROWSER });
  try {
    // Navigate to app root and attempt an interactive login using env-provided credentials
    await driver.get(baseUrl + '/');
    // Allow the page to settle
    await driver.sleep(600);

    await performInteractiveLogin(driver, baseUrl, { email: process.env.LOGIN_EMAIL, password: process.env.LOGIN_PASSWORD });

    // Wait for evidence of an authenticated page (Dashboard/Profile/Logout)
    const start = Date.now();
    const timeout = 15000;
    let ok = false;
    while (Date.now() - start < timeout) {
      try {
        const text = await driver.executeScript('return document.body && document.body.innerText || ""');
        if (/Dashboard|Profile|Sign out|Logout|My Profile|Welcome/i.test(text)) { ok = true; break; }
      } catch (e) {}
      await driver.sleep(300);
    }
    if (!ok) throw new Error('Sign-in flow did not reach an authenticated page (no Dashboard/Profile visible)');
  } finally {
    try { await driver.quit(); } catch (e) {}
  }
}
