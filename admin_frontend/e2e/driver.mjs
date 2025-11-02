import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import edge from 'selenium-webdriver/edge.js';

export async function buildDriver({ headless = true, preferred = 'edge' } = {}) {
  // Try preferred browser first, fall back if it fails
  const tried = [];
  for (const browser of [preferred, browserFallback(preferred)]) {
    if (!browser || tried.includes(browser)) continue;
    tried.push(browser);
    try {
      if (browser === 'edge') {
        const options = new edge.Options();
        if (headless) options.addArguments('--headless=new');
        options.addArguments('--disable-gpu', '--no-sandbox', '--window-size=1280,900');
        return await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build();
      } else if (browser === 'chrome') {
        const options = new chrome.Options();
        if (headless) options.addArguments('--headless=new');
        options.addArguments('--disable-gpu', '--no-sandbox', '--window-size=1280,900');
        return await new Builder().forBrowser('chrome').setChromeOptions(options).build();
      }
    } catch (e) {
      // Try next browser
    }
  }
  // Final attempt with default
  return await new Builder().forBrowser('chrome').build();
}

function browserFallback(preferred) {
  return preferred === 'edge' ? 'chrome' : 'edge';
}
