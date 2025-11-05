const { expect } = require('chai');
const LoginPage = require('../pageobjects/LoginPage');
const ForgotPasswordPage = require('../pageobjects/ForgotPasswordPage');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Forgot Password flow', () => {
  afterEach(function () {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.resolve(process.cwd(), './artifacts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const result = {
        title: this.currentTest && this.currentTest.title,
        state: this.currentTest && this.currentTest.state,
        duration: this.currentTest && this.currentTest.duration,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(path.join(dir, 'run-result-forgot.json'), JSON.stringify(result, null, 2), 'utf8');
    } catch {}
  });

  it('should open Forgot Password and type email, then go back', async function () {
    this.timeout(120000);
    await LoginPage.open();
    await LoginPage.goToForgotPassword();
    await ForgotPasswordPage.assertOnForgotPassword();
    await ForgotPasswordPage.fillEmail('user@example.com');
    await savePageSourceSnapshot('forgot-filled');
    await screenshot('forgot-before-back');
    await driver.back();
    await screenshot('forgot-back-to-login');
    const title = await $('android=new UiSelector().textContains("Sign in to continue")');
    expect(await title.isDisplayed()).to.equal(true);
  });
});
