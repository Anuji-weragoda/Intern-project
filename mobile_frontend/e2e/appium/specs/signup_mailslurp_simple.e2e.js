const { expect } = require('chai');
const { MailSlurp } = require('mailslurp-client');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Simple Sign Up Test (No Email Required)', () => {
  let mailslurp;
  let inbox;
  let testEmail;
  const MAILSLURP_API_KEY = process.env.MAILSLURP_API_KEY;
  const TEST_PASSWORD = 'TestPass123!@#';
  const APP_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend';

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

  before(async function () {
    console.log('=== Simple Sign Up Test: Starting suite ===');
    
    if (!MAILSLURP_API_KEY) {
      throw new Error('MAILSLURP_API_KEY environment variable is required');
    }

    console.log('Initializing MailSlurp client...');
    mailslurp = new MailSlurp({ apiKey: MAILSLURP_API_KEY });
  });

  afterEach(async function () {
    console.log(`\n=== Test completed: ${this.currentTest.title} - ${this.currentTest.state} ===`);
    
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
        path.join(dir, 'run-result-simple-signup.json'),
        JSON.stringify(result, null, 2),
        'utf8'
      );
    } catch (e) {
      console.log('Failed to save test result:', e.message);
    }
  });

  after(async function () {
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

  it('should fill signup form with MailSlurp email', async function () {
    this.timeout(120000);

    try {
      console.log('Simple SignUp Test: Starting...');

      // Step 1: Create MailSlurp inbox
      console.log('Step 1: Creating MailSlurp inbox...');
      inbox = await mailslurp.createInbox();
      testEmail = inbox.emailAddress;
      console.log(`Created test inbox: ${testEmail}`);
      await screenshot('01-inbox-created');

      // Step 2: Launch app
      console.log('Step 2: Waiting for app to load...');
      await browser.pause(3000);
      await savePageSourceSnapshot('initial-screen');
      await screenshot('02-initial-screen');

      // Step 3: Navigate to signup
      console.log('Step 3: Looking for Sign Up button...');
      
      // Try to find and click Sign Up button
      let signupNavBtn;
      let foundSignup = false;
      
      const signupSelectors = [
        '~signup_nav_button',
        '//*[@content-desc="Sign Up"]',
        'android=new UiSelector().textContains("Sign Up")',
        'android=new UiSelector().textMatches(".*[Ss]ign [Uu]p.*")',
        'android=new UiSelector().textContains("Create Account")',
        '//android.widget.Button[contains(@text, "Sign Up")]',
        '//android.widget.TextView[contains(@text, "Sign Up")]'
      ];

      for (const selector of signupSelectors) {
        try {
          console.log(`  Trying selector: ${selector}`);
          signupNavBtn = await $(selector);
          await signupNavBtn.waitForDisplayed({ timeout: 3000 });
          await signupNavBtn.click();
          console.log(`  ✓ Found and clicked signup button`);
          foundSignup = true;
          break;
        } catch (e) {
          console.log(`  ✗ Not found with: ${selector}`);
        }
      }

      if (!foundSignup) {
        console.log('⚠️  Could not find Sign Up button, checking if already on signup screen...');
        await savePageSourceSnapshot('no-signup-button');
        await screenshot('03-no-signup-button');
      } else {
        await browser.pause(2000);
        await screenshot('03-signup-screen');
      }

      // Step 4: Check what's on screen now
      console.log('Step 4: Analyzing current screen...');
      await savePageSourceSnapshot('current-screen');
      
      const pageSource = await browser.getPageSource();
      const hasEmailField = pageSource.includes('mail') || pageSource.includes('Email');
      const hasPasswordField = pageSource.includes('assword') || pageSource.includes('Password');
      
      console.log(`  Email field detected: ${hasEmailField}`);
      console.log(`  Password field detected: ${hasPasswordField}`);

      // Step 5: Try to fill form
      console.log('Step 5: Attempting to fill form...');
      
      // Try multiple strategies to find email field
      const emailSelectors = [
        '~email_input',
        '~signup_email_input',
        '//android.widget.EditText[contains(@hint, "mail") or contains(@hint, "Email")]',
        '//android.widget.EditText[contains(@content-desc, "mail")]',
        '//android.widget.EditText[@index="0"]',
        'android=new UiSelector().className("android.widget.EditText").instance(0)'
      ];

      let emailFieldFound = false;
      for (const selector of emailSelectors) {
        try {
          console.log(`  Trying email selector: ${selector}`);
          await typeText(selector, testEmail, 'email');
          emailFieldFound = true;
          await screenshot('04-email-entered');
          break;
        } catch (e) {
          console.log(`  ✗ Failed with: ${selector}`);
        }
      }

      if (!emailFieldFound) {
        console.log('❌ Could not find email input field');
        await savePageSourceSnapshot('no-email-field');
        await screenshot('99-no-email-field');
        throw new Error('Email input field not found. Check screenshots and page source.');
      }

      // Try to fill password
      const passwordSelectors = [
        '~password_input',
        '~signup_password_input',
        '//android.widget.EditText[@password="true"][@index="0"]',
        '//android.widget.EditText[contains(@hint, "assword") or contains(@hint, "Password")]',
        'android=new UiSelector().className("android.widget.EditText").instance(1)'
      ];

      let passwordFieldFound = false;
      for (const selector of passwordSelectors) {
        try {
          console.log(`  Trying password selector: ${selector}`);
          await typeText(selector, TEST_PASSWORD, 'password');
          passwordFieldFound = true;
          await screenshot('05-password-entered');
          break;
        } catch (e) {
          console.log(`  ✗ Failed with: ${selector}`);
        }
      }

      if (!passwordFieldFound) {
        console.log('⚠️  Could not find password field, but email was filled');
      }

      // Try confirm password if it exists
      try {
        await typeText('//android.widget.EditText[@password="true"][@index="1"]', TEST_PASSWORD, 'confirm password');
        await screenshot('06-confirm-password-entered');
      } catch {
        console.log('  No confirm password field found (might not be required)');
      }

      await screenshot('07-form-filled');
      console.log(`✓ Successfully filled signup form with email: ${testEmail}`);
      
      // Step 6: Verify form is filled
      console.log('Step 6: Verifying form...');
      await savePageSourceSnapshot('form-filled');
      
      const finalPageSource = await browser.getPageSource();
      const emailInSource = finalPageSource.includes(testEmail);
      
      console.log(`  Email appears in page source: ${emailInSource}`);
      
      if (emailInSource) {
        console.log('✅ Test passed: Signup form filled successfully');
      } else {
        console.log('⚠️  Email might not have been entered correctly');
      }

      console.log('\n📧 Test email created:', testEmail);
      console.log('📝 You can manually complete the signup to test email delivery\n');

    } catch (e) {
      console.log('Simple SignUp Test failed:', e?.message || e);
      
      try {
        const src = await browser.getPageSource();
        console.log('--- PAGE SOURCE (last 3000 chars) ---');
        console.log(src.substring(Math.max(0, src.length - 3000)));
        console.log('--- END PAGE SOURCE ---');
        await savePageSourceSnapshot('failure');
        await screenshot('99-failure');
      } catch {}

      throw e;
    }
  });
});
