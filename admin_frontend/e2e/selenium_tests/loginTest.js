import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // prepare screenshot folder
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir, 'screenshots');
  try { fs.mkdirSync(shotsDir, { recursive: true }); } catch {}

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
    console.log('[userManagementTest] Opening User Management page...');
    await driver.get(`${BASE_URL}/user-management`);

    await driver.wait(until.elementLocated(By.css('body')), 5000);
    await saveShot('page-loaded');

    // Verify header text
    const header = await driver.wait(until.elementLocated(By.xpath("//h1[contains(., 'User Management')]")), 10000);
    const headerText = await header.getText();
    console.log('[userManagementTest] Header found:', headerText);

    // Wait for table to appear
    const table = await driver.wait(until.elementLocated(By.xpath("//table")), 10000);
    console.log('[userManagementTest] Table visible:', !!table);
    await saveShot('table-visible');

    // Search for a user
    const searchInput = await driver.findElement(By.xpath("//input[@placeholder='Search by email or username...']"));
    await searchInput.sendKeys('admin');
    await driver.sleep(1000);
    await saveShot('search-admin');
    console.log('[userManagementTest] Typed "admin" in search input.');

    // Filter by role
    const filterSelect = await driver.findElement(By.xpath("//select[contains(@class, 'bg-slate-50')]"));
    await filterSelect.click();
    const adminOption = await driver.findElement(By.xpath("//option[contains(text(), 'Admin')]"));
    await adminOption.click();
    console.log('[userManagementTest] Filtered by role: Admin');
    await driver.sleep(1000);
    await saveShot('filtered-admin');

    // Click first user row
    const firstRow = await driver.wait(until.elementLocated(By.xpath("//tbody/tr[1]")), 10000);
    await firstRow.click();
    console.log('[userManagementTest] Clicked first user row');
    await driver.sleep(800);
    await saveShot('clicked-user');

    // Wait for modal to appear
    const modal = await driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class,'bg-white') and contains(.,'Account Status')]")),
      10000
    );
    console.log('[userManagementTest] Modal opened:', await modal.isDisplayed());
    await saveShot('modal-opened');

    // Close modal
    const closeBtn = await driver.findElement(By.xpath("//button[contains(@class,'hover:bg-slate-100')]"));
    await closeBtn.click();
    console.log('[userManagementTest] Closed user modal');
    await driver.sleep(500);
    await saveShot('modal-closed');

    // Click Manage Roles button
    const manageRolesBtn = await driver.findElement(By.xpath("//button[contains(., 'Manage Roles')]"));
    await manageRolesBtn.click();
    console.log('[userManagementTest] Clicked Manage Roles');
    await driver.sleep(800);
    await saveShot('clicked-manage-roles');

    console.log('[userManagementTest] ✅ User Management test completed successfully');
  } catch (err) {
    await saveShot('error');
    const html = await driver.getPageSource();
    fs.writeFileSync(path.join(shotsDir, 'error-page.html'), html);
    console.log('[userManagementTest] ❌ Error occurred:', err.message);
    throw err;
  } finally {
    if (KEEP_OPEN) {
      console.log('[userManagementTest] KEEP_BROWSER_OPEN=true — leaving browser open for inspection.');
      return;
    }
    console.log('[userManagementTest] Closing browser');
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[userManagementTest] Fatal error:', err);
  process.exit(1);
});
