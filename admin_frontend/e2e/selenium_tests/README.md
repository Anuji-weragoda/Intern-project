Selenium tests (Node.js) for admin_frontend

Overview
- This folder contains lightweight Selenium automation tests written in JavaScript (ESM) using `selenium-webdriver` and Chrome.
- Tests open a real browser, perform flows (login, register, dashboard check, navigation, form submission), log progress to the console, and always close the browser.

Prerequisites
- Node.js (tested with Node 18+).
- Project dependencies installed in `admin_frontend` (run `npm install`).
- Chrome installed on the machine. Make sure the installed Chrome version matches a chromedriver on PATH, or install chromedriver and add it to PATH.

Files
- `loginTest.js` - attempts UI login (tries to click in-app sign-in and fill login inputs).
- `registerTest.js` - attempts registration on `/signup` or `/register`.
- `dashboardTest.js` - seeds a localStorage bypass and checks dashboard content.
- `navigationTest.js` - clicks common nav links and verifies navigation.
- `formSubmissionTest.js` - attempts to find a create/new form (user-management) and submit sample data.

Running tests
1. From `admin_frontend` folder run `npm install` if you haven't already.
2. Start the app preview (the tests expect the app to be served at the BASE_URL):

```powershell
# start vite preview (matches run-e2e.mjs behavior)
npm run preview:e2e
```

3. In another terminal, run any test file directly:

```powershell
# visible run using Chrome
node e2e/selenium_tests/loginTest.js

# with credentials (example)
set LOGIN_EMAIL=you@example.com; set LOGIN_PASSWORD=YourPass; node e2e/selenium_tests/loginTest.js
```

Environment variables
- `BASE_URL` - URL of the running app (default `http://localhost:5180`)
- `HEADLESS` - set to `true` to run Chrome headless
- `LOGIN_EMAIL`, `LOGIN_PASSWORD` - credentials used by `loginTest.js` and `signin` flows
- `SIGNUP_EMAIL`, `SIGNUP_PASSWORD`, `SIGNUP_NAME` - used by `registerTest.js` if provided

Notes & tips
- Tests are intentionally defensive — they try multiple selectors and will skip if required form elements are not present. Adjust selectors in each file to match your exact app markup for deterministic results.
- If your environment uses an external IdP, prefer setting `LOGIN_PAGE_URL` (modify `loginTest.js`) or use the project's programmatic bypass helpers for reliable CI runs.
