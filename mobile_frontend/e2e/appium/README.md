# Appium E2E tests (WebdriverIO)

This folder contains an isolated WebdriverIO + Appium test setup for the Flutter `mobile_frontend` project (Android with UiAutomator2).

What I added
- `package.json` — devDependencies and scripts for running tests locally.
- `wdio.conf.js` — WDIO config that uses the Appium service and reads capabilities via a helper.
- `helpers/capabilities.js` — small helper to build capabilities from environment variables.
- `specs/smoke.spec.js` — a minimal smoke test that opens a session and checks the page source.

Quick start (Windows PowerShell):

1. Open PowerShell and change to this folder:

```powershell
cd ./mobile_frontend/e2e/appium
```

2. Install dependencies (this will install WDIO and Appium libs):

```powershell
npm install
```

3. Start Appium server, or rely on the built-in WDIO Appium service. If you want to run Appium yourself:

```powershell
appium
```

4. Run tests. Example for Android (set your APK path or rely on default path in helper). Your APK path:
	`C:\Users\AnujiWeragoda\GIT\staff-management-system\Intern-project\mobile_frontend\app-debug.apk`

```powershell
# set an explicit app path and device
$env:ANDROID_APP = 'C:\Users\AnujiWeragoda\GIT\staff-management-system\Intern-project\mobile_frontend\app-debug.apk'; $env:ANDROID_DEVICE_NAME = 'emulator-5554'; $env:CAPS='android'; npm run test
```

Or run the generic one (you must set env vars so capabilities are valid):

```powershell
npm run test:android:win
```

5. Alternatively, use the helper script to auto-detect adb/device and run the test:

```powershell
cd .\mobile_frontend\e2e\appium
npm run android:auto
```

If your Android SDK is in a custom path:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-android.ps1 -SdkRoot "C:\Path\To\Android\Sdk"

Running against an already running Appium server (like the one you started)
- Keep your server running at http://127.0.0.1:4723
- In another terminal:

```powershell
cd .\mobile_frontend\e2e\appium
npm run android:remote
```
This disables the built-in Appium service (APPIUM_START=false) and points WDIO to 127.0.0.1:4723.
```

Notes and next steps
- Fill real `ANDROID_APP` or `IOS_APP` env vars. The helper defaults point to common Android debug APK output paths but may not match your build.
- Add app-specific selectors and tests in `specs/`.
- For Flutter-specific element access, consider installing and using the `appium-flutter-driver` or using element accessibility ids set in the Flutter code.
 
Sample test added
- `specs/login.e2e.js` — waits for `~login_button`, taps it, and verifies a `~login_screen` appears.
	Adjust the accessibility ids to match your app if different.


