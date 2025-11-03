# admin_frontend E2E

Quick steps to run the end-to-end tests in a visible browser on Windows

Recommended (use cmd.exe through PowerShell; avoids PowerShell script policy issues):

```powershell
cd 'c:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\admin_frontend'
cmd /c "set HEADLESS=false && set PREFERRED_BROWSER=edge && npm run e2e"
```

Convenience npm scripts (PowerShell-friendly):

- `npm run e2e:open-edge` — run E2E with Edge visible
- `npm run e2e:open-chrome` — run E2E with Chrome visible

These scripts set the environment variables for the current shell invocation and run the E2E runner directly with `node`.

PowerShell (temporary bypass of execution policy):

```powershell
cd 'c:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\admin_frontend'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
$env:HEADLESS = 'false'
$env:PREFERRED_BROWSER = 'edge'
npm run e2e
```

Open the generated HTML report after a run:

```powershell
npm run e2e:open-report
```

WebDriver note

Selenium requires a matching browser driver (msedgedriver or chromedriver) on your PATH. Check with:

```powershell
where msedgedriver
where chromedriver
```

If missing, download the correct driver (matching your browser version) and add it to your PATH.

Running the optional signup example tests

The optional signup examples only run when the following env vars are present:

- `SIGNUP_URL`, `SIGNUP_EMAIL`, `SIGNUP_PASSWORD`, `MAILHOG_URL` (for OTP example)
- `TOTP_SECRET` (for TOTP example)

Provide them before running if you want those tests to execute.
