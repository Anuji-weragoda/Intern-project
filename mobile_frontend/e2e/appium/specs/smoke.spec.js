const { expect } = require('chai');

describe('Appium smoke', () => {
  it('should create a session and return page source', async () => {
    // Session is created by WDIO/Appium service. Ensure sessionId exists.
    const sid = browser.sessionId || (browser && browser.capabilities && browser.capabilities.deviceName);
    expect(sid).to.not.be.undefined;

    // Try to get page source to ensure the app is responding
    const source = await browser.getPageSource();
    expect(source).to.be.a('string');
    // A minimal assertion — app-specific assertions should be added per-app
  });
});
