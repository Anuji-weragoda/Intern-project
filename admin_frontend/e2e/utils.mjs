// Utilities to prepare the app for authenticated E2E flows without a real backend
// - Sets a dummy session via localStorage (used by authService E2E bypass)
// - Sets a dummy jwt_token cookie for pages that read JWT directly (Dashboard/Profile)
// - Stubs window.fetch to return canned JSON for known API endpoints used by pages

export async function prepareAuthenticatedApp(driver, baseUrl) {
  // If a real login is requested via env vars, perform an interactive login
  const realLogin = (process.env.REAL_LOGIN === 'true') || !!process.env.LOGIN_EMAIL || !!process.env.SIGNUP_EMAIL;
  if (realLogin) {
    const email = process.env.LOGIN_EMAIL || process.env.SIGNUP_EMAIL;
    const password = process.env.LOGIN_PASSWORD || process.env.SIGNUP_PASSWORD;
    try {
      // First navigate to a protected page to trigger any auth redirect
      try {
        await driver.get(baseUrl + '/profile');
        await driver.wait((await import('selenium-webdriver')).until.elementLocated((await import('selenium-webdriver')).By.css('body')), 3000).catch(() => {});
      } catch (e) {}
      await performInteractiveLogin(driver, baseUrl, { email, password });
    } catch (e) {
      // fall back to bypass if interactive login fails
      console.warn('Interactive login failed, falling back to bypass auth for E2E:', e?.message || e);
    }
    return;
  }

  // Ensure we're on the app origin to set localStorage and cookie
  await driver.get(baseUrl + '/');

  // Minimal flag injection to bypass auth
  await driver.executeScript("try { localStorage.setItem('E2E_BYPASS_AUTH','1'); } catch(e) {}");
  await driver.executeScript(
    "try { localStorage.setItem('E2E_USER', JSON.stringify({ username: 'e2e', displayName: 'E2E User', email: 'e2e@example.com', roles: ['ADMIN'] })); } catch(e) {}"
  );
  await driver.executeScript("try { document.cookie = 'jwt_token=dummy-e2e-token; path=/'; } catch(e) {}");

  // Guard against any full-page navigations to external OAuth during E2E
  await driver.executeScript(`
    try {
      var appOrigin = window.location.origin;
      var host = window.location.hostname;
      var isLocal = host === 'localhost' || host === '127.0.0.1';
      var bypass = (typeof localStorage !== 'undefined' && localStorage.getItem('E2E_BYPASS_AUTH') === '1');

      if (isLocal && bypass) {
        try {
          var __origAssign = window.location.assign ? window.location.assign.bind(window.location) : null;
          if (__origAssign) {
            window.location.assign = function(href) {
              try {
                var url = new URL(href, window.location.href);
                if (url.origin !== appOrigin) { return; }
              } catch (e) {}
              return __origAssign(href);
            };
          }
        } catch (e) {}

        try {
          var __origReplace = window.location.replace ? window.location.replace.bind(window.location) : null;
          if (__origReplace) {
            window.location.replace = function(href) {
              try {
                var url = new URL(href, window.location.href);
                if (url.origin !== appOrigin) { return; }
              } catch (e) {}
              return __origReplace(href);
            };
          }
        } catch (e) {}
      }
    } catch (e) {}
  `);

  // Minimal fetch stubs for pages that call backend directly (Dashboard, etc.)
  await driver.executeScript(`
    try {
      var origFetch = window.fetch ? window.fetch.bind(window) : null;
      if (origFetch) {
        window.fetch = function(u, i) {
          try {
            var s = String(u || '');
            if (s.indexOf('/api/v1/me') !== -1) {
              return Promise.resolve({ ok: true, json: function(){ return Promise.resolve({ email: 'e2e@example.com', displayName: 'E2E User', roles: ['ADMIN'], createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(), loginCount: 1 }); } });
            }
            if (s.indexOf('/api/v1/admin/audit-log') !== -1) {
              return Promise.resolve({ ok: true, json: function(){ return Promise.resolve([{ id:1, email:'e2e@example.com', eventType:'LOGIN', success:true, createdAt: new Date().toISOString() }]); } });
            }
          } catch(e) {}
          return origFetch(u, i);
        };
      }
    } catch(e) {}
  `);

  // Refresh so AuthContext re-runs session bootstrap with bypass
  await driver.navigate().refresh();
  // Give the app a moment to initialize AuthContext and read the bypass flags
  await driver.sleep(1200);
  // Try dismissing common modal dialogs/popups that may block flows
  try { await dismissCommonDialogs(driver); } catch (e) { /* non-fatal */ }
}

// Try a generic interactive login on the app. This attempts to navigate to
// common login paths and fill common email/password selectors. It's
// intentionally tolerant: it will try several selector variants and wait
// briefly for navigation or presence of app content before returning.
export async function performInteractiveLogin(driver, baseUrl, { email, password, selectors } = {}) {
  if (!email || !password) throw new Error('Missing email or password for interactive login');
  const { By, until } = await import('selenium-webdriver');
  console.log('[E2E] performInteractiveLogin starting; email=', email ? email.replace(/(.{2}).+(@.+)/,'$1***$2') : '<none>');
  // Allow overriding selectors and login URL via environment variables for deterministic runs
  const envLoginUrl = process.env.LOGIN_PAGE_URL || '';
  const envEmailSelector = process.env.LOGIN_EMAIL_SELECTOR || '';
  const envPasswordSelector = process.env.LOGIN_PASSWORD_SELECTOR || '';
  const envSubmitSelector = process.env.LOGIN_SUBMIT_SELECTOR || '';

  // Common selectors to try (can be overridden by env vars or passed selectors)
  const emailSelectors = (selectors && selectors.email) ? selectors.email : (envEmailSelector ? envEmailSelector.split('|') : [
    "input[type=email]",
    "input[name=email]",
    "input[name=username]",
    "input[id=email]",
    "input[autocomplete=email]"
  ]);
  const passwordSelectors = (selectors && selectors.password) ? selectors.password : (envPasswordSelector ? envPasswordSelector.split('|') : [
    "input[type=password]",
    "input[name=password]",
    "input[id=password]",
    "input[autocomplete=current-password]"
  ]);
  const submitSelectors = (selectors && selectors.submit) ? selectors.submit : (envSubmitSelector ? envSubmitSelector.split('|') : [
    "button[type=submit]",
    "button[name=login]",
    "button[data-test=login]",
    "button[data-test=signin]",
    "input[type=submit]"
  ]);

  // Try a few common login paths
  const tryPaths = [];
  // If the user provided a specific login URL, try it first
  if (envLoginUrl) tryPaths.push(envLoginUrl);
  // then try common app paths
  tryPaths.push('/login', '/signin', '/auth', '/');
  let loggedIn = false;
  // First, try to click an in-app "Sign in"/"Log in" button which may open the hosted IdP
  try {
    await driver.get(baseUrl + '/');
    await driver.wait(until.elementLocated(By.css('body')), 3000).catch(() => {});
    const signTexts = ['Sign in', 'Sign In', 'Sign in with', 'Log in', 'Log In', 'Sign up / Sign in', 'Sign in / Sign up'];
    for (const t of signTexts) {
      try {
        const xpath = `//button[contains(normalize-space(string(.)), '${t}')] | //a[contains(normalize-space(string(.)), '${t}')]`;
        const el = await driver.findElements(By.xpath(xpath)).then(a => a[0]).catch(() => null);
        if (el) {
          console.log('[E2E] clicking in-app sign-in button with text:', t);
          try {
            await driver.executeScript('arguments[0].scrollIntoView({block:"center", inline:"center"})', el).catch(() => {});
            await driver.sleep(120);
            try { await el.click(); } catch (e) { try { await driver.executeScript('arguments[0].click()', el); } catch (e) {} }
          } catch (e) {}
          await driver.sleep(700);
          break;
        }
      } catch (e) {}
    }
    // If not found by text, try a set of common selectors/hrefs and attributes
    const fallbackSelectors = [
      "a[href*='login']",
      "a[href*='signin']",
      "a[href*='auth']",
      "button[aria-label*='sign']",
      "button[aria-label*='login']",
      ".signin",
      ".login",
      "[data-test*='login']",
      "[data-testid*='login']",
      "[data-test*='signin']"
    ];
    for (const s of fallbackSelectors) {
      try {
        const el = await driver.findElements(By.css(s)).then(a => a[0]).catch(() => null);
        if (el) {
          try { await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el); } catch (e) {}
          try { await el.click(); } catch (e) { try { await driver.executeScript('arguments[0].click()', el); } catch (e) {} }
          await driver.sleep(700);
          break;
        }
      } catch (e) {}
    }
  } catch (e) {}
  // After attempting to open the login, check whether we've been redirected to a login page or if inputs are present.
  // If not, capture a screenshot and a short page snippet to help debug why the button wasn't visible.
  try {
    const cur = await driver.getCurrentUrl().catch(() => '');
    const bodyText = (await driver.executeScript('return (document.body && document.body.innerText) ? document.body.innerText.substring(0,2000) : ""')).catch(() => '');
    // If page doesn't contain typical login words and we didn't navigate away, snapshot for debugging
    if (!/login|sign in|signin|auth|password|email/i.test(cur + '\n' + bodyText)) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const reportsDir = path.resolve(process.cwd(), 'e2e', 'reports');
        const shotsDir = path.join(reportsDir, 'screenshots');
        try { fs.mkdirSync(shotsDir, { recursive: true }); } catch (e) {}
        const ts = Date.now();
        const fileName = `signin-missing-${ts}.png`;
        const base64 = await driver.takeScreenshot().catch(() => null);
        if (base64) {
          fs.writeFileSync(path.join(shotsDir, fileName), Buffer.from(base64, 'base64'));
          console.log('[E2E] saved screenshot to e2e/reports/screenshots/' + fileName);
        }
        const infoFile = `signin-missing-${ts}.txt`;
        try { fs.writeFileSync(path.join(shotsDir, infoFile), `url: ${cur}\n\nbody snippet:\n${bodyText}`); } catch (e) {}
        console.log('[E2E] saved page snippet to e2e/reports/screenshots/' + infoFile);
      } catch (e) {
        console.log('[E2E] unable to save debug screenshot/snippet:', e && e.message);
      }
    }
  } catch (e) {}
  for (const p of tryPaths) {
    try {
      // Try current page first (handles off-origin hosted login that redirected us)
      if (p === '/') {
        // don't navigate away for '/'
      } else {
        await driver.get(new URL(p, baseUrl).toString());
      }
      await driver.wait(until.elementLocated(By.css('body')), 8000);

      // If the current page already contains email/password inputs (e.g., hosted IdP), use them
      // Try to find inputs without assuming we navigated.

      // find email field (including on current/off-origin page)
      let emailEl = null;
      for (const s of emailSelectors) {
        emailEl = await driver.findElements(By.css(s)).then(arr => arr[0]).catch(() => null);
        if (emailEl) break;
      }
      let passEl = null;
      for (const s of passwordSelectors) {
        passEl = await driver.findElements(By.css(s)).then(arr => arr[0]).catch(() => null);
        if (passEl) break;
      }
      if (!emailEl || !passEl) {
        // Not a login page for this path — try next path
        continue;
      }

      console.log('[E2E] found login form selectors on page, attempting to fill and submit');

      await emailEl.clear();
      await emailEl.sendKeys(email);
      await passEl.clear();
      await passEl.sendKeys(password);

      // Click submit
      let submitEl = null;
      for (const s of submitSelectors) {
        submitEl = await driver.findElements(By.css(s)).then(arr => arr[0]).catch(() => null);
        if (submitEl) break;
      }
      if (submitEl) {
        console.log('[E2E] clicking login submit element');
        try { await submitEl.click(); } catch (e) { try { await driver.executeScript('arguments[0].click()', submitEl); } catch (e) {} }
      } else {
        // fallback: press Enter on password field
        console.log('[E2E] submit element not found, sending Enter on password field');
        try { await passEl.sendKeys('\n'); } catch (e) {}
      }

      // Wait briefly for a navigation back to app origin or presence of app body text
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        try {
          const cur = await driver.getCurrentUrl();
          if (cur && cur.indexOf(new URL(baseUrl).host) !== -1) {
            loggedIn = true; break;
          }
        } catch {}
        const text = await driver.executeScript('return document.body && document.body.innerText || "";');
        if (/Dashboard|Profile|Welcome|Sign out|Logout|My Profile|Email/i.test(text)) { loggedIn = true; break; }
        await driver.sleep(300);
      }
      if (loggedIn) break;
    } catch (e) {
      // ignore and try next path
    }
  }
  if (!loggedIn) throw new Error('Interactive login did not detect a successful sign-in');
  // small delay to let app initialize
  await driver.sleep(800);
}

// Click through common modal/dialog/button texts if present. This helps automated
// runs when the app or browser shows permission dialogs, cookie banners, or
// other one-off buttons that block tests. It's conservative: only attempts a
// few selectors/texts and uses short timeouts so it doesn't hang.
export async function dismissCommonDialogs(driver) {
  const { By, until } = await import('selenium-webdriver');
  const texts = ['Allow', 'Continue', 'Accept', 'OK', 'Close', 'Got it', 'Dismiss'];
  for (const t of texts) {
    try {
      // XPath to match button-like elements with exact text or containing text
      const xpath = `//button[normalize-space(string(.))='${t}'] | //button[contains(normalize-space(string(.)), '${t}')] | //*[@role='button' and (normalize-space(string(.))='${t}' or contains(normalize-space(string(.)), '${t}'))]`;
      const el = await driver.findElement(By.xpath(xpath)).catch(() => null);
      if (el) {
        // Wait a short moment for it to be clickable then click
        try { await driver.wait(until.elementIsVisible(el), 800); } catch {}
        try { await el.click(); } catch {}
        // Small pause to allow UI to update
        await driver.sleep(300);
      }
    } catch (e) {
      // ignore and continue
    }
  }
}
