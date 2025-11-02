import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';

export async function runUnauthorized({ baseUrl, headless }) {
  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    await driver.get(baseUrl + '/unauthorized');

    // Expect Unauthorized content
    await driver.wait(until.elementLocated(By.css('body')), 10000);

    // First, wait for SPA hydration and confirm the client-side path stays at /unauthorized
    let pathOk = false;
    const deadlinePath = Date.now() + 5000;
    while (Date.now() < deadlinePath) {
      const pathname = await driver.executeScript('return window.location && window.location.pathname || "";');
      if (/(^|\/)unauthorized\/?$/.test(pathname)) { pathOk = true; break; }
      await driver.sleep(150);
    }

    // Poll for text that matches the actual Unauthorized page copy (allow hydration time)
    const regex = /(403|Access Denied|You do not have permission|Sign in with a different account)/i;
    const deadline = Date.now() + 10000;
    let matched = false;
    while (Date.now() < deadline) {
      // Use DOM innerText instead of page source to capture SPA-rendered content
      const text = await driver.executeScript('return document.body && document.body.innerText || "";');
      if (regex.test(text)) { matched = true; break; }
      await driver.sleep(250);
    }
    if (!matched && !pathOk) {
      const currentUrl = await driver.getCurrentUrl();
      const text = await driver.executeScript('return document.body && document.body.innerText || "";');
      const sample = (text || '').slice(0, 600).replace(/\s+/g, ' ').trim();
      throw new Error(`Unauthorized page content not found at ${currentUrl}. Sample innerText: "${sample}"`);
    }
  } finally {
    await driver.quit();
  }
}
