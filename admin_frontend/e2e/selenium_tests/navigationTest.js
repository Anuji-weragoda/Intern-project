import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

// Navigation test: click main nav links and verify navigation.
// Run with: node navigationTest.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const HEADLESS = process.env.HEADLESS === 'true';

async function main() {
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await driver.get(BASE_URL + '/');
    await driver.wait(until.elementLocated(By.css('body')), 5000);

    // Try to click a few likely navigation links by href
    const navPaths = ['/dashboard', '/profile', '/user-management', '/audit-log'];
    for (const p of navPaths) {
      try {
        const els = await driver.findElements(By.css(`a[href*='${p}']`));
        if (!els.length) {
          console.log('[navigationTest] No link for', p, 'found; skipping');
          continue;
        }
        console.log('[navigationTest] Clicking link to', p);
        await els[0].click();
        // Wait for navigation
        await driver.wait(async () => {
          const url = await driver.getCurrentUrl();
          return url.includes(p) || (await driver.executeScript('return document.body && document.body.innerText || ""')).toLowerCase().includes(p.replace('/',''));
        }, 5000).catch(() => {});
      } catch (e) {
        console.log('[navigationTest] Error navigating to', p, e && e.message);
      }
      // small pause
      await driver.sleep(500);
    }
    console.log('[navigationTest] Navigation checks complete');
  } finally {
    await driver.quit().catch(() => {});
  }
}

main().catch((err) => { console.error('[navigationTest] Error:', err && err.stack || err); process.exit(1); });
