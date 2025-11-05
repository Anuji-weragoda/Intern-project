/* eslint-disable no-undef */
const { findAny, savePageSourceSnapshot, screenshot, ensureAppInForeground } = require('../pageobjects/common')
const DashboardPage = require('../pageobjects/DashboardPage')

describe('Dashboard quick check (assumes logged in)', function () {
  this.timeout(60000)

  before(async function () {
    // Bring app to foreground and ensure dashboard is visible
    await ensureAppInForeground()
    try {
      await DashboardPage.assertOnDashboard()
    } catch (err) {
      console.log('Dashboard not visible - please login first or run the full auth spec')
      this.skip()
    }
  })

  it('opens My Profile and verifies content', async () => {
    const selectors = [
      'android=new UiSelector().descriptionContains("My Profile")',
      'android=new UiSelector().textContains("My Profile")',
      'android=new UiSelector().textContains("View and manage your profile")',
    ];
    // try to bring into view
    try { await DashboardPage.openMyProfile(); } catch (e) {
      // fallback: scroll and then click via common helper
      try { await scrollToText('My Profile'); } catch {}
      const el = await findAny(selectors, 5000);
      const { clickWithRetry } = require('../pageobjects/common');
      await clickWithRetry(el);
    }
    await savePageSourceSnapshot('quick-my-profile')
    await screenshot('quick-my-profile.png')
    // verify presence of profile text
    await findAny([
      'android=new UiSelector().textContains("View and manage your profile")',
      'android=new UiSelector().textContains("Profile")'
    ], 5000)
    await driver.back()
  })

  it('opens Edit Profile and verifies content', async () => {
    const selectors = [
      'android=new UiSelector().descriptionContains("Edit Profile")',
      'android=new UiSelector().textContains("Edit Profile")',
      'android=new UiSelector().textContains("Update your personal information")'
    ];
    try { await DashboardPage.openEditProfile(); } catch (e) {
      try { await scrollToText('Edit Profile'); } catch {}
      const el = await findAny(selectors, 5000);
      const { clickWithRetry } = require('../pageobjects/common');
      await clickWithRetry(el);
    }
    await savePageSourceSnapshot('quick-edit-profile')
    await screenshot('quick-edit-profile.png')
    await findAny([
      'android=new UiSelector().descriptionContains("Edit Profile")',
      'android=new UiSelector().textContains("Update your personal information")'
    ], 5000)
    await driver.back()
  })

  it('opens Security Settings and verifies content', async () => {
    const selectors = [
      'android=new UiSelector().textContains("Security Settings")',
      'android=new UiSelector().textContains("Security")',
      'android=new UiSelector().textContains("Settings")'
    ];
    try { await DashboardPage.openSettings(); } catch (e) {
      try { await scrollToText('Security Settings'); } catch {}
      const el = await findAny(selectors, 5000);
      const { clickWithRetry } = require('../pageobjects/common');
      await clickWithRetry(el);
    }
    await savePageSourceSnapshot('quick-security-settings')
    await screenshot('quick-security-settings.png')
    await findAny([
      'android=new UiSelector().textContains("Security")',
      'android=new UiSelector().textContains("Settings")'
    ], 5000)
    await driver.back()
  })

  it('clicks Sign Out and verifies login screen', async () => {
    // Try to scroll to make sure Sign Out is visible
    try { await driver.execute('mobile: scroll', {direction: 'down'}); } catch {}
    await driver.pause(300)

    const signOutSelectors = [
      'android=new UiSelector().descriptionContains("Sign Out")',
      'android=new UiSelector().textContains("Sign Out")',
      '~Sign Out',
      'android=new UiSelector().textMatches("(?i).*sign\\s*out.*")',
      'android=new UiSelector().resourceIdMatches(".*sign.*out.*|.*logout.*")'
    ]

    const btn = await findAny(signOutSelectors, 10000)
    await btn.click()
    await savePageSourceSnapshot('quick-after-signout')
    await screenshot('quick-after-signout.png')

    // Verify we are back on the login screen
    await findAny([
      'android=new UiSelector().textContains("Enter your email")',
      'android=new UiSelector().textContains("Sign In")',
      'android=new UiSelector().descriptionContains("email")'
    ], 10000)
  })
})

module.exports = {}
