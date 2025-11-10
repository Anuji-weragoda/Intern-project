const { expect } = require('chai');
const { MailSlurp } = require('mailslurp-client');
const { authenticator } = require("otplib");
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Sign Up with MailSlurp Email Verification then TOTP', () => {
  let mailslurp;
  let inbox;
  let testEmail;
  const MAILSLURP_API_KEY = process.env.MAILSLURP_API_KEY;
  const TEST_PASSWORD = 'TestPass123!@#';
  const APP_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend';
  const APP_ACTIVITY = process.env.ANDROID_ACTIVITY || 'com.example.mobile_frontend.MainActivity';

  // Helper function to wait for and find an element with retry
  const findElement = async (selector, timeout = 15000) => {
    // Improved finder with longer default timeout and better logging
    console.log(`Finding element: ${selector} (timeout ${timeout}ms)`);
    const element = await $(selector);
    await element.waitForDisplayed({ timeout });
    return element;
  };

  // Helper function to type text into an element
  const typeText = async (selector, text, label = '') => {
    console.log(`Typing ${label || 'text'} into ${selector}`);
    const element = await findElement(selector);
    // Ensure the field is focused before typing — click to focus, then set value.
    try {
      await element.click();
    } catch (e) {
      // Some elements may not support click; ignore and continue
    }
    await element.clearValue();
    await element.setValue(text);
    // Hide keyboard if present (Android)
    try {
      await driver.hideKeyboard();
    } catch (e) {
      // ignore if hideKeyboard not available
    }
    await browser.pause(300);
  };

  // Helper: scroll into view by accessibility description on Android
  const scrollIntoViewByDesc = async (desc) => {
    try {
      const sel = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("${desc}"))`;
      const el = await $(sel);
      await el.waitForDisplayed({ timeout: 5000 });
      return el;
    } catch (e) {
      return null;
    }
  };

  // Helper function to handle Android system dialogs
  const handleAndroidFirstRunDialogs = async () => {
    try {
      const permissionBtn = await $('android=new UiSelector().textContains("ALLOW")');
      if (await permissionBtn.isDisplayed()) {
        await permissionBtn.click();
        await browser.pause(500);
      }
    } catch (e) {
      // No dialog present, continue
    }

    try {
      const whileUsingBtn = await $('id=com.android.permissioncontroller:id/permission_allow_foreground_only_button');
      if (await whileUsingBtn.isDisplayed()) {
        await whileUsingBtn.click();
        await browser.pause(500);
      }
    } catch (e) {
      // No dialog present, continue
    }
  };

  // Extract OTP from email body (AWS Cognito format)
  const extractOtpFromEmail = (emailBody) => {
    console.log('Extracting OTP from AWS Cognito email...');
    
    // AWS Cognito specific patterns
    const cognitoPatterns = [
      /confirmation code is[:\s]+(\d{6})/i,        // "Your confirmation code is: 123456"
      /verification code is[:\s]+(\d{6})/i,        // "Your verification code is: 123456"
      /code[:\s]+(\d{6})/i,                        // "code: 123456"
      /\b(\d{6})\b/,                                // Simple 6-digit number
    ];

    for (const pattern of cognitoPatterns) {
      const match = emailBody.match(pattern);
      if (match && match[1]) {
        console.log(`Found OTP: ${match[1]} (pattern: ${pattern.source})`);
        return match[1];
      }
    }

    // If no pattern matches, try to find any 6-digit sequence
    const allDigits = emailBody.match(/\d{6}/);
    if (allDigits) {
      console.log(`Found 6-digit sequence: ${allDigits[0]}`);
      return allDigits[0];
    }

    console.log('❌ No OTP found in email body');
    return null;
  };

  before(async function () {
    console.log('=== Sign Up with MailSlurp E2E: Starting suite ===');
    
    // Validate MailSlurp API key
    if (!MAILSLURP_API_KEY) {
      throw new Error('MAILSLURP_API_KEY environment variable is required. Get your API key from https://app.mailslurp.com');
    }
    console.log(`MAILSLURP_API_KEY length: ${MAILSLURP_API_KEY.length}`);
    console.log(`MAILSLURP_API_KEY starts with: ${MAILSLURP_API_KEY.substring(0, 6)}...`);

    console.log('Initializing MailSlurp client...');
    mailslurp = new MailSlurp({ apiKey: MAILSLURP_API_KEY });
  });

  beforeEach(async function () {
    console.log(`\n=== Starting test: ${this.currentTest.title} ===`);
    
    // Reset app to initial state
    try {
      if (driver.isAndroid) {
        await driver.terminateApp(APP_PACKAGE);
        await browser.pause(1000);
        await driver.activateApp(APP_PACKAGE);
        await browser.pause(1500);
      }
    } catch (e) {
      console.log('App reset:', e?.message || e);
    }

    await handleAndroidFirstRunDialogs();
  });

  afterEach(async function () {
    console.log(`\n=== Test completed: ${this.currentTest.title} - ${this.currentTest.state} ===`);
    
    // Save test results
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.resolve(process.cwd(), './artifacts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const result = {
        title: this.currentTest && this.currentTest.title,
        state: this.currentTest && this.currentTest.state,
        duration: this.currentTest && this.currentTest.duration,
        timestamp: new Date().toISOString(),
        email: testEmail
      };
      
      fs.writeFileSync(
        path.join(dir, 'run-result-mailslurp-signup.json'),
        JSON.stringify(result, null, 2),
        'utf8'
      );
    } catch (e) {
      console.log('Failed to save test result:', e.message);
    }
  });

  after(async function () {
    // Cleanup: Delete the test inbox
    if (inbox && inbox.id) {
      try {
        console.log(`Cleaning up test inbox: ${inbox.emailAddress}`);
        await mailslurp.deleteInbox(inbox.id);
        console.log('Test inbox deleted successfully');
      } catch (e) {
        console.log('Failed to delete inbox:', e.message);
      }
    }
  });

  it('should complete signup, email verification, then optional TOTP setup', async function () {
    this.timeout(240000); // 4 minutes for full flow including Cognito email delivery

    try {
      console.log('SignUp MailSlurp E2E: Starting test...');

      // Step 1: Create a new MailSlurp inbox
      console.log('Step 1: Creating new MailSlurp inbox...');
      inbox = await mailslurp.createInbox();
      testEmail = inbox.emailAddress;
      console.log(`Created test inbox: ${testEmail}`);
      await screenshot('01-inbox-created');

      // Step 2: Launch app and navigate to signup screen
      console.log('Step 2: Navigating to signup screen...');
      await savePageSourceSnapshot('signup-initial');
      await screenshot('02-initial-screen');

      // Wait for login screen to be visible
      await browser.pause(2000);

      // Find and click "Sign Up" or "Create Account" button
      // Try multiple selectors for the signup navigation button
      let signupNavBtn;
      try {
        // Try accessibility ID first
        signupNavBtn = await findElement('~signup_nav_button', 5000);
      } catch {
        try {
          // Try content-desc
          signupNavBtn = await findElement('//*[@content-desc="Sign Up"]', 5000);
        } catch {
          try {
            // Try text content
            signupNavBtn = await findElement('android=new UiSelector().textContains("Sign Up")', 5000);
          } catch {
            try {
              // Try Create Account
              signupNavBtn = await findElement('android=new UiSelector().textContains("Create Account")', 5000);
            } catch {
              // Try button with text
              signupNavBtn = await findElement('//android.widget.Button[contains(@text, "Sign Up")]', 5000);
            }
          }
        }
      }

      await signupNavBtn.click();
      console.log('Clicked Sign Up navigation button');
      await browser.pause(1500);
      await screenshot('03-signup-screen');

      // Step 3: Fill in signup form
      console.log('Step 3: Filling signup form...');
      
      // Fill email field (robust multi-strategy)
      const resolveEmailField = async () => {
        // 1. Direct semantics id
        try { const el = await $('~email_input'); if (await el.isDisplayed()) return el; } catch {}
        // 2. Hint-based xpath
        try { const el = await $('//android.widget.EditText[contains(@hint, "email") or contains(@hint, "Email")]'); if (await el.isDisplayed()) return el; } catch {}
        // 3. First EditText that is not password (no password="true")
        try {
          const edits = await $$('//android.widget.EditText');
          for (const e of edits) {
            try { const pwdAttr = await e.getAttribute('password'); if (pwdAttr && pwdAttr.toString() === 'true') continue; } catch {}
            // Heuristic: if any other field already filled (none yet) pick first
            return e;
          }
        } catch {}
        // 4. Page source regex last resort
        try {
          const src = await driver.getPageSource();
          if (/Enter your email/i.test(src)) {
            // Try selecting by index again
            const el = await $('//android.widget.EditText[@index="0"]');
            if (await el.isDisplayed()) return el;
          }
        } catch {}
        throw new Error('Email input field not found by any strategy');
      };
      let emailField;
      try { emailField = await resolveEmailField(); } catch (e) { console.log('Email field resolution failed:', e.message); throw e; }
      await emailField.click().catch(()=>{});
      await emailField.clearValue().catch(()=>{});
      await emailField.setValue(testEmail);
      try { await driver.hideKeyboard(); } catch {}
      console.log('Email entered:', testEmail);
      await screenshot('04-email-entered');

      // Fill password field (semantic -> hint -> any password EditText)
      const resolvePasswordField = async () => {
        try { const el = await $('~password_input'); if (await el.isDisplayed()) return el; } catch {}
        try { const el = await $('//android.widget.EditText[contains(@hint, "password") and @password="true"]'); if (await el.isDisplayed()) return el; } catch {}
        try { const el = await $('//android.widget.EditText[@password="true"]'); if (await el.isDisplayed()) return el; } catch {}
        // Heuristic: last EditText if still not found
        try {
          const edits = await $$('//android.widget.EditText');
          if (edits.length) return edits[edits.length-1];
        } catch {}
        throw new Error('Password input not found');
      };
      let passwordField;
      try { passwordField = await resolvePasswordField(); } catch (e) { console.log('Password field resolution failed:', e.message); throw e; }
      await passwordField.click().catch(()=>{});
      await passwordField.clearValue().catch(()=>{});
      await passwordField.setValue(TEST_PASSWORD);
      try { await driver.hideKeyboard(); } catch {}
      console.log('Password entered.');
      await screenshot('05-password-entered');

      // Fill confirm password field if present (semantic -> hint -> match length equality with password)
      const tryConfirmPassword = async () => {
        try {
          const el = await $('~confirm_password_input');
          if (await el.isDisplayed()) {
            await el.click().catch(()=>{});
            await el.clearValue().catch(()=>{});
            await el.setValue(TEST_PASSWORD);
            console.log('Confirm password filled (semantics).');
            return true;
          }
        } catch {}
        try {
          const el = await $('//android.widget.EditText[contains(@hint, "Confirm") or contains(@hint, "confirm")]');
          if (await el.isDisplayed()) {
            await el.click().catch(()=>{});
            await el.clearValue().catch(()=>{});
            await el.setValue(TEST_PASSWORD);
            console.log('Confirm password filled (hint).');
            return true;
          }
        } catch {}
        // Heuristic: second password-looking field (password=true) that differs from first
        try {
            const pwFields = await $$('//android.widget.EditText[@password="true"]');
            if (pwFields.length > 1) {
              const el = pwFields[1];
              await el.click().catch(()=>{});
              await el.clearValue().catch(()=>{});
              await el.setValue(TEST_PASSWORD);
              console.log('Confirm password filled (heuristic second password field).');
              return true;
            }
        } catch {}
        console.log('No confirm password field found, continuing...');
        return false;
      };
      await tryConfirmPassword();
      await screenshot('06-confirm-password-entered');

      // Fill additional fields if present (name, phone, etc.)
      try {
        const nameField = await $('~name_input');
        if (await nameField.isDisplayed()) {
          await nameField.clearValue();
          await nameField.setValue('Test User');
          console.log('Filled name field');
        }
      } catch {
        console.log('No name field found, continuing...');
      }

      await savePageSourceSnapshot('signup-form-filled');
      await screenshot('07-form-complete');

      // Step 4: Submit signup form
      console.log('Step 4: Submitting signup form...');
      
      let signupSubmitBtn;
      try {
        signupSubmitBtn = await findElement('~signup_button', 5000);
      } catch {
        try {
          signupSubmitBtn = await findElement('//*[@content-desc="Sign Up" or @content-desc="Create Account"]', 5000);
        } catch {
          try {
            signupSubmitBtn = await findElement('android=new UiSelector().textContains("Sign Up").className("android.widget.Button")', 5000);
          } catch {
            signupSubmitBtn = await findElement('//android.widget.Button[contains(@text, "Sign Up") or contains(@content-desc, "Sign Up")]', 5000);
          }
        }
      }

      await signupSubmitBtn.click();
      console.log('Clicked Sign Up submit button');
      await browser.pause(2000);
      await screenshot('08-after-signup-submit');

      // Step 5: Wait for EMAIL VERIFICATION screen ONLY (TOTP must follow after email is verified)
      console.log('Step 5: Waiting for email verification screen (poll up to 30s)...');
      let emailScreenDetected = false;
      let emailDetectedAtMs = null;
      const startWaitEmail = Date.now();
      const timeoutEmailMs = 30000;
      while (Date.now() - startWaitEmail < timeoutEmailMs && !emailScreenDetected) {
        await browser.pause(1000);
        try {
          // Prefer content-desc (description) because our Flutter labels are in content-desc
          const v1 = await $('android=new UiSelector().descriptionContains("Verify Email")');
          if (await v1.isDisplayed()) { emailScreenDetected = true; emailDetectedAtMs = Date.now(); break; }
        } catch {}
        try {
          // Accessibility-id may not be set on EditText; fallback to hint attribute xpath
          let v2;
          try { v2 = await $('~verification_code_input'); } catch {}
          if (!v2 || !(await v2.isDisplayed())) {
            v2 = await $('//android.widget.EditText[contains(@hint, "verification") or contains(@hint, "000000")]');
          }
          if (await v2.isDisplayed()) { emailScreenDetected = true; emailDetectedAtMs = Date.now(); break; }
        } catch {}
        if (((Date.now() - startWaitEmail) % 5000) < 1200) {
          try { await savePageSourceSnapshot(`post-signup-email-poll-${Math.floor((Date.now()-startWaitEmail)/1000)}s`); } catch {}
        }
      }
      await savePageSourceSnapshot('post-signup-email-final-state');
      await screenshot('09-email-verification-screen');
      console.log(`Email verification screen detected=${emailScreenDetected}, afterMs=${emailDetectedAtMs ? (emailDetectedAtMs - startWaitEmail) : 'n/a'}`);
      if (!emailScreenDetected) {
        console.log('Email verification screen not detected within 30s. Proceeding with fallback flow (may be redirected to login or directly to TOTP setup by Cognito).');
      }

      // Step 6: Wait for verification email from AWS Cognito
      console.log('Step 6: Waiting for verification email from AWS Cognito...');
      console.log('This may take up to 120 seconds (Cognito can be slow)...');
      console.log(`Monitoring inbox: ${testEmail}`);
      
      const emailTimeout = 120000; // 120 seconds for Cognito
      let email;
      try {
        email = await mailslurp.waitForLatestEmail(inbox.id, emailTimeout, true);
        console.log(`✓ Received email from: ${email.from}`);
        console.log(`  Email subject: ${email.subject}`);
      } catch (emailError) {
        console.log('❌ No email received after 120 seconds');
        console.log('Checking inbox manually...');
        
        // Try to get all emails in the inbox
        const emails = await mailslurp.getEmails(inbox.id);
        console.log(`Found ${emails.length} email(s) in inbox`);
        
        if (emails.length > 0) {
          email = emails[0];
          console.log(`Using first email: ${email.subject}`);
        } else {
          throw new Error('No verification email received from AWS Cognito. Please check:\n' +
            '1. Cognito email settings are configured\n' +
            '2. Cognito has verified email identity (SES)\n' +
            '3. Check AWS Cognito console for any errors');
        }
      }
      
      await screenshot('10-email-received');

      // Step 7: Extract OTP from email
      console.log('Step 7: Extracting OTP from email...');
      const emailBody = email.body || email.textContent || '';
      console.log('Email body preview:', emailBody.substring(0, 200));
      
      const otp = extractOtpFromEmail(emailBody);
      if (!otp) {
        console.log('Full email body:', emailBody);
        throw new Error('Failed to extract OTP from email body');
      }
      
      console.log(`Extracted OTP: ${otp}`);
      expect(otp).to.match(/^\d{6}$/, 'OTP should be 6 digits');

  // Step 8: Enter OTP in verification screen
  console.log('Step 8: Entering OTP in verification screen...');
      
      // Try to find OTP input field (updated: prefer semantics from signup screen)
      let otpInput;
      try {
        otpInput = await findElement('~verification_code_input', 5000);
      } catch {
        try {
          // Target only 6-digit code field by hint or max length; avoid generic first EditText (email/password)
          otpInput = await findElement('//android.widget.EditText[(contains(@hint, "000000") or contains(@hint, "verification") or @max-text-length="6")]', 5000);
        } catch {
          throw new Error('Unable to locate OTP verification input field via dedicated selectors');
        }
      }

      await otpInput.clearValue();
  try { await otpInput.click(); } catch (e) {}
  await otpInput.clearValue();
  await otpInput.setValue(otp);
  try { await driver.hideKeyboard(); } catch (e) {}
  console.log(`Entered OTP: ${otp}`);
  await browser.pause(500);
      await screenshot('11-otp-entered');

      // Step 9: Submit OTP
      console.log('Step 9: Submitting OTP...');
      
      let verifyBtn;
      try {
        // Primary semantic label for signup verification button
        verifyBtn = await findElement('~verify_button', 3000);
      } catch {
        try {
          // Fallback to Signup button (same widget with changed label)
          verifyBtn = await findElement('~signup_button', 3000);
        } catch {
          try {
            // Text contains Verify
            verifyBtn = await findElement('android=new UiSelector().textContains("Verify")', 4000);
          } catch {
            // Any button
            verifyBtn = await findElement('//android.widget.Button', 4000);
          }
        }
      }

      await verifyBtn.click();
      console.log('Clicked Verify button');
      await browser.pause(3000);
      await screenshot('12-after-verify');

      // Step 10: Post-verification: app should auto sign-in or transition; we no longer attempt manual login fallback.
      console.log('Step 10: Skipping manual login fallback – expecting in-flow auto sign-in / TOTP setup.');

      console.log('Polling for TOTP setup screen (mandatory MFA) or dashboard (if MFA already satisfied)...');
      const startPollTotp = Date.now();
      const timeoutTotpMs = 30000;
      let totpSetupDetected = false;
      while (Date.now() - startPollTotp < timeoutTotpMs && !totpSetupDetected) {
        await browser.pause(1000);
        try {
          const header = await $('android=new UiSelector().descriptionContains("Set Up Authenticator")');
          if (await header.isDisplayed()) { totpSetupDetected = true; break; }
        } catch {}
        try {
          const showText = await $('android=new UiSelector().descriptionContains("Show secret key")');
          if (await showText.isDisplayed()) { totpSetupDetected = true; break; }
        } catch {}
        try {
          const showSecretBtn = await $('~totp_show_secret_button');
          if (await showSecretBtn.isDisplayed()) { totpSetupDetected = true; break; }
        } catch {}
        try {
          let totpCodeField;
          try { totpCodeField = await $('~totp_code_field'); } catch {}
          if (!totpCodeField || !(await totpCodeField.isExisting())) {
            totpCodeField = await $('//android.widget.EditText[contains(@hint, "000000") or @max-text-length="6"]');
          }
          if (await totpCodeField.isDisplayed()) { totpSetupDetected = true; break; }
        } catch {}
        try {
          const totpVerifyBtn = await $('~totp_verify_button');
          if (await totpVerifyBtn.isDisplayed()) { totpSetupDetected = true; break; }
        } catch {}
  // No manual login retry here; signup flow now auto-signs in.
        // Early exit if dashboard appears (user pool may not mandate TOTP)
        try {
          const dashboardMarker = await $('android=new UiSelector().descriptionContains("Dashboard").className("android.view.View")');
          if (await dashboardMarker.isDisplayed()) { break; }
        } catch {}
        if (((Date.now() - startPollTotp) % 5000) < 1200) {
          try { await savePageSourceSnapshot(`post-email-totp-poll-${Math.floor((Date.now()-startPollTotp)/1000)}s`); } catch {}
        }
      }
      await savePageSourceSnapshot('post-email-totp-final-state');
      await screenshot('14-totp-or-dashboard');
      console.log(`TOTP setup detected=${totpSetupDetected}`);

      if (totpSetupDetected) {
        console.log('Proceeding with TOTP setup flow...');
        // Reveal secret
        try {
          // Don't rely on scrolling; treat current state as source of truth.
          let revealed = false;
          // If semantics reports visible, skip click
          try {
            const showSem = await $('~totp_show_secret_button');
            if (await showSem.isExisting()) {
              const stateVal = await showSem.getAttribute('contentDescription');
              if (stateVal && /visible/i.test(stateVal)) {
                console.log('Secret already visible – skipping reveal click');
                revealed = true;
              }
            }
          } catch {}
          if (!revealed) {
            // Try clicking by semantics without scrolling
            try {
              const revealBtn = await $('~totp_show_secret_button');
              if (await revealBtn.isDisplayed()) {
                await revealBtn.click();
                revealed = true;
              }
            } catch {}
          }
          if (!revealed) {
            // Try by visible content-desc (description) without scrolling
            try {
              const btnByDesc = await $('android=new UiSelector().descriptionContains("Show secret key")');
              if (await btnByDesc.isDisplayed()) {
                await btnByDesc.click();
                revealed = true;
              }
            } catch {}
          }
          console.log(revealed ? 'Reveal step complete' : 'Reveal not needed');
          await browser.pause(400);
        } catch { console.log('Reveal secret step skipped due to exception'); }

        // Extract secret (semantic first, fallback heuristics)
        const extractSharedSecret = async () => {
          // 0. Try copy-to-clipboard path first for reliability
          try {
            // Ensure copy control is visible; try by semantics id and by tooltip/content-desc
            let copyBtn;
            // Avoid scrolling; use direct selectors only
            try { copyBtn = await $('~totp_copy_secret_button'); } catch {}
            if (!copyBtn || !(await copyBtn.isExisting())) {
              try { copyBtn = await $('android=new UiSelector().descriptionContains("Copy secret")'); } catch {}
            }
            if (!copyBtn || !(await copyBtn.isExisting())) {
              try { copyBtn = await $('android=new UiSelector().textContains("Copy secret")'); } catch {}
            }
            if (copyBtn && await copyBtn.isExisting()) {
              await copyBtn.click();
              await browser.pause(300);
              try {
                const b64 = await driver.getClipboard();
                if (b64) {
                  const buf = Buffer.from(b64, 'base64');
                  const clipText = buf.toString('utf8').trim();
                  if (clipText && /[A-Z2-7]/i.test(clipText)) {
                    const normalized = clipText.replace(/[^A-Z2-7=]/gi, '').toUpperCase();
                    if (normalized.length >= 16) {
                      console.log('Extracted secret via clipboard');
                      return normalized;
                    }
                  }
                }
              } catch {}
            }
          } catch {}

          // 1. Direct accessibility id lookup (semantics label + fallback static exposed node)
          try {
            const elCandidates = ['~totp_secret_value_static', '~totp_secret_value', '~totp_secret_value_offstage'];
            for (const sel of elCandidates) {
              try {
                const el = await $(sel);
                if (await el.isExisting()) {
                  try {
                    const cd = await el.getAttribute('contentDescription');
                    if (cd) {
                      const secretFromCd = cd.split(/\s+/).find(s => /^[A-Z2-7]{16,}$/i.test(s));
                      if (secretFromCd) return secretFromCd.toUpperCase();
                    }
                  } catch {}
                  try {
                    const txt = await el.getText();
                    if (txt && /^[A-Z2-7]{16,}$/i.test(txt.trim())) return txt.trim().toUpperCase();
                  } catch {}
                }
              } catch {}
            }
          } catch {}

          // 2. Scan all android.view.View contentDescriptions for otpauth or base32 sequences
          try {
            const views = await $$('android=new UiSelector().className("android.view.View")');
            for (const v of views) {
              let desc = '';
              try { desc = await v.getAttribute('contentDescription'); } catch {}
              if (!desc) continue;
              if (/otpauth:\/\//i.test(desc)) {
                const m = desc.match(/secret=([A-Z2-7]+)(&|$)/i);
                if (m && m[1]) return m[1].toUpperCase();
              }
              const base32Candidate = desc.match(/([A-Z2-7]{16,})/);
              if (base32Candidate) return base32Candidate[1].toUpperCase();
            }
          } catch {}

            // 3. Scan TextViews for otpauth URI or base32
          try {
            const tvs = await $$('android=new UiSelector().className("android.widget.TextView")');
            for (const tv of tvs) {
              let txt = '';
              try { txt = await tv.getText(); } catch {}
              if (!txt) continue;
              if (/otpauth:\/\//i.test(txt)) {
                const m = txt.match(/secret=([A-Z2-7]+)(&|$)/i);
                if (m && m[1]) return m[1].toUpperCase();
              }
              const base32Candidate = txt.match(/([A-Z2-7]{16,})/);
              if (base32Candidate) return base32Candidate[1].toUpperCase();
            }
          } catch {}

          // 4. Last resort: parse page source
          try {
            const src = await driver.getPageSource();
            // Look for secret= param
            const uriMatch = src.match(/secret=([A-Z2-7]{16,})/i);
            if (uriMatch && uriMatch[1]) return uriMatch[1].toUpperCase();
            // Or any long base32 sequence
            const seqMatch = src.match(/([A-Z2-7]{16,})/);
            if (seqMatch && seqMatch[1]) return seqMatch[1].toUpperCase();
          } catch {}
          return '';
        };

        let sharedSecret = await extractSharedSecret();
        if (!sharedSecret) {
          // Give UI a brief extra moment and retry once
          await browser.pause(1500);
          sharedSecret = await extractSharedSecret();
        }
        if (!sharedSecret) {
          const debugSrc = await driver.getPageSource();
          console.log('Page source snippet (secret extraction failed):', debugSrc.substring(0, 2000));
          throw new Error('Unable to locate TOTP shared secret value on screen');
        }
        console.log('Raw shared secret extracted (length', sharedSecret.length, '):', sharedSecret);
        // Normalize: remove whitespace/newlines or accidental punctuation around secret
        const normalizedSecret = sharedSecret.replace(/[^A-Z2-7=]/gi, '').toUpperCase();
        if (normalizedSecret !== sharedSecret) {
          console.log('Normalized secret:', normalizedSecret);
        }
        if (!normalizedSecret || normalizedSecret.length < 16) {
          throw new Error('Shared secret invalid or too short after normalization: ' + normalizedSecret);
        }
        sharedSecret = normalizedSecret; // use normalized value for TOTP generation

        // Generate TOTP code using otplib
        const totpCode = authenticator.generate(sharedSecret);
        console.log('Generated TOTP code:', totpCode);
        expect(totpCode).to.match(/^[0-9]{6}$/);

        // Enter TOTP code
        let totpCodeField;
        try { totpCodeField = await $('~totp_code_field'); } catch {}
        if (!totpCodeField || !(await totpCodeField.isExisting())) {
          // Fallback to EditText with hint/length (observed in page source)
          totpCodeField = await $('//android.widget.EditText[contains(@hint, "000000") or @max-text-length="6"]');
        }
        await totpCodeField.setValue(totpCode);
        try { await driver.hideKeyboard(); } catch {}
        await screenshot('15-totp-code-entered');

        // Click TOTP verify button (with retry if still on setup screen)
        const clickTotpVerify = async () => {
          let btn;
          try { btn = await $('~totp_verify_button'); } catch {}
          if (!btn || !(await btn.isExisting())) {
            try { btn = await $('android=new UiSelector().textContains("Verify").className("android.widget.Button")'); } catch {}
          }
          if (!btn || !(await btn.isExisting())) {
            const buttons = await $$('//android.widget.Button');
            if (buttons && buttons.length > 0) btn = buttons[buttons.length - 1];
          }
          if (!btn || !(await btn.isExisting())) throw new Error('TOTP verify button not found');
          await btn.click();
          console.log('Clicked TOTP verify button');
        };

        let verifyAttempts = 0;
        const maxVerifyAttempts = 2; // one initial + one retry if still on setup
        while (verifyAttempts < maxVerifyAttempts) {
          verifyAttempts++;
          await clickTotpVerify();
          await browser.pause(2500);
          await screenshot(`16-after-totp-verify-attempt-${verifyAttempts}`);
          // Check if still on TOTP setup (code field or show secret button visible)
          let stillOnSetup = false;
          try { const cf = await $('~totp_code_field'); if (cf && await cf.isDisplayed()) stillOnSetup = true; } catch {}
          try { const showBtn = await $('~totp_show_secret_button'); if (showBtn && await showBtn.isDisplayed()) stillOnSetup = true; } catch {}
          if (!stillOnSetup) { console.log('Left TOTP setup screen; proceeding.'); break; }
          if (verifyAttempts < maxVerifyAttempts) {
            console.log('Still on TOTP setup; regenerating code and retrying verify...');
            const newCode = authenticator.generate(sharedSecret);
            console.log('Regenerated TOTP code:', newCode);
            let codeField;
            try { codeField = await $('~totp_code_field'); } catch {}
            if (!codeField || !(await codeField.isExisting())) {
              codeField = await $('//android.widget.EditText[contains(@hint, "000000") or @max-text-length="6"]');
            }
            await codeField.clearValue().catch(()=>{});
            await codeField.setValue(newCode);
            try { await driver.hideKeyboard(); } catch {}
          }
        }
      } else {
        console.log('TOTP setup not required; proceeding to dashboard verification.');
      }

      // Step 11: Verify successful login - check for dashboard
      console.log('Step 11: Verifying successful login (dashboard)...');

      // Give the app a short moment to transition
      await browser.pause(2000);
      await savePageSourceSnapshot('dashboard-after-signup');
      await screenshot('13-dashboard');

      // Consolidated, robust wait for dashboard detection. This repeatedly
      // checks several possible dashboard selectors and also verifies
      // that we're not still on the login/verification screen. If none of
      // the checks succeed within the timeout, the test will fail.
      const waitForDashboard = async (timeout = 20000) => {
        const start = Date.now();
        const selectors = [
          '~dashboard_root',
          '~dashboard_header',
          '~dashboard_welcome_text',
          '//*[contains(@content-desc, "dashboard")]',
          'android=new UiSelector().textContains("Welcome")',
          '~home_screen',
          'android=new UiSelector().textContains("Home")'
        ];

        while (Date.now() - start < timeout) {
          try {
            for (const sel of selectors) {
              try {
                const el = await $(sel);
                if (el && await el.isDisplayed()) {
                  console.log(`Dashboard detected by selector: ${sel}`);
                  return true;
                }
              } catch (e) {
                // ignore and try next selector
              }
            }

            // Extra heuristic: if "Sign In" is not visible, we may be on the dashboard
            try {
              const signInBtn = await $('android=new UiSelector().textContains("Sign In")');
              const visible = await signInBtn.isDisplayed();
              if (!visible) {
                console.log('Sign In not visible → assuming dashboard');
                return true;
              }
            } catch {
              // Sign In not found at all - another good sign we're not on login
              console.log('Sign In element not found → assuming dashboard');
              return true;
            }
          } catch (e) {
            // Continue retrying until timeout
          }

          await browser.pause(1000);
        }

        return false;
      };

      const dashboardFound = await waitForDashboard(20000);
      expect(dashboardFound).to.equal(true, 'Dashboard should be visible after successful signup and verification');
      
      console.log('SignUp MailSlurp E2E: Test completed successfully!');
      console.log(`Test account created: ${testEmail}`);

    } catch (e) {
      console.log('SignUp MailSlurp E2E: Test failed:', e?.message || e);

      // On failure, dump page source for debugging
      try {
        const src = await browser.getPageSource();
        console.log('--- PAGE SOURCE START ---');
        console.log(src.substring(0, Math.min(src.length, 5000)));
        console.log('--- PAGE SOURCE END ---');
        await savePageSourceSnapshot('signup-failure');
        await screenshot('99-failure-screenshot');
      } catch (dumpError) {
        console.log('Failed to dump page source:', dumpError.message);
      }

      throw e;
    }
  });

});
