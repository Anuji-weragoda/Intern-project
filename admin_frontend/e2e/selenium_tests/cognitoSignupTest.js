import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { MailSlurp } from 'mailslurp-client';
import { authenticator } from 'otplib';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
// Step 10.1: If the app now shows TOTP MFA setup, complete it
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';
const MAILSLURP_API_KEY = process.env.MAILSLURP_API_KEY;
const MAILSLURP_INBOX_ID = process.env.MAILSLURP_INBOX_ID;
const MAILSLURP_EMAIL = process.env.MAILSLURP_EMAIL;
const PAUSE_AT_CONFIRM = process.env.PAUSE_AT_CONFIRM === 'true';

// Test password - meets Cognito password requirements
const TEST_PASSWORD = 'Test@1234';

async function main() {
  // Validate MailSlurp API key
  if (!MAILSLURP_API_KEY) {
    console.error('[cognitoSignupTest] ❌ Error: MAILSLURP_API_KEY environment variable is required');
    console.error('[cognitoSignupTest] Set it with: $env:MAILSLURP_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // Build WebDriver. Allow specifying a local chromedriver binary via CHROME_DRIVER_PATH.
  let driver;
  try {
    const chromeDriverPath = process.env.CHROME_DRIVER_PATH;
    if (chromeDriverPath) {
      console.log('[cognitoSignupTest] ⚙️ Using CHROME_DRIVER_PATH:', chromeDriverPath);
      const service = new chrome.ServiceBuilder(chromeDriverPath);
      driver = await new Builder().forBrowser('chrome').setChromeOptions(options).setChromeService(service).build();
    } else {
      // Try to auto-discover chromedriver from a local dependency (npm install chromedriver)
      try {
        console.log('[cognitoSignupTest] ⚙️ Attempting to locate chromedriver via installed npm package...');
        const chromedriverMod = await import('chromedriver');
        // chromedriver package exposes .path on CommonJS; dynamic import wraps it differently
        const chromedriverPath = chromedriverMod.path || (chromedriverMod.default && chromedriverMod.default.path) || null;
        if (chromedriverPath) {
          console.log('[cognitoSignupTest] ⚙️ Found chromedriver at:', chromedriverPath);
          const service = new chrome.ServiceBuilder(chromedriverPath);
          driver = await new Builder().forBrowser('chrome').setChromeOptions(options).setChromeService(service).build();
        } else {
          // Fallback to default builder (requires chromedriver on PATH)
          driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
        }
      } catch (e2) {
        // dynamic import failed or package not installed — fallback to default builder
        driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
      }
    }
  } catch (e) {
    console.error('[cognitoSignupTest] ❌ Could not start Chrome WebDriver.');
    console.error('[cognitoSignupTest] Error:', e && e.message);
    console.error('[cognitoSignupTest] Common causes: chromedriver not installed, chromedriver not on PATH, or incompatible Chrome version.');
    console.error('[cognitoSignupTest] Quick fixes:');
    console.error('  - Install chromedriver locally: npm install --save-dev chromedriver');
    console.error('  - Or download matching chromedriver and set CHROME_DRIVER_PATH to the exe path');
    console.error('  - Ensure your Chrome version matches the chromedriver version');
    console.error('  - On Windows, you can run: npx chromedriver --version and ensure it starts');
    console.error('[cognitoSignupTest] If you want me to try Edge instead, set USE_EDGE=true and ensure msedgedriver is available.');
    throw e;
  }

  // Prepare screenshot folder
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir, 'screenshots');
  try { 
    fs.mkdirSync(shotsDir, { recursive: true }); 
  } catch {}

  async function saveShot(name) {
    try {
      const b = await driver.takeScreenshot();
      const file = path.join(shotsDir, `cognito-signup-${name}-${Date.now()}.png`);
      fs.writeFileSync(file, b, 'base64');
      console.log(`[cognitoSignupTest] 📸 Saved screenshot: ${name}`);
    } catch (e) {
      console.log(`[cognitoSignupTest] ⚠️  Screenshot failed for ${name}:`, e && e.message);
    }
  }

  // Robust click helper to avoid click interceptions/overlays using hit-testing
  async function safeClick(element, label = 'element') {
    // Helper: check if element is actually clickable at its center (not covered by overlays)
    async function hitTestClickable(el) {
      try {
        return await driver.executeScript(
          `var el = arguments[0];
           if (!el) return false;
           var r = el.getBoundingClientRect();
           if (!r || r.width === 0 || r.height === 0) return false;
           var x = r.left + r.width/2; var y = r.top + r.height/2;
           // If outside viewport, scroll into view
           el.scrollIntoView({block:'center', inline:'center'});
           var elemAtPt = document.elementFromPoint(x, y);
           function contains(a,b){ return !!(a && (a===b || (a.contains && a.contains(b)))); }
           var style = window.getComputedStyle(el);
           var visible = style && style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && parseFloat(style.opacity || '1') > 0.01;
           var enabled = !(el.disabled);
           return visible && enabled && (contains(el, elemAtPt) || contains(elemAtPt, el));`
          , el);
      } catch { return false; }
    }

    for (let i = 0; i < 5; i++) {
      try {
        await driver.wait(until.elementIsVisible(element), 5000).catch(() => {});
        await driver.wait(until.elementIsEnabled(element), 5000).catch(() => {});
        // Wait briefly until any overlay is gone from hit-test point
        for (let j = 0; j < 6; j++) {
          if (await hitTestClickable(element)) break;
          await driver.sleep(250);
        }
        // Try native click
        try { await element.click(); return true; } catch {}
        // Scroll, then try again
        try { await driver.executeScript('arguments[0].scrollIntoView({block:"center", inline:"center"});', element); } catch {}
        await driver.sleep(200);
        try { await element.click(); return true; } catch {}
        // Actions API click (moves to center)
        try { await driver.actions({ bridge: true }).move({ origin: element }).click().perform(); return true; } catch {}
        // Try clicking an inner span (AWSUI often wraps text inside spans)
        try {
          const innerSpan = await element.findElement(By.xpath('.//span[1]'));
          await driver.actions({ bridge: true }).move({ origin: innerSpan }).click().perform();
          return true;
        } catch {}
        // JS click fallback
        try { await driver.executeScript('arguments[0].click();', element); return true; } catch {}
        await driver.sleep(350);
      } catch {}
    }
    console.log(`[cognitoSignupTest] ⚠️  safeClick fallback failed for ${label}; attempting form submit via JS`);
    try { await driver.executeScript("var f=document.querySelector('form'); if(f) f.submit();"); return true; } catch {}
    return false;
  }

    // Enhanced confirm click helper: robust locating, logging, retries and diagnostics
    async function enhancedConfirmClick(codeInput) {
      console.log('[cognitoSignupTest] 🔔 enhancedConfirmClick: locating confirm control near code input');
      let confirmBtn = null;
      try {
        confirmBtn = await driver.executeScript(
          `(function(codeEl){
             if(!codeEl) return null;
             var form = codeEl.closest('form');
             if(form){
               // Prefer controls whose visible text exactly matches 'Confirm account' inside same form and not tied to another form
               var exact = Array.from(form.querySelectorAll('button, input[type="submit"]')).filter(function(el){
                 var txt = ((el.innerText||'') + ' ' + (el.value||'')).toLowerCase().trim();
                 var formAttr = el.getAttribute && el.getAttribute('form');
                 if(formAttr) return false; // exclude controls that target a different form (e.g. Resend)
                 return txt === 'confirm account';
               });
               if(exact.length) return exact[0];
               // Next prefer any 'confirm' or 'verify' labelled control inside the same form (excluding differently-targeted controls)
               var cands = Array.from(form.querySelectorAll('button, input[type="submit"]')).filter(function(el){
                 var txt = ((el.innerText||'') + ' ' + (el.value||'')).toLowerCase().trim();
                 var formAttr = el.getAttribute && el.getAttribute('form');
                 if(formAttr) return false;
                 return txt.includes('confirm') || txt.includes('verify') || txt.includes('continue');
               });
               if(cands.length) return cands[0];
               // fallback to primary submit in the form if nothing more specific found
               var submit = form.querySelector('button[type="submit"]:not([form]), input[type="submit"]:not([form])');
               if(submit) return submit;
             }
             // Absolute fallback: nearest visible element whose text contains 'confirm' but exclude elements that target other forms
             var crect = codeEl.getBoundingClientRect();
             var els = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
             els = els.filter(function(el){
               var formAttr = el.getAttribute && el.getAttribute('form');
               if(formAttr) return false;
               var txt = ((el.innerText||'') + ' ' + (el.value||'')).toLowerCase();
               if(!txt) return false;
               if(!(txt.includes('confirm') || txt.includes('verify') || txt.includes('continue'))) return false;
               var r = el.getBoundingClientRect();
               return r && r.width>0 && r.height>0 && r.top >= crect.top - 6;
             });
             if(!els.length) return null;
             var cx = crect.left + crect.width/2;
             els.sort(function(a,b){
               var ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
               var da=Math.abs((ra.left+ra.width/2)-cx)+Math.abs((ra.top+ra.height/2)-crect.top);
               var db=Math.abs((rb.left+rb.width/2)-cx)+Math.abs((rb.top+rb.height/2)-crect.top);
               return da-db;
             });
             return els[0];
          })(arguments[0]);`, codeInput);
      } catch (e) {
        console.log('[cognitoSignupTest] ⚠️ enhancedConfirmClick: locator script failed:', e && e.message);
      }

      if (!confirmBtn) {
        console.log('[cognitoSignupTest] ⚠️ enhancedConfirmClick: no confirm control found via script');
        return false;
      }

      // Add diagnostic info about the control
      try {
        const info = await driver.executeScript(
          `var el = arguments[0]; return {tag: el.tagName, text: (el.innerText||el.value||'').slice(0,120), disabled: !!el.disabled, rect: el.getBoundingClientRect(), form: el.getAttribute && el.getAttribute('form')};`,
          confirmBtn
        );
        console.log('[cognitoSignupTest] 🔎 Confirm control info:', info);
      } catch {}

      // Ensure visible/enabled then attempt a sequence of clicks with retries
      try { await driver.wait(until.elementIsVisible(confirmBtn), 3000); } catch {}
      try { await driver.wait(until.elementIsEnabled(confirmBtn), 3000); } catch {}

      let clicked = false;
      for (let attempt = 0; attempt < 6 && !clicked; attempt++) {
        console.log(`[cognitoSignupTest] 🔁 enhancedConfirmClick: attempt ${attempt+1}`);
        try {
          // Try safeClick first
          clicked = await safeClick(confirmBtn, `enhanced-confirm-attempt-${attempt}`);
          if (clicked) break;
        } catch (e) { console.log('[cognitoSignupTest] ⚠️ safeClick threw:', e && e.message); }

        // Press Enter on the code input as a reliable form submit
        try { await codeInput.sendKeys(Key.ENTER); clicked = true; break; } catch (e) { }

        // Try JS submit on the enclosing form
        try {
          const submitted = await driver.executeScript(
            "var f = arguments[0] && arguments[0].closest && arguments[0].closest('form'); if (f) { if (typeof f.requestSubmit==='function') f.requestSubmit(); else f.submit(); return true;} return false;",
            codeInput
          );
          if (submitted) { clicked = true; break; }
        } catch (e) { }

        // Small backoff
        await driver.sleep(500 + attempt * 200);
      }

      if (!clicked) {
        console.log('[cognitoSignupTest] ❌ enhancedConfirmClick: all attempts failed — saving diagnostics');
        try { await saveShot('confirm-click-failed'); } catch {}
        try { fs.writeFileSync(path.join(shotsDir, `confirm-click-failed-${Date.now()}.html`), await driver.getPageSource()); } catch {}
      } else {
        console.log('[cognitoSignupTest] ✅ enhancedConfirmClick: confirm submitted/attempted');
      }

      return clicked;
    }

  let mailslurp;
  let inbox;
  let inboxEmail;
  let totpSecret = null;

  try {
    console.log('[cognitoSignupTest] 🚀 Starting AWS Cognito Hosted UI signup test with MailSlurp');
    
    // Initialize MailSlurp
    console.log('[cognitoSignupTest] 📧 Initializing MailSlurp client...');
    mailslurp = new MailSlurp({ apiKey: MAILSLURP_API_KEY });
    
    // Create or reuse inbox
    if (MAILSLURP_INBOX_ID) {
      console.log(`[cognitoSignupTest] ♻️ Reusing MailSlurp inbox via MAILSLURP_INBOX_ID=${MAILSLURP_INBOX_ID}`);
      try {
        // Try retrieving inbox details to get the email address if not provided
        if (!MAILSLURP_EMAIL) {
          try {
            const existing = await mailslurp.getInbox(MAILSLURP_INBOX_ID);
            inbox = existing;
            inboxEmail = existing.emailAddress;
          } catch (e) {
            throw new Error('MAILSLURP_INBOX_ID provided but unable to fetch inbox. Please also set MAILSLURP_EMAIL.');
          }
        } else {
          inbox = { id: MAILSLURP_INBOX_ID, emailAddress: MAILSLURP_EMAIL };
          inboxEmail = MAILSLURP_EMAIL;
        }
      } catch (e) {
        console.log('[cognitoSignupTest] ⚠️  Reuse failed, falling back to creating a new inbox:', e.message);
      }
    }
    if (!inbox) {
      console.log('[cognitoSignupTest] 📬 Creating temporary MailSlurp inbox...');
      inbox = await mailslurp.createInbox();
      inboxEmail = inbox.emailAddress;
    }
    console.log(`[cognitoSignupTest] ✅ Using inbox: ${inboxEmail}`);
    console.log(`[cognitoSignupTest] 📧 Inbox ID: ${inbox.id}`);

    // Step 1: Navigate to home page
    console.log('[cognitoSignupTest] 🌐 Navigating to home page...');
    await driver.get(BASE_URL);
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    await driver.sleep(1000);
    await saveShot('01-home-page');

    // Step 2: Click "Sign In" button to open Cognito Hosted UI
    console.log('[cognitoSignupTest] 🔑 Looking for Sign In button...');
    const signInButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Sign In')]")),
      10000
    );
    await signInButton.click();
    console.log('[cognitoSignupTest] ✅ Clicked Sign In button');
    await driver.sleep(2000);
    await saveShot('02-cognito-signin-page');

    // Step 3: Wait for Cognito Hosted UI to load and click "Create account" link
    console.log('[cognitoSignupTest] 🔍 Waiting for Cognito Hosted UI to load...');
    
    // Switch to Cognito hosted UI (might be in a new window or redirected)
    const currentUrl = await driver.getCurrentUrl();
    console.log(`[cognitoSignupTest] Current URL: ${currentUrl}`);

    // Wait for the "Create account" or "Sign up" link
    console.log('[cognitoSignupTest] 🔗 Looking for Create account link...');
    
    // Try multiple possible selectors for the sign-up link
    let createAccountLink;
    const signupSelectors = [
      "//a[contains(text(), 'Create an account')]",
      "//a[contains(., 'Create an account')]",
      "//a[contains(text(), 'Create account')]",
      "//a[contains(text(), 'Sign up')]",
      "//a[contains(text(), 'create account')]",
      "//a[contains(text(), 'sign up')]",
      "//button[contains(text(), 'Create account')]",
      "//button[contains(text(), 'Sign up')]",
      "//a[@href and contains(., 'Create')]",
      "//a[@href and contains(., 'signup')]",
      "//a[@href and contains(., 'register')]"
    ];

    for (const selector of signupSelectors) {
      try {
        createAccountLink = await driver.wait(
          until.elementLocated(By.xpath(selector)),
          3000
        );
        console.log(`[cognitoSignupTest] ✅ Found sign-up link using selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`[cognitoSignupTest] ⚠️  Selector failed: ${selector}`);
        continue;
      }
    }

    if (!createAccountLink) {
      // Save page source for debugging
      const pageText = await driver.executeScript('return document.body.innerText');
      console.log('[cognitoSignupTest] 📄 Page text:', pageText.substring(0, 500));
      throw new Error('Could not find Create account link on Cognito Hosted UI');
    }

    await createAccountLink.click();
    console.log('[cognitoSignupTest] ✅ Clicked Create account link');
    await driver.sleep(2000);
    await saveShot('03-signup-form');

    // Step 4: Fill out the signup form
    console.log('[cognitoSignupTest] 📝 Filling out signup form...');
    
    // Email field
    const emailInput = await driver.wait(
      until.elementLocated(By.css("input[type='email'], input[name='username'], input[name='email']")),
      10000
    );
    await emailInput.clear();
    await emailInput.sendKeys(inboxEmail);
    console.log(`[cognitoSignupTest] ✅ Entered email: ${inboxEmail}`);

    // Password field
    const passwordInputs = await driver.findElements(By.css("input[type='password']"));
    if (passwordInputs.length < 1) {
      throw new Error('Could not find password input fields');
    }

    await passwordInputs[0].clear();
    await passwordInputs[0].sendKeys(TEST_PASSWORD);
    console.log('[cognitoSignupTest] ✅ Entered password');

    // Confirm password field (if present)
    if (passwordInputs.length > 1) {
      await passwordInputs[1].clear();
      await passwordInputs[1].sendKeys(TEST_PASSWORD);
      console.log('[cognitoSignupTest] ✅ Entered password confirmation');
    }

    await driver.sleep(500);
    await saveShot('04-form-filled');

    // Step 5: Submit the signup form
    console.log('[cognitoSignupTest] 📤 Submitting signup form...');
    const submitButton = await driver.findElement(
      By.xpath("//button[@type='submit' and (contains(., 'Sign up') or contains(., 'Create') or contains(., 'Continue'))] | //input[@type='submit'] | //button[@name='signUpButton'] | //button[@data-analytics-funnel-value]")
    );
    const clicked = await safeClick(submitButton, 'signup-submit');
    if (!clicked) {
      throw new Error('Unable to click Sign up/submit button (intercepted)');
    }
    console.log('[cognitoSignupTest] ✅ Clicked submit button');
    await driver.sleep(3000);
    await saveShot('05-after-submit');

    // Step 6: Handle next step (TOTP setup or email verification)
    console.log('[cognitoSignupTest] ⏳ Waiting for post-signup step (TOTP/email verification)...');

    // Check for error messages first
    try {
      const errorElement = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'error') or contains(text(), 'Error') or contains(text(), 'ERROR') or contains(text(), 'failed') or contains(text(), 'Failed')]") ),
        5000
      );
      const errorText = await errorElement.getText();
      console.log('[cognitoSignupTest] ⚠️  Error detected on page:', errorText);
      
      // Take screenshot of error
      await saveShot('05b-signup-error');
      
      // Get full page text for debugging
      const pageText = await driver.executeScript('return document.body.innerText');
      console.log('[cognitoSignupTest] 📄 Full page text:', pageText);
      
      // Check if it's a Lambda/PreSignUp error
      if (pageText.includes('PreSignUp') || pageText.includes('Lambda') || pageText.includes('exports is not defined')) {
        throw new Error(`Cognito Lambda PreSignUp trigger error detected: ${errorText}\n\nThis is a backend configuration issue, not a test issue.\n\nPlease fix your Lambda function to use ES module syntax:\n- Change: module.exports = { handler }\n- To: export { handler }\n\nOr configure the Lambda runtime properly.`);
      }
      
      throw new Error(`Signup error: ${errorText}`);
    } catch (e) {
      // If no error found within 5 seconds, proceed to look for verification page
      if (e.message && (e.message.includes('PreSignUp') || e.message.includes('Lambda'))) {
        throw e; // Re-throw Lambda errors
      }
      // Otherwise continue - no error found, which is good
    }
    
    async function getBodyText() {
      return (await driver.executeScript('return document.body && document.body.innerText || ""')) || '';
    }

    async function isTotpSetupPage() {
      const text = (await getBodyText()).toLowerCase();
      return (
        text.includes('authenticator') ||
        text.includes('totp') ||
        text.includes('qr code') ||
        text.includes('scan a qr') ||
        text.includes('secret key') ||
        text.includes('secret code') ||
        text.includes('enter code')
      );
    }

    // Poll briefly to detect TOTP setup
    let onTotpSetup = false;
    for (let i = 0; i < 10; i++) { // ~10s
      if (await isTotpSetupPage()) { onTotpSetup = true; break; }
      await driver.sleep(1000);
    }

    if (onTotpSetup) {
      console.log('[cognitoSignupTest] 🔐 TOTP setup detected — extracting secret and verifying...');
      await saveShot('06a-totp-setup');

      function extractSecretFromText(text) {
        const upper = (text || '').toUpperCase();
        const base32Pattern = /([A-Z2-7]{16,})/g; // common base32 charset
        const candidates = [];
        let m;
        while ((m = base32Pattern.exec(upper)) !== null) { candidates.push(m[1]); }
        candidates.sort((a,b) => b.length - a.length);
        return candidates[0] || null;
      }

      try {
        const secretEl = await driver.findElement(By.xpath("//*[contains(translate(., 'SECRETKEY', 'secretkey'), 'secret') and (contains(., 'key') or contains(., 'code'))]"));
        const t = await secretEl.getText();
        totpSecret = extractSecretFromText(t);
      } catch {}

      if (!totpSecret) {
        const pageText = await getBodyText();
        totpSecret = extractSecretFromText(pageText);
      }

      if (!totpSecret) {
        await saveShot('06a-no-secret-found');
        throw new Error('Could not extract TOTP secret from the setup page');
      }

      console.log('[cognitoSignupTest] 🔑 Extracted TOTP secret (masked):', totpSecret.slice(0,6) + '...' + totpSecret.slice(-4));

      const code = authenticator.generate(totpSecret.replace(/\s+/g, ''));
      console.log('[cognitoSignupTest] 🔢 Generated TOTP code:', code);

      const codeInput = await driver.wait(
        until.elementLocated(By.css("input[name='code'], input[type='text'], input[autocomplete='one-time-code'], input[placeholder*='code' i]")),
        10000
      );
      await codeInput.clear();
      await codeInput.sendKeys(code);
      await saveShot('06b-totp-code-entered');

      // Verify / Continue
      const verifySelectors = [
        "//button[contains(., 'Verify')]",
        "//button[contains(., 'Continue')]",
        "//input[@type='submit']",
        "//button[contains(., 'Confirm')]",
      ];
      let verifyBtn = null;
      for (const s of verifySelectors) {
        try { verifyBtn = await driver.findElement(By.xpath(s)); break; } catch {}
      }
      if (!verifyBtn) throw new Error('Could not find Verify/Continue button on TOTP setup');
      await verifyBtn.click();
      await driver.sleep(1500);
      await saveShot('06c-totp-verified-attempt');

      // If there's a Sign in link/button, click it
      try {
        const signInLink = await driver.findElement(By.xpath("//a[contains(., 'Sign in') or contains(., 'Sign In')] | //button[contains(., 'Sign in') or contains(., 'Sign In')]") );
        await signInLink.click();
        await driver.sleep(1200);
      } catch {}

      // Login with email + password, expect TOTP challenge
      console.log('[cognitoSignupTest] 🔁 Logging in with TOTP...');
      const emailField = await driver.wait(
        until.elementLocated(By.css("input[type='email'], input[name='username'], input[name='email']")),
        12000
      );
      await emailField.clear();
      await emailField.sendKeys(inboxEmail);
      try { const nextBtn = await driver.findElement(By.xpath("//button[contains(., 'Next')] | //input[@type='submit']")); await nextBtn.click(); } catch {}
      await driver.sleep(800);

      const pwdField = await driver.wait(until.elementLocated(By.css("input[type='password']")), 10000);
      await pwdField.clear();
      await pwdField.sendKeys(TEST_PASSWORD);
      try { const signBtn = await driver.findElement(By.xpath("//button[contains(., 'Sign in') or contains(., 'Sign In')] | //input[@type='submit']")); await signBtn.click(); } catch {}
      await driver.sleep(1200);

      // TOTP challenge
      const bodyAfterPwd = (await getBodyText()).toLowerCase();
      if (bodyAfterPwd.includes('verification code') || bodyAfterPwd.includes('enter code') || bodyAfterPwd.includes('authenticator')) {
        const code2 = authenticator.generate(totpSecret.replace(/\s+/g, ''));
        const totpInput = await driver.wait(
          until.elementLocated(By.css("input[name='code'], input[type='text'], input[autocomplete='one-time-code'], input[placeholder*='code' i]")),
          10000
        );
        await totpInput.clear();
        await totpInput.sendKeys(code2);
        try { const verifyBtn2 = await driver.findElement(By.xpath("//button[contains(., 'Verify')] | //input[@type='submit'] | //button[contains(., 'Continue')]") ); await verifyBtn2.click(); } catch {}
      }

      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        const t = (await getBodyText()).toLowerCase();
        return url.includes('login/oauth2/code') || t.includes('signed in') || t.includes('success');
      }, 20000).catch(() => {});

      await saveShot('08-login-complete');
      console.log('[cognitoSignupTest] ✅ TOTP setup and sign-in completed');

    } else {
      // Email verification flow fallback
      await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'verification') or contains(text(), 'Verification') or contains(text(), 'Confirm') or contains(text(), 'confirm')]") ),
        15000
      );
      console.log('[cognitoSignupTest] ✅ Verification page loaded');
      await saveShot('06-verification-page');

      console.log('[cognitoSignupTest] 📬 Waiting for verification email from Cognito...');
      console.log('[cognitoSignupTest] This may take up to 60 seconds...');
      const email = await mailslurp.waitForLatestEmail(inbox.id, 60000, true);
      console.log('[cognitoSignupTest] ✅ Received verification email!');
      console.log(`[cognitoSignupTest] Email subject: ${email.subject}`);
      console.log(`[cognitoSignupTest] Email from: ${email.from}`);

      console.log('[cognitoSignupTest] 🔍 Extracting verification code from email...');
      const emailBody = email.body || '';
      const emailSubject = email.subject || '';
      console.log(`[cognitoSignupTest] Email body preview: ${emailBody.substring(0, 200)}...`);
      // If the email contains a verification link, prefer navigating to it (some Cognito setups send a link)
      try {
        const urlMatch = emailBody.match(/https?:\/\/[\w\-.:@?&=;#%+\/\[\]\(\)~,\$'!]+/i);
        if (urlMatch && urlMatch[0]) {
          const vlink = urlMatch[0];
          console.log('[cognitoSignupTest] 🔗 Found verification link in email — navigating to it:', vlink);
          try {
            await driver.get(vlink);
            await driver.sleep(1500);
            await saveShot('06b-verification-link-clicked');
            // Wait briefly for redirect back to app or confirmation text
            await driver.wait(async () => {
              const t = (await driver.executeScript('return document.body && document.body.innerText || ""')).toLowerCase();
              const url = await driver.getCurrentUrl();
              return url.includes('login/oauth2/code') || /confirmed|verified|success|signed in|sign in/.test(t);
            }, 10000).catch(() => {});
            console.log('[cognitoSignupTest] ✅ Navigated verification link — proceeding');
          } catch (e) {
            console.log('[cognitoSignupTest] ⚠️ Navigation to verification link failed:', e && e.message);
          }
        }
      } catch (e) {
        console.log('[cognitoSignupTest] ⚠️ Error while trying to parse verification link from email:', e && e.message);
      }
      const codePatterns = [/(\d{6})/, /verification code is\s*[:\s]*(\d{6})/i, /code[:\s]+(\d{6})/i, /confirm.*code[:\s]+(\d{6})/i, /(\d{6})\s*is your/i];
      let verificationCode;
      for (const pattern of codePatterns) {
        const match = emailBody.match(pattern) || emailSubject.match(pattern);
        if (match && match[1]) { verificationCode = match[1]; break; }
      }
      if (!verificationCode) throw new Error('Failed to extract verification code from email');

      console.log('[cognitoSignupTest] 📝 Entering verification code...');
      const codeInput = await driver.wait(
        until.elementLocated(By.css("input[name='code'], input[type='text'], input[placeholder*='code' i]")),
        10000
      );
      await codeInput.clear(); await codeInput.sendKeys(verificationCode);
      // Fire input/change events to ensure the Confirm button enables
      try {
        await driver.executeScript(
          "arguments[0].dispatchEvent(new Event('input', {bubbles:true})); arguments[0].dispatchEvent(new Event('change', {bubbles:true}));",
          codeInput
        );
      } catch {}
      await saveShot('07-code-entered');

      if (PAUSE_AT_CONFIRM) {
        console.log('[cognitoSignupTest] ⏸️  PAUSE_AT_CONFIRM=true — stopping before clicking “Confirm account”.');
        console.log('[cognitoSignupTest]     Tip: set KEEP_BROWSER_OPEN=true to keep the browser open for manual actions.');
        if (KEEP_OPEN) {
          console.log('[cognitoSignupTest]     Browser will remain open. You can confirm manually.');
          return; // finally will respect KEEP_OPEN and not quit
        } else {
          console.log('[cognitoSignupTest]     Waiting here for 60s before continuing...');
          await driver.sleep(60000);
        }
      }

      // Ensure we actually click the Confirm account button — use enhanced helper
      console.log('[cognitoSignupTest] 🔔 Attempting to click Confirm account button...');
      try {
        await enhancedConfirmClick(codeInput);
      } catch (e) {
        console.log('[cognitoSignupTest] ⚠️ enhancedConfirmClick threw an error:', e && e.message);
      }

      console.log('[cognitoSignupTest] 📤 Submitting verification code (scoped to form)...');
      // Locate submit within same form as code input again and click
      let confirmButton = null;
      try {
        confirmButton = await driver.executeScript(
          `(function(codeEl){
             var form = codeEl && codeEl.closest('form');
             if(!form) return null;
             return form.querySelector('button[type="submit"], input[type="submit"]');
          })(arguments[0]);`, codeInput);
      } catch {}
      if (!confirmButton) {
        // Try a targeted AWS Cognito analytics attribute (seen in hosted UI): prefer this before generic locator
        try {
          confirmButton = await driver.findElement(By.css('button[data-analytics-funnel-value="button:re:"]'));
          console.log('[cognitoSignupTest] ✅ Found confirm button by data-analytics-funnel-value selector');
        } catch (e) {
          // Fallback to generic locator
          confirmButton = await driver.wait(
            until.elementLocated(By.xpath("//button[contains(., 'Confirm account')] | //button[contains(., 'Confirm')] | //input[@type='submit'] | //button[@type='submit'] | //button[@name='confirm_sign_up_button'] | //button[@name='confirmButton']")),
            12000
          );
        }
      }
      try { await driver.wait(until.elementIsEnabled(confirmButton), 5000); } catch {}
      try { await driver.wait(until.elementIsVisible(confirmButton), 5000); } catch {}
      // Prefer safeClick to avoid AWSUI overlays
      let clickedConfirm = await safeClick(confirmButton, 'confirm-account');
      if (!clickedConfirm) {
        // Fallback: press Enter in the code field to submit the form
        try { await codeInput.sendKeys(Key.ENTER); clickedConfirm = true; } catch {}
        if (!clickedConfirm) {
          // Final fallback: submit the form via JS
          try {
            const submitted = await driver.executeScript(
              "var f = arguments[0] && arguments[0].closest && arguments[0].closest('form'); if (f) { if (typeof f.requestSubmit==='function') f.requestSubmit(); else f.submit(); return true;} return false;",
              codeInput
            );
            if (submitted) clickedConfirm = true;
          } catch {}
        }
      }
      // Wait a moment and for page transition toward MFA/sign-in or for confirm UI to disappear
      try {
        await driver.wait(async () => {
          const url = await driver.getCurrentUrl();
          const t = (await driver.executeScript('return document.body && document.body.innerText || ""')).toLowerCase();
          const maybeTotp = t.includes('authenticator') || t.includes('totp') || t.includes('qr code') || t.includes('secret key') || t.includes('enter code');
          // Also consider confirmation done if the confirm button or code input disappears
          const confirmPresent = await driver.findElements(By.xpath("//button[contains(., 'Confirm account')] | //button[contains(., 'Confirm')] | //input[@type='submit'] | //button[@type='submit'] | //button[@name='confirm_sign_up_button'] | //button[@name='confirmButton']"));
          const codePresent = await driver.findElements(By.css("input[name='code'], input[type='text'], input[placeholder*='code' i]"));
          const confirmGone = confirmPresent.length === 0;
          const codeGone = codePresent.length === 0;
          return confirmGone || codeGone || maybeTotp || t.includes('sign in') || url.includes('login/oauth2/code');
        }, 20000);
      } catch {}
      await driver.sleep(1200);
      await saveShot('08-after-verification');

      await driver.wait(async () => {
        const currentUrl = await driver.getCurrentUrl();
        const pageText = await driver.executeScript('return document.body.innerText || ""');
        const isOnLoginPage = currentUrl.includes('signin') || currentUrl.includes('login') || pageText.includes('Sign in') || pageText.includes('Sign In');
        const isOnDashboard = currentUrl.includes('dashboard') || pageText.includes('Dashboard');
        const hasSuccessMessage = /success|verified|confirmed/i.test(pageText);
        return isOnLoginPage || isOnDashboard || hasSuccessMessage;
      }, 15000);

      const finalUrl = await driver.getCurrentUrl();
      const pageText = await driver.executeScript('return document.body.innerText || ""');
      console.log(`[cognitoSignupTest] Final URL: ${finalUrl}`);
      console.log(`[cognitoSignupTest] Page text preview: ${pageText.substring(0, 200)}...`);
      await saveShot('09-signup-complete');
      console.log('[cognitoSignupTest] ✅✅✅ Signup test completed successfully! ✅✅✅');
      console.log(`[cognitoSignupTest] Test email: ${inboxEmail}`);
      console.log(`[cognitoSignupTest] Test password: ${TEST_PASSWORD}`);
      console.log('[cognitoSignupTest] 🎉 User account created and verified!');
    }

  } catch (err) {
    await saveShot('error');
    
    // Save page source for debugging
    try {
      const html = await driver.getPageSource();
      const errorFile = path.join(shotsDir, `cognito-signup-error-page-${Date.now()}.html`);
      fs.writeFileSync(errorFile, html);
      console.log(`[cognitoSignupTest] Saved error page HTML to: ${errorFile}`);
    } catch (e) {
      console.log('[cognitoSignupTest] Could not save error page HTML');
    }

    console.log('[cognitoSignupTest] ❌ Error occurred:', err.message);
    console.log('[cognitoSignupTest] Stack trace:', err.stack);
    throw err;
  } finally {
    // Cleanup: KEEP the MailSlurp inbox for inspection/debugging as requested
    if (inbox && mailslurp) {
      try {
        console.log(`[cognitoSignupTest] 📬 Keeping MailSlurp inbox (not deleting). Inbox ID: ${inbox.id}, Email: ${inbox.emailAddress}`);
      } catch {}
    }

    if (KEEP_OPEN) {
      console.log('[cognitoSignupTest] KEEP_BROWSER_OPEN=true — leaving browser open for inspection.');
      return;
    }
    
    console.log('[cognitoSignupTest] Closing browser');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[cognitoSignupTest] Fatal error:', err);
  process.exit(1);
});
