const LoginPage = require('../pageobjects/LoginPage');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Navigation smoke', () => {
  it('should open app and show login elements', async () => {
    await LoginPage.open();
    await savePageSourceSnapshot('nav-login');
    await screenshot('nav-login');
    // Validate presence of Sign In and the hint text
    await $('android=new UiSelector().textContains("Sign in to continue")');
    await $('android=new UiSelector().textContains("Sign In")');
  });
});
