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

// Try to make sure Android shows the soft keyboard even when a hardware keyboard is present
async function ensureAndroidSoftKeyboardVisible() {
  if (!driver.isAndroid) return;
  try {
    // Make Android show IME even with a hardware keyboard attached
    await driver.execute('mobile: shell', {
      command: 'settings',
      args: ['put', 'secure', 'show_ime_with_hard_keyboard', '1']
    });
    console.log('Ensured Android setting show_ime_with_hard_keyboard=1');
  } catch (e) {
    console.log('Could not enforce soft keyboard visibility', e?.message || e);
  }
}

async function typeIfExists(selectors, value, label = 'field') {
  try {
    const el = await findAny(selectors, 5000);
    
    // Click to focus and force keyboard
    await el.click();
    await browser.pause(500);
    
    // Try multiple keyboard visibility methods
    await ensureAndroidSoftKeyboardVisible();
    await browser.pause(300);
    
    // Try to show keyboard via adb if available
    try {
      if (driver.isAndroid) {
        await driver.execute('mobile: shell', {
          command: 'input',
          args: ['text', '']
        });
        console.log('Triggered IME input command');
      }
    } catch (e) {
      console.log('shell input command failed:', e?.message || e);
    }
    
    await screenshot(`typing-${label}-focused`);

    // Clear and type using direct setValue approach
    try {
      await el.clearValue?.();
    } catch {}
    
    await el.setValue(value);
    console.log(`Typed into ${label}: ${value}`);
    await browser.pause(300);
    await screenshot(`typing-${label}-after-input`);

    // Try to trigger IME action to advance/confirm
    try {
      if (driver.isAndroid) {
        await driver.execute('mobile: performEditorAction', { action: 'next' });
        await browser.pause(300);
      }
    } catch (e) {
      console.log('performEditorAction failed:', e?.message || e);
    }
    return true;
  } catch (e) {
    console.log(`Could not find ${label} to type:`, e?.message || e);
    return false;
  }
}

// Fallback tap using W3C actions at the element's center (helps when .click() is intercepted)
async function tapCenter(el) {
  try {
    const rect = await el.getRect();
    const x = Math.floor(rect.x + rect.width / 2);
    const y = Math.floor(rect.y + rect.height / 2);
    await driver.performActions([
      {
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
    await driver.releaseActions?.();
    console.log(`Tapped at center: (${x}, ${y})`);
  } catch (e) {
    console.log('tapCenter failed:', e?.message || e);
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
        'android=new UiSelector().className("android.widget.EditText").instance(0)',
        'android=new UiSelector().descriptionContains("Email")',
        'android=new UiSelector().textContains("Email")',
        'android=new UiSelector().hint("Enter your email")'
      ];
      const passwordSelectors = [
        'android=new UiSelector().className("android.widget.EditText").instance(1)',
        'android=new UiSelector().descriptionContains("Password")',
        'android=new UiSelector().textContains("Password")',
        'android=new UiSelector().hint("Enter your password")'
      ];
      const typedEmail = await typeIfExists(emailSelectors, 'anujinishaweragoda1234@gmail.com', 'email');
      await browser.pause(400);
      const typedPassword = await typeIfExists(passwordSelectors, 'iHuyntj9P4ZTYR2@@@@', 'password');
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

      // Try to click the Sign In/Log In button on the login screen and verify success (best-effort)
      const signInButtonSelectors = [
        'android=new UiSelector().description("Sign In")',
        'android=new UiSelector().descriptionContains("Sign In")',
        '~Sign In',
        'android=new UiSelector().text("Sign In")',
        'android=new UiSelector().textContains("Sign In")',
        '~login_submit',
        'android=new UiSelector().resourceIdMatches("(?i).*sign.*in.*|.*login.*")',
        // Scrollable fallback to bring the button into view by text
        'android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Sign In")'
      ];
      try {
        const signInBtn = await findAny(signInButtonSelectors, 15000);
        console.log('Login E2E: Sign In button located, clicking...');
        try {
          await signInBtn.click();
        } catch (clickErr) {
          console.log('Standard click failed, falling back to tapCenter:', clickErr?.message || clickErr);
          await tapCenter(signInBtn);
        }
        await browser.pause(2000);
        await screenshot('05-after-sign-in-click');
        
        // Best-effort check that we navigated to a post-login screen
        const successSelectors = [
          '~home_screen',
          'android=new UiSelector().descriptionContains("Home")',
          'android=new UiSelector().textContains("Home")',
          'android=new UiSelector().textContains("Dashboard")',
          'android=new UiSelector().resourceIdMatches("(?i).*home.*|.*dashboard.*")',
          'android=new UiSelector().className("android.widget.FrameLayout")'
        ];
        try {
          const successEl = await findAny(successSelectors, 15000);
          console.log('Login E2E: post-login screen or app loaded.');
          await screenshot('06-post-login-visible');
        } catch (e) {
          console.log('Login E2E: did not detect a specific post-login screen.');
          await screenshot('06-after-login-unknown-state');
        }
      } catch (btnErr) {
        console.log('Login E2E: Sign In button not found on login screen; test stopping here:', btnErr?.message || btnErr);
        throw new Error('Could not find and click Sign In button');
      }
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
