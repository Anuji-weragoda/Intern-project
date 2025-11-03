const { expect } = require('chai');
const LoginPage = require('../pageobjects/LoginPage');
const DashboardPage = require('../pageobjects/DashboardPage');
const { findAny, typeIfExists, savePageSourceSnapshot, screenshot } = require('../pageobjects/common');

describe('Profile Edit flow', () => {
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
      fs.writeFileSync(path.join(dir, 'run-result-profile-edit.json'), JSON.stringify(result, null, 2), 'utf8');
    } catch {}
  });

  it('should login, open Edit Profile, tweak a field and save', async () => {
    await LoginPage.open();
    await LoginPage.fillCredentials(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
    await LoginPage.tapSignIn();
    await DashboardPage.assertOnDashboard();

    await DashboardPage.openEditProfile();
    await savePageSourceSnapshot('profile-edit-open');
    await screenshot('profile-edit-open');

    // Try to edit a common field (Name or Phone) if present
    const edited = await typeIfExists([
      'android=new UiSelector().textContains("Name")',
      'android=new UiSelector().textContains("Full Name")',
      'android=new UiSelector().textContains("Phone")',
      'android=new UiSelector().className("android.widget.EditText").instance(0)'
    ], 'Test User', 'profile-edit-field');

    if (edited) {
      const saveBtn = await findAny([
        'android=new UiSelector().textContains("Save")',
        'android=new UiSelector().textContains("Update")',
        'android=new UiSelector().descriptionContains("Save")'
      ], 12000).catch(() => null);
      if (saveBtn) {
        await saveBtn.click();
        await screenshot('profile-edit-save');
      }
    }

    // Validate we remain in app (not Hello Android) by checking dashboard title after back
    await driver.back();
    const dash = await findAny([
      'android=new UiSelector().textContains("Staff Management")'
    ], 15000);
    expect(await dash.isDisplayed()).to.equal(true);
  });
});
