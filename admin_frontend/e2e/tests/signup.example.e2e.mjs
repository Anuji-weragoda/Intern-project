// Example E2E for sign-up with OTP via a hosted UI using MailHog
// This test is OPTIONAL and runs only when env vars are provided.
// Required env:
//  - SIGNUP_URL: full URL to the hosted sign-up page (e.g., Cognito Hosted UI SignUp screen)
//  - SIGNUP_EMAIL: email address to register
//  - SIGNUP_PASSWORD: password for the new user
//  - MAILHOG_URL: e.g., http://localhost:8025
// Optional env:
//  - SIGNUP_SELECTORS: JSON string with fields: { email, password, passwordConfirm, submit }
//  - OTP_SELECTORS: JSON string with fields: { code, confirm }
//  - OTP_SUBJECT_REGEX: regex string to match OTP emails (default /otp|verification|code/i)
//  - OTP_CODE_REGEX: regex string to extract code (default /(\d{6})/)
//  - AFTER_SIGNUP_URL: URL to navigate after confirmation (e.g., app baseUrl)

import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';
import { waitForOtpEmail } from '../otp/mailhog.mjs';

function getEnvJSON(name, fallback) {
  try { return JSON.parse(process.env[name] || ''); } catch { return fallback; }
}

export async function runSignupExample({ headless }) {
  const required = ['SIGNUP_URL', 'SIGNUP_EMAIL', 'SIGNUP_PASSWORD', 'MAILHOG_URL'];
  if (required.some((k) => !process.env[k])) {
    console.warn('Signup example skipped: missing env vars (SIGNUP_URL, SIGNUP_EMAIL, SIGNUP_PASSWORD, MAILHOG_URL).');
    return; // skip without failing
  }

  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    const signupUrl = process.env.SIGNUP_URL;
    const email = process.env.SIGNUP_EMAIL;
    const password = process.env.SIGNUP_PASSWORD;
    const mailhogUrl = process.env.MAILHOG_URL;
    const afterUrl = process.env.AFTER_SIGNUP_URL;

    const signupSel = getEnvJSON('SIGNUP_SELECTORS', {
      email: 'input[type=email]',
      password: 'input[name=password]',
      passwordConfirm: 'input[name=confirm_password], input[name=passwordConfirm]',
      submit: 'button[type=submit], button[data-test=signup]'
    });
    const otpSel = getEnvJSON('OTP_SELECTORS', {
      code: 'input[name=otp], input[name=code]'
      , confirm: 'button[type=submit], button[data-test=confirm]'
    });

    const subjectRegex = new RegExp(process.env.OTP_SUBJECT_REGEX || 'otp|verification|code', 'i');
    const codeRegex = new RegExp(process.env.OTP_CODE_REGEX || '(\\d{6})');

    // Open hosted sign-up page
    await driver.get(signupUrl);
    await driver.wait(until.elementLocated(By.css('body')), 15000);

    // Fill sign-up form
    const emailEl = await driver.findElement(By.css(signupSel.email));
    const passEl = await driver.findElement(By.css(signupSel.password));
    const pass2El = await driver.findElements(By.css(signupSel.passwordConfirm)).then(arr => arr[0]).catch(() => null);
    await emailEl.clear();
    await emailEl.sendKeys(email);
    await passEl.clear();
    await passEl.sendKeys(password);
    if (pass2El) { await pass2El.clear(); await pass2El.sendKeys(password); }

    const submitEl = await driver.findElement(By.css(signupSel.submit));
    await submitEl.click();

    // Wait for OTP email
    const { code } = await waitForOtpEmail({ mailhogUrl, to: email, subjectRegex, codeRegex, timeoutMs: 90000 });

    // Enter OTP on the hosted UI
    const codeEl = await driver.findElement(By.css(otpSel.code));
    await codeEl.clear();
    await codeEl.sendKeys(code);
    const confirmEl = await driver.findElement(By.css(otpSel.confirm));
    await confirmEl.click();

    // Optional: navigate back to app to verify access
    if (afterUrl) {
      await driver.get(afterUrl);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
    }
  } finally {
    await driver.quit();
  }
}
