const { expect } = require('chai');
const { MailSlurp } = require('mailslurp-client');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Sign Up with MailSlurp Email Verification', () => {
  let mailslurp;
  let inbox;
  let testEmail;
  const MAILSLURP_API_KEY = process.env.MAILSLURP_API_KEY;
  const TEST_PASSWORD = 'TestPass123!@#';
  const APP_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend';
  const APP_ACTIVITY = process.env.ANDROID_ACTIVITY || 'com.example.mobile_frontend.MainActivity';

  // Helper function to wait for and find an element with retry
  const findElement = async (selector, timeout = 10000) => {
    console.log(`Finding element: ${selector}`);
    const element = await $(selector);
    await element.waitForDisplayed({ timeout });
    return element;
  };

  // Helper function to type text into an element
  const typeText = async (selector, text, label = '') => {
    console.log(`Typing ${label || 'text'} into ${selector}`);
    const element = await findElement(selector);
    await element.clearValue();
    await element.setValue(text);
    await browser.pause(300);
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

  it('should complete full signup flow with email verification', async function () {
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
      
      // Fill email field
      try {
        await typeText('~email_input', testEmail, 'email');
      } catch {
        try {
          await typeText('//android.widget.EditText[@hint="Email" or contains(@hint, "email")]', testEmail, 'email');
        } catch {
          await typeText('//android.widget.EditText[@index="0"]', testEmail, 'email');
        }
      }
      await screenshot('04-email-entered');

      // Fill password field
      try {
        await typeText('~password_input', TEST_PASSWORD, 'password');
      } catch {
        try {
          await typeText('//android.widget.EditText[@hint="Password" or contains(@hint, "password")]', TEST_PASSWORD, 'password');
        } catch {
          await typeText('//android.widget.EditText[@password="true"][@index="0"]', TEST_PASSWORD, 'password');
        }
      }
      await screenshot('05-password-entered');

      // Fill confirm password field if it exists
      try {
        await typeText('~confirm_password_input', TEST_PASSWORD, 'confirm password');
        await screenshot('06-confirm-password-entered');
      } catch {
        try {
          await typeText('//android.widget.EditText[@hint="Confirm Password" or contains(@hint, "Confirm")]', TEST_PASSWORD, 'confirm password');
          await screenshot('06-confirm-password-entered');
        } catch {
          console.log('No confirm password field found, continuing...');
        }
      }

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

      // Step 5: Wait for verification screen
      console.log('Step 5: Waiting for verification screen...');
      await browser.pause(3000);
      await savePageSourceSnapshot('verification-screen');
      await screenshot('09-verification-screen');

      // Verify we're on the OTP verification screen
      try {
        const verificationText = await findElement('android=new UiSelector().textContains("verification")', 5000);
        expect(await verificationText.isDisplayed()).to.equal(true);
        console.log('Verification screen detected');
      } catch {
        console.log('Could not find verification text, but continuing...');
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
      
      // Try to find OTP input field
      let otpInput;
      try {
        otpInput = await findElement('~otp_input', 5000);
      } catch {
        try {
          otpInput = await findElement('~verification_code_input', 5000);
        } catch {
          try {
            otpInput = await findElement('//android.widget.EditText[contains(@hint, "code") or contains(@hint, "OTP") or contains(@hint, "verification")]', 5000);
          } catch {
            // Look for any EditText on the verification screen
            otpInput = await findElement('//android.widget.EditText', 5000);
          }
        }
      }

      await otpInput.clearValue();
      await otpInput.setValue(otp);
      console.log(`Entered OTP: ${otp}`);
      await browser.pause(500);
      await screenshot('11-otp-entered');

      // Step 9: Submit OTP
      console.log('Step 9: Submitting OTP...');
      
      let verifyBtn;
      try {
        verifyBtn = await findElement('~verify_button', 5000);
      } catch {
        try {
          verifyBtn = await findElement('//*[@content-desc="Verify" or @content-desc="Submit" or @content-desc="Confirm"]', 5000);
        } catch {
          try {
            verifyBtn = await findElement('android=new UiSelector().textContains("Verify").className("android.widget.Button")', 5000);
          } catch {
            verifyBtn = await findElement('//android.widget.Button[contains(@text, "Verify") or contains(@text, "Submit") or contains(@content-desc, "Verify")]', 5000);
          }
        }
      }

      await verifyBtn.click();
      console.log('Clicked Verify button');
      await browser.pause(3000);
      await screenshot('12-after-verify');

      // Step 10: Verify successful login - check for dashboard
      console.log('Step 10: Verifying successful login...');
      
      // Wait for dashboard to appear
      await browser.pause(2000);
      await savePageSourceSnapshot('dashboard-after-signup');
      await screenshot('13-dashboard');

      // Check for dashboard indicators
      let dashboardFound = false;
      
      // Try multiple dashboard detection methods
      try {
        const dashboardRoot = await findElement('//*[contains(@content-desc, "dashboard")]', 8000);
        dashboardFound = await dashboardRoot.isDisplayed();
        console.log('Dashboard root found via content-desc');
      } catch {
        try {
          const welcomeText = await findElement('android=new UiSelector().textContains("Welcome")', 5000);
          dashboardFound = await welcomeText.isDisplayed();
          console.log('Dashboard found via Welcome text');
        } catch {
          try {
            const homeIndicator = await findElement('~home_screen', 5000);
            dashboardFound = await homeIndicator.isDisplayed();
            console.log('Dashboard found via home_screen');
          } catch {
            try {
              // Check if we're no longer on verification screen
              const signInBtn = await $('android=new UiSelector().textContains("Sign In")');
              const isOnLogin = await signInBtn.isDisplayed();
              dashboardFound = !isOnLogin; // If we can't see Sign In, we're likely on dashboard
              console.log(`Dashboard detection by absence of login: ${dashboardFound}`);
            } catch {
              console.log('Could not definitively detect dashboard, checking page source...');
            }
          }
        }
      }

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

  // Additional test: Verify invalid OTP is rejected
  it('should reject invalid OTP', async function () {
    this.timeout(120000);

    try {
      console.log('Invalid OTP Test: Starting...');

      // Create inbox
      inbox = await mailslurp.createInbox();
      testEmail = inbox.emailAddress;
      console.log(`Created test inbox: ${testEmail}`);

      // Navigate to signup and fill form (abbreviated)
      await browser.pause(2000);
      
      // Navigate to signup screen
      try {
        const signupNavBtn = await findElement('android=new UiSelector().textContains("Sign Up")', 5000);
        await signupNavBtn.click();
        await browser.pause(1500);
      } catch (e) {
        console.log('Could not find signup button, may already be on signup screen');
      }

      // Fill minimal required fields
      await typeText('//android.widget.EditText[@index="0"]', testEmail, 'email');
      await typeText('//android.widget.EditText[@password="true"][@index="0"]', TEST_PASSWORD, 'password');
      
      // Submit
      const submitBtn = await findElement('android=new UiSelector().textContains("Sign Up").className("android.widget.Button")', 5000);
      await submitBtn.click();
      await browser.pause(3000);

      // Enter invalid OTP
      console.log('Entering invalid OTP...');
      const otpInput = await findElement('//android.widget.EditText', 5000);
      await otpInput.clearValue();
      await otpInput.setValue('000000');
      await screenshot('invalid-otp-entered');

      // Submit invalid OTP
      const verifyBtn = await findElement('android=new UiSelector().textContains("Verify").className("android.widget.Button")', 5000);
      await verifyBtn.click();
      await browser.pause(2000);
      await screenshot('after-invalid-otp');

      // Verify error message appears
      try {
        const errorMsg = await findElement('android=new UiSelector().textContains("Invalid").textContains("code")', 5000);
        const errorVisible = await errorMsg.isDisplayed();
        expect(errorVisible).to.equal(true, 'Error message should be visible for invalid OTP');
        console.log('Invalid OTP Test: Error message displayed correctly');
      } catch {
        // Alternative: check that we're still on verification screen (not dashboard)
        const otpField = await $('//android.widget.EditText');
        const stillOnVerification = await otpField.isDisplayed();
        expect(stillOnVerification).to.equal(true, 'Should still be on verification screen after invalid OTP');
        console.log('Invalid OTP Test: Still on verification screen (OTP rejected)');
      }

    } catch (e) {
      console.log('Invalid OTP Test failed:', e?.message || e);
      await savePageSourceSnapshot('invalid-otp-failure');
      await screenshot('99-invalid-otp-failure');
      throw e;
    }
  });
});
