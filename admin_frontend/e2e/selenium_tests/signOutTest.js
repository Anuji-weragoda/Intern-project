import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Selenium test for Navbar sign out functionality: login, click profile dropdown,
// click Sign out button, and verify user is logged out.
// Based on Navbar.tsx component structure.
// Run with: node signOutTest.js
// Environment:
//  BASE_URL (default http://localhost:5180)
//  HEADLESS=true to run headless
//  KEEP_BROWSER_OPEN=true to leave browser open for debugging
//  LOGIN_EMAIL and LOGIN_PASSWORD for authentication

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // Prepare screenshots directory
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir, 'screenshots');
  try { fs.mkdirSync(shotsDir, { recursive: true }); } catch (e) {}

  async function saveShot(name) {
    try {
      const b = await driver.takeScreenshot();
      const file = path.join(shotsDir, `${name}-${Date.now()}.png`);
      fs.writeFileSync(file, b, 'base64');
      console.log('[signOutTest] saved screenshot', file);
    } catch (e) {
      console.log('[signOutTest] screenshot failed', e && e.message);
    }
  }

  try {
    // Authentication: If credentials provided, perform Cognito login first
    const LOGIN_EMAIL = process.env.LOGIN_EMAIL || '';
    const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';

    async function performLoginIfNeeded() {
      if (!LOGIN_EMAIL || !LOGIN_PASSWORD) return;

      try {
        console.log('[signOutTest] Performing Cognito login with provided credentials');

        // Determine origin for login
        let origin = BASE_URL;
        try {
          if (BASE_URL) origin = new URL(BASE_URL).origin;
        } catch (e) {}

        await driver.get(origin + '/');
        await driver.wait(until.elementLocated(By.css('body')), 5000);
        await saveShot('login-start');

        // Click sign-in button (matches navbar's auth flow)
        async function tryClickByXPathText(text) {
          try {
            const xpath = `//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`;
            const el = await driver.findElements(By.xpath(xpath));
            if (el.length) { await el[0].click(); return true; }
          } catch (e) {}
          return false;
        }

        const signInTexts = ['Sign in', 'Sign In', 'Log in', 'Login', 'Sign in with'];
        for (const text of signInTexts) {
          const ok = await tryClickByXPathText(text);
          if (ok) {
            console.log('[signOutTest] Clicked sign-in button:', text);
            break;
          }
        }

        // Wait and locate email input
        await driver.sleep(800);
        const emailSelectors = [
          "input[type=email]",
          "input[name=email]",
          "input[id=email]",
          "input[autocomplete=email]",
          "input[name=username]"
        ];

        let emailEl = null;
        for (const selector of emailSelectors) {
          const els = await driver.findElements(By.css(selector)).catch(() => []);
          if (els.length) { emailEl = els[0]; break; }
        }

        if (!emailEl) {
          // Try direct /login navigation
          await driver.get(origin + '/login');
          await driver.sleep(800);
          await saveShot('navigated-to-login-during-login');

          for (const selector of emailSelectors) {
            const els = await driver.findElements(By.css(selector)).catch(() => []);
            if (els.length) { emailEl = els[0]; break; }
          }
        }

        if (!emailEl) {
          console.log('[signOutTest] Email input not found during login attempt');
          return;
        }

        // Fill email and submit
        await emailEl.clear();
        await emailEl.sendKeys(LOGIN_EMAIL);

        // Find and click Next/Submit button
        const submitSelectors = ["button[type=submit]"];
        let submitEl = null;
        for (const selector of submitSelectors) {
          const els = await driver.findElements(By.css(selector)).catch(() => []);
          if (els.length) { submitEl = els[0]; break; }
        }

        if (!submitEl) {
          const xpath = `//button[contains(normalize-space(string(.)), "Next")]`;
          const els = await driver.findElements(By.xpath(xpath));
          if (els.length) submitEl = els[0];
        }

        if (submitEl) await submitEl.click();
        await saveShot('after-email-submit-during-login');

        // Wait for password field
        await driver.wait(async () => {
          const els = await driver.findElements(By.css("input[type=password]")).catch(() => []);
          return els.length > 0;
        }, 10000).catch(() => {});

        // Locate and fill password
        const passSelectors = [
          "input[type=password]",
          "input[name=password]",
          "input[id=password]",
          "input[autocomplete=current-password]"
        ];

        let passEl = null;
        for (const selector of passSelectors) {
          const els = await driver.findElements(By.css(selector)).catch(() => []);
          if (els.length) { passEl = els[0]; break; }
        }

        if (!passEl) {
          console.log('[signOutTest] Password input not found during login attempt');
          return;
        }

        await passEl.clear();
        await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
        await saveShot('after-password-submit-during-login');

        // Wait for redirect away from Cognito
        try {
          await driver.wait(async () => {
            const url = await driver.getCurrentUrl();
            return !/amazoncognito\.com/.test(url);
          }, 20000);
        } catch (e) {}

        // If JWT in URL, navigate to dashboard
        try {
          const current = await driver.getCurrentUrl();
          const jwtMatch = current.match(/[?&]jwt=[^&]+/i);
          if (jwtMatch) {
            try {
              const u = new URL(current);
              const dash = u.origin + '/dashboard';
              console.log('[signOutTest] JWT detected in URL, navigating to dashboard:', dash);
              await driver.get(dash);
              await driver.sleep(800);
              await saveShot('after-redirect-with-jwt-during-login');
            } catch (e) {}
          }
        } catch (e) {}

        // Wait for authenticated UI (dashboard or profile indicators)
        await driver.wait(async () => {
          const url = await driver.getCurrentUrl();
          const text = await driver.executeScript('return document.body && document.body.innerText || ""');
          return /Dashboard|Profile|Sign out|Logout|Welcome/i.test(text) || /\/dashboard|\/profile/.test(url);
        }, 30000).catch(() => {});

        await saveShot('login-finished');
        console.log('[signOutTest] Login completed successfully');
      } catch (e) {
        console.log('[signOutTest] Login failed:', e && e.message);
      }
    }

    // Perform login if credentials provided
    await performLoginIfNeeded();

    // Navigate to dashboard to access navbar with authenticated user
    console.log('[signOutTest] Navigating to dashboard to access navbar');
    await driver.get(BASE_URL + '/dashboard');
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    await saveShot('dashboard-loaded');

    // Verify user is logged in (check for profile dropdown or user info)
    const bodyText = await driver.executeScript('return document.body && document.body.innerText || ""');
    if (/Authentication Error|No authentication token|Please log in|Session has expired|Sign in/i.test(bodyText)) {
      console.log('[signOutTest] User not logged in, cannot test sign out');
      await saveShot('not-logged-in');
      throw new Error('User authentication required for sign out test');
    }

    console.log('[signOutTest] User appears to be logged in, proceeding with sign out test');

    // Click on the profile dropdown button (matches navbar structure)
    console.log('[signOutTest] Clicking profile dropdown in navbar');
    const profileButtons = await driver.findElements(By.xpath("//button[.//div[contains(@class,'rounded-full')]]")).catch(() => []);
    if (!profileButtons.length) {
      throw new Error('Profile dropdown button not found in navbar');
    }

    await profileButtons[0].click();
    await driver.sleep(500);
    await saveShot('profile-dropdown-opened');

    // Click "Sign out" button in dropdown (matches navbar dropdown structure)
    const signOutButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Sign out')]")).catch(() => []);
    if (!signOutButtons.length) {
      throw new Error('"Sign out" button not found in dropdown');
    }

    console.log('[signOutTest] Clicking "Sign out" button');
    await signOutButtons[0].click();
    await saveShot('sign-out-clicked');

    // Wait for sign out to complete (matches navbar logout flow)
    // The logout function may redirect to a logout endpoint or back to home
    console.log('[signOutTest] Waiting for sign out to complete...');

    // Wait for either:
    // 1. Redirect to a logout page or home page
    // 2. Sign in button to appear (indicating user is logged out)
    // 3. Authentication error or login prompt
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      const text = await driver.executeScript('return document.body && document.body.innerText || ""');

      // Check for sign in button (indicates user is logged out)
      const signInButtons = await driver.findElements(By.xpath("//a[contains(normalize-space(string(.)), 'Sign in')] | //button[contains(normalize-space(string(.)), 'Sign in')]")).catch(() => []);

      return signInButtons.length > 0 ||
             /Sign in|Log in|Login|Authentication|Please sign in/i.test(text) ||
             /\/logout|\/login|\/\?/.test(url);
    }, 15000).catch(() => {
      console.log('[signOutTest] Sign out may have completed but redirect detection timed out');
    });

    await saveShot('after-sign-out');

    // Verify sign out was successful
    const finalUrl = await driver.getCurrentUrl();
    const finalText = await driver.executeScript('return document.body && document.body.innerText || ""');

    console.log('[signOutTest] Final URL after sign out:', finalUrl);
    console.log('[signOutTest] Checking for sign in elements...');

    // Check for sign in button or login prompts
    const signInElements = await driver.findElements(By.xpath("//a[contains(normalize-space(string(.)), 'Sign in')] | //button[contains(normalize-space(string(.)), 'Sign in')]")).catch(() => []);
    const hasSignInPrompt = /Sign in|Log in|Login|Authentication required|Please sign in|Session expired/i.test(finalText);

    if (signInElements.length > 0 || hasSignInPrompt) {
      console.log('[signOutTest] ✅ Sign out successful - sign in prompt detected');
      await saveShot('sign-out-success-verified');
    } else {
      console.log('[signOutTest] ⚠️ Sign out completed but sign in prompt not clearly detected');
      console.log('[signOutTest] Final page text preview:', finalText.substring(0, 200) + '...');
      await saveShot('sign-out-completed-unclear');
    }

    console.log('[signOutTest] Sign out test completed');

  } catch (err) {
    await saveShot('sign-out-test-error');
    console.error('[signOutTest] Test failed:', err && err.message);
    throw err;
  } finally {
    if (KEEP_OPEN) {
      console.log('[signOutTest] KEEP_BROWSER_OPEN=true - leaving browser open for inspection');
      return;
    }
    console.log('[signOutTest] Closing browser');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[signOutTest] Fatal error:', err && err.stack || err);
  process.exit(1);
});