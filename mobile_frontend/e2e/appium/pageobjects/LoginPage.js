const {
  ensureAppInForeground,
  findAny,
  clickIfExists,
  typeIfExists,
  screenshot,
  savePageSourceSnapshot,
  scrollToText,
} = require('./common');

class LoginPage {
  async open() {
    await ensureAppInForeground();
    await savePageSourceSnapshot('login-open');
    await screenshot('login-open');
  }

  async goToSignUp() {
    const sel = [
      '~Sign Up',
      'android=new UiSelector().description("Sign Up")',
      'android=new UiSelector().textContains("Sign Up")',
      'android=new UiSelector().textMatches("(?i).*Sign\\s*Up.*")',
      'android=new UiSelector().textContains("Create Account")',
      'android=new UiSelector().textMatches("(?i).*Register.*")',
    ];
    // Try scrolling in case the link is off-screen
    await scrollToText('Sign Up');
    await scrollToText('Create Account');
    await scrollToText('Register');
    const el = await findAny(sel, 20000);
    await el.click();
    await screenshot('login-to-signup');
  }

  async goToForgotPassword() {
    const sel = [
      '~Forgot Password?',
      'android=new UiSelector().descriptionContains("Forgot Password")',
      'android=new UiSelector().textContains("Forgot Password")'
    ];
    await scrollToText('Forgot Password');
    const el = await findAny(sel, 20000);
    await el.click();
    await screenshot('login-to-forgot');
  }

  async fillCredentials(email, password) {
    const emailSelectors = [
      'android=new UiSelector().textContains("Enter your email")',
      'android=new UiSelector().descriptionContains("email")',
      'android=new UiSelector().className("android.widget.EditText").instance(0)'
    ];
    const passwordSelectors = [
      'android=new UiSelector().textContains("Enter your password")',
      'android=new UiSelector().descriptionContains("password")',
      'android=new UiSelector().className("android.widget.EditText").instance(1)'
    ];
    await typeIfExists(emailSelectors, email, 'email');
    await typeIfExists(passwordSelectors, password, 'password');
    await screenshot('login-typed');
  }

  async tapSignIn() {
    const loginButtonSelectors = [
      '~Sign In',
      'android=new UiSelector().description("Sign In")',
      'android=new UiSelector().textContains("Sign In")'
    ];
    const el = await findAny(loginButtonSelectors, 10000);
    await el.click();
    await screenshot('login-tap-sign-in');
  }
}

module.exports = new LoginPage();
