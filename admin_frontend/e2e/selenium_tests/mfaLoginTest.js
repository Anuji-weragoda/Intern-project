import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { authenticator } from 'otplib';

// MFA Login E2E
// - Logs in with username + password
// - Waits for MFA input
// - Generates TOTP via otplib and submits
// - Verifies redirect to /dashboard
//
// Env variables:
//   LOGIN_EMAIL        - Cognito username/email
//   LOGIN_PASSWORD     - Cognito password
//   TOTP_SECRET        - Base32 TOTP secret for the user
//   BASE_URL           - App URL (default http://localhost:5180)
//   HEADLESS           - 'true' to run Chrome headless
//   KEEP_BROWSER_OPEN  - 'true' to leave browser running for debug

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';
const TOTP_SECRET = process.env.TOTP_SECRET || '';

async function waitForServer(baseUrl, timeoutMs = 30000, intervalMs = 1000) {
  let u;
  try { u = new URL(baseUrl); } catch (e) { throw new Error(`Invalid BASE_URL: ${baseUrl}`); }
  u.hash = '';
  const target = u.toString();

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise(resolve => {
      const req = http.get(target, res => { res.resume(); resolve((res.statusCode || 500) < 500); });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

async function main() {
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD || !TOTP_SECRET) {
    console.log('[mfaLoginTest] Missing env vars: ensure LOGIN_EMAIL, LOGIN_PASSWORD, and TOTP_SECRET are set.');
  }

  const serverReady = await waitForServer(BASE_URL, 60000);
  if (!serverReady) throw new Error(`[mfaLoginTest] Server not reachable at ${BASE_URL}`);

  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  // Reduce GPU-related noise on some Windows hosts
  options.addArguments('--disable-gpu');
  options.addArguments('--disable-software-rasterizer');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // screenshots dir
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir, 'screenshots');
  try { fs.mkdirSync(shotsDir, { recursive: true }); } catch {}
  const saveShot = async (name) => {
    try {
      const b = await driver.takeScreenshot();
      const file = path.join(shotsDir, `${name}-${Date.now()}.png`);
      fs.writeFileSync(file, b, 'base64');
      console.log('[mfaLoginTest] saved screenshot', file);
    } catch (e) {
      console.log('[mfaLoginTest] screenshot failed', e && e.message);
    }
  };

  try {
    console.log('[mfaLoginTest] Navigating to app root:', BASE_URL);
    await driver.get(BASE_URL + '/');
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    await saveShot('home');

    // Click a sign-in button or link
    async function tryClickByXPathText(text) {
      try {
        const xpath = `//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`;
        const els = await driver.findElements(By.xpath(xpath));
        if (els.length) { await els[0].click(); return true; }
      } catch {}
      return false;
    }

    const signInLabels = ['Sign in', 'Sign In', 'Log in', 'Login', 'Sign in with'];
    let clicked = false;
    for (const label of signInLabels) {
      if (await tryClickByXPathText(label)) { console.log('[mfaLoginTest] Clicked sign-in:', label); clicked = true; break; }
    }
    if (!clicked) {
      // try direct /login
      console.log('[mfaLoginTest] No visible sign-in control, navigating to /login');
      await driver.get(BASE_URL + '/login');
    }

    await driver.sleep(800);
    await saveShot('login-start');

    // Email / username input
    const emailSelectors = [
      "input[type=email]",
      "input[name=email]",
      "input[id=email]",
      "input[autocomplete=email]",
      "input[name=username]",
      "input#username"
    ];
    let emailEl = null;
    for (const sel of emailSelectors) {
      const els = await driver.findElements(By.css(sel)).catch(() => []);
      if (els.length) { emailEl = els[0]; break; }
    }
    if (!emailEl) throw new Error('[mfaLoginTest] Email/username input not found');
    await emailEl.clear();
    await emailEl.sendKeys(LOGIN_EMAIL);

    // Submit email/next
    let submitBtn = (await driver.findElements(By.css("button[type=submit]")))[0];
    if (!submitBtn) {
      const els = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Next')]|//button[contains(normalize-space(string(.)), 'Continue')]"));
      if (els.length) submitBtn = els[0];
    }
    if (submitBtn) await submitBtn.click();
    await saveShot('email-submitted');

    // Password step
    await driver.wait(async () => (await driver.findElements(By.css("input[type=password]"))).length > 0, 15000);
    const passSelectors = [
      "input[type=password]",
      "input[name=password]",
      "input[id=password]",
      "input[autocomplete=current-password]"
    ];
    let passEl = null;
    for (const sel of passSelectors) {
      const els = await driver.findElements(By.css(sel)).catch(() => []);
      if (els.length) { passEl = els[0]; break; }
    }
    if (!passEl) throw new Error('[mfaLoginTest] Password input not found');
    await passEl.clear();
    await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
    await saveShot('password-submitted');

    // MFA step — wait for a likely OTP input
    console.log('[mfaLoginTest] Waiting for MFA input field...');
    await driver.wait(async () => {
      const selectors = [
        "input[name=code]",
        "input[name=otp]",
        "input[id=code]",
        "input[id=otp]",
        "input[autocomplete=one-time-code]",
        "input[type=tel]",
        "input[data-testid*='otp']",
        "input[data-test*='otp']"
      ];
      for (const sel of selectors) {
        const found = await driver.findElements(By.css(sel)).catch(() => []);
        if (found.length) return true;
      }
      // some UIs use N single-digit inputs
      const sixInputs = await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']"));
      return sixInputs.length >= 6;
    }, 30000);

    // Generate TOTP code
    const code = authenticator.generate(TOTP_SECRET);
    console.log('[mfaLoginTest] Generated TOTP code (masked):', code.replace(/.(?=.{2}$)/g, '*'));

    // Try single input first
    let otpEl = null;
    const otpSelectors = [
      "input[name=code]",
      "input[name=otp]",
      "input[id=code]",
      "input[id=otp]",
      "input[autocomplete=one-time-code]",
      "input[type=tel]"
    ];
    for (const sel of otpSelectors) {
      const els = await driver.findElements(By.css(sel)).catch(() => []);
      if (els.length) { otpEl = els[0]; break; }
    }

    if (otpEl) {
      await otpEl.clear().catch(() => {});
      await otpEl.sendKeys(code);
    } else {
      // N separate digit inputs; type one by one
      const digitInputs = await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']"));
      if (digitInputs.length < 6) throw new Error('[mfaLoginTest] MFA inputs not found');
      for (let i = 0; i < 6 && i < code.length; i++) {
        await digitInputs[i].sendKeys(code[i]);
      }
    }
    await saveShot('mfa-filled');

    // Submit MFA
    let mfaSubmit = (await driver.findElements(By.css("button[type=submit]")))[0];
    if (!mfaSubmit) {
      const els = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Verify')]|//button[contains(normalize-space(string(.)), 'Continue')]|//button[contains(normalize-space(string(.)), 'Submit')]"));
      if (els.length) mfaSubmit = els[0];
    }
    if (mfaSubmit) await mfaSubmit.click();
    await saveShot('mfa-submitted');

    // Wait until redirected back from Cognito
    try {
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return !/amazoncognito\.com/.test(url);
      }, 30000);
    } catch {}

    // Some flows include jwt param; route to dashboard
    try {
      const current = await driver.getCurrentUrl();
      const jwtInUrl = /[?&]jwt=[^&]+/i.test(current);
      if (jwtInUrl) {
        const u = new URL(current);
        const dash = u.origin + '/dashboard';
        console.log('[mfaLoginTest] JWT found in URL, navigating to', dash);
        await driver.get(dash);
      }
    } catch {}

    // Validate dashboard
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      const text = await driver.executeScript('return document.body && document.body.innerText || ""');
      return /\/dashboard/.test(url) || /Dashboard|Welcome|Profile|Sign out|Logout/i.test(text);
    }, 30000);
    await saveShot('dashboard');
    console.log('[mfaLoginTest] ✅ MFA login succeeded, dashboard reached');

    if (KEEP_OPEN) {
      console.log('[mfaLoginTest] KEEP_BROWSER_OPEN=true — leaving browser open.');
      return;
    }
  } catch (err) {
    await saveShot('error');
    try {
      const html = await driver.getPageSource();
      fs.writeFileSync(path.join(shotsDir, 'mfa-login-error.html'), html);
    } catch {}
    console.error('[mfaLoginTest] ❌ Test failed:', err && err.message);
    throw err;
  } finally {
    if (!KEEP_OPEN) {
      console.log('[mfaLoginTest] Closing browser');
      await driver.quit().catch(() => {});
    }
  }
}

main().catch((e) => { console.error('[mfaLoginTest] Fatal:', e && e.stack || e); process.exit(1); });
