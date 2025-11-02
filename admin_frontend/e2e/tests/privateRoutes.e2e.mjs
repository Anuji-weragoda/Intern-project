import { By, until } from 'selenium-webdriver';
import { buildDriver } from '../driver.mjs';

export async function runPrivateRoutes({ baseUrl, headless }) {
  const driver = await buildDriver({ headless, preferred: 'edge' });
  try {
    // Directly navigate to a protected page (e.g., /profile).
    // The app's PrivateRoute redirects unauthenticated users to the backend OAuth2 login endpoint
    // (e.g., http://localhost:8081/oauth2/authorization/cognito), not to /unauthorized.
    await driver.get(baseUrl + '/profile');
    await driver.wait(until.elementLocated(By.css('body')), 10000);

    // Allow SPA routing to occur
    await driver.sleep(500);

    const currentUrl = await driver.getCurrentUrl();
    const urlObj = new URL(currentUrl);
    const appHost = new URL(baseUrl).host;

    const redirectedOffApp = urlObj.host !== appHost;
    const looksLikeOauth = /oauth2|authorization|cognito/i.test(currentUrl) || urlObj.host.includes('cognito-idp') || urlObj.port === '8081';

    if (!(redirectedOffApp && looksLikeOauth)) {
      throw new Error(`Expected redirect to backend OAuth login, got ${currentUrl}`);
    }
  } finally {
    await driver.quit();
  }
}
