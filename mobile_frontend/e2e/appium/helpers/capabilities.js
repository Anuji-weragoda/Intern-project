/**
 * Small helper to return capabilities for Appium.
 * The helper reads environment variables to decide whether to return Android or iOS capabilities.
 *
 * Example usage:
 *  - set environment variables before running: ANDROID_APP=/path/to/app.apk ANDROID_DEVICE_NAME=emulator-5554 node ...
 *  - or set CAPS=android or CAPS=ios to pick a preset and then set additional env vars.
 */

const path = require('path');
const fs = require('fs');

function androidCapsFromEnv() {
  const userAbsApk = 'C:/Users/AnujiWeragoda/GIT/staff-management-system/Intern-project/mobile_frontend/app-debug.apk';
  const relApkAtRoot = path.resolve(process.cwd(), '../../app-debug.apk');
  const relApkInBuild = path.resolve(process.cwd(), '../../build/app/outputs/apk/debug/app-debug.apk');

  // Decide APK path: env var wins; else first existing candidate
  const resolvedApk = process.env.ANDROID_APP && process.env.ANDROID_APP.trim().length > 0
    ? process.env.ANDROID_APP
    : [relApkAtRoot, relApkInBuild, userAbsApk].find(p => {
        try { return !!p && fs.existsSync(p); } catch { return false; }
      }) || relApkInBuild; // last resort

  const caps = {
    platformName: 'Android',
    'appium:automationName': process.env.ANDROID_AUTOMATION_NAME || 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
    'appium:app': resolvedApk,
    'appium:appWaitActivity': process.env.ANDROID_APP_WAIT_ACTIVITY || '*',
    'appium:autoGrantPermissions': true,
  };

  if (process.env.ANDROID_UDID) {
    caps['appium:udid'] = process.env.ANDROID_UDID;
  }

  if (process.env.ANDROID_NO_RESET === 'true') {
    caps['appium:noReset'] = true;
  }

  try { console.log('[caps] android', JSON.stringify(caps, null, 2)); } catch {}
  return caps;
}

function iosCapsFromEnv() {
  return {
    platformName: 'iOS',
    automationName: process.env.IOS_AUTOMATION_NAME || 'XCUITest',
    deviceName: process.env.IOS_DEVICE_NAME || 'iPhone Simulator',
    platformVersion: process.env.IOS_PLATFORM_VERSION || undefined,
    app: process.env.IOS_APP || undefined
  };
}

module.exports = function getCapabilities() {
  const selector = (process.env.CAPS || process.env.caps || '').toLowerCase();
  if (selector === 'ios') return iosCapsFromEnv();
  if (selector === 'android') return androidCapsFromEnv();

  // default: attempt to detect by presence of env vars
  if (process.env.ANDROID_APP || process.env.ANDROID_DEVICE_NAME) return androidCapsFromEnv();
  if (process.env.IOS_APP || process.env.IOS_DEVICE_NAME) return iosCapsFromEnv();

  // fallback example capability (no app path) - user must replace with a real .apk or .app
  return {
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: 'Android Emulator',
    app: process.env.ANDROID_APP || '',
    autoGrantPermissions: true
  };
};
