const { expect } = require('chai');
const LoginPage = require('../pageobjects/LoginPage');
const SignUpPage = require('../pageobjects/SignUpPage');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Sign Up flow', () => {
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
      fs.writeFileSync(path.join(dir, 'run-result-signup.json'), JSON.stringify(result, null, 2), 'utf8');
    } catch {}
  });

  it('should open Sign Up, fill fields, and return back', async function () {
    this.timeout(120000);
    await LoginPage.open();
    await LoginPage.goToSignUp();
    await SignUpPage.assertOnSignUp();
    await SignUpPage.fillForm('newuser@example.com', 'Password123', 'Password123');
    await savePageSourceSnapshot('signup-filled');
    await screenshot('signup-before-back');
    // Back to login
    await driver.back();
    await screenshot('signup-back-to-login');
    // Expect to see login title again
    const title = await $('android=new UiSelector().textContains("Sign in to continue")');
    expect(await title.isDisplayed()).to.equal(true);
  });
});
