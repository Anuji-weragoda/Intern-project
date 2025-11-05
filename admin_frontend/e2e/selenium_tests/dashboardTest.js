import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

// Dashboard smoke test. Uses a simple auth bypass (localStorage) if credentials
// are not available, then opens /dashboard and checks for common dashboard elements.
// Run with: node dashboardTest.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    // Seed localStorage bypass to simulate an authenticated session for the app
    await driver.get(BASE_URL + '/');
    await driver.wait(until.elementLocated(By.css('body')), 3000).catch(() => {});
    await driver.executeScript("try { localStorage.setItem('E2E_BYPASS_AUTH','1'); localStorage.setItem('E2E_USER', JSON.stringify({ email: 'e2e@example.com', displayName: 'E2E User' })); } catch(e) {}");
    // Navigate to dashboard
    await driver.get(BASE_URL + '/dashboard');
    await driver.wait(until.elementLocated(By.css('body')), 5000);

    // Check that dashboard content appears
    const text = await driver.executeScript('return document.body && document.body.innerText || ""');
    if (/Dashboard|Recent|Overview|Welcome/i.test(text)) {
      console.log('[dashboardTest] Dashboard content detected');
    } else {
      throw new Error('Dashboard content not detected');
    }
  } finally {
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { console.error('[dashboardTest] Error:', err && err.stack || err); process.exit(1); });
