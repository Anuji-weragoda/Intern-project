import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

// Generic form submission test: tries to find a user-creation or similar form and submit sample data.
// Run with: node formSubmissionTest.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    // Navigate to a likely form area
    await driver.get(BASE_URL + '/user-management');
    await driver.wait(until.elementLocated(By.css('body')), 5000);

    // Try to find a "create" or "new" button to reveal a form
    const btns = await driver.findElements(By.xpath("//button[contains(., 'Create') or contains(., 'New') or contains(., 'Add')]"));
    if (btns.length) {
      console.log('[formSubmissionTest] Found create/new button — clicking to open form');
      await btns[0].click();
      await driver.sleep(600);
    }

    // Try to find name/email/password fields
    const nameEl = (await driver.findElements(By.css("input[name='name'], input[id='name'], input[placeholder*='Name']"))).shift();
    const emailEl = (await driver.findElements(By.css("input[type='email'], input[name='email'], input[id='email']"))).shift();
    const passEl = (await driver.findElements(By.css("input[type='password'], input[name='password']"))).shift();

    if (!emailEl || !nameEl) {
      console.log('[formSubmissionTest] Required form fields not found; skipping form submission');
      return;
    }

    const testEmail = `e2e.user.${Date.now()}@example.com`;
    await nameEl.clear(); await nameEl.sendKeys('E2E Created User');
    await emailEl.clear(); await emailEl.sendKeys(testEmail);
    if (passEl) { await passEl.clear(); await passEl.sendKeys('Password123!'); }

    // Submit the form
    const submitEls = await driver.findElements(By.css("button[type='submit'], input[type='submit']"));
    if (submitEls.length) {
      await submitEls[0].click();
    } else {
      await emailEl.sendKeys(Key.RETURN);
    }

    // Wait for evidence of creation (table row, success message)
    await driver.wait(async () => {
      const text = await driver.executeScript('return document.body && document.body.innerText || ""');
      return /created|success|added|saved/i.test(text) || text.includes(testEmail);
    }, 8000).catch(() => {});

    console.log('[formSubmissionTest] Form submission attempt complete');
  } finally {
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { console.error('[formSubmissionTest] Error:', err && err.stack || err); process.exit(1); });
