const fs = require('fs');
const path = require('path');

async function ensureAppInForeground() {
  const APP_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend';
  const APP_ACTIVITY = process.env.ANDROID_ACTIVITY || 'com.example.mobile_frontend.MainActivity';
  try {
    if (driver.isAndroid) {
      await driver.activateApp(APP_PACKAGE);
      await browser.pause(400);
    }
  } catch {}
  try {
    if (driver.isAndroid) {
      await driver.startActivity(APP_PACKAGE, APP_ACTIVITY);
      await browser.pause(600);
    }
  } catch {}
}

async function savePageSourceSnapshot(prefix = 'page') {
  try {
    const dir = path.resolve(process.cwd(), './artifacts/pagesource');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const src = await browser.getPageSource();
    const file = path.join(dir, `${Date.now()}-${prefix}.xml`);
    fs.writeFileSync(file, src, 'utf8');
    console.log(`Saved page source: ${file}`);
  } catch (e) {
    console.log('Failed to save page source', e?.message || e);
  }
}

async function screenshot(name) {
  try {
    const dir = path.resolve(process.cwd(), './artifacts/screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${name}.png`);
    await browser.saveScreenshot(file);
    console.log(`Saved screenshot: ${file}`);
  } catch (e) {
    console.log('Failed to save screenshot', e?.message || e);
  }
}

async function clickIfExists(selector, waitMs = 2000) {
  try {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: waitMs });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

async function findAny(selectors, waitMs = 20000) {
  const start = Date.now();
  let lastErr;
  let reactivated = false;
  while (Date.now() - start < waitMs) {
    for (const sel of selectors) {
      try {
        const el = await $(sel);
        await el.waitForDisplayed({ timeout: 4000 });
        console.log(`Found element by selector: ${sel}`);
        return el;
      } catch (e) { lastErr = e; }
    }
    // If nothing found for a while, try to bring app to foreground once
    if (!reactivated && Date.now() - start > Math.min(4000, waitMs / 2)) {
      try {
        await ensureAppInForeground();
      } catch {}
      reactivated = true;
    }
    await browser.pause(500);
  }
  throw lastErr || new Error('Element not found');
}

async function scrollToText(text) {
  if (!driver.isAndroid) return false;
  try {
    const sel = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${text}")`;
    const el = await $(sel);
    await el.waitForDisplayed({ timeout: 2000 });
    return true;
  } catch {
    // Fallback: manual scroll gestures with limited attempts
    try {
      const rect = await driver.getWindowRect();
      const left = Math.floor(rect.width * 0.1);
      const width = Math.floor(rect.width * 0.8);
      const top = Math.floor(rect.height * 0.2);
      const height = Math.floor(rect.height * 0.6);
      for (let i = 0; i < 5; i++) {
        // Try to find before scrolling
        const candidate = await $(`android=new UiSelector().textContains("${text}")`);
        if (await candidate.isDisplayed().catch(() => false)) return true;
        await driver.execute('mobile: scrollGesture', {
          left, top, width, height,
          direction: 'down', percent: 0.9,
        });
        await browser.pause(400);
      }
    } catch {}
    return false;
  }
}

async function typeIfExists(selectors, value, label = 'field') {
  try {
    const el = await findAny(selectors, 5000);
    await el.click();
    await el.clearValue?.();
    await el.setValue(value);
    console.log(`Typed into ${label}: ${value}`);
    return true;
  } catch {
    console.log(`Could not find ${label} to type`);
    return false;
  }
}

module.exports = {
  ensureAppInForeground,
  savePageSourceSnapshot,
  screenshot,
  clickIfExists,
  findAny,
  scrollToText,
  typeIfExists,
};

// Attempt to click an element or selector with retries and fallbacks.
async function clickWithRetry(elOrSelector, attempts = 3) {
  let el = null;
  try {
    el = typeof elOrSelector === 'string' ? await $(elOrSelector) : elOrSelector;
  } catch (e) { /* ignore */ }

  for (let i = 0; i < attempts; i++) {
    try {
      if (!el) el = typeof elOrSelector === 'string' ? await $(elOrSelector) : elOrSelector;
      await el.waitForDisplayed({ timeout: 3000 });
      await el.click();
      return true;
    } catch (e) {
      // try to hide keyboard (it may block clicks)
      try { await driver.hideKeyboard(); } catch {}
      await browser.pause(300);
      // try tap by center coordinates
      try {
        const rect = await el.getRect();
        const x = Math.floor(rect.x + rect.width / 2);
        const y = Math.floor(rect.y + rect.height / 2);
        // legacy touchPerform call - works in many Appium setups
        await driver.touchPerform([{ action: 'tap', options: { x, y } }]);
        return true;
      } catch (err) {
        // last resort: try executing a generic mobile tap when supported
        try {
          await driver.execute('mobile: tap', { x: Math.floor((await driver.getWindowRect()).width / 2), y: Math.floor((await driver.getWindowRect()).height / 2) });
        } catch {}
      }
    }
  }
  return false;
}
