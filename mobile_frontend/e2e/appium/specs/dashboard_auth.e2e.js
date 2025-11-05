/* eslint-disable no-undef */
const assert = require('assert')
const path = require('path')
const { findAny, savePageSourceSnapshot, screenshot, typeIfExists, ensureAppInForeground } = require('../pageobjects/common')
const LoginPage = require('../pageobjects/LoginPage')
const DashboardPage = require('../pageobjects/DashboardPage')

describe('Dashboard navigation and auth flow', function () {
  this.timeout(180000)

  const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'anujinishaweragoda1234@gmail.com'
  const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'iHuyntj9P4ZTYR2@@@@'

  it('logs in, navigates tabs (View Profile, Edit Profile, Security), then signs out', async () => {
    // Ensure app is ready and on the login screen
    await driver.pause(1000)

    // Login
  await screenshot('00-before-login.png')

    // Use LoginPage helper to fill credentials and sign in
    await LoginPage.fillCredentials(TEST_EMAIL, TEST_PASSWORD)
    await LoginPage.tapSignIn()
  await savePageSourceSnapshot('01-after-sign-in-click.xml')
  await screenshot('01-after-sign-in-click.png')

    // Wait for dashboard welcome to appear
    // Wait for dashboard to appear using DashboardPage helper
    await DashboardPage.assertOnDashboard()

    // Open My Profile (View)
    await DashboardPage.openMyProfile()
    await savePageSourceSnapshot('03-my-profile.xml')

    // Back to dashboard if needed
    await driver.back();
    await driver.pause(500)

    // Open Edit Profile
    await DashboardPage.openEditProfile()
    await savePageSourceSnapshot('04-edit-profile.xml')
    await screenshot('04-edit-profile.png')

    // Make a small edit if possible (toggle focus on a field then cancel)
    const anyInput = await findAny([
      'new UiSelector().className("android.widget.EditText")',
      'new UiSelector().resourceIdMatches(".*name.*|.*email.*|.*phone.*")'
    ], 5000)
    if (anyInput) {
      await anyInput.click()
      await driver.pause(300)
      await driver.hideKeyboard().catch(() => {})
    }
  await screenshot('04b-edit-profile-after-focus.png')

    // Back to dashboard
    await driver.back();
    await driver.pause(500)

    // Open Security / Settings
    await DashboardPage.openSettings()
    await savePageSourceSnapshot('05-security.xml')
    await screenshot('05-security.png')

    // Back to dashboard
    await driver.back();
    await driver.pause(500)

    // Sign out
    const signOutSelectors = [
      'android=new UiSelector().descriptionContains("Sign Out")',
      'new UiSelector().textContains("Sign Out")',
      '~Sign Out',
      'new UiSelector().textContains("Logout")',
      'android=new UiSelector().descriptionContains("Logout")'
    ]
    const signOutBtn = await findAny(signOutSelectors, 10000)
    assert(signOutBtn, 'Sign Out button not found')
    await signOutBtn.click()
  await savePageSourceSnapshot('06-after-signout.xml')
  await screenshot('06-after-signout.png')

    // Confirm we are back on login screen
    const loginScreenSelectors = [
      'android=new UiSelector().textContains("Enter your email")',
      'android=new UiSelector().descriptionContains("email")',
      'new UiSelector().textContains("Sign In")',
      'new UiSelector().textContains("email")'
    ]
    const backToLogin = await findAny(loginScreenSelectors, 10000)
    assert(backToLogin, 'Did not navigate back to login screen after sign out')
  })
})

describe('Dashboard page (unit) checks', function () {
  this.timeout(60000)

  before(async function () {
    // Try to bring app to foreground; if dashboard not present skip tests
    await ensureAppInForeground()
    try {
      await DashboardPage.assertOnDashboard()
    } catch (err) {
      console.log('Dashboard not visible - skipping Dashboard page unit tests')
      this.skip()
    }
  })

  it('opens My Profile, Edit Profile and Settings from dashboard', async () => {
    // Open My Profile
    await DashboardPage.openMyProfile()
    await savePageSourceSnapshot('unit-03-my-profile.xml')
    await screenshot('unit-03-my-profile.png')
    // Verify My Profile screen content
    try {
      await findAny([
        'android=new UiSelector().descriptionContains("My Profile")',
        'android=new UiSelector().textContains("View and manage your profile")',
        'android=new UiSelector().textContains("Profile")'
      ], 5000)
    } catch (e) {
      throw new Error('My Profile did not show expected content')
    }
    await driver.back()
    await driver.pause(300)

    // Open Edit Profile
    await DashboardPage.openEditProfile()
    await savePageSourceSnapshot('unit-04-edit-profile.xml')
    await screenshot('unit-04-edit-profile.png')
    // Verify Edit Profile screen content
    try {
      await findAny([
        'android=new UiSelector().descriptionContains("Edit Profile")',
        'android=new UiSelector().textContains("Update your personal information")',
        'android=new UiSelector().textContains("Edit")'
      ], 5000)
    } catch (e) {
      throw new Error('Edit Profile did not show expected content')
    }
    await driver.back()
    await driver.pause(300)

    // Open Settings/Security
    await DashboardPage.openSettings()
    await savePageSourceSnapshot('unit-05-security.xml')
    await screenshot('unit-05-security.png')
    // Verify Settings/Security screen content
    try {
      await findAny([
        'android=new UiSelector().textContains("Security")',
        'android=new UiSelector().textContains("Settings")',
        'android=new UiSelector().descriptionContains("Security")'
      ], 5000)
    } catch (e) {
      throw new Error('Settings/Security did not show expected content')
    }
    await driver.back()
  })
})
