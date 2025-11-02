const { findAny, typeIfExists, screenshot, savePageSourceSnapshot } = require('./common');

class SignUpPage {
  async assertOnSignUp() {
    // Try to reveal common labels
    await browser.pause(500);
    try { await driver.hideKeyboard(); } catch {}
    await browser.pause(200);
    // Scroll for typical titles/buttons
    for (const t of ['Create Account', 'Register', 'Sign Up']) {
      await browser.pause(100);
      await require('./common').scrollToText(t);
    }
    const title = await findAny([
      // Title variants
      'android=new UiSelector().textContains("Create Account")',
      'android=new UiSelector().textMatches("(?i).*Create\\s*Account.*")',
      'android=new UiSelector().textContains("Register")',
      'android=new UiSelector().textMatches("(?i).*Register.*")',
      'android=new UiSelector().textContains("Verify Email")',
      'android=new UiSelector().textContains("Sign up to get started")',
      // Action button as fallback signal that we are on signup screen
      'android=new UiSelector().textContains("Sign Up")',
      'android=new UiSelector().descriptionContains("Sign Up")',
      'android=new UiSelector().textMatches("(?i).*Sign\\s*Up.*")',
    ], 25000);
    await screenshot('signup-open');
    return title;
  }

  async fillForm(email, password, confirm) {
    await typeIfExists([
      'android=new UiSelector().textContains("Enter your email")',
      'android=new UiSelector().className("android.widget.EditText").instance(0)'
    ], email, 'signup-email');
    await typeIfExists([
      'android=new UiSelector().textContains("Enter your password")',
      'android=new UiSelector().className("android.widget.EditText").instance(1)'
    ], password, 'signup-password');
    await typeIfExists([
      'android=new UiSelector().textContains("Confirm your password")',
      'android=new UiSelector().className("android.widget.EditText").instance(2)'
    ], confirm, 'signup-confirm');
    await screenshot('signup-filled');
  }

  async submit() {
    const btn = await findAny([
      'android=new UiSelector().textContains("Sign Up")',
      'android=new UiSelector().descriptionContains("Sign Up")',
      'android=new UiSelector().textMatches("(?i).*Register.*")',
    ], 12000);
    await btn.click();
    await screenshot('signup-submit');
  }
}

module.exports = new SignUpPage();
