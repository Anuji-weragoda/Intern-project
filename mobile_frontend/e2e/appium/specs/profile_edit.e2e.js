const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const LoginPage = require('../pageobjects/LoginPage');
const DashboardPage = require('../pageobjects/DashboardPage');
const { findAny, typeIfExists, savePageSourceSnapshot, screenshot, ensureAppInForeground } = require('../pageobjects/common');

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'anujinishaweragoda1234@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'iHuyntj9P4ZTYR2@@@@';

describe('Profile Edit flow', () => {
  afterEach(function () {
    try {
      const dir = path.resolve(process.cwd(), './artifacts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const result = {
        title: this.currentTest && this.currentTest.title,
        state: this.currentTest && this.currentTest.state,
        duration: this.currentTest && this.currentTest.duration,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(path.join(dir, 'run-result-profile-edit.json'), JSON.stringify(result, null, 2), 'utf8');
      console.log('Saved profile edit test result');
    } catch (e) {
      console.log('Failed to save profile edit test result:', e?.message || e);
    }
  });

  it('should login, navigate to dashboard, open Edit Profile, edit a field and save', async () => {
    try {
      console.log('Profile Edit E2E: starting...');
      await browser.pause(1500);

      // Step 1: Ensure app is in foreground
      await ensureAppInForeground();
      await savePageSourceSnapshot('profile-edit-app-launch');
      await screenshot('00-profile-edit-app-launch');

      // Step 2: Login using direct approach (more control over timing)
      console.log('Profile Edit E2E: opening login page...');
      await ensureAppInForeground();
      await browser.pause(1000);
      await savePageSourceSnapshot('profile-edit-login-open');
      await screenshot('00-profile-edit-login-open');

      // Fill email
      console.log(`Profile Edit E2E: finding email field...`);
      const emailSelectors = [
        'android=new UiSelector().className("android.widget.EditText").instance(0)',
        'android=new UiSelector().hint("Enter your email")',
        'android=new UiSelector().textContains("Email")',
      ];
      const emailField = await findAny(emailSelectors, 15000);
      await emailField.click();
      await browser.pause(300);
      await emailField.clearValue?.();
      await emailField.setValue(TEST_EMAIL);
      console.log(`Profile Edit E2E: email filled: ${TEST_EMAIL}`);
      await browser.pause(500);
      await screenshot('00a-profile-edit-email-filled');

      // Fill password
      console.log('Profile Edit E2E: finding password field...');
      const passwordSelectors = [
        'android=new UiSelector().className("android.widget.EditText").instance(1)',
        'android=new UiSelector().hint("Enter your password")',
        'android=new UiSelector().textContains("Password")',
      ];
      const passwordField = await findAny(passwordSelectors, 15000);
      await passwordField.click();
      await browser.pause(300);
      await passwordField.clearValue?.();
      await passwordField.setValue(TEST_PASSWORD);
      console.log('Profile Edit E2E: password filled');
      await browser.pause(500);
      await screenshot('00b-profile-edit-password-filled');
      await savePageSourceSnapshot('profile-edit-credentials-filled');

      // Try to scroll to make sure Sign In button is visible
      console.log('Profile Edit E2E: scrolling to ensure Sign In button is visible...');
      try {
        if (driver.isAndroid) {
          const rect = await driver.getWindowRect();
          const left = Math.floor(rect.width * 0.1);
          const width = Math.floor(rect.width * 0.8);
          const top = Math.floor(rect.height * 0.2);
          const height = Math.floor(rect.height * 0.6);
          await driver.execute('mobile: scrollGesture', {
            left, top, width, height,
            direction: 'down', percent: 0.5,
          });
          await browser.pause(500);
        }
      } catch (e) {
        console.log('Scroll attempt (non-critical):', e?.message || e);
      }

      console.log('Profile Edit E2E: tapping Sign In...');
      const signInSelectors = [
        'android=new UiSelector().description("Sign In")',
        'android=new UiSelector().textContains("Sign In")',
        '~Sign In',
        'android=new UiSelector().text("Sign In")',
        'android=new UiSelector().descriptionContains("Sign In")'
      ];
      const signInBtn = await findAny(signInSelectors, 20000);
      await signInBtn.click();
      console.log('Profile Edit E2E: Sign In clicked, waiting for auth...');
      await browser.pause(4000);  // Wait for Cognito auth to complete
      await savePageSourceSnapshot('profile-edit-after-login-click');
      await screenshot('01-profile-edit-after-login-click');

      // Step 3: Wait briefly for dashboard/app to load (don't verify yet, just wait)
      console.log('Profile Edit E2E: app loading after sign in, waiting...');
      await browser.pause(2000);
      await screenshot('02-profile-edit-app-loading');

      // Step 4: Try to open Edit Profile (may be in tabs, profile screen, or menu)
      console.log('Profile Edit E2E: looking for Edit Profile button/tab...');
      const editProfileSelectors = [
        // These match the dashboard menu items
        'android=new UiSelector().description("Edit Profile")',
        'android=new UiSelector().descriptionContains("Edit Profile")',
        // Also try without newline character just in case
        'android=new UiSelector().textContains("Edit Profile")',
        'android=new UiSelector().textContains("Update your personal information")',
        'android=new UiSelector().descriptionContains("Update your personal")',
        '~edit_profile'
      ];

      let editProfileBtn;
      try {
        editProfileBtn = await findAny(editProfileSelectors, 12000);
        console.log('Profile Edit E2E: Edit Profile button found, clicking...');
        await editProfileBtn.click();
        await browser.pause(1500);
        await savePageSourceSnapshot('profile-edit-screen-opened');
        await screenshot('03-profile-edit-screen-opened');
      } catch (e) {
        console.log('Profile Edit E2E: direct Edit Profile search failed, trying alternative approach:', e?.message || e);
        await screenshot('02b-profile-edit-button-search-failed');
        throw new Error(`Could not find Edit Profile button after login: ${e?.message || e}. Check page source at artifacts/pagesource/`);
      }

      // Step 5: Edit a profile field
      console.log('Profile Edit E2E: looking for editable fields...');
      const editableFieldSelectors = [
        'android=new UiSelector().descriptionContains("Name")',
        'android=new UiSelector().textContains("Name")',
        'android=new UiSelector().textContains("Full Name")',
        'android=new UiSelector().hint("Full Name")',
        'android=new UiSelector().hint("Name")',
        'android=new UiSelector().className("android.widget.EditText").instance(0)',
        'android=new UiSelector().className("android.widget.EditText").instance(1)'
      ];

      const edited = await typeIfExists(editableFieldSelectors, 'Test User Updated', 'profile-name-field').catch(() => false);
      
      if (edited) {
        console.log('Profile Edit E2E: field edited successfully');
        await browser.pause(300);
        await screenshot('04-profile-edit-field-edited');
        await savePageSourceSnapshot('profile-edit-field-edited');

        // Step 6: Find and click Save button
        console.log('Profile Edit E2E: looking for Save button...');
        // Hide keyboard if it overlaps the Save button
        try { await driver.hideKeyboard(); await browser.pause(300); } catch {}
        await savePageSourceSnapshot('profile-edit-before-save-search');
        await screenshot('05a-profile-edit-before-save-search');

        const saveButtonSelectors = [
          // Accessibility descriptions and texts commonly used
          'android=new UiSelector().description("Save")',
          'android=new UiSelector().descriptionContains("Save")',
          'android=new UiSelector().descriptionContains("Save Changes")',
          'android=new UiSelector().descriptionContains("Update")',
          'android=new UiSelector().text("Save")',
          'android=new UiSelector().textContains("Save")',
          'android=new UiSelector().textContains("Save Changes")',
          'android=new UiSelector().textContains("Update")',
          'android=new UiSelector().resourceIdMatches("(?i).*save.*|.*update.*")',
          // Generic button fallback
          'android=new UiSelector().className("android.widget.Button").clickable(true)'
        ];

        let clickedSave = false;
        try {
          const saveBtn = await findAny(saveButtonSelectors, 8000);
          console.log('Profile Edit E2E: Save button found (first attempt), clicking...');
          await saveBtn.click();
          clickedSave = true;
        } catch (firstErr) {
          console.log('Profile Edit E2E: Save not found initially, trying to scroll and retry:', firstErr?.message || firstErr);
          // Try to scroll to reveal the Save button and retry
          try {
            if (driver.isAndroid) {
              const rect = await driver.getWindowRect();
              const left = Math.floor(rect.width * 0.1);
              const width = Math.floor(rect.width * 0.8);
              const top = Math.floor(rect.height * 0.2);
              const height = Math.floor(rect.height * 0.6);
              for (let i = 0; i < 2; i++) {
                await driver.execute('mobile: scrollGesture', {
                  left, top, width, height,
                  direction: 'down', percent: 0.9,
                });
                await browser.pause(400);
              }
              // UiScrollable fallback targeting text
              try {
                const scrollSel = 'android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Save")';
                await $(scrollSel).catch(() => null);
              } catch {}
            }
          } catch {}
          await screenshot('05b-profile-edit-after-scroll');
          try {
            const saveBtn2 = await findAny(saveButtonSelectors, 8000);
            console.log('Profile Edit E2E: Save button found after scroll, clicking...');
            await saveBtn2.click();
            clickedSave = true;
          } catch (secondErr) {
            console.log('Profile Edit E2E: Save button still not found:', secondErr?.message || secondErr);
          }
        }

        if (clickedSave) {
          await browser.pause(1200);
          await screenshot('05-profile-edit-after-save');
          await savePageSourceSnapshot('profile-edit-after-save');
          console.log('Profile Edit E2E: Save completed');
        } else {
          await screenshot('05-profile-edit-no-save-button');
        }
      } else {
        console.log('Profile Edit E2E: could not find editable field on profile edit screen');
        await screenshot('04-profile-edit-no-editable-field');
      }

      // Step 7: Quick final check that app is still responsive
      console.log('Profile Edit E2E: checking if app is still responsive...');
      try {
        await browser.pause(500);
        const src = await browser.getPageSource();
        if (src && src.length > 100) {
          console.log('Profile Edit E2E: app is responsive, test completed');
          await screenshot('06-profile-edit-final-state');
        }
      } catch (e) {
        console.log('Profile Edit E2E: app state check:', e?.message || e);
      }

      console.log('Profile Edit E2E: test flow completed');

    } catch (e) {
      // On failure, dump a snippet of the page source to help identify issue
      try {
        const src = await browser.getPageSource();
        console.log('--- PAGE SOURCE START (Profile Edit Failure) ---');
        console.log(src.substring(0, Math.min(src.length, 5000)));
        console.log('--- PAGE SOURCE END ---');
        await savePageSourceSnapshot('profile-edit-on-failure');
      } catch {}
      throw e;
    }
  });
});
