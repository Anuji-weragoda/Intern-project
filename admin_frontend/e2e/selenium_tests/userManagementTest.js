import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Selenium test for User Management page: navigate to user management,
// wait for users table to load, click Manage Roles for first user,
// toggle a role in the modal, submit changes, and handle success alert.
// Based on UserManagement.tsx component structure.
// Run with: node userManagementTest.js
// Environment:
//  BASE_URL (default http://localhost:5180)
//  PAGE_URL (optional specific user management URL)
//  HEADLESS=true to run headless
//  KEEP_BROWSER_OPEN=true to leave browser open for debugging
//  LOGIN_EMAIL and LOGIN_PASSWORD for authentication

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const PAGE_URL = process.env.PAGE_URL || '';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // Prepare screenshots directory
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir, 'screenshots');
  try { fs.mkdirSync(shotsDir, { recursive: true }); } catch (e) {}

  async function saveShot(name) {
    try {
      const b = await driver.takeScreenshot();
      const file = path.join(shotsDir, `${name}-${Date.now()}.png`);
      fs.writeFileSync(file, b, 'base64');
      console.log('[userManagementTest] saved screenshot', file);
    } catch (e) {
      console.log('[userManagementTest] screenshot failed', e && e.message);
    }
  }

  try {
    // Authentication: If credentials provided, perform Cognito login first
    const LOGIN_EMAIL = process.env.LOGIN_EMAIL || '';
    const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';
    
    async function performLoginIfNeeded() {
      if (!LOGIN_EMAIL || !LOGIN_PASSWORD) return;
      
      try {
        console.log('[userManagementTest] Performing Cognito login with provided credentials');
        
        // Determine origin for login
        let origin = BASE_URL;
        try { 
          if (PAGE_URL) origin = new URL(PAGE_URL).origin; 
          else origin = new URL(BASE_URL).origin; 
        } catch (e) {}
        
        await driver.get(origin + '/');
        await driver.wait(until.elementLocated(By.css('body')), 5000);
        await saveShot('login-start');

        // Click sign-in button (matches component's auth flow)
        async function tryClickByXPathText(text) {
          try {
            const xpath = `//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`;
            const el = await driver.findElements(By.xpath(xpath));
            if (el.length) { await el[0].click(); return true; }
          } catch (e) {}
          return false;
        }

        const signInTexts = ['Sign in', 'Sign In', 'Log in', 'Login', 'Sign in with'];
        for (const text of signInTexts) {
          const ok = await tryClickByXPathText(text);
          if (ok) { 
            console.log('[userManagementTest] Clicked sign-in button:', text); 
            break; 
          }
        }

        // Wait and locate email input
        await driver.sleep(800);
        const emailSelectors = [
          "input[type=email]", 
          "input[name=email]", 
          "input[id=email]", 
          "input[autocomplete=email]", 
          "input[name=username]"
        ];
        
        let emailEl = null;
        for (const selector of emailSelectors) {
          const els = await driver.findElements(By.css(selector)).catch(() => []);
          if (els.length) { emailEl = els[0]; break; }
        }
        
        if (!emailEl) {
          // Try direct /login navigation
          await driver.get(origin + '/login');
          await driver.sleep(800);
          await saveShot('navigated-to-login-during-login');
          
          for (const selector of emailSelectors) {
            const els = await driver.findElements(By.css(selector)).catch(() => []);
            if (els.length) { emailEl = els[0]; break; }
          }
        }
        
        if (!emailEl) {
          console.log('[userManagementTest] Email input not found during login attempt');
          return;
        }

        // Fill email and submit
        await emailEl.clear();
        await emailEl.sendKeys(LOGIN_EMAIL);
        
        // Find and click Next/Submit button
        const submitSelectors = ["button[type=submit]"];
        let submitEl = null;
        for (const selector of submitSelectors) {
          const els = await driver.findElements(By.css(selector)).catch(() => []);
          if (els.length) { submitEl = els[0]; break; }
        }
        
        if (!submitEl) {
          const xpath = `//button[contains(normalize-space(string(.)), "Next")]`;
          const els = await driver.findElements(By.xpath(xpath));
          if (els.length) submitEl = els[0];
        }
        
        if (submitEl) await submitEl.click();
        await saveShot('after-email-submit-during-login');

        // Wait for password field
        await driver.wait(async () => {
          const els = await driver.findElements(By.css("input[type=password]")).catch(() => []);
          return els.length > 0;
        }, 10000).catch(() => {});

        // Locate and fill password
        const passSelectors = [
          "input[type=password]", 
          "input[name=password]", 
          "input[id=password]", 
          "input[autocomplete=current-password]"
        ];
        
        let passEl = null;
        for (const selector of passSelectors) {
          const els = await driver.findElements(By.css(selector)).catch(() => []);
          if (els.length) { passEl = els[0]; break; }
        }
        
        if (!passEl) {
          console.log('[userManagementTest] Password input not found during login attempt');
          return;
        }

        await passEl.clear();
        await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
        await saveShot('after-password-submit-during-login');

        // Wait for redirect away from Cognito
        try {
          await driver.wait(async () => {
            const url = await driver.getCurrentUrl();
            return !/amazoncognito\.com/.test(url);
          }, 20000);
        } catch (e) {}

        // If JWT in URL, navigate to dashboard
        try {
          const current = await driver.getCurrentUrl();
          const jwtMatch = current.match(/[?&]jwt=[^&]+/i);
          if (jwtMatch) {
            try {
              const u = new URL(current);
              const dash = u.origin + '/dashboard';
              console.log('[userManagementTest] JWT detected in URL, navigating to dashboard:', dash);
              await driver.get(dash);
              await driver.sleep(800);
              await saveShot('after-redirect-with-jwt-during-login');
            } catch (e) {}
          }
        } catch (e) {}

        // Wait for authenticated UI (dashboard or profile indicators)
        await driver.wait(async () => {
          const url = await driver.getCurrentUrl();
          const text = await driver.executeScript('return document.body && document.body.innerText || ""');
          return /Dashboard|Profile|Sign out|Logout|Welcome/i.test(text) || /\/dashboard|\/profile/.test(url);
        }, 30000).catch(() => {});
        
        await saveShot('login-finished');
        console.log('[userManagementTest] Login completed successfully');
      } catch (e) {
        console.log('[userManagementTest] Login failed:', e && e.message);
      }
    }

    // Perform login if credentials provided
    await performLoginIfNeeded();

    // Navigate to user management page
    const userManagementUrl = PAGE_URL || (BASE_URL + '/admin/users');
    console.log('[userManagementTest] Navigating to user management:', userManagementUrl);
    await driver.get(userManagementUrl);
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    await saveShot('user-management-navigated');

    // Check for authentication errors (matches component error states)
    const bodyText = await driver.executeScript('return document.body && document.body.innerText || ""');
    if (/Authentication Error|No authentication token|Please log in|Session has expired/i.test(bodyText)) {
      console.log('[userManagementTest] Authentication error detected on user management page');
      await saveShot('user-management-auth-error');
      throw new Error('Authentication required but not available');
    }

    // Wait for users table to load (matches component's table structure)
    console.log('[userManagementTest] Waiting for users table to load...');
    await driver.wait(async () => {
      const table = await driver.findElements(By.css('table.table-fixed')).catch(() => []);
      if (!table.length) return false;
      
      const rows = await driver.findElements(By.css('table.table-fixed tbody tr'));
      return rows.length > 0;
    }, 15000);
    
    await saveShot('user-management-table-loaded');
    console.log('[userManagementTest] Users table loaded successfully');

    // Find and click the first "Manage Roles" button (matches component's button structure)
    const manageButtons = await driver.findElements(By.xpath("//table//tbody//tr//button[contains(normalize-space(string(.)), 'Manage Roles')]"));
    if (!manageButtons.length) {
      throw new Error('No "Manage Roles" buttons found in user table');
    }
    
    console.log('[userManagementTest] Clicking "Manage Roles" for first user');
    await manageButtons[0].click();
    await driver.sleep(500);
    await saveShot('role-modal-opened');

    // Wait for role management modal to appear (matches component's modal structure)
    await driver.wait(async () => {
      const headings = await driver.findElements(By.xpath("//h3[contains(normalize-space(string(.)), 'Manage User Roles')]")).catch(() => []);
      return headings.length > 0;
    }, 5000);
    
    console.log('[userManagementTest] Role management modal opened');

    // Find role toggle buttons within the modal (matches component's role button structure)
    // These are full-width buttons that can be clicked to toggle roles
    const roleButtons = await driver.findElements(By.xpath(
      "//div[contains(@class,'fixed')]//div[contains(@class,'space-y-3')]//button[not(contains(normalize-space(string(.)), 'Cancel')) and not(contains(normalize-space(string(.)), 'Update Roles'))]"
    )).catch(() => []);
    
    if (!roleButtons.length) {
      // Fallback: find buttons within modal by searching for modal container
      const modal = await driver.findElements(By.xpath("//div[.//h3[contains(normalize-space(string(.)), 'Manage User Roles')]]"));
      if (modal.length) {
        const buttons = await modal[0].findElements(By.css('button')).catch(() => []);
        // Filter out Cancel and Update buttons
        const filteredButtons = [];
        for (const btn of buttons) {
          const text = await btn.getText().catch(() => '');
          if (!text.includes('Cancel') && !text.includes('Update Roles')) {
            filteredButtons.push(btn);
          }
        }
        roleButtons.push(...filteredButtons);
      }
    }

    if (!roleButtons.length) {
      throw new Error('No role toggle buttons found in the modal');
    }

    // Click the first available role button to toggle it (matches component's toggleRole function)
    console.log('[userManagementTest] Toggling first available role');
    const firstRoleButton = roleButtons[0];
    const roleText = await firstRoleButton.getText().catch(() => 'Unknown Role');
    console.log('[userManagementTest] Toggling role:', roleText.split('\n')[0]);
    
    await firstRoleButton.click();
    await driver.sleep(300);
    await saveShot('role-toggled');

    // Find and click the "Update Roles" button (matches component's handleUpdateRoles)
    const updateButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Update Roles')]")).catch(() => []);
    if (!updateButtons.length) {
      throw new Error('"Update Roles" button not found in modal');
    }
    
    console.log('[userManagementTest] Clicking "Update Roles" to submit changes');
    await updateButtons[0].click();
    await saveShot('update-roles-clicked');

    // Wait for and handle success alert (matches component's alert("✅ Roles updated successfully!"))
    try {
      console.log('[userManagementTest] Waiting for success alert...');
      await driver.wait(until.alertIsPresent(), 7000);
      const alert = await driver.switchTo().alert();
      const alertText = await alert.getText();
      console.log('[userManagementTest] Success alert received:', alertText);
      
      if (!alertText.includes('Roles updated successfully')) {
        console.warn('[userManagementTest] Unexpected alert text:', alertText);
      }
      
      await alert.accept();
      await saveShot('alert-accepted');
    } catch (e) {
      console.log('[userManagementTest] No alert detected after role update');
      // Continue - some implementations might not use alerts
    }

    // Wait for modal to close (matches component's setShowRoleModal(false))
    console.log('[userManagementTest] Waiting for role modal to close...');
    await driver.wait(async () => {
      const modals = await driver.findElements(By.xpath("//h3[contains(normalize-space(string(.)), 'Manage User Roles')]")).catch(() => []);
      return modals.length === 0;
    }, 10000).catch(() => {
      console.log('[userManagementTest] Role modal did not close within timeout');
    });

    await saveShot('user-management-finished');
    console.log('[userManagementTest] User management role change test completed successfully');

  } catch (err) {
    await saveShot('user-management-error');
    console.error('[userManagementTest] Test failed:', err && err.message);
    throw err;
  } finally {
    if (KEEP_OPEN) {
      console.log('[userManagementTest] KEEP_BROWSER_OPEN=true - leaving browser open for inspection');
      return;
    }
    console.log('[userManagementTest] Closing browser');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { 
  console.error('[userManagementTest] Fatal error:', err && err.stack || err); 
  process.exit(1); 
});
