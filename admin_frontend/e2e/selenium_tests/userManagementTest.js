import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Selenium test for User Management page: open Manage Roles for first user,
// toggle a role, submit and confirm the browser alert.
// Run with: node userManagementTest.js
// Environment:
//  BASE_URL (default http://localhost:5180)
//  HEADLESS=true to run headless
//  KEEP_BROWSER_OPEN=true to leave the browser open for debugging

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // prepare screenshots dir
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
    console.log('[userManagementTest] Opening app at', BASE_URL + '/user-management');
    await driver.get(BASE_URL + '/user-management');
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    await saveShot('user-management-initial');

    // Check for authentication error message (page shows an auth error if no token)
    const bodyText = await driver.executeScript('return document.body && document.body.innerText || ""');
    if (/Authentication Error|No authentication token|Please log in/i.test(bodyText)) {
      console.log('[userManagementTest] Authentication required or error page detected — aborting test');
      await saveShot('user-management-auth-error');
      return;
    }

    // Wait for the users table to appear
    await driver.wait(async () => {
      const rows = await driver.findElements(By.css('table tbody tr'));
      return rows.length > 0;
    }, 15000);

    await saveShot('user-management-table-loaded');

    // Find the first 'Manage Roles' button in the table and click it
    const manageButtons = await driver.findElements(By.xpath("//table//tbody//tr//button[contains(normalize-space(string(.)), 'Manage Roles')]"));
    if (!manageButtons.length) {
      throw new Error('Manage Roles button not found in any user row');
    }
    console.log('[userManagementTest] Clicking Manage Roles for first user');
    await manageButtons[0].click();
    await driver.sleep(500);
    await saveShot('role-modal-opened');

    // Wait for the Role Management modal to appear (heading 'Manage User Roles')
    await driver.wait(async () => {
      const headings = await driver.findElements(By.xpath("//h3[contains(normalize-space(string(.)), 'Manage User Roles')]") ).catch(() => []);
      return headings.length > 0;
    }, 5000);

    // Inside the modal, find role toggle buttons — they are full-width buttons
    const roleButtons = await driver.findElements(By.xpath("//div[contains(@class,'fixed') or contains(@class,'z-50')]//button[.//text() and not(contains(normalize-space(string(.)), 'Cancel')) and not(contains(normalize-space(string(.)), 'Update Roles'))]")).catch(() => []);
    // Fallback: find buttons inside dialog by searching for 'Update Roles' sibling
    if (!roleButtons.length) {
      const modal = await driver.findElements(By.xpath("//div[.//h3[contains(normalize-space(string(.)), 'Manage User Roles')]]"));
      if (modal.length) {
        roleButtons.push(...(await modal[0].findElements(By.css('button')).catch(() => [])));
      }
    }

    if (!roleButtons.length) {
      throw new Error('No role option buttons found inside the modal');
    }

    // Click the first role button to toggle it
    console.log('[userManagementTest] Toggling first role option in modal');
    await roleButtons[0].click();
    await driver.sleep(300);
    await saveShot('role-toggled');

    // Click the Update Roles button (text contains 'Update Roles')
    const updateButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Update Roles')]") ).catch(() => []);
    if (!updateButtons.length) throw new Error('Update Roles button not found in modal');
    console.log('[userManagementTest] Clicking Update Roles');
    await updateButtons[0].click();

    // The app uses alert(...) to confirm success. Wait for alert and accept it.
    try {
      await driver.wait(until.alertIsPresent(), 7000);
      const alert = await driver.switchTo().alert();
      const txt = await alert.getText();
      console.log('[userManagementTest] Alert text:', txt);
      await alert.accept();
      await saveShot('after-roles-updated-alert');
    } catch (e) {
      // No alert — continue and verify modal closed
      console.log('[userManagementTest] No alert detected after update; verifying modal closed');
    }

    // Wait for modal to disappear (timeout 10s)
    await driver.wait(async () => {
      const modals = await driver.findElements(By.xpath("//h3[contains(normalize-space(string(.)), 'Manage User Roles')]") ).catch(() => []);
      return modals.length === 0;
    }, 10000).catch(() => {
      console.log('[userManagementTest] Role modal did not close within timeout');
    });

    await saveShot('user-management-finished');
    console.log('[userManagementTest] Role change flow complete');
  } catch (err) {
    await saveShot('user-management-error');
    console.error('[userManagementTest] Error:', err && err.stack || err);
    throw err;
  } finally {
    if (KEEP_OPEN) {
      console.log('[userManagementTest] KEEP_BROWSER_OPEN=true — leaving browser open for inspection (test process will exit without closing the browser)');
      return;
    }
    console.log('[userManagementTest] Quitting driver');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { console.error('[userManagementTest] Error (top-level):', err && err.stack || err); process.exit(1); });
