// Utilities to prepare the app for authenticated E2E flows without a real backend
// - Sets a dummy session via localStorage (used by authService E2E bypass)
// - Sets a dummy jwt_token cookie for pages that read JWT directly (Dashboard/Profile)
// - Stubs window.fetch to return canned JSON for known API endpoints used by pages

export async function prepareAuthenticatedApp(driver, baseUrl) {
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
}
