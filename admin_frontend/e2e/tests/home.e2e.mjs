import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';

export async function runHome({ baseUrl, headless }) {
  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    await driver.get(baseUrl + '/');

    // Basic smoke: app root renders and body is present
    await driver.wait(until.elementLocated(By.css('body')), 10000);

    // Try to find a login button; tolerate absence (some builds may render different text)
    const buttons = await driver.findElements(By.css('button'));
    if (buttons.length > 0) {
      // Ensure at least one button is interactable
      await driver.wait(until.elementIsVisible(buttons[0]), 5000);
    }
  } finally {
    await driver.quit();
  }
}
