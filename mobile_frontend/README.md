# mobile_frontend

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Appium testing

A short overview of how Appium fits into this mobile project: Appium is a
cross-platform mobile automation framework that uses the WebDriver protocol to
drive native, hybrid and web apps on iOS and Android. Tests live in a language
client (Java, JavaScript, Python, etc.), create a driver session with desired
capabilities (device, platform, app), perform UI actions and assertions, and
then attach screenshots/logs to the test report (for example Allure or JUnit
XML) for diagnostics.

Quick checklist
- Appium Server (npm package or standalone)
- Client library (for example `appium-java-client`, `appium-python-client`, or WebdriverIO)
- Test runner (JUnit/TestNG, pytest, Mocha/Jest)
- Backend automation: UiAutomator2/Espresso (Android) or XCUITest (iOS)
- Device/emulator accessible via adb or Xcode; Appium Inspector for debugging

Minimal desired capabilities example (Android)

```json
{
	"platformName": "Android",
	"automationName": "UiAutomator2",
	"deviceName": "Pixel_4_API_31",
	"app": "C:\\\\path\\\\to\\\\app-debug.apk",
	"appPackage": "com.example.app",
	"appActivity": "com.example.app.MainActivity",
	"noReset": false
}
```

Quick local run steps
1. Start an emulator or connect a device (verify with `adb devices`).
2. Start Appium server (e.g. `npx appium` or Appium Desktop).
3. Run your tests with the chosen client/runner. On failure capture screenshots
	 and device logs and attach them to the test report (Allure is recommended).

Notes and best practices
- Use environment variables or CI secret storage — do not hard-code credentials.
- Prefer explicit waits and the Page Object Model to reduce flakiness.
- For parallel device runs use a device cloud (BrowserStack/Sauce/AWS Device Farm)
	or an Appium Grid.

