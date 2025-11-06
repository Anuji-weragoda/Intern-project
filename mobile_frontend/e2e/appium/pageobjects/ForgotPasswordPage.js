const { findAny, typeIfExists, screenshot, scrollToText } = require('./common');

class ForgotPasswordPage {
  async assertOnForgotPassword() {
    // Fast-path: if the fp_email_input semantics/accessibility id is present, we're already on the forgot screen
    try {
      const quick = await findAny(['~fp_email_input'], 2000).catch(() => null);
      if (quick) {
        await screenshot('forgot-open-quick');
        return quick;
      }
    } catch (_) {}

    // Otherwise, perform the normal detection flow (scroll + heuristics)
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
    // Prefer accessibility id (Semantics label) if available, then fall back to text/hint heuristics
    await typeIfExists([
      '~fp_email_input',
      'android=new UiSelector().textContains("Email")',
      'android=new UiSelector().textMatches("(?i).*email.*")',
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
