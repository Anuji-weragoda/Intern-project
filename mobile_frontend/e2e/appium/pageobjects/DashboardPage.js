const { findAny, screenshot } = require('./common');

class DashboardPage {
  async assertOnDashboard() {
    const el = await findAny([
      'android=new UiSelector().textContains("Staff Management")',
    ], 20000);
    await screenshot('dashboard-open');
    return el;
  }

  async openMyProfile() {
    const el = await findAny([
      'android=new UiSelector().textContains("My Profile")',
    ], 10000);
    await el.click();
    await screenshot('dashboard-open-my-profile');
  }

  async openEditProfile() {
    const el = await findAny([
      'android=new UiSelector().textContains("Edit Profile")',
    ], 10000);
    await el.click();
    await screenshot('dashboard-open-edit-profile');
  }

  async openSettings() {
    const el = await findAny([
      'android=new UiSelector().textContains("Settings")',
      'android=new UiSelector().textContains("Security Settings")',
    ], 10000);
    await el.click();
    await screenshot('dashboard-open-settings');
  }
}

module.exports = new DashboardPage();
