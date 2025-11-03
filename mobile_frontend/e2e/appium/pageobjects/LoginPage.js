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
    // Broaden selectors and interact carefully to ensure keyboard and focus
    const emailSelectors = [
      'android=new UiSelector().resourceIdMatches("(?i).*email.*|.*username.*")',
      'android=new UiSelector().textContains("Enter your email")',
      'android=new UiSelector().descriptionContains("email")',
      'android=new UiSelector().textContains("Email")',
      'android=new UiSelector().className("android.widget.EditText").instance(0)'
    ];

    const passwordSelectors = [
      'android=new UiSelector().resourceIdMatches("(?i).*password.*")',
      'android=new UiSelector().textContains("Enter your password")',
      'android=new UiSelector().textContains("Password")',
      'android=new UiSelector().className("android.widget.EditText").instance(1)'
    ];

    // Find email field and type with explicit focus + small pauses
    const emailEl = await findAny(emailSelectors, 8000).catch(() => null);
    if (emailEl) {
      await emailEl.click().catch(() => {});
      await driver.pause(250);
      try { await emailEl.clearValue(); } catch {}
      await emailEl.setValue(email);
      // Try to move focus to next field via editor action
      try { await driver.execute('mobile: performEditorAction', { action: 'next' }); } catch {}
    } else {
      // fallback to helper
      await typeIfExists(emailSelectors, email, 'email');
    }

    // Find password field and type
    let passEl = await findAny(passwordSelectors, 8000).catch(() => null);
    // If the found element is not an EditText (could be a 'Forgot Password' link that contains the word), try a stricter selector
    if (passEl) {
      const cls = await passEl.getAttribute('class').catch(() => '');
      const txt = await passEl.getText().catch(() => '');
      if (!/EditText/i.test(cls) && /forgot|reset|password/i.test(txt)) {
        // try the explicit EditText instance as fallback
        passEl = await findAny(['android=new UiSelector().className("android.widget.EditText").instance(1)'], 4000).catch(() => null);
      }
    }

    if (passEl) {
      await passEl.click().catch(() => {});
      await driver.pause(250);
      try { await passEl.clearValue(); } catch {}
      // attempt setValue, then addValue as a retry
      try {
        await passEl.setValue(password);
      } catch (e) {
        try { await passEl.addValue(password); } catch {}
      }
      // try to submit via editor action
      try { await driver.execute('mobile: performEditorAction', { action: 'done' }); } catch {}
    } else {
      await typeIfExists(passwordSelectors, password, 'password');
    }

    await screenshot('login-typed');
  }

  async tapSignIn() {
    // Prefer actual Button elements to avoid tapping links like 'Forgot Password'
    const buttonSelectors = [
      'android=new UiSelector().className("android.widget.Button").textMatches("(?i).*sign\\s*in.*")',
      'android=new UiSelector().className("android.widget.Button").descriptionContains("Sign In")',
      'android=new UiSelector().className("android.widget.Button").textContains("Sign In")'
    ];

    // Generic fallbacks
    const loginButtonSelectors = [
      '~Sign In',
      'android=new UiSelector().description("Sign In")',
      'android=new UiSelector().descriptionContains("Sign In")',
      'android=new UiSelector().textContains("Sign In")',
      'android=new UiSelector().textMatches("(?i).*sign\\s*in.*")',
      'android=new UiSelector().resourceIdMatches(".*sign.*in.*")'
    ];

  // Try to scroll to the button in case it's off-screen
  try { await scrollToText('Sign In'); } catch {}

  // Capture page state before attempting to tap so failures can be diagnosed
  try { await savePageSourceSnapshot('before-sign-in'); } catch {}
  try { await screenshot('before-sign-in.png'); } catch {}

    // Helper to validate candidate isn't a forgot/reset link
    const isBadLabel = (text = '', desc = '') => {
      text = (text || '').toString().toLowerCase();
      desc = (desc || '').toString().toLowerCase();
      return /forgot|reset|password|recover/.test(text) || /forgot|reset|password|recover/.test(desc);
    };

    // Try precise button selectors first
    for (const sel of buttonSelectors) {
      try {
        const el = await $(sel);
        if (!await el.isDisplayed().catch(() => false)) continue;
        const txt = await el.getText().catch(() => '');
        const desc = await el.getAttribute('content-desc').catch(() => '');
        if (isBadLabel(txt, desc)) continue;
        await el.click();
        await screenshot('login-tap-sign-in');
        return;
      } catch {}
    }

    // Try broader selectors and filter ambiguous matches
    for (const sel of loginButtonSelectors) {
      try {
        const el = await $(sel);
        if (!await el.isDisplayed().catch(() => false)) continue;
        const txt = await el.getText().catch(() => '');
        const desc = await el.getAttribute('content-desc').catch(() => '');
        if (isBadLabel(txt, desc)) continue;
        await el.click();
        await screenshot('login-tap-sign-in');
        return;
      } catch {}
    }

    // Fallback: hide keyboard and try quick clickIfExists attempts
    try { await driver.hideKeyboard(); } catch {}
    try {
      const { clickIfExists } = require('./common');
      if (await clickIfExists('~Sign In', 2000)) { await screenshot('login-tap-sign-in'); return; }
      if (await clickIfExists('android=new UiSelector().textMatches("(?i).*sign\\s*in.*")', 2000)) { await screenshot('login-tap-sign-in'); return; }
    } catch {}

    // If we reached here, collect candidates for debugging
    try {
      const candidates = await $$('android=new UiSelector().textMatches("(?i).*sign\\s*in.*")');
      console.log(`SignIn candidates found: ${candidates.length}`);
      for (let i = 0; i < candidates.length; i++) {
        try {
          const el = candidates[i];
          const txt = await el.getText().catch(() => '');
          const desc = await el.getAttribute('content-desc').catch(() => '');
          const resId = await el.getAttribute('resourceId').catch(() => '');
          console.log(`candidate[${i}] text='${txt}' desc='${desc}' resId='${resId}' displayed=${await el.isDisplayed().catch(() => false)}`);
        } catch (e) { console.log('candidate inspect failed', e?.message || e); }
      }
    } catch (e) { console.log('candidate enumeration failed', e?.message || e); }

    // Last resort: capture a screenshot for debugging and throw
    await screenshot('login-tap-sign-in-failure.png');
    await savePageSourceSnapshot('login-tap-sign-in-failure');
    throw new Error('Sign In button not found or ambiguous');
  }
}

module.exports = new LoginPage();
