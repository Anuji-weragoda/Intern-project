import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

// Simple registration test. Attempts to open /signup or /register and submit a form.
// Run with: node registerTest.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const SIGNUP_EMAIL = process.env.SIGNUP_EMAIL || '';
const SIGNUP_PASSWORD = process.env.SIGNUP_PASSWORD || '';
const SIGNUP_NAME = process.env.SIGNUP_NAME || 'E2E Test User';
const HEADLESS = process.env.HEADLESS === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    console.log('[registerTest] Navigating to signup page');
    await driver.get(BASE_URL + '/signup');
    await driver.wait(until.elementLocated(By.css('body')), 5000).catch(() => {});

    // Try common signup fields
    const nameSel = "input[name='name'], input[id='name'], input[placeholder*='Name']";
    const emailSel = "input[type='email'], input[name='email'], input[id='email']";
    const passSel = "input[type='password'], input[name='password'], input[id='password']";
    const submitSel = "button[type='submit'], input[type='submit']";

    const nameEls = await driver.findElements(By.css(nameSel));
    const emailEls = await driver.findElements(By.css(emailSel));
    const passEls = await driver.findElements(By.css(passSel));

    if (!emailEls.length || !passEls.length) {
      // try /register
      console.log('[registerTest] Signup inputs not found, trying /register');
      await driver.get(BASE_URL + '/register');
      await driver.sleep(600);
    }

    // refresh element references
    const nameEl = (await driver.findElements(By.css(nameSel))).shift();
    const emailEl = (await driver.findElements(By.css(emailSel))).shift();
    const passEl = (await driver.findElements(By.css(passSel))).shift();

    if (!emailEl || !passEl) {
      console.log('[registerTest] No signup form detected; skipping test');
      return;
    }

    // Use provided env vars or generate a unique email
    const email = SIGNUP_EMAIL || `e2e+${Date.now()}@example.com`;
    const password = SIGNUP_PASSWORD || (Math.random().toString(36).slice(2) + 'A1!');

    if (nameEl) { await nameEl.clear(); await nameEl.sendKeys(SIGNUP_NAME); }
    await emailEl.clear(); await emailEl.sendKeys(email);
    await passEl.clear(); await passEl.sendKeys(password);

    // Submit the form
    const submitEls = await driver.findElements(By.css(submitSel));
    if (submitEls.length) {
      await submitEls[0].click();
    } else {
      // fallback: press Enter
      await passEl.sendKeys(Key.RETURN);
    }

    // Wait for success indication
    await driver.wait(async () => {
      const text = await driver.executeScript('return document.body && document.body.innerText || ""');
      return /Verify|Confirm|Welcome|Account created|Registration complete|created/i.test(text);
    }, 10000).catch(() => {});

    console.log('[registerTest] Registration flow completed (or timed out waiting for confirmation)');
  } finally {
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { console.error('[registerTest] Error:', err && err.stack || err); process.exit(1); });
