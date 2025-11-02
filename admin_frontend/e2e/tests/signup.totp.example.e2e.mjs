// Example E2E for sign-up/login with TOTP (authenticator app)
// This is OPTIONAL and runs only when env vars are provided.
// Required env:
//  - SIGNUP_URL: full URL to the hosted sign-up or login page that will prompt for TOTP
//  - SIGNUP_EMAIL: username/email for the user (should already be enrolled with the TOTP secret)
//  - SIGNUP_PASSWORD: password for that user
//  - TOTP_SECRET: Base32 secret shared with the authenticator app for this test user
// Optional env:
//  - SIGNUP_SELECTORS: JSON with fields { user, password, submit }
//  - TOTP_SELECTORS: JSON with fields { code, confirm }
//  - AFTER_SIGNUP_URL: URL to navigate after verification (e.g., app baseUrl)
// Notes:
//  - Best practice: Use a pre-enrolled test user in a non-prod IdP with a known TOTP secret.
//  - If you must enroll during the test, you'll need to extract the otpauth:// secret from the page/QR flow,
//    which varies by IdP and is not included in this generic example.

import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';
import { totpCode } from '../otp/totp.mjs';

function getEnvJSON(name, fallback) {
  try { return JSON.parse(process.env[name] || ''); } catch { return fallback; }
}

export async function runSignupTotpExample({ headless }) {
  const required = ['SIGNUP_URL', 'SIGNUP_EMAIL', 'SIGNUP_PASSWORD', 'TOTP_SECRET'];
  if (required.some((k) => !process.env[k])) {
    console.warn('TOTP signup example skipped: missing env vars (SIGNUP_URL, SIGNUP_EMAIL, SIGNUP_PASSWORD, TOTP_SECRET).');
    return; // skip without failing
  }

  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    const signupUrl = process.env.SIGNUP_URL;
    const email = process.env.SIGNUP_EMAIL;
    const password = process.env.SIGNUP_PASSWORD;
    const totpSecret = process.env.TOTP_SECRET;
    const afterUrl = process.env.AFTER_SIGNUP_URL;

    const signupSel = getEnvJSON('SIGNUP_SELECTORS', {
      user: 'input[type=email], input[name=username], input[name=email]'
      , password: 'input[name=password]'
      , submit: 'button[type=submit], button[data-test=login], button[data-test=signup]'
    });
    const totpSel = getEnvJSON('TOTP_SELECTORS', {
      code: 'input[name=otp], input[name=code], input[autocomplete=one-time-code]'
      , confirm: 'button[type=submit], button[data-test=confirm]'
    });

    // Open hosted sign-up/login page
    await driver.get(signupUrl);
    await driver.wait(until.elementLocated(By.css('body')), 15000);

    // Fill credentials
    const userEl = await driver.findElement(By.css(signupSel.user));
    const passEl = await driver.findElement(By.css(signupSel.password));
    await userEl.clear();
    await userEl.sendKeys(email);
    await passEl.clear();
    await passEl.sendKeys(password);

    const submitEl = await driver.findElement(By.css(signupSel.submit));
    await submitEl.click();

  // Wait for TOTP prompt, then compute and enter the current code
  await driver.wait(until.elementLocated(By.css(totpSel.code)), 20000);
  const step = Number(process.env.TOTP_STEP || '30');
  const digits = Number(process.env.TOTP_DIGITS || '6');
  const code = totpCode({ secret: totpSecret, step, digits });
    const codeEl = await driver.findElement(By.css(totpSel.code));
    await codeEl.clear();
    await codeEl.sendKeys(code);

    const confirmEl = await driver.findElement(By.css(totpSel.confirm));
    await confirmEl.click();

    // Optional final navigation
    if (afterUrl) {
      await driver.get(afterUrl);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
    }
  } finally {
    await driver.quit();
  }
}
