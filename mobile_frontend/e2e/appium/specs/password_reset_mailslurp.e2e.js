const { expect } = require('chai');
const { MailSlurp } = require('mailslurp-client');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');
const fs = require('fs');

describe('Password Reset with MailSlurp', () => {
  let mailslurp;
  let inbox;
  let testEmail;
  const MAILSLURP_API_KEY = process.env.MAILSLURP_API_KEY || 'c86e3a916e92cd5ccd3135c3ad403fd326a5108364fb415503bf304a571c0fae';
  const NEW_PASSWORD = 'TestPass123!@#';  // Includes uppercase, lowercase, numbers, special chars to meet strict requirements
  
  // Use existing MailSlurp inbox - get these from your MailSlurp account
  // These emails should already be created in both MailSlurp and Cognito
  const EXISTING_MAILSLURP_EMAIL = process.env.MAILSLURP_EMAIL || '7ed317c1-38ca-43bb-bed6-621c5da3169c@mailslurp.biz';
  const EXISTING_INBOX_ID = process.env.MAILSLURP_INBOX_ID; // Optional: if you know the inbox ID

  const findElement = async (selector, timeout = 15000) => {
    console.log(`Finding element: ${selector} (timeout ${timeout}ms)`);
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    return el;
  };

  const typeText = async (selector, text, label = '') => {
    console.log(`Typing ${label || 'text'} into ${selector}`);
    const element = await findElement(selector);
    try { await element.click(); } catch (e) {}
    await element.clearValue();
    await element.setValue(text);
    try { await driver.hideKeyboard(); } catch (e) {}
    await browser.pause(300);
  };


  const extractOtpFromEmail = (emailBody) => {
    const patterns = [
      /reset code is[:\s]+(\d{6})/i,
      /verification code is[:\s]+(\d{6})/i,
      /code[:\s]+(\d{6})/i,
      /\b(\d{6})\b/
    ];

    for (const p of patterns) {
      const m = emailBody.match(p);
      if (m && m[1]) return m[1];
    }
    const any = emailBody.match(/\d{6}/);
    return any ? any[0] : null;
  };

  // Get existing MailSlurp inbox by email address
  const getExistingMailSlurpInbox = async () => {
    try {
      console.log(`Using existing MailSlurp email: ${EXISTING_MAILSLURP_EMAIL}`);

      // If an explicit inbox id was provided, try to fetch it directly first
      if (EXISTING_INBOX_ID) {
        try {
          console.log(`Attempting to load inbox by ID: ${EXISTING_INBOX_ID}`);
          const byId = await mailslurp.getInbox(EXISTING_INBOX_ID);
          if (byId && byId.emailAddress) {
            console.log(`✓ Found inbox by ID: ${byId.emailAddress}`);
            return byId;
          }
        } catch (idErr) {
          console.log('Could not load inbox by ID:', idErr.message || idErr);
        }
      }

      // getAllInboxes can return different shapes depending on client version
      const result = await mailslurp.getAllInboxes(0, 100); // try first 100
      console.log('Raw getAllInboxes result keys:', Object.keys(result || {}).slice(0, 6));

      // Normalize inbox list from possible response shapes
      let inboxes = [];
      if (Array.isArray(result)) inboxes = result;
      else if (result && Array.isArray(result.content)) inboxes = result.content;
      else if (result && Array.isArray(result.inboxes)) inboxes = result.inboxes;
      else if (result && Array.isArray(result.value)) inboxes = result.value;
      else if (result && result.results && Array.isArray(result.results)) inboxes = result.results;

      console.log(`Found ${inboxes.length} inboxes (normalized)`);
      if (inboxes.length > 0) console.log('First few inboxes:', inboxes.slice(0, 5).map(i => i.emailAddress).join(', '));

      // Try exact match first, then case-insensitive contains
      let existingInbox = inboxes.find(i => i.emailAddress === EXISTING_MAILSLURP_EMAIL);
      if (!existingInbox) {
        existingInbox = inboxes.find(i => i.emailAddress && i.emailAddress.toLowerCase().includes(EXISTING_MAILSLURP_EMAIL.toLowerCase()));
      }

      if (existingInbox) {
        console.log(`✓ Found existing inbox: ${existingInbox.emailAddress}`);
        return existingInbox;
      }

      // As a last resort, try to fetch inbox by searching pages (if many)
      console.log('Inbox not found in first page; attempting a broader search (pages 0..9)');
      for (let page = 0; page < 10; page++) {
        try {
          const pageResult = await mailslurp.getAllInboxes(page, 100);
          const pageInboxes = Array.isArray(pageResult) ? pageResult : (pageResult.content || pageResult.inboxes || pageResult.value || pageResult.results || []);
          if (!Array.isArray(pageInboxes) || pageInboxes.length === 0) break;
          const found = pageInboxes.find(i => i.emailAddress === EXISTING_MAILSLURP_EMAIL || (i.emailAddress && i.emailAddress.toLowerCase().includes(EXISTING_MAILSLURP_EMAIL.toLowerCase())));
          if (found) {
            console.log(`✓ Found inbox on page ${page}`);
            return found;
          }
        } catch (pageErr) {
          console.log(`Page ${page} search error:`, pageErr.message || pageErr);
          break;
        }
      }

      console.error(`✗ Could not find inbox for ${EXISTING_MAILSLURP_EMAIL}`);
      console.log('Available inboxes (sample):', inboxes.map(i => i.emailAddress).slice(0, 20).join(', '));
      throw new Error(`Inbox for ${EXISTING_MAILSLURP_EMAIL} not found in MailSlurp`);
    } catch (e) {
      console.error('Error getting MailSlurp inbox:', e.message || e);
      throw e;
    }
  };

  before(async function () {
    if (!MAILSLURP_API_KEY) throw new Error('MAILSLURP_API_KEY is required');
    mailslurp = new MailSlurp({ apiKey: MAILSLURP_API_KEY });
  });

  afterEach(async function () {
    // No cleanup needed - using pre-existing MailSlurp inbox and Cognito user
    // These resources should be reused across test runs
    console.log('Test completed - no cleanup needed for pre-existing resources');
  });

  it('should request a password reset and complete it via MailSlurp', async function () {
    this.timeout(240000);

    try {
      console.log('Using existing MailSlurp inbox...');
      inbox = await getExistingMailSlurpInbox();
      testEmail = EXISTING_MAILSLURP_EMAIL;
      console.log(`Test will use existing email: ${testEmail}`);
      await screenshot('pr-01-inbox-ready');

      // CRITICAL: Assuming user already exists in Cognito with this email
      // No need to create user - it should already be set up
      console.log('✓ Using pre-configured test user for password reset');
      await browser.pause(1000);

      // CRITICAL: Wait for app to fully load and render login screen
      console.log('Waiting for app to load...');
      await browser.pause(2000);
      
      // Ensure we're on the login screen, then navigate to Forgot Password
      await savePageSourceSnapshot('pr-initial');
      await screenshot('pr-02-initial');

      // Navigate to Forgot Password screen - CRITICAL: Must click the button AND wait for screen change
      console.log('Navigating to Forgot Password screen...');
      
      // First, wait for login screen to be ready with multiple attempts
      let emailField = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Attempt ${attempt} to find email input...`);
        try {
          emailField = await findElement('~email_input', 10000);
          console.log('✓ Found email field via Semantics');
          break;
        } catch (e) {
          if (attempt < 3) {
            console.log(`Attempt ${attempt} failed, retrying...`);
            await browser.pause(1000);
          } else {
            // Try fallback: generic EditText
            console.log('Trying fallback selector for email field...');
            try {
              emailField = await findElement('//android.widget.EditText', 5000);
              console.log('✓ Found email field via EditText fallback');
            } catch (e2) {
              console.error('Could not find email field:', e2.message);
              await savePageSourceSnapshot('pr-email-field-not-found');
              await screenshot('pr-email-field-not-found');
              throw new Error('Email field not found after 3 attempts');
            }
          }
        }
      }
      console.log('Login screen confirmed');

      // Find and click the Forgot Password button
      let forgotBtn;
      try {
        forgotBtn = await findElement('~login_forgot_password', 5000);
      } catch {
        try {
          forgotBtn = await findElement('//*[@content-desc="Forgot Password?"]', 5000);
        } catch {
          forgotBtn = await findElement('android=new UiSelector().textContains("Forgot Password")', 5000);
        }
      }

      console.log('Found Forgot Password button, clicking...');
      await forgotBtn.click();
      console.log('Button clicked, waiting for screen transition...');
      
      // CRITICAL: Wait significantly longer for Flutter navigation to complete
      await browser.pause(3000);

      // Now attempt to find the forgot screen email field
      console.log('Checking if navigation succeeded...');
      let forgotEmailField = null;

      // Try the Semantics accessor first
      try {
        forgotEmailField = await findElement('~fp_email_input', 6000);
        console.log('✓ Found forgot screen email field via Semantics');
      } catch {
        console.log('Semantics accessor not found, trying generic methods...');
        // Try looking for any EditText with Email label
        try {
          forgotEmailField = await findElement('//android.widget.EditText[contains(@hint, "Email")]', 5000);
          console.log('✓ Found email field via hint');
        } catch {
          // Last resort: get all EditTexts and pick the one in a position different from login
          const allEditTexts = await $$('//android.widget.EditText');
          if (allEditTexts.length > 0) {
            // On forgot screen, typically email is the only visible EditText; on login there are 2
            for (const el of allEditTexts) {
              try {
                const displayed = await el.isDisplayed();
                if (displayed) {
                  forgotEmailField = el;
                  console.log('✓ Found first displayed EditText');
                  break;
                }
              } catch {}
            }
          }
        }
      }

      if (!forgotEmailField) {
        await savePageSourceSnapshot('pr-forgot-screen-not-found');
        await screenshot('pr-forgot-screen-not-found');
        throw new Error('Navigation to Forgot Password screen failed or screen structure changed. Aborting to avoid typing into login field.');
      }

      console.log('Email field confirmed on forgot screen');

      // Type the email into the forgot screen email field
      console.log('Filling email for reset...');

  try { await forgotEmailField.click(); } catch {}
  try { await forgotEmailField.clearValue(); } catch {}
  await forgotEmailField.setValue(testEmail);
      try { await driver.hideKeyboard(); } catch {}
      await screenshot('pr-03-email-entered');

      // Email entered above via flexible detection; proceed to request reset code

      // Click send reset code
      console.log('Submitting request for reset code...');
      let sendBtn;
      try {
        sendBtn = await findElement('//*[@content-desc="Send Reset Code"]', 5000);
        console.log('✓ Found Send Reset Code button via content-desc');
      } catch {
        try { 
          sendBtn = await findElement('android=new UiSelector().textContains("Send Reset Code")', 5000); 
          console.log('✓ Found Send Reset Code button via UiSelector text');
        } catch {
          try { 
            sendBtn = await findElement('android=new UiSelector().descriptionContains("Send Reset Code")', 5000); 
            console.log('✓ Found Send Reset Code button via UiSelector description');
          } catch { sendBtn = null; }
        }
      }
      if (!sendBtn) throw new Error('Could not find Send Reset Code button');
      console.log('Clicking Send Reset Code button...');
      await sendBtn.click();
      await browser.pause(2000);
      await screenshot('pr-04-after-request');

      // Wait for email
      console.log('Waiting for reset email (up to 120s)...');
      let email;
      try {
        email = await mailslurp.waitForLatestEmail(inbox.id, 120000, true);
        console.log(`Received email: ${email.subject}`);
      } catch (e) {
        const all = await mailslurp.getEmails(inbox.id);
        if (all.length === 0) throw new Error('No reset email received; check Cognito/SES settings');
        email = all[0];
      }
      await screenshot('pr-05-email-received');

      const body = email.body || email.textContent || '';
      const otp = extractOtpFromEmail(body);
      if (!otp) throw new Error('Failed to extract OTP from reset email');
      console.log(`Extracted OTP: ${otp}`);

      // Enter verification code
      console.log('Entering verification code...');
      let codeField;
      try { 
        codeField = await findElement('~fp_code_input', 6000);
        console.log('Found code field via semantic accessor');
      } catch {
        console.log('Semantic accessor failed, trying alternative selectors...');
        try { 
          codeField = await findElement('//android.widget.EditText[@hint]', 6000);
          console.log('Found code field via generic EditText with hint');
        } catch {
          try {
            codeField = await findElement('android=new UiSelector().className("android.widget.EditText").index(2)', 6000);
            console.log('Found code field via index selector');
          } catch {
            codeField = await findElement('//android.widget.EditText', 8000);
            console.log('Found code field via generic EditText');
          }
        }
      }
  try { await codeField.click(); } catch (e) {}
  try { await codeField.clearValue(); } catch (e) {}
  await codeField.setValue(otp);
      try { await driver.hideKeyboard(); } catch (e) {}
      await screenshot('pr-06-otp-entered');

      // Enter new password and confirm
      console.log('Entering new password...');
      let newPassField;
      try { newPassField = await findElement('~fp_new_password_input', 5000); } catch {
        try { newPassField = await findElement('android=new UiSelector().textContains("New Password").className("android.widget.EditText")', 5000); } catch {
          newPassField = await findElement('//android.widget.EditText[contains(@text, "New Password") or contains(@hint, "New Password")]');
        }
      }
  try { await newPassField.click(); } catch (e) {}
  try { await newPassField.clearValue(); } catch (e) {}
  await newPassField.setValue(NEW_PASSWORD);
      try { await driver.hideKeyboard(); } catch (e) {}

      let confirmField;
      try { confirmField = await findElement('~fp_confirm_password_input', 5000); } catch {
        try { confirmField = await findElement('android=new UiSelector().textContains("Confirm Password").className("android.widget.EditText")', 5000); } catch {
          confirmField = await findElement('//android.widget.EditText[contains(@text, "Confirm") or contains(@hint, "Confirm")]');
        }
      }
  try { await confirmField.click(); } catch (e) {}
  try { await confirmField.clearValue(); } catch (e) {}
  await confirmField.setValue(NEW_PASSWORD);
      try { await driver.hideKeyboard(); } catch (e) {}
      await screenshot('pr-07-passwords-entered');

      // Submit reset
      console.log('Submitting password reset...');
      let resetBtn;
      try { 
        resetBtn = await findElement('~fp_action_button_verify', 3000);
        console.log('Found reset button via semantic accessor');
      } catch {
        try { 
          resetBtn = await findElement('//*[@content-desc="Reset Password"]', 5000);
          console.log('Found reset button via content-desc');
        } catch {
          try {
            resetBtn = await findElement('android=new UiSelector().textContains("Reset Password").className("android.widget.Button")', 5000);
            console.log('Found reset button via UiSelector with text');
          } catch {
            resetBtn = await findElement('android=new UiSelector().textContains("Reset")', 5000);
            console.log('Found reset button via UiSelector with partial text');
          }
        }
      }
      await resetBtn.click();
      console.log('Reset button clicked, waiting for response...');
      await browser.pause(3000);  // Wait longer for API response
      await screenshot('pr-08-after-reset');

      // Verify success by checking page source for success message or navigation
      console.log('Verifying password reset success...');
      let success = false;
      let errorMessage = null;
      
      // Wait for any navigation or success message
      await browser.pause(2000);
      
      // Get page source to check what's currently displayed
      const pageSource = await browser.getPageSource();
      console.log('Checking page source for success indicators...');
      
      // Check if we've navigated away from the reset form (Reset/Resend buttons gone)
      const hasResetButton = pageSource.includes('content-desc="Reset Password"');
      const hasResendButton = pageSource.includes('content-desc="Resend Code"');
      
      console.log(`Form still visible: resetBtn=${hasResetButton}, resendBtn=${hasResendButton}`);
      
      // PRIMARY SUCCESS CRITERIA: Buttons are gone = navigation happened successfully
      if (!hasResetButton && !hasResendButton) {
        console.log('✓ Successfully navigated away from forgot password form - password reset succeeded');
        success = true;
      }
      
      // If form is still visible, check for explicit success message (might still be on same screen)
      if (!success && (pageSource.includes('Password reset successful') || pageSource.includes('Please login'))) {
        console.log('✓ Found explicit success message in page source');
        success = true;
      }
      
      // Debug: If still failed, check for error indication
      if (!success) {
        console.log('❌ Form buttons still visible - password reset may have failed');
        console.log('Page state:', {
          hasResetButton,
          hasResendButton,
          hasSuccessMessage: pageSource.includes('successful'),
          hasErrorMessage: pageSource.includes('Error') || pageSource.includes('error'),
        });
        
        // Save page source for inspection
        const fs = require('fs');
        const path = require('path');
        const artifactDir = path.join(__dirname, 'artifacts/pagesource');
        if (!fs.existsSync(artifactDir)) {
          fs.mkdirSync(artifactDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(artifactDir, 'success-check.xml'),
          pageSource
        );
        console.log('Page source saved to success-check.xml');
      }

      expect(success).to.equal(true, 'Password reset should navigate away from reset form (buttons disappear). Form still visible means Amplify confirmResetPassword() failed - check password complexity requirements or OTP expiration.');
      console.log('✓ Password reset flow completed successfully');

    } catch (e) {
      console.log('Password reset test failed:', e?.message || e);
      try { await savePageSourceSnapshot('pr-failure'); await screenshot('pr-99-failure'); } catch (dumpErr) {}
      throw e;
    }
  });
});
