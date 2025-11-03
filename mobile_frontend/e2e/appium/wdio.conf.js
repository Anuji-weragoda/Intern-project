const { join, resolve } = require('path');
const fs = require('fs');
const getCapabilities = require('./helpers/capabilities');

exports.config = {
  runner: 'local',
  specs: [
    './specs/**/*.spec.js',
    './specs/**/*.e2e.js'
  ],
  maxInstances: 1,
  // Prefer W3C vendor-prefixed Appium caps directly here to avoid any translation issues
  capabilities: [(() => {
    const cwd = process.cwd();
    const candidates = [
      process.env.ANDROID_APP && process.env.ANDROID_APP.trim(),
      resolve(cwd, '../../app-debug.apk'),
      resolve(cwd, '../../build/app/outputs/apk/debug/app-debug.apk'),
      'C:/Users/AnujiWeragoda/GIT/staff-management-system/Intern-project/mobile_frontend/app-debug.apk'
    ].filter(Boolean);
    let apk = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } }) || '';
    const caps = {
      platformName: 'Android',
      'appium:automationName': process.env.ANDROID_AUTOMATION_NAME || 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
      'appium:app': apk,
      'appium:autoGrantPermissions': true,
      'appium:dontStopAppOnReset': true,
      'appium:disableWindowAnimation': true,
      'appium:newCommandTimeout': 180,
      // Explicitly target the Flutter app's package/activity so the correct app is launched
      'appium:appPackage': process.env.ANDROID_PACKAGE || 'com.example.mobile_frontend',
      'appium:appActivity': process.env.ANDROID_ACTIVITY || 'com.example.mobile_frontend.MainActivity',
      'appium:appWaitActivity': process.env.ANDROID_WAIT_ACTIVITY || 'com.example.mobile_frontend.MainActivity,io.flutter.embedding.android.FlutterActivity,*',
      'appium:appWaitForLaunch': true
    };
    if (process.env.ANDROID_UDID) caps['appium:udid'] = process.env.ANDROID_UDID;
    if (process.env.ANDROID_NO_RESET === 'true') caps['appium:noReset'] = true;
    try { console.log('[wdio caps]', JSON.stringify(caps, null, 2)); } catch {}
    return caps;
  })()],
  logLevel: process.env.LOG_LEVEL || 'info',
  bail: 0,
  baseUrl: '',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 1,
  // Use the Appium service to start a local server.
  // If you're already running Appium separately, set APPIUM_START=false
  // to disable this service and connect to the external server instead.
  services: process.env.APPIUM_START === 'false' ? [] : ['appium'],
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  port: process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723,
  path: process.env.APPIUM_BASE_PATH || '/',
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000  // Increased to 3 minutes for full login + profile edit flow
  },
  // Take a screenshot on failure to help debug selector issues
  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    if (!passed) {
      const fs = require('fs');
      const path = require('path');
      const dir = path.resolve(process.cwd(), './artifacts/screenshots');
      try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
      const file = path.join(dir, `${Date.now()}-${(test.title || 'test').replace(/[^a-z0-9-_]+/gi,'_')}.png`);
      try { await browser.saveScreenshot(file); console.log(`Saved failure screenshot: ${file}`); } catch {}
    }
  },
  appium: {
    // Options passed to Appium server; leave defaults to rely on global appium install or Appium desktop
    args: {
      // Uncomment or add server args here if needed
    }
  }
};
