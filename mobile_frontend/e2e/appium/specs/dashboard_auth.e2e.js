const { expect } = require('chai');
const LoginPage = require('../pageobjects/LoginPage');
const DashboardPage = require('../pageobjects/DashboardPage');
const { savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Authenticated dashboard navigation', () => {
  before(function () {
    if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
      console.log('Skipping: TEST_EMAIL/TEST_PASSWORD not set');
      this.skip();
    }
  });

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
      fs.writeFileSync(path.join(dir, 'run-result-dashboard.json'), JSON.stringify(result, null, 2), 'utf8');
    } catch {}
  });

  it('should login with valid creds and reach dashboard, then navigate', async () => {
    await LoginPage.open();
    await LoginPage.fillCredentials(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
    await LoginPage.tapSignIn();
    // Await dashboard
    await DashboardPage.assertOnDashboard();
    await savePageSourceSnapshot('dashboard-open');

    // Try open My Profile (HomeScreen)
    await DashboardPage.openMyProfile();
    await savePageSourceSnapshot('home-open');
    await screenshot('home-open');
    await driver.back();

    // Try open Edit Profile
    await DashboardPage.openEditProfile();
    await savePageSourceSnapshot('profile-edit-open');
    await screenshot('profile-edit-open');
    await driver.back();

    // Try open Settings
    await DashboardPage.openSettings();
    await savePageSourceSnapshot('settings-open');
    await screenshot('settings-open');
    await driver.back();
  });
});
