import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Selenium test for Profile page: login, navigate to profile via navbar,
// click Edit Profile, update fields, save changes, and verify success.
// Based on Profile.tsx component structure.
// Run with: node profileTest.js
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
  // Suppress TensorFlow Lite and other library logs
  options.addArguments('--log-level=0');
  options.addArguments('--disable-logging');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-extensions');
  options.addArguments('--disable-plugins');
  options.addArguments('--disable-web-security');
  options.addArguments('--disable-features=VizDisplayCompositor');
  options.addArguments('--disable-ipc-flooding-protection');
  options.addArguments('--disable-background-timer-throttling');
  options.addArguments('--disable-renderer-backgrounding');
  options.addArguments('--disable-backgrounding-occluded-windows');
  options.addArguments('--silent');
  options.addArguments('--disable-gpu');
  options.addArguments('--disable-software-rasterizer');
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
      console.log('[profileTest] saved screenshot', file);
    } catch (e) {
      console.log('[profileTest] screenshot failed', e && e.message);
    }
  }

  try {
    // Authentication: If credentials provided, perform Cognito login first
    const LOGIN_EMAIL = process.env.LOGIN_EMAIL || '';
    const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';

    async function performLoginIfNeeded() {
      if (!LOGIN_EMAIL || !LOGIN_PASSWORD) return;

      try {
        console.log('[profileTest] Performing Cognito login with provided credentials');

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
            console.log('[profileTest] Clicked sign-in button:', text);
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
          console.log('[profileTest] Email input not found during login attempt');
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
          console.log('[profileTest] Password input not found during login attempt');
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
              console.log('[profileTest] JWT detected in URL, navigating to dashboard:', dash);
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
        console.log('[profileTest] Login completed successfully');
      } catch (e) {
        console.log('[profileTest] Login failed:', e && e.message);
      }
    }

    // Perform login if credentials provided
    await performLoginIfNeeded();

    // Navigate to dashboard to access navbar
    console.log('[profileTest] Navigating to dashboard to access navbar');
    await driver.get(BASE_URL + '/dashboard');
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    await saveShot('dashboard-loaded');

    // Check for authentication errors
    const bodyText = await driver.executeScript('return document.body && document.body.innerText || ""');
    if (/Authentication Error|No authentication token|Please log in|Session has expired/i.test(bodyText)) {
      console.log('[profileTest] Authentication error detected');
      await saveShot('dashboard-auth-error');
      throw new Error('Authentication required but not available');
    }

    // Click on the profile dropdown button (matches navbar structure)
    console.log('[profileTest] Clicking profile dropdown in navbar');
    const profileButtons = await driver.findElements(By.xpath("//button[.//div[contains(@class,'rounded-full')]]")).catch(() => []);
    if (!profileButtons.length) {
      throw new Error('Profile dropdown button not found in navbar');
    }

    await profileButtons[0].click();
    await driver.sleep(500);
    await saveShot('profile-dropdown-opened');

    // Click "View Profile" link in dropdown (matches navbar dropdown structure)
    const viewProfileLinks = await driver.findElements(By.xpath("//a[contains(normalize-space(string(.)), 'View Profile')]")).catch(() => []);
    if (!viewProfileLinks.length) {
      throw new Error('"View Profile" link not found in dropdown');
    }

    console.log('[profileTest] Clicking "View Profile" link');
    await viewProfileLinks[0].click();
    await driver.sleep(1000);
    await saveShot('profile-page-loaded');

    // Wait for profile page to load (matches Profile.tsx structure)
    await driver.wait(async () => {
      const headings = await driver.findElements(By.xpath("//h1[contains(normalize-space(string(.)), 'My Profile')]")).catch(() => []);
      return headings.length > 0;
    }, 10000);

    console.log('[profileTest] Profile page loaded successfully');

    // Click "Edit Profile" button (matches Profile.tsx edit mode toggle)
    const editButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Edit Profile')]")).catch(() => []);
    if (!editButtons.length) {
      throw new Error('"Edit Profile" button not found');
    }

    console.log('[profileTest] Clicking "Edit Profile" button');
    await editButtons[0].click();
    await driver.sleep(500);
    await saveShot('edit-mode-enabled');

    // Wait for edit form to appear
    await driver.wait(async () => {
      const saveButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Save Changes')]")).catch(() => []);
      return saveButtons.length > 0;
    }, 5000);

    console.log('[profileTest] Edit form loaded, filling in fields');

    // Fill in the form fields (matches Profile.tsx input structure)
    // Update display name
    const displayNameInputs = await driver.findElements(By.css("input[name='displayName']")).catch(() => []);
    if (displayNameInputs.length > 0) {
      await displayNameInputs[0].clear();
      await displayNameInputs[0].sendKeys('Test User Updated');
      console.log('[profileTest] Updated display name');
    }

    // Update username
    const usernameInputs = await driver.findElements(By.css("input[name='username']")).catch(() => []);
    if (usernameInputs.length > 0) {
      await usernameInputs[0].clear();
      await usernameInputs[0].sendKeys('testuser_updated');
      console.log('[profileTest] Updated username');
    }

    // Update phone number
    const phoneInputs = await driver.findElements(By.css("input[name='phoneNumber']")).catch(() => []);
    if (phoneInputs.length > 0) {
      await phoneInputs[0].clear();
      await phoneInputs[0].sendKeys('+1-555-123-4567');
      console.log('[profileTest] Updated phone number');
    }

    // Update locale/language preference
    const localeSelects = await driver.findElements(By.css("select[name='locale']")).catch(() => []);
    if (localeSelects.length > 0) {
      await localeSelects[0].sendKeys('es'); // Spanish
      console.log('[profileTest] Updated locale to Spanish');
    }

    await saveShot('form-filled');

    // Click "Save Changes" button (matches Profile.tsx save functionality)
    const saveButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Save Changes')]")).catch(() => []);
    if (!saveButtons.length) {
      throw new Error('"Save Changes" button not found');
    }

    console.log('[profileTest] Clicking "Save Changes" button');
    await saveButtons[0].click();
    await saveShot('save-changes-clicked');

    // Wait for success message (matches Profile.tsx success state)
    console.log('[profileTest] Waiting for success message...');
    await driver.wait(async () => {
      const successElements = await driver.findElements(By.xpath("//div[contains(@class,'border-green-500')]//h4[contains(normalize-space(string(.)), 'Success!')]")).catch(() => []);
      return successElements.length > 0;
    }, 10000);

    console.log('[profileTest] Success message appeared - profile update successful!');
    await saveShot('profile-update-success');

    // Verify the updated values are displayed (optional verification)
    console.log('[profileTest] Verifying updated profile information...');

    // Check if display name was updated in the profile card
    const displayNameElements = await driver.findElements(By.xpath("//h2[contains(@class,'font-bold') and contains(@class,'text-white')]")).catch(() => []);
    if (displayNameElements.length > 0) {
      const displayedName = await displayNameElements[0].getText().catch(() => '');
      console.log('[profileTest] Display name in profile card:', displayedName);
    }

    await saveShot('profile-test-completed');
    console.log('[profileTest] Profile edit test completed successfully');

  } catch (err) {
    await saveShot('profile-test-error');
    console.error('[profileTest] Test failed:', err && err.message);
    throw err;
  } finally {
    if (KEEP_OPEN) {
      console.log('[profileTest] KEEP_BROWSER_OPEN=true - leaving browser open for inspection');
      return;
    }
    console.log('[profileTest] Closing browser');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[profileTest] Fatal error:', err && err.stack || err);
  process.exit(1);
});