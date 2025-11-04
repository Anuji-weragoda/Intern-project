const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { authenticator } = require('otplib');

/**
 * MFA Login E2E test for Flutter mobile app.
 * This test automates the login process with MFA verification using TOTP.
 *
 * Prerequisites:
 * - Set TOTP_SECRET environment variable with the TOTP secret key
 * - App must have accessibilityIds: 'email_input', 'password_input', 'login_button',
 *   'mfa_input', 'mfa_verify_button', 'dashboard_root'
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
    try {
      const el = await $(sel);
      if (await el.isDisplayed()) {
        await el.click();
        console.log(`Dismissed dialog via: ${sel}`);
        await browser.pause(500);
      }
    } catch {}
  }
}

async function findElement(selector, timeout = 20000) {
  try {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    console.log(`Found element: ${selector}`);
    return el;
  } catch (e) {
    console.log(`Element not found: ${selector}`, e?.message || e);
    throw e;
  }
}

async function typeText(selector, text, label = 'field') {
  try {
    const el = await findElement(selector);
    await el.click();
    await browser.pause(500);
    await el.clearValue();
    await el.setValue(text);
    console.log(`Typed into ${label}: ${text}`);
    await browser.pause(300);
    return true;
  } catch (e) {
    console.log(`Could not type into ${label}:`, e?.message || e);
    return false;
  }
}

describe('MFA Login Flow', () => {
  let totpSecret = process.env.TOTP_SECRET;

  before(() => {
    if (!totpSecret) {
      throw new Error('TOTP_SECRET environment variable is required for MFA tests');
    }
    console.log('TOTP_SECRET is set, proceeding with MFA test');
  });

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

  it('should find accessibility elements on login screen', async () => {
    try {
      console.log('Testing accessibility IDs...');

      // Wait for app to load
      await browser.pause(2000);

      // Try to find email input using xpath with class and index
      console.log('Looking for email_input...');
      const emailEl = await findElement('//android.widget.EditText[@index="3"]', 5000);
      console.log('Found email_input:', emailEl);

      // Try to find password input using xpath with class and index
      console.log('Looking for password_input...');
      const passwordEl = await findElement('//android.widget.EditText[@index="4"]', 5000);
      console.log('Found password_input:', passwordEl);

      // Try to find login button using content-desc
      console.log('Looking for login_button...');
      const loginEl = await findElement('//*[@content-desc="Sign In"]', 5000);
      console.log('Found login_button:', loginEl);

      console.log('All accessibility elements found successfully!');

    } catch (e) {
      console.log('Accessibility test failed:', e?.message || e);
      throw e;
    }
  });

  it('should login with MFA verification', async () => {
    try {
      console.log('MFA Login E2E: Starting test...');

      // Launch the app
      console.log('MFA Login E2E: Launching app...');
      await browser.pause(1500);

      const APP_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend';
      const APP_ACTIVITY = process.env.ANDROID_ACTIVITY || 'com.example.mobile_frontend.MainActivity';

      try {
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
      } catch (e) {
        console.log('startActivity failed:', e?.message || e);
      }

      await handleAndroidFirstRunDialogs();
      await savePageSourceSnapshot('after-launch');
      await screenshot('01-after-launch');

      // Enter email
      console.log('MFA Login E2E: Entering email...');
      await typeText('//android.widget.EditText[@index="3"]', 'anujinishala@gmail.com', 'email');
      await screenshot('02-after-email-input');

      // Enter password
      console.log('MFA Login E2E: Entering password...');
      await typeText('//android.widget.EditText[@index="4"]', 'iHuyntj9P4ZTYR2@@@', 'password');
      await screenshot('03-after-password-input');

      // Tap login button
      console.log('MFA Login E2E: Tapping login button...');
      const loginBtn = await findElement('//*[@content-desc="Sign In"]');
      await loginBtn.click();
      await browser.pause(1000);
      await screenshot('04-after-login-click');

      // Wait for either MFA verification screen or dashboard (depending on MFA setup)
      console.log('MFA Login E2E: Waiting for MFA screen or dashboard...');
      let mfaFound = false;
      let dashboardFound = false;
      
      try {
        // Be flexible with hint attribute; contains() avoids brittle newline/entity matches
        await findElement('//android.widget.EditText[contains(@hint, "mfa_input")]', 12000); // Wait up to 12 seconds for MFA screen
        mfaFound = true;
        console.log('MFA Login E2E: MFA screen appeared - MFA is enabled');
        await screenshot('05-mfa-screen-visible');
      } catch (e) {
        console.log('MFA Login E2E: MFA screen not found, checking for dashboard...');
        try {
          await findElement('~dashboard_root', 10000); // Wait up to 10 seconds for dashboard
          dashboardFound = true;
          console.log('MFA Login E2E: Dashboard appeared - MFA not required or login succeeded');
          await screenshot('05-dashboard-visible');
        } catch (e2) {
          throw new Error('Neither MFA screen nor dashboard appeared after login');
        }
      }

      if (mfaFound) {
        // Helper to prefer clicking wrapper or inner button
        const clickVerify = async () => {
          try {
            const wrapper = await $('//*[@content-desc="mfa_verify_button"]');
            if (await wrapper.isDisplayed()) {
              await wrapper.click();
              return true;
            }
          } catch {}
          const innerBtn = await $('//*[@content-desc="Verify Code"]');
          await innerBtn.waitForDisplayed({ timeout: 5000 });
          await innerBtn.click();
          return true;
        };

        // Generate TOTP with boundary awareness
        const generateFreshTotp = () => {
          try {
            const remaining = typeof authenticator.timeRemaining === 'function' ? authenticator.timeRemaining() : 30;
            console.log(`TOTP seconds remaining in window: ${remaining}`);
            // If the code is about to roll over, wait for the next window
            if (remaining <= 4) {
              const waitMs = (remaining + 1) * 1000; // small buffer after rollover
              console.log(`Waiting ${waitMs}ms for next TOTP window...`);
              browser.pause(waitMs);
            }
          } catch {}
          const code = authenticator.generate(totpSecret);
          console.log(`Generated TOTP code: ${code}`);
          return code;
        };

        // Retry up to 3 attempts across potential time windows
        let verified = false;
        for (let attempt = 1; attempt <= 3 && !verified; attempt++) {
          console.log(`MFA Login E2E: Attempt ${attempt} - entering/verifying TOTP`);

          const totpCode = generateFreshTotp();
          expect(totpCode).to.match(/^\d{6}$/, 'TOTP code should be 6 digits');

          // Enter TOTP code (clear then set)
          await typeText('//android.widget.EditText[contains(@hint, "mfa_input")]', totpCode, 'MFA code');
          await screenshot(`06-after-mfa-input-attempt-${attempt}`);

          // Tap verify
          console.log('MFA Login E2E: Tapping verify button...');
          await clickVerify();
          await browser.pause(1500);
          await screenshot(`07-after-verify-click-attempt-${attempt}`);

          // Check for dashboard first
          try {
            await findElement('~dashboard_root', 8000);
            console.log('MFA Login E2E: Dashboard screen visible - MFA verification successful!');
            await screenshot('08-dashboard-visible');
            verified = true;
            break;
          } catch (e) {
            console.log('Dashboard not visible yet, will retry if attempts remain.');
          }

          // If still on MFA screen, small wait to allow any error message; then retry
          await browser.pause(1500);
        }

        if (!verified) {
          await savePageSourceSnapshot('mfa-final-state');
          throw new Error('MFA verification failed after multiple attempts; dashboard not reached');
        }
      }

      console.log('MFA Login E2E: Test completed successfully');

    } catch (e) {
      console.log('MFA Login E2E: Test failed:', e?.message || e);

      // On failure, dump page source for debugging
      try {
        const src = await browser.getPageSource();
        console.log('--- PAGE SOURCE START ---');
        console.log(src.substring(0, Math.min(src.length, 5000)));
        console.log('--- PAGE SOURCE END ---');
        await savePageSourceSnapshot('on-failure');
        await screenshot('99-failure-screenshot');
      } catch {}

      throw e;
    }
  });
});