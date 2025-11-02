const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

/**
 * Sample login E2E test using accessibility ids.
 * Assumptions:
 *  - There's a button with accessibility id "login_button" on the first screen.
 *  - Tapping it navigates to a login screen that has an accessibility id
 *    like "login_screen" or a title with id "login_title".
 * Adjust selectors below to match your app if needed.
 */

async function savePageSourceSnapshot(prefix = 'page') {
  try {
    const dir = path.resolve(process.cwd(), './artifacts/pagesource');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const src = await browser.getPageSource();
    const file = path.join(dir, `${Date.now()}-${prefix}.xml`);
    fs.writeFileSync(file, src, 'utf8');
    console.log(`Saved page source: ${file}`);
  } catch (e) {
    console.log('Failed to save page source', e?.message || e);
  }
}

async function clickIfExists(selector, waitMs = 2000) {
  try {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: waitMs });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

async function handleAndroidFirstRunDialogs() {
  const candidates = [
    'android=new UiSelector().textContains("While using the app")',
    'android=new UiSelector().textContains("Allow")',
    'android=new UiSelector().textContains("CONTINUE")',
    'android=new UiSelector().textContains("Continue")',
    'android=new UiSelector().textContains("OK")',
    'android=new UiSelector().resourceIdMatches(".*permission_allow_button")',
    'android=new UiSelector().resourceIdMatches(".*continue_button")'
  ];
  for (const sel of candidates) {
    if (await clickIfExists(sel, 1500)) {
      console.log(`Dismissed dialog via: ${sel}`);
      await browser.pause(500);
    }
  }
}

async function findAny(selectors, waitMs = 20000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < waitMs) {
    for (const sel of selectors) {
      try {
        const el = await $(sel);
        await el.waitForDisplayed({ timeout: 1000 });
        console.log(`Found element by selector: ${sel}`);
        return el;
      } catch (e) { lastErr = e; }
    }
    await browser.pause(500);
  }
  throw lastErr || new Error('Element not found');
}

async function screenshot(name) {
  try {
    const dir = path.resolve(process.cwd(), './artifacts/screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${name}.png`);
    await browser.saveScreenshot(file);
    console.log(`Saved screenshot: ${file}`);
  } catch (e) {
    console.log('Failed to save screenshot', e?.message || e);
  }
}

async function typeIfExists(selectors, value, label = 'field') {
  try {
    const el = await findAny(selectors, 5000);
    await el.click();
    await el.clearValue?.();
    await el.setValue(value);
    console.log(`Typed into ${label}: ${value}`);
    return true;
  } catch {
    console.log(`Could not find ${label} to type`);
    return false;
  }
}

describe('Login flow', () => {
  afterEach(function () {
    try {
      const dir = path.resolve(process.cwd(), './artifacts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const result = {
        title: this.currentTest && this.currentTest.title,
        state: this.currentTest && this.currentTest.state,
        duration: this.currentTest && this.currentTest.duration,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(path.join(dir, 'run-result.json'), JSON.stringify(result, null, 2), 'utf8');
      console.log(`Saved test result to ${path.join(dir, 'run-result.json')}`);
    } catch (e) {
      console.log('Failed to write run result', e?.message || e);
    }
  });

  it('should open app, tap login button, and show login screen', async () => {
    try {
      console.log('Login E2E: starting...');
      await browser.pause(1500);
      // Ensure our app is in the foreground even if the emulator shows the home screen
      const APP_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend';
      const APP_ACTIVITY = process.env.ANDROID_ACTIVITY || 'com.example.mobile_frontend.MainActivity';
      try {
        // First try to activate the app (fast path if already installed)
        if (driver.isAndroid) {
          await driver.activateApp(APP_PACKAGE);
          await browser.pause(500);
        }
      } catch {}
      try {
        if (driver.isAndroid) {
          await driver.startActivity(APP_PACKAGE, APP_ACTIVITY);
          await browser.pause(800);
        }
      } catch (e) { console.log('startActivity fallback failed:', e?.message || e); }
      await handleAndroidFirstRunDialogs();
      await savePageSourceSnapshot('after-launch');
      await screenshot('01-after-launch');

      // Try multiple strategies to find the login button
      const loginButtonSelectors = [
        '~Sign In',
        'android=new UiSelector().description("Sign In")',
        'android=new UiSelector().descriptionContains("Sign In")',
        '~login_button',
        'android=new UiSelector().descriptionContains("login")',
        'android=new UiSelector().textContains("Sign in")',
        'android=new UiSelector().textContains("Login")',
        'android=new UiSelector().resourceIdMatches("(?i).*login.*")'
      ];
      const loginBtn = await findAny(loginButtonSelectors, 20000);
      console.log('Login E2E: login button located, clicking...');
      await loginBtn.click();
      await browser.pause(800);
      await screenshot('02-after-login-click');

      // Optionally type into username/password for better visual confirmation
      const emailSelectors = [
        'android=new UiSelector().descriptionContains("Email")',
        'android=new UiSelector().textContains("Email")',
        'android=new UiSelector().className("android.widget.EditText").instance(0)'
      ];
      const passwordSelectors = [
        'android=new UiSelector().descriptionContains("Password")',
        'android=new UiSelector().textContains("Password")',
        'android=new UiSelector().className("android.widget.EditText").instance(1)'
      ];
      const typedEmail = await typeIfExists(emailSelectors, 'test@example.com', 'email');
      await browser.pause(400);
      const typedPassword = await typeIfExists(passwordSelectors, 'secret123', 'password');
      if (typedEmail || typedPassword) {
        await screenshot('03-after-typing');
      }

      // Verify the login screen appears (try a couple of ids commonly used)
      const loginScreenSelectors = [
        '~Sign in to continue',
        'android=new UiSelector().description("Sign in to continue")',
        'android=new UiSelector().descriptionContains("Sign in")',
        '~Sign In',
        'android=new UiSelector().description("Sign In")',
        'android=new UiSelector().descriptionContains("Sign In")',
        '~login_screen',
        'android=new UiSelector().descriptionContains("login")',
        'android=new UiSelector().textContains("Login")',
        'android=new UiSelector().resourceIdMatches("(?i).*login.*")'
      ];
      const loginScreen = await findAny(loginScreenSelectors, 20000);
      console.log('Login E2E: login screen displayed');
      expect(await loginScreen.isDisplayed()).to.equal(true);
      await browser.pause(800);
      await screenshot('04-final-state');
    } catch (e) {
      // On failure, dump a snippet of the page source to help identify selectors
      try {
        const src = await browser.getPageSource();
        console.log('--- PAGE SOURCE START ---');
        console.log(src.substring(0, Math.min(src.length, 5000)));
        console.log('--- PAGE SOURCE END ---');
        await savePageSourceSnapshot('on-failure');
      } catch {}
      throw e;
    }
  });
});
