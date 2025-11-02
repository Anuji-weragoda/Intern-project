const { findAny, typeIfExists, screenshot, scrollToText } = require('./common');

class ForgotPasswordPage {
  async assertOnForgotPassword() {
    await scrollToText('Forgot Password');
    await scrollToText('Reset Password');
    await scrollToText('Send Reset Code');
    const title = await findAny([
      'android=new UiSelector().textContains("Forgot Password")',
      'android=new UiSelector().textMatches("(?i).*Forgot\\s*Password.*")',
      'android=new UiSelector().textContains("Reset Password")',
      // Fallbacks: presence of Send Reset Code button or the input label
      'android=new UiSelector().textContains("Send Reset Code")',
      'android=new UiSelector().textContains("Email")',
    ], 25000);
    await screenshot('forgot-open');
    return title;
  }

  async fillEmail(email) {
    await typeIfExists([
      'android=new UiSelector().textContains("Email")',
      'android=new UiSelector().className("android.widget.EditText").instance(0)'
    ], email, 'forgot-email');
    await screenshot('forgot-email');
  }

  async sendCode() {
    const btn = await findAny([
      'android=new UiSelector().textContains("Send Reset Code")',
    ], 8000).catch(() => null);
    if (btn) {
      await btn.click();
      await screenshot('forgot-send-code');
    }
  }
}

module.exports = new ForgotPasswordPage();
