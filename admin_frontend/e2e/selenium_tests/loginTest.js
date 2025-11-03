import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Simple Selenium login test using Chrome.
// Run with: node loginTest.js
// Environment:
//  BASE_URL (default http://localhost:5180)
//  LOGIN_EMAIL, LOGIN_PASSWORD
//  HEADLESS=true to run headless

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const EMAIL = process.env.LOGIN_EMAIL || '';
const PASSWORD = process.env.LOGIN_PASSWORD || '';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';

async function main() {
  // Build Chrome driver
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // prepare screenshots dir
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir, 'screenshots');
  try { fs.mkdirSync(shotsDir, { recursive: true }); } catch (e) {}

  async function saveShot(name) {
    try {
      const b = await driver.takeScreenshot();
      const file = path.join(shotsDir, `${name}-${Date.now()}.png`);
      fs.writeFileSync(file, b, 'base64');
      console.log('[loginTest] saved screenshot', file);
    } catch (e) {
      console.log('[loginTest] screenshot failed', e && e.message);
    }
  }

  try {
    console.log('[loginTest] Opening app at', BASE_URL);
    await driver.get(BASE_URL + '/');

    // Wait for page body
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    await saveShot('before-click');

    // Attempt to click an in-app sign in link/button. We try several heuristics.
    const signSelectors = [
      "button:contains('Sign in')",
      "button[aria-label*='sign']",
      "a[href*='login']",
      "a[href*='signin']",
      "[data-test*='login']",
      "[data-testid*='login']",
      "button.login",
      "a.login"
    ];

    // Helper to attempt clicks by CSS or XPath (for text matching)
    async function tryClickByXPathText(text) {
      try {
        const xpath = `//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`;
        const el = await driver.findElements(By.xpath(xpath));
        if (el.length) { await el[0].click(); return true; }
      } catch (e) {}
      return false;
    }

    // Try text-based clicks first
    const textButtons = ['Sign in', 'Sign In', 'Log in', 'Login', 'Sign in with'];
    let clicked = false;
    for (const t of textButtons) {
      const ok = await tryClickByXPathText(t);
      if (ok) { console.log('[loginTest] Clicked button with text', t); clicked = true; break; }
    }
    if (clicked) {
      await saveShot('after-click');
      console.log('[loginTest] current URL after click:', await driver.getCurrentUrl());
    }

    // If EMAIL/PASSWORD provided, attempt to fill login form. We wait for common selectors.
    if (!EMAIL || !PASSWORD) {
      console.log('[loginTest] No EMAIL/PASSWORD env vars provided — skipping form fill.');
      return;
    }

    // Wait for possible email input on page (hosted IdP or in-app form)
    const emailSelectors = ["input[type=email]", "input[name=email]", "input[id=email]", "input[autocomplete=email]", "input[name=username]"];
    let emailEl = null;
    for (const s of emailSelectors) {
      const els = await driver.findElements(By.css(s)).catch(() => []);
      if (els.length) { emailEl = els[0]; break; }
    }

    // If email input not found, try to navigate to /login
    if (!emailEl) {
      console.log('[loginTest] Email input not found on page, navigating to /login');
      await driver.get(BASE_URL + '/login');
      await driver.sleep(800);
      await saveShot('navigated-to-login');
      for (const s of emailSelectors) {
        const els = await driver.findElements(By.css(s)).catch(() => []);
        if (els.length) { emailEl = els[0]; break; }
      }
    }

    if (!emailEl) throw new Error('Email input not found on login page');

    // Fill email and click Next (for Cognito flow)
    console.log('[loginTest] Filling email and clicking Next');
    await emailEl.clear();
    await emailEl.sendKeys(EMAIL);

    // Find submit button (Next)
    const submitSelectors = ["button[type=submit]", "button:contains('Next')"];
    let submitEl = null;
    for (const s of submitSelectors) {
      const els = await driver.findElements(By.css(s)).catch(() => []);
      if (els.length) { submitEl = els[0]; break; }
    }
    if (!submitEl) {
      // Try XPath for text
      const xpath = `//button[contains(normalize-space(string(.)), "Next")]`;
      const els = await driver.findElements(By.xpath(xpath));
      if (els.length) submitEl = els[0];
    }
    if (!submitEl) throw new Error('Submit button not found on login page');

    await submitEl.click();
    await saveShot('after-email-submit');

    // Wait for password input to appear (after Next)
    await driver.wait(async () => {
      const els = await driver.findElements(By.css("input[type=password]")).catch(() => []);
      return els.length > 0;
    }, 10000);

    // Now find password
    const passSelectors = ["input[type=password]", "input[name=password]", "input[id=password]", "input[autocomplete=current-password]"];
    let passEl = null;
    for (const s of passSelectors) {
      const els = await driver.findElements(By.css(s)).catch(() => []);
      if (els.length) { passEl = els[0]; break; }
    }
    if (!passEl) throw new Error('Password input not found after Next');

    // Fill and submit
    console.log('[loginTest] Filling password and submitting');
    await passEl.clear();
    await passEl.sendKeys(PASSWORD, Key.RETURN);
    await saveShot('after-password-submit');

    // Wait for redirects to complete (follow IdP -> app). Some deployments
    // redirect through an external IdP (amazoncognito) back to a local port
    // (e.g. :8081). First wait for the URL to leave the IdP domain, then
    // wait for an authenticated UI (dashboard/profile or sign-out present).

    // Wait up to 20s for the browser to leave the IdP (if present).
    try {
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        // return true when URL is no longer the Cognito hosted domain
        return !/amazoncognito\.com/.test(url);
      }, 20000);
    } catch (e) {
      // timed out waiting for redirect — continue and attempt to detect auth UI
      console.log('[loginTest] timeout waiting for IdP redirect; continuing to check for authenticated UI');
    }
    // If redirected back with a JWT in the URL (some setups use a dev server
    // origin like :5173 or :8081 and append ?jwt=...), navigate explicitly to
    // the dashboard on that origin so the client app can process the token and
    // render the authenticated UI.
    try {
      const current = await driver.getCurrentUrl();
      const m = current.match(/[?&]jwt=[^&]+/i);
      if (m) {
        try {
          const u = new URL(current);
          const origin = u.origin;
          const dash = origin + '/dashboard';
          console.log('[loginTest] Detected jwt in redirect URL — navigating to', dash);
          await driver.get(dash);
          await driver.sleep(800);
          await saveShot('after-redirect-with-jwt');
        } catch (e) {
          console.log('[loginTest] Failed to navigate to dashboard on redirect origin', e && e.message);
        }
      }
    } catch (e) {
      // ignore
    }

    // Now wait up to 30s for an authenticated UI to appear (dashboard/profile/sign out text)
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      const text = await driver.executeScript('return document.body && document.body.innerText || ""');
      console.log('[loginTest] checking page after login, url=', url);
      return /Dashboard|Profile|Sign out|Logout|Welcome/i.test(text) || /\/dashboard|\/profile/.test(url);
    }, 30000);

    // Give the SPA a short moment to stabilise, then capture final screenshot.
    try {
      await driver.sleep(1500);
      await saveShot('after-submit');
    } catch (e) {
      console.log('[loginTest] final screenshot failed', e && e.message);
    }
    console.log('[loginTest] Login appears successful — authenticated UI detected');
  } catch (err) {
    try {
      await saveShot('error');
      const pageSource = await driver.getPageSource();
      fs.writeFileSync(path.join(shotsDir, 'error-page.html'), pageSource);
      console.log('[loginTest] current URL on error:', await driver.getCurrentUrl());
    } catch (e) {}
    throw err;
  } finally {
    // On debug runs you may want to keep the browser open for manual inspection.
    if (KEEP_OPEN) {
      console.log('[loginTest] KEEP_BROWSER_OPEN=true — leaving browser open for inspection (test process will exit without closing the browser)');
      // Do not quit the driver so the browser window remains. Return to let the
      // Node process exit; some OSes may keep the window but the webdriver
      // session might be orphaned — this is intended for local debugging only.
      return;
    }

    // Always clean up the browser in non-debug runs
    console.log('[loginTest] Quitting driver');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { console.error('[loginTest] Error:', err && err.stack || err); process.exit(1); });
