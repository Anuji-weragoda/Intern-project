const { expect } = require('chai');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');
const { authenticator } = require('otplib');

/*
  signup_totp.e2e.js
  Flow:
   1. Navigate to Sign Up
   2. Create user (email + password)
   3. Enter verification code manually supplied (TEST_VERIFICATION_CODE env) OR skip if auto handled externally
   4. When TOTP setup screen appears, reveal secret, extract it
   5. Generate current TOTP code with otplib
   6. Enter code and finish

  Requirements:
   - App must expose semantics labels added to TotpSetupScreen:
     * totp_show_secret_button
     * totp_secret_container / totp_secret_value
     * totp_code_field
     * totp_verify_button
   - Environment variables:
     * TEST_EMAIL (optional; if absent will fabricate unique)
     * TEST_PASSWORD (default TestPass123!@#)
     * OPTIONAL_VERIFICATION_CODE (if the email verification step is needed and not auto-handled elsewhere)
*/

describe('Signup + TOTP setup', () => {
  const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!@#';
  const baseEmail = process.env.TEST_EMAIL;
  const needManualEmailCode = !!process.env.OPTIONAL_VERIFICATION_CODE;
  let testEmail;

  const find = async (selector, timeout = 12000) => {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    return el;
  };

  const tryFind = async (selectors, timeoutEach = 4000) => {
    for (const sel of selectors) {
      try {
        return await find(sel, timeoutEach);
      } catch (_) { /* continue */ }
    }
    throw new Error('None of selectors matched: ' + selectors.join(' | '));
  };

  const typeInto = async (selector, value) => {
    const el = await find(selector);
    try { await el.click(); } catch {}
    try { await el.clearValue(); } catch {}
    await el.setValue(value);
  };

  it('should complete signup and finish TOTP setup', async function() {
    this.timeout(180000);
    testEmail = baseEmail || `totpuser_${Date.now()}@example.com`;

    // 1. Navigate to signup
    await screenshot('totp-01-launch');
    let signUpNav;
    try {
      signUpNav = await find('~signup_nav_button', 4000);
    } catch {
      signUpNav = await tryFind([
        'android=new UiSelector().textContains("Sign Up")',
        'android=new UiSelector().textContains("Create Account")'
      ]);
    }
    await signUpNav.click();
    await screenshot('totp-02-signup-screen');

    // 2. Fill form
    await typeInto('~email_input', testEmail);
    await typeInto('~password_input', TEST_PASSWORD);
    // Confirm password may share semantics or require fallback
    try {
      await typeInto('~confirm_password_input', TEST_PASSWORD);
    } catch {
      try { await typeInto('android=new UiSelector().textContains("Confirm")', TEST_PASSWORD); } catch {}
    }
    await screenshot('totp-03-form-filled');

    // Submit signup
    let signupBtn;
    try { signupBtn = await find('~signup_button', 4000); } catch {
      signupBtn = await tryFind([
        'android=new UiSelector().textContains("Sign Up").className("android.widget.Button")'
      ]);
    }
    await signupBtn.click();
    await screenshot('totp-04-signup-submitted');

    // 3. Handle email verification (if required & manual code provided)
    if (needManualEmailCode) {
      console.log('Manual email code entry requested via OPTIONAL_VERIFICATION_CODE');
      // Wait for code field
      const codeField = await tryFind([
        '~verification_code_input',
        'android=new UiSelector().textContains("000000")'
      ], 6000);
      await codeField.setValue(process.env.OPTIONAL_VERIFICATION_CODE);
      await screenshot('totp-05-code-entered');
      // Press verify button (reuse signup_button semantics changed state)
      let verifyBtn;
      try { verifyBtn = await find('~verify_button', 4000); } catch {
        verifyBtn = await tryFind([
          'android=new UiSelector().textContains("Verify")'
        ]);
      }
      await verifyBtn.click();
      await screenshot('totp-06-code-submitted');
    } else {
      // Wait a bit for automatic transition after confirmSignUp
      await browser.pause(4000);
    }

    // 4. Wait for TOTP setup screen (look for header or QR icon)
    const totpHeaderSelectors = [
      'android=new UiSelector().textContains("Set Up Authenticator")',
      'android=new UiSelector().textContains("Authenticator")'
    ];
    await tryFind(totpHeaderSelectors, 8000);
    await screenshot('totp-07-totp-screen');

    // 5. Reveal secret
    let showSecretBtn = await tryFind([
      '~totp_show_secret_button',
      'android=new UiSelector().textContains("Show secret")',
      'android=new UiSelector().textContains("Show secret key")'
    ]);
    await showSecretBtn.click();
    await browser.pause(500);
    await screenshot('totp-08-secret-revealed');

    // 6. Capture secret text
    // Appium cannot always read SelectableText directly; fallback to page source parse
    let secretValue = '';
    try {
      const secretElem = await find('~totp_secret_value', 4000);
      secretValue = await secretElem.getText();
    } catch {
      const src = await browser.getPageSource();
      const match = src.match(/[A-Z2-7]{16,}/); // Base32 typical length
      if (match) secretValue = match[0];
    }
    if (!secretValue) throw new Error('Failed to extract TOTP secret value');
    console.log('Extracted TOTP secret (first 6): ' + secretValue.substring(0,6) + '...');

    // 7. Generate current TOTP code
    const totpCode = authenticator.generate(secretValue.trim());
    console.log('Generated TOTP code: ' + totpCode);
    await screenshot('totp-09-code-generated');

    // 8. Enter code
    const codeInput = await tryFind([
      '~totp_code_field',
      'android=new UiSelector().textContains("000000")'
    ]);
    await codeInput.setValue(totpCode);
    await browser.pause(300);
    await screenshot('totp-10-code-entered');

    // 9. Submit
    let verifyTotpBtn;
    try { verifyTotpBtn = await find('~totp_verify_button', 4000); } catch {
      verifyTotpBtn = await tryFind([
        'android=new UiSelector().textContains("Verify & Finish")',
        'android=new UiSelector().textContains("Verify")'
      ]);
    }
    await verifyTotpBtn.click();
    await screenshot('totp-11-totp-submitted');

    // 10. Confirm dashboard
    await browser.pause(3000);
    let onDashboard = false;
    for (const sel of [
      'android=new UiSelector().textContains("Dashboard")',
      'android=new UiSelector().textContains("Welcome")',
      'android=new UiSelector().textContains("Staff")'
    ]) {
      try {
        const el = await $(sel);
        if (await el.isDisplayed()) { onDashboard = true; break; }
      } catch {}
    }
    expect(onDashboard).to.equal(true, 'Expected to land on dashboard after TOTP verification');
    await screenshot('totp-12-dashboard');
  });
});
